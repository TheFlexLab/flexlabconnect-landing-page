import crypto from "crypto";

type DynamoAttribute =
  | { S: string }
  | { N: string }
  | { BOOL: boolean }
  | { NULL: boolean };

export type DynamoItem = Record<string, DynamoAttribute>;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function amzDates(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

async function dynamoRequest<T>(target: string, body: unknown): Promise<T> {
  const region = process.env.AWS_REGION?.trim() || "us-east-2";
  const accessKey = requiredEnv("AWS_ACCESS_KEY_ID");
  const secretKey = requiredEnv("AWS_SECRET_ACCESS_KEY");
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
  const host = `dynamodb.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const payload = JSON.stringify(body);
  const { amzDate, dateStamp } = amzDates();

  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-date": amzDate,
    "x-amz-target": `DynamoDB_20120810.${target}`,
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  // `host` must be part of the SigV4 canonical request. The HTTP client adds
  // the actual Host header automatically, so we sign it without forcing a
  // forbidden/implementation-specific Host header through fetch().
  const signingHeaders: Record<string, string> = { ...headers, host };
  const signedHeaderNames = Object.keys(signingHeaders).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${signingHeaders[name].trim()}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256(payload),
  ].join("\n");

  const service = "dynamodb";
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: payload,
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.message || data?.Message || text || response.statusText;
    throw new Error(`DynamoDB ${target} failed: ${message}`);
  }
  return data as T;
}

export function getEmailTableName(): string {
  return process.env.DYNAMODB_EMAIL_TABLE?.trim() || "flexlabconnect-email-policy";
}

export async function ensureEmailPolicyTable(): Promise<void> {
  const tableName = getEmailTableName();
  try {
    await dynamoRequest("DescribeTable", { TableName: tableName });
    return;
  } catch (error) {
    if (process.env.DYNAMODB_AUTO_CREATE !== "true") throw error;
  }

  await dynamoRequest("CreateTable", {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
  });

  const started = Date.now();
  while (Date.now() - started < 60_000) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const result = await dynamoRequest<{ Table?: { TableStatus?: string } }>(
        "DescribeTable",
        { TableName: tableName }
      );
      if (result.Table?.TableStatus === "ACTIVE") return;
    } catch {
      // Retry while table is being created.
    }
  }
  throw new Error(`DynamoDB table ${tableName} did not become ACTIVE in time.`);
}

export async function getItem(pk: string): Promise<DynamoItem | null> {
  await ensureEmailPolicyTable();
  const result = await dynamoRequest<{ Item?: DynamoItem }>("GetItem", {
    TableName: getEmailTableName(),
    Key: { pk: { S: pk } },
    ConsistentRead: true,
  });
  return result.Item || null;
}

export async function putItem(item: DynamoItem): Promise<void> {
  await ensureEmailPolicyTable();
  await dynamoRequest("PutItem", {
    TableName: getEmailTableName(),
    Item: item,
  });
}

export function attrString(item: DynamoItem | null, key: string): string | null {
  const value = item?.[key];
  return value && "S" in value ? value.S : null;
}

export function attrBool(item: DynamoItem | null, key: string): boolean {
  const value = item?.[key];
  return Boolean(value && "BOOL" in value && value.BOOL);
}
