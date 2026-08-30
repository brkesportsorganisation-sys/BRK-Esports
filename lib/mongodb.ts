import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(uri && uri.startsWith('mongodb') && !uri.includes('<db_username>'));
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR.
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  }

  try {
    return await clientPromise;
  } catch (err) {
    console.error('[MongoDB Connection Error]:', err);
    return null;
  }
}

export async function getWhatsAppDb(): Promise<Db | null> {
  const mongoClient = await getMongoClient();
  if (!mongoClient) return null;
  // Use database named 'whatsapp_automation'
  return mongoClient.db('whatsapp_automation');
}

/**
 * Direct access to collections
 */
export async function getWhatsAppCollections() {
  const db = await getWhatsAppDb();
  if (!db) return null;

  return {
    schedules: db.collection('schedules'),
    groups: db.collection('groups'),
    logs: db.collection('logs'),
    settings: db.collection('settings'),
    forwarder: db.collection('forwarder'),
    bot: db.collection('bot'),
    sessions: db.collection('sessions'),
  };
}
