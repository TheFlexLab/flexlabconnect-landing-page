import crypto from "crypto";
import { putItem } from "@/lib/dynamodb";
import { markEmailRiskEvent } from "@/lib/email-policy";
import { isValidEmail, normalizeEmail } from "@/lib/unsubscribe-token";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function stringValue(record: UnknownRecord | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function arrayValue(record: UnknownRecord | null, key: string): unknown[] {
  const value = record?.[key];
  return Array.isArray(value) ? value : [];
}

function emailList(values: unknown[]): string[] {
  const emails = new Set<string>();
  for (const value of values) {
    if (typeof value === "string") {
      const email = normalizeEmail(value);
      if (isValidEmail(email)) emails.add(email);
      continue;
    }

    const item = asRecord(value);
    const candidate =
      stringValue(item, "emailAddress") ||
      stringValue(item, "email") ||
      stringValue(item, "recipient");
    if (candidate) {
      const email = normalizeEmail(candidate);
      if (isValidEmail(email)) emails.add(email);
    }
  }
  return [...emails];
}

function recipientsForEvent(payload: UnknownRecord, eventType: string): string[] {
  const bounce = asRecord(payload.bounce);
  const complaint = asRecord(payload.complaint);
  const delivery = asRecord(payload.delivery);
  const delay = asRecord(payload.deliveryDelay);
  const mail = asRecord(payload.mail);

  if (eventType === "bounce") return emailList(arrayValue(bounce, "bouncedRecipients"));
  if (eventType === "complaint") return emailList(arrayValue(complaint, "complainedRecipients"));
  if (eventType === "delivery") return emailList(arrayValue(delivery, "recipients"));
  if (eventType === "deliverydelay") return emailList(arrayValue(delay, "delayedRecipients"));

  const destination = arrayValue(mail, "destination");
  return emailList(destination);
}

function normalizeEventType(payload: UnknownRecord): string {
  const raw =
    stringValue(payload, "eventType") ||
    stringValue(payload, "notificationType") ||
    stringValue(payload, "event") ||
    "unknown";
  return raw.replace(/[\s_-]/g, "").toLowerCase();
}

function isPermanentBounce(payload: UnknownRecord): boolean {
  const bounce = asRecord(payload.bounce);
  const bounceType = stringValue(bounce, "bounceType");
  // Configuration-set "Hard bounces" events are permanent. Some payloads do
  // not include bounceType, so absence is treated as a hard bounce event.
  return !bounceType || bounceType.toLowerCase() === "permanent";
}

function eventMessageId(payload: UnknownRecord): string {
  const mail = asRecord(payload.mail);
  return stringValue(mail, "messageId") || "unknown-message";
}

async function auditEvent(
  payload: UnknownRecord,
  eventType: string,
  recipients: string[]
): Promise<void> {
  const messageId = eventMessageId(payload);
  const canonical = JSON.stringify({ eventType, messageId, recipients: [...recipients].sort() });
  const hash = crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 40);
  const now = new Date().toISOString();

  await putItem({
    pk: { S: `SES_EVENT#${hash}` },
    type: { S: `ses_${eventType}` },
    messageId: { S: messageId },
    recipients: { S: recipients.join(",") },
    createdAt: { S: now },
    source: { S: "amazon_ses_sns" },
  });
}

export type ProcessedSesEvent = {
  eventType: string;
  messageId: string;
  recipients: string[];
  suppressed: string[];
};

/**
 * Handles both SES identity-level SNS notifications (notificationType) and
 * configuration-set SNS event publishing payloads (eventType).
 */
export async function processSesEventPayload(payload: unknown): Promise<ProcessedSesEvent> {
  const record = asRecord(payload);
  if (!record) throw new Error("SES event payload is not an object.");

  const eventType = normalizeEventType(record);
  const recipients = recipientsForEvent(record, eventType);
  const suppressed: string[] = [];

  if (eventType === "complaint") {
    for (const email of recipients) {
      await markEmailRiskEvent(email, "complaint");
      suppressed.push(email);
    }
  }

  if (eventType === "bounce" && isPermanentBounce(record)) {
    for (const email of recipients) {
      await markEmailRiskEvent(email, "bounce");
      suppressed.push(email);
    }
  }

  await auditEvent(record, eventType, recipients);

  return {
    eventType,
    messageId: eventMessageId(record),
    recipients,
    suppressed,
  };
}
