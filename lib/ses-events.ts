import crypto from "crypto";
import { getEventsCollection } from "@/lib/mongodb";
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

  return emailList(arrayValue(mail, "destination"));
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
  const eventKey = `SES_EVENT#${hash}`;
  const events = await getEventsCollection();

  await events.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        type: `ses_${eventType}`,
        messageId,
        recipients,
        createdAt: new Date(),
        source: "amazon_ses_sns",
      },
    },
    { upsert: true }
  );
}

export type ProcessedSesEvent = {
  eventType: string;
  messageId: string;
  recipients: string[];
  suppressed: string[];
};

/**
 * Handles SES configuration-set SNS event publishing payloads. It also remains
 * compatible with identity-level feedback payloads if they are enabled later.
 */
export async function processSesEventPayload(payload: unknown): Promise<ProcessedSesEvent> {
  const record = asRecord(payload);
  if (!record) throw new Error("SES event payload is not an object.");

  const eventType = normalizeEventType(record);
  const recipients = recipientsForEvent(record, eventType);
  const suppressed: string[] = [];

  console.info("[ses-sns] SES event received", {
    eventType,
    messageId: eventMessageId(record),
    recipients,
  });

  if (eventType === "complaint") {
    for (const email of recipients) {
      await markEmailRiskEvent(email, "complaint");
      suppressed.push(email);
    }
    console.warn("[ses-sns] complaint persisted", { recipients });
  }

  if (eventType === "bounce" && isPermanentBounce(record)) {
    for (const email of recipients) {
      await markEmailRiskEvent(email, "bounce");
      suppressed.push(email);
    }
    console.warn("[ses-sns] permanent bounce persisted", { recipients });
  }

  await auditEvent(record, eventType, recipients);

  return {
    eventType,
    messageId: eventMessageId(record),
    recipients,
    suppressed,
  };
}
