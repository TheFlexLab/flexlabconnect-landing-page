import crypto from "crypto";

export type SnsEnvelope = {
  Type?: string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string;
  Timestamp?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  Token?: string;
};

const certificateCache = new Map<string, { pem: string; expiresAt: number }>();

function expectedTopicArn(): string {
  const value = process.env.SES_SNS_TOPIC_ARN?.trim();
  if (!value) {
    throw new Error("SES_SNS_TOPIC_ARN is not configured.");
  }
  return value;
}

function isAllowedAwsSnsUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    const validHost =
      /^sns(?:\.[a-z0-9-]+)?\.amazonaws\.com$/.test(hostname) ||
      /^sns\.[a-z0-9-]+\.amazonaws\.com\.cn$/.test(hostname);

    return validHost;
  } catch {
    return false;
  }
}

function isAllowedSigningCertificateUrl(rawUrl: string): boolean {
  if (!isAllowedAwsSnsUrl(rawUrl)) return false;

  const url = new URL(rawUrl);
  return (
    url.pathname.startsWith("/SimpleNotificationService-") &&
    url.pathname.endsWith(".pem") &&
    !url.search &&
    !url.hash
  );
}

function buildStringToSign(message: SnsEnvelope): string {
  const type = message.Type;
  const fields =
    type === "Notification"
      ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
      : type === "SubscriptionConfirmation" || type === "UnsubscribeConfirmation"
        ? ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"]
        : [];

  if (fields.length === 0) {
    throw new Error(`Unsupported SNS message type: ${type || "unknown"}`);
  }

  let canonical = "";
  for (const field of fields) {
    const value = message[field as keyof SnsEnvelope];
    if (field === "Subject" && typeof value !== "string") continue;
    if (typeof value !== "string" || !value) {
      throw new Error(`SNS message is missing required field ${field}.`);
    }
    canonical += `${field}\n${value}\n`;
  }
  return canonical;
}

async function fetchSigningCertificate(url: string): Promise<string> {
  const cached = certificateCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.pem;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch SNS signing certificate (${response.status}).`);
  }

  const pem = await response.text();
  if (!pem.includes("BEGIN CERTIFICATE")) {
    throw new Error("SNS signing certificate response was not a PEM certificate.");
  }

  certificateCache.set(url, { pem, expiresAt: Date.now() + 60 * 60 * 1000 });
  return pem;
}

export async function verifySnsEnvelope(message: SnsEnvelope): Promise<void> {
  if (!message.TopicArn || message.TopicArn !== expectedTopicArn()) {
    throw new Error("SNS topic ARN is not allowed.");
  }
  if (!message.SigningCertURL || !isAllowedSigningCertificateUrl(message.SigningCertURL)) {
    throw new Error("SNS signing certificate URL is not allowed.");
  }
  if (!message.Signature || !message.SignatureVersion) {
    throw new Error("SNS signature metadata is missing.");
  }

  const algorithm =
    message.SignatureVersion === "1"
      ? "RSA-SHA1"
      : message.SignatureVersion === "2"
        ? "RSA-SHA256"
        : null;
  if (!algorithm) {
    throw new Error(`Unsupported SNS SignatureVersion: ${message.SignatureVersion}`);
  }

  const certificate = await fetchSigningCertificate(message.SigningCertURL);
  const canonical = buildStringToSign(message);
  const verifier = crypto.createVerify(algorithm);
  verifier.update(canonical, "utf8");
  verifier.end();

  const valid = verifier.verify(certificate, message.Signature, "base64");
  if (!valid) {
    throw new Error("SNS signature verification failed.");
  }
}

export async function confirmSnsSubscription(message: SnsEnvelope): Promise<void> {
  if (message.Type !== "SubscriptionConfirmation" || !message.SubscribeURL) {
    throw new Error("SNS subscription confirmation URL is missing.");
  }
  if (!isAllowedAwsSnsUrl(message.SubscribeURL)) {
    throw new Error("SNS subscription confirmation URL is not allowed.");
  }

  if (process.env.SNS_AUTO_CONFIRM_SUBSCRIPTIONS !== "true") {
    throw new Error(
      "SNS subscription is valid but auto-confirmation is disabled. Set SNS_AUTO_CONFIRM_SUBSCRIPTIONS=true temporarily to confirm the HTTPS subscription."
    );
  }

  const response = await fetch(message.SubscribeURL, {
    method: "GET",
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`SNS subscription confirmation failed (${response.status}).`);
  }
}
