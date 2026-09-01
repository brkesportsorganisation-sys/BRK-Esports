/**
 * useMongoAuthState — Baileys auth state backed by MongoDB.
 *
 * Replaces `useMultiFileAuthState` so that the WhatsApp session
 * survives Render container restarts without needing a re-scan.
 *
 * Data layout in MongoDB `sessions` collection:
 *   { _id: 'creds',        data: '<JSON string of creds>' }
 *   { _id: 'key-preKey-0', data: '<JSON string>' }
 *   … one document per key type+id pair
 */

const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const mongoose = require('mongoose');

// ─── Mongoose model (inline so this file is self-contained) ──────────────────
const SessionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    data: { type: String, required: true },
  },
  { _id: false }
);
const Session =
  mongoose.models.BaileysSession ||
  mongoose.model('BaileysSession', SessionSchema, 'baileyssessions');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function docId(type, id) {
  return `key-${type}-${id}`;
}

function serialize(data) {
  return JSON.stringify(data, BufferJSON.replacer);
}

function deserialize(raw) {
  return JSON.parse(raw, BufferJSON.reviver);
}

// ─── Main export ─────────────────────────────────────────────────────────────
async function useMongoAuthState() {
  // Load credentials from MongoDB
  async function readCreds() {
    const doc = await Session.findById('creds').lean();
    if (doc?.data) {
      try {
        return deserialize(doc.data);
      } catch {
        return null;
      }
    }
    return null;
  }

  let creds = (await readCreds()) || initAuthCreds();

  // Persist credentials immediately on every update
  async function saveCreds(updatedCreds) {
    if (updatedCreds) {
      Object.assign(creds, updatedCreds);
    }
    await Session.findOneAndUpdate(
      { _id: 'creds' },
      { _id: 'creds', data: serialize(creds) },
      { upsert: true, new: true }
    );
  }

  const keyCache = new Map();

  const keys = {
    get: async (type, ids) => {
      const result = {};
      const missingIds = [];

      for (const id of ids) {
        const cacheKey = docId(type, id);
        if (keyCache.has(cacheKey)) {
          result[id] = keyCache.get(cacheKey);
        } else {
          missingIds.push(id);
        }
      }

      if (missingIds.length > 0) {
        await Promise.all(
          missingIds.map(async (id) => {
            const cacheKey = docId(type, id);
            const doc = await Session.findById(cacheKey).lean();
            if (doc?.data) {
              try {
                let value = deserialize(doc.data);
                if (type === 'app-state-sync-key' && value) {
                  value = proto.Message.AppStateSyncKeyData.fromObject(value);
                }
                keyCache.set(cacheKey, value);
                result[id] = value;
              } catch (e) {
                // Ignore corrupt key
              }
            }
          })
        );
      }
      return result;
    },

    set: async (data) => {
      const bulkOps = [];
      for (const [type, ids] of Object.entries(data)) {
        for (const [id, value] of Object.entries(ids || {})) {
          const _id = docId(type, id);
          if (value) {
            keyCache.set(_id, value);
            bulkOps.push({
              updateOne: {
                filter: { _id },
                update: { $set: { data: serialize(value) } },
                upsert: true,
              },
            });
          } else {
            keyCache.delete(_id);
            bulkOps.push({
              deleteOne: {
                filter: { _id },
              },
            });
          }
        }
      }
      if (bulkOps.length > 0) {
        try {
          await Session.bulkWrite(bulkOps, { ordered: false });
        } catch (err) {
          // Ignore duplicate upsert race conditions
        }
      }
    },
  };

  return {
    state: { creds, keys },
    saveCreds,
  };
}

module.exports = { useMongoAuthState };
