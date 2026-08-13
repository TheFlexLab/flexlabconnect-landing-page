import crypto from "crypto";
import { getEventsCollection, getRecipientsCollection } from "@/lib/mongodb";
import { isValidEmail, normalizeEmail } from "@/lib/unsubscribe-token";

export const ALLOWED_RECIPIENT_SOURCES = [
  "existing_customer",
  "contact_form",
  "meeting_request",
  "confirmed_subscriber",
] as const;

export type AllowedRecipientSource = (typeof ALLOWED_RECIPIENT_SOURCES)[number];

export type RecipientRecord = {
  email: string;
  source: string;
  sourceDetail?: string;
  consentAt?: Date;
  unsubscribed: boolean;
  unsubscribedAt?: Date;
  bounced: boolean;
  bouncedAt?: Date;
  complained: boolean;
  complainedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type EligibilityResult = {
  email: string;
  allowed: boolean;
  reason:
    | "eligible"
    | "invalid_email"
    | "unknown_recipient"
    | "disallowed_source"
    | "unsubscribed"
    | "bounced"
    | "complained";
  source?: string;
};

export async function registerEligibleRecipient(
  email: string,
  source: AllowedRecipientSource,
  metadata?: { consentAt?: Date; sourceDetail?: string }
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error("Invalid email address.");
  if (!ALLOWED_RECIPIENT_SOURCES.includes(source)) {
    throw new Error("Recipient source is not allowed for SES delivery.");
  }

  const recipients = await getRecipientsCollection<RecipientRecord>();
  const existing = await recipients.findOne({ email: normalized });
  const now = new Date();

  await recipients.updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        source,
        sourceDetail: metadata?.sourceDetail || source,
        consentAt: metadata?.consentAt || now,
        unsubscribed: existing?.unsubscribed ?? false,
        bounced: existing?.bounced ?? false,
        complained: existing?.complained ?? false,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function getEmailEligibility(email: string): Promise<EligibilityResult> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { email: normalized, allowed: false, reason: "invalid_email" };
  }

  const recipients = await getRecipientsCollection<RecipientRecord>();
  const item = await recipients.findOne({ email: normalized });
  if (!item) {
    return { email: normalized, allowed: false, reason: "unknown_recipient" };
  }

  const source = item.source || "unknown";
  if (!ALLOWED_RECIPIENT_SOURCES.includes(source as AllowedRecipientSource)) {
    return { email: normalized, allowed: false, reason: "disallowed_source", source };
  }
  if (item.complained) {
    return { email: normalized, allowed: false, reason: "complained", source };
  }
  if (item.bounced) {
    return { email: normalized, allowed: false, reason: "bounced", source };
  }
  if (item.unsubscribed) {
    return { email: normalized, allowed: false, reason: "unsubscribed", source };
  }

  return { email: normalized, allowed: true, reason: "eligible", source };
}

export async function assertEmailCanBeSent(email: string): Promise<void> {
  const result = await getEmailEligibility(email);
  if (!result.allowed) {
    throw new Error(`SES delivery blocked for ${result.email}: ${result.reason}`);
  }
}

export async function unsubscribeEmail(
  email: string
): Promise<"unsubscribed" | "already_unsubscribed"> {
  const normalized = normalizeEmail(email);
  const recipients = await getRecipientsCollection<RecipientRecord>();
  const events = await getEventsCollection();
  const existing = await recipients.findOne({ email: normalized });
  const now = new Date();

  if (existing?.unsubscribed) {
    return "already_unsubscribed";
  }

  await recipients.updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        source: existing?.source || "confirmed_subscriber",
        unsubscribed: true,
        unsubscribedAt: now,
        bounced: existing?.bounced ?? false,
        complained: existing?.complained ?? false,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  const eventKey = `UNSUBSCRIBE#${crypto.randomUUID()}`;
  await events.insertOne({
    eventKey,
    type: "unsubscribe",
    email: normalized,
    createdAt: now,
    source: "flexlabconnect.com",
  });

  return "unsubscribed";
}

export async function markEmailRiskEvent(
  email: string,
  event: "bounce" | "complaint"
): Promise<void> {
  const normalized = normalizeEmail(email);
  const recipients = await getRecipientsCollection<RecipientRecord>();
  const existing = await recipients.findOne({ email: normalized });
  const now = new Date();

  const updates: Partial<RecipientRecord> = {
    email: normalized,
    source: existing?.source || "existing_customer",
    unsubscribed: existing?.unsubscribed ?? false,
    bounced: existing?.bounced ?? false,
    complained: existing?.complained ?? false,
    updatedAt: now,
  };

  if (event === "bounce") {
    updates.bounced = true;
    updates.bouncedAt = now;
  } else {
    updates.complained = true;
    updates.complainedAt = now;
  }

  await recipients.updateOne(
    { email: normalized },
    {
      $set: updates,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}
