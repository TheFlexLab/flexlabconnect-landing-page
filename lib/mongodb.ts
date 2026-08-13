import { MongoClient, type Collection, type Db, type Document } from "mongodb";

type MongoGlobal = typeof globalThis & {
  __flexlabMongoClientPromise?: Promise<MongoClient>;
  __flexlabMongoIndexesReady?: Promise<void>;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getDatabaseName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || "flexlabconnect";
}

export function getRecipientsCollectionName(): string {
  return process.env.MONGODB_RECIPIENTS_COLLECTION?.trim() || "email_recipients";
}

export function getEventsCollectionName(): string {
  return process.env.MONGODB_EVENTS_COLLECTION?.trim() || "email_events";
}

function getMongoClientPromise(): Promise<MongoClient> {
  const globalMongo = globalThis as MongoGlobal;

  if (!globalMongo.__flexlabMongoClientPromise) {
    const uri = requiredEnv("MONGODB_URI");
    const client = new MongoClient(uri, {
      appName: "flexlabconnect-ses",
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10_000,
    });

    globalMongo.__flexlabMongoClientPromise = client.connect().catch((error) => {
      delete globalMongo.__flexlabMongoClientPromise;
      throw error;
    });
  }

  return globalMongo.__flexlabMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db(getDatabaseName());
}

export async function getRecipientsCollection<T extends Document = Document>(): Promise<Collection<T>> {
  const db = await getMongoDb();
  await ensureMongoIndexes(db);
  return db.collection<T>(getRecipientsCollectionName());
}

export async function getEventsCollection<T extends Document = Document>(): Promise<Collection<T>> {
  const db = await getMongoDb();
  await ensureMongoIndexes(db);
  return db.collection<T>(getEventsCollectionName());
}

async function ensureMongoIndexes(db: Db): Promise<void> {
  const globalMongo = globalThis as MongoGlobal;
  if (!globalMongo.__flexlabMongoIndexesReady) {
    globalMongo.__flexlabMongoIndexesReady = (async () => {
      const recipients = db.collection(getRecipientsCollectionName());
      const events = db.collection(getEventsCollectionName());

      await Promise.all([
        recipients.createIndex({ email: 1 }, { unique: true, name: "uniq_email" }),
        recipients.createIndex({ source: 1 }, { name: "source_idx" }),
        recipients.createIndex({ unsubscribed: 1, bounced: 1, complained: 1 }, { name: "suppression_idx" }),
        events.createIndex({ eventKey: 1 }, { unique: true, name: "uniq_event_key" }),
        events.createIndex({ createdAt: -1 }, { name: "created_at_idx" }),
        events.createIndex({ email: 1, createdAt: -1 }, { name: "email_events_idx", sparse: true }),
      ]);
    })().catch((error) => {
      delete globalMongo.__flexlabMongoIndexesReady;
      throw error;
    });
  }

  await globalMongo.__flexlabMongoIndexesReady;
}
