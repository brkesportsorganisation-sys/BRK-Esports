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
  mongoose.model('BaileysSession', SessionSchema);

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
  async function saveCreds() {
    await Session.findOneAndUpdate(
      { _id: 'creds' },
      { _id: 'creds', data: serialize(creds) },
      { upsert: true, new: true }
    );
  }

  const keys = {
    get: async (type, ids) => {
      const result = {};
      await Promise.all(
        ids.map(async (id) => {
          const doc = await Session.findById(docId(type, id)).lean();
          if (doc?.data) {
            let value = deserialize(doc.data);
            // Signal-specific: pre-key objects need the type hint
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            result[id] = value;
          }
        })
      );
      return result;
    },

    set: async (data) => {
      const ops = [];
      for (const [type, ids] of Object.entries(data)) {
        for (const [id, value] of Object.entries(ids || {})) {
          const _id = docId(type, id);
          if (value) {
            ops.push(
              Session.findOneAndUpdate(
                { _id },
                { _id, data: serialize(value) },
                { upsert: true }
              )
            );
          } else {
            // null value means delete the key
            ops.push(Session.deleteOne({ _id }));
          }
        }
      }
      await Promise.all(ops);
    },
  };

  return {
    state: { creds, keys },
    saveCreds,
  };
}

module.exports = { useMongoAuthState };
