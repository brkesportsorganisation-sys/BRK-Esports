import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let lastFailureTime = 0;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  if (!uri || !uri.startsWith('mongodb') || uri.includes('<db_username>')) {
    return false;
  }
  // If failed recently within 30 seconds, temporarily treat as not configured to prevent request lag
  if (Date.now() - lastFailureTime < 30000) {
    return false;
  }
  return true;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      if (!clientPromise) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
      }
    }

    const connectedClient = await clientPromise;
    return connectedClient;
  } catch (err: any) {
    console.warn('[MongoDB Connection Failed - Using Supabase Fallback]:', err?.message || err);
    lastFailureTime = Date.now();
    global._mongoClientPromise = undefined;
    clientPromise = null;
    client = null;
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
