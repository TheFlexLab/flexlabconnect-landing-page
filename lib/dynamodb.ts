import {
  AttributeValue,
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

export type DynamoItem = Record<string, AttributeValue>;

function getRegion(): string {
  return process.env.SES_REGION?.trim() || "us-east-2";
}

function getDynamoClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: getRegion(),
  });
}

/**
 * DynamoDB table used for:
 * - recipient eligibility
 * - unsubscribe state
 * - bounce state
 * - complaint state
 * - SES event audit records
 */
export function getEmailTableName(): string {
  return (
    process.env.DYNAMODB_EMAIL_TABLE?.trim() ||
    "flexlabconnect-email-policy"
  );
}

/**
 * Confirms that the email policy table exists.
 *
 * If DYNAMODB_AUTO_CREATE=true is configured, the application can
 * automatically create the table if it does not exist.
 *
 * For production, it is generally better to create the table once
 * through AWS/IaC and leave DYNAMODB_AUTO_CREATE disabled.
 */
export async function ensureEmailPolicyTable(): Promise<void> {
  const client = getDynamoClient();
  const tableName = getEmailTableName();

  try {
    await client.send(
      new DescribeTableCommand({
        TableName: tableName,
      })
    );

    return;
  } catch (error) {
    if (process.env.DYNAMODB_AUTO_CREATE !== "true") {
      throw error;
    }
  }

  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,

        BillingMode: "PAY_PER_REQUEST",

        AttributeDefinitions: [
          {
            AttributeName: "pk",
            AttributeType: "S",
          },
        ],

        KeySchema: [
          {
            AttributeName: "pk",
            KeyType: "HASH",
          },
        ],
      })
    );
  } catch (error) {
    /**
     * Multiple requests could theoretically attempt to create the
     * table simultaneously.
     *
     * If another invocation already created it, the polling below
     * will detect the table normally.
     */
    console.warn("[dynamodb] CreateTable attempt returned an error", {
      tableName,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const startedAt = Date.now();
  const timeoutMs = 60_000;

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const result = await client.send(
        new DescribeTableCommand({
          TableName: tableName,
        })
      );

      if (result.Table?.TableStatus === "ACTIVE") {
        return;
      }
    } catch {
      // Table may still be propagating. Retry until timeout.
    }
  }

  throw new Error(
    `DynamoDB table ${tableName} did not become ACTIVE within 60 seconds.`
  );
}

/**
 * Reads a single DynamoDB item using its primary key.
 */
export async function getItem(pk: string): Promise<DynamoItem | null> {
  await ensureEmailPolicyTable();

  const client = getDynamoClient();

  const result = await client.send(
    new GetItemCommand({
      TableName: getEmailTableName(),

      Key: {
        pk: {
          S: pk,
        },
      },

      ConsistentRead: true,
    })
  );

  return (result.Item as DynamoItem | undefined) || null;
}

/**
 * Writes/replaces an item in the email-policy DynamoDB table.
 */
export async function putItem(item: DynamoItem): Promise<void> {
  await ensureEmailPolicyTable();

  const client = getDynamoClient();

  await client.send(
    new PutItemCommand({
      TableName: getEmailTableName(),
      Item: item,
    })
  );
}

/**
 * Safely extracts a string attribute from a DynamoDB item.
 */
export function attrString(
  item: DynamoItem | null,
  key: string
): string | null {
  const value = item?.[key];

  if (!value || !("S" in value)) {
    return null;
  }

  return value.S || null;
}

/**
 * Safely extracts a boolean attribute from a DynamoDB item.
 */
export function attrBool(
  item: DynamoItem | null,
  key: string
): boolean {
  const value = item?.[key];

  if (!value || !("BOOL" in value)) {
    return false;
  }

  return Boolean(value.BOOL);
}