import crypto from "crypto";

const DEFAULT_REGION = "us-east-2";
const DEFAULT_FROM_EMAIL = "contact@flexlabconnect.com";
const DEFAULT_FROM_NAME = "FlexLab";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string, encoding?: crypto.BinaryToTextEncoding): Buffer | string {
  const result = crypto.createHmac("sha256", key).update(value, "utf8");
  return encoding ? result.digest(encoding) : result.digest();
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp) as Buffer;
  const kRegion = hmac(kDate, region) as Buffer;
  const kService = hmac(kRegion, "ses") as Buffer;
  return hmac(kService, "aws4_request") as Buffer;
}

function getCredentials() {
  const accessKeyId = process.env.SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;
  const sessionToken = process.env.SES_SESSION_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("SES credentials are not configured. Set SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY.");
  }

  return { accessKeyId, secretAccessKey, sessionToken };
}

export async function sendSesEmail(input: {
  to: string;
  subject: string;
  message: string;
}): Promise<{ messageId: string }> {
  const region = process.env.SES_REGION || DEFAULT_REGION;
  const fromEmail = process.env.SES_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const fromName = process.env.SES_FROM_NAME || DEFAULT_FROM_NAME;
  const replyTo = process.env.SES_REPLY_TO || fromEmail;
  const { accessKeyId, secretAccessKey, sessionToken } = getCredentials();

  const host = `email.${region}.amazonaws.com`;
  const path = "/v2/email/outbound-emails";
  const endpoint = `https://${host}${path}`;

  const body = JSON.stringify({
    FromEmailAddress: `${fromName} <${fromEmail}>`,
    Destination: { ToAddresses: [input.to] },
    ReplyToAddresses: [replyTo],
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: input.message, Charset: "UTF-8" },
        },
      },
    },
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);

  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    ...(sessionToken ? [`x-amz-security-token:${sessionToken}`] : []),
  ].join("\n") + "\n";

  const signedHeaders = [
    "content-type",
    "host",
    "x-amz-date",
    ...(sessionToken ? ["x-amz-security-token"] : []),
  ].join(";");

  const canonicalRequest = [
    "POST",
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region);
  const signature = hmac(signingKey, stringToSign, "hex") as string;
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-amz-date": amzDate,
      authorization,
      ...(sessionToken ? { "x-amz-security-token": sessionToken } : {}),
    },
    body,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as {
    MessageId?: string;
    message?: string;
    Message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || data.Message || `Amazon SES returned HTTP ${response.status}.`);
  }

  if (!data.MessageId) throw new Error("Amazon SES accepted the request but did not return a MessageId.");
  return { messageId: data.MessageId };
}
