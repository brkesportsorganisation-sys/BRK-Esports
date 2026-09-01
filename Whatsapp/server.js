require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const {
  makeWASocket,
  DisconnectReason,
  fetchLatestWaWebVersion,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const { useMongoAuthState } = require('./mongoAuthState');

const ScheduledMessage = require('./models/ScheduledMessage');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ─── CORS ────────────────────────────────────────────────────────────────────
// Allow: Vercel production, Vercel preview URLs, localhost dev
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const ADDITIONAL_ORIGINS = (process.env.ALLOWED_ORIGINS_EXTRA || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin header)
      if (!origin) return callback(null, true);
      // Allow localhost in any form
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
      // Allow configured Vercel domain
      if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) return callback(null, true);
      // Allow *.vercel.app preview URLs for the same project
      if (ALLOWED_ORIGIN && origin.endsWith('.vercel.app')) {
        const baseDomain = ALLOWED_ORIGIN.replace('https://', '').split('.')[0];
        if (origin.includes(baseDomain)) return callback(null, true);
      }
      // Allow extra origins
      if (ADDITIONAL_ORIGINS.includes(origin)) return callback(null, true);
      // If no whitelist configured at all, allow everything (dev mode)
      if (!ALLOWED_ORIGIN && ADDITIONAL_ORIGINS.length === 0) return callback(null, true);
      callback(new Error(`CORS: Origin not allowed — ${origin}`));
    },
    credentials: true,
  })
);

// ─── ENV ──────────────────────────────────────────────────────────────────────
const TARGET_GROUPS = (process.env.TARGET_GROUPS || '')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

const SOURCE_CHANNEL_JID = process.env.SOURCE_CHANNEL_JID;
const API_SECRET = process.env.API_SECRET || 'blackrock_secret_bot_key_2026';

// ─── State ────────────────────────────────────────────────────────────────────
let sock;
let isConnected = false;
let reconnectAttempts = 0;
let connectedGroups = []; // Cache of groups after connect
let connectedChannels = []; // Cache of channels after connect
const recentForwardedMsgIds = new Map(); // Anti-duplicate deduplication map (id -> timestamp)

// ─── Persistent Store for Baileys Signal Key Exchanges & Retry Handshakes ─────
// Fixes "Waiting for this message. This may take a while."
const messageStore = new Map();
const msgRetryCounterCache = new Map();

async function storeMessage(id, message) {
  if (!id || !message) return;
  messageStore.set(id, message);
  if (messageStore.size > 3000) {
    const firstKey = messageStore.keys().next().value;
    messageStore.delete(firstKey);
  }
  try {
    if (mongoose.connection && mongoose.connection.db) {
      await mongoose.connection.db.collection('whatsapp_message_store').updateOne(
        { _id: id },
        { $set: { message: JSON.stringify(message), createdAt: new Date() } },
        { upsert: true }
      );
    }
  } catch (e) {}
}

async function getStoredMessage(key) {
  if (!key?.id) return undefined;
  if (messageStore.has(key.id)) {
    return messageStore.get(key.id);
  }
  try {
    if (mongoose.connection && mongoose.connection.db) {
      const doc = await mongoose.connection.db.collection('whatsapp_message_store').findOne({ _id: key.id });
      if (doc?.message) {
        const parsed = JSON.parse(doc.message);
        messageStore.set(key.id, parsed);
        return parsed;
      }
    }
  } catch (e) {}
  return undefined;
}

async function sendWaMessage(jid, content, options = {}, attempt = 1) {
  if (!sock) throw new Error('WhatsApp socket not initialized');
  try {
    const result = await sock.sendMessage(jid, content, options);
    if (result?.key?.id && result?.message) {
      await storeMessage(result.key.id, result.message);
    }
    return result;
  } catch (err) {
    if (attempt < 2) {
      console.warn(`⚠️ [sendWaMessage] Attempt ${attempt} failed for ${jid} (${err.message}). Retrying in 1.2s...`);
      await new Promise((r) => setTimeout(r, 1200));
      return sendWaMessage(jid, content, options, attempt + 1);
    }
    throw err;
  }
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireApiSecret(req, res, next) {
  const provided = req.headers['x-api-secret'];
  if (!API_SECRET || provided !== API_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// ─── WhatsApp Connection ──────────────────────────────────────────────────────
async function connectToWhatsApp() {
  const { version } = await fetchLatestWaWebVersion();
  console.log('🔄 Loading WhatsApp session from MongoDB...');
  const { state, saveCreds } = await useMongoAuthState();
  console.log('✅ Session loaded. Creds present:', !!state?.creds?.me);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    browser: ['Blackrock Esports (Windows)', 'Chrome', '124.0.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    msgRetryCounterCache,
    getMessage: getStoredMessage,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Scan this QR code with WhatsApp (Linked Devices):');
      qrcode.generate(qr, { small: true });
      app.locals.latestQr = qr;
    }

    if (connection === 'close') {
      isConnected = false;
      app.locals.latestQr = null;
      connectedGroups = [];
      connectedChannels = [];
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.log('❌ Logged out from WhatsApp. Re-scan QR code from Admin Panel.');
        return;
      }

      reconnectAttempts += 1;
      const delay = Math.min(reconnectAttempts * 3000, 30000);
      console.log(`⚠️ Connection closed. Reconnecting in ${delay / 1000}s...`);
      setTimeout(connectToWhatsApp, delay);
    } else if (connection === 'open') {
      console.log('✅ WhatsApp successfully connected!');
      isConnected = true;
      reconnectAttempts = 0;
      app.locals.latestQr = null;

      // Auto-fetch groups & channels on connect
      try {
        await refreshGroupsCache();
        await refreshChannelsCache();
        console.log(`📋 Cached ${connectedGroups.length} group(s) and ${connectedChannels.length} channel(s).`);
      } catch (err) {
        console.warn('⚠️ Could not prefetch groups/channels:', err.message);
      }
    }
  });

  // ─── Dynamic Forwarder Config Loader from Memory / MongoDB / Next.js ─────
  let inMemoryForwarderConfig = null;
  async function getDynamicForwarderConfig() {
    if (inMemoryForwarderConfig) return inMemoryForwarderConfig;
    try {
      if (mongoose.connection && mongoose.connection.db) {
        const doc = await mongoose.connection.db.collection('whatsapp_forwarder').findOne({ _id: 'forwarder_config' });
        if (doc) {
          inMemoryForwarderConfig = doc;
          return doc;
        }
      }
    } catch (e) {}
    return null;
  }

  // ─── Helper: Log forward action to MongoDB ────────────────────────────────
  async function logForwardToDb(targetJid, groupName, text, status = 'SENT', error = null) {
    try {
      if (mongoose.connection && mongoose.connection.db) {
        await mongoose.connection.db.collection('whatsapp_logs').insertOne({
          id: `log_fwd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          targetDestination: targetJid,
          targetName: groupName || targetJid,
          messageText: text,
          triggerType: 'CHANNEL_FORWARD',
          status,
          error: error || undefined,
          sentAt: new Date().toISOString(),
        });
      }
    } catch (e) {}
  }

  // ─── Channel & Newsletter Auto-Forwarder Listener ─────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of (messages || [])) {
      if (!msg || !msg.message) continue;
      if (msg.key?.id) {
        storeMessage(msg.key.id, msg.message);
      }

      const jid = msg.key?.remoteJid || '';
      const isNewsletter = jid.endsWith('@newsletter') || jid.endsWith('@broadcast') || jid.includes('newsletter');

      // Auto-cache discovered newsletter into channels cache & MongoDB
      if (isNewsletter) {
        let detectedName = msg.pushName || 'WhatsApp Channel';
        if (msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.title) {
          detectedName = msg.message.extendedTextMessage.contextInfo.externalAdReply.title;
        }
        await saveChannelToDb(jid, detectedName);
      }

      // Ignore regular chats fromMe, but ALLOW channel (@newsletter) messages even if fromMe!
      if (msg.key?.fromMe && !isNewsletter) continue;

      const configuredChannel = (forwarderConfig?.sourceChannelId || SOURCE_CHANNEL_JID || '').trim();
      const channelInviteCode = configuredChannel.includes('whatsapp.com/channel/')
        ? configuredChannel.split('whatsapp.com/channel/')[1]?.split(/[\?\/]/)[0]?.replace(/[^a-zA-Z0-9]/g, '')
        : '';

      // Match check
      let isMatch = false;
      if (!configuredChannel || configuredChannel === '*' || configuredChannel.toLowerCase() === 'all') {
        isMatch = isNewsletter;
      } else if (jid === configuredChannel || jid.includes(configuredChannel) || configuredChannel.includes(jid)) {
        isMatch = true;
      } else if (channelInviteCode && jid.includes(channelInviteCode)) {
        isMatch = true;
      } else if (isNewsletter) {
        // If user provided channel name, match against it or treat as channel
        if (forwarderConfig?.sourceChannelName && forwarderConfig.sourceChannelName !== 'WhatsApp Channel') {
          isMatch = true;
        } else {
          isMatch = true;
        }
      }

      if (!isMatch) continue;

      // 3. Deduplication: Prevent double posting within 10 minutes
      const msgId = msg.key?.id || `${jid}_${Date.now()}`;
      const now = Date.now();
      if (recentForwardedMsgIds.has(msgId)) {
        continue;
      }
      recentForwardedMsgIds.set(msgId, now);

      // Clean up deduplication cache
      if (recentForwardedMsgIds.size > 200) {
        for (const [k, v] of recentForwardedMsgIds.entries()) {
          if (now - v > 600000) recentForwardedMsgIds.delete(k);
        }
      }

      // 4. Extract Text & Media from Baileys message structure
      const msgObj = msg.message;
      const textMessage =
        msgObj?.conversation ||
        msgObj?.extendedTextMessage?.text ||
        msgObj?.imageMessage?.caption ||
        msgObj?.videoMessage?.caption ||
        msgObj?.documentMessage?.caption ||
        msgObj?.viewOnceMessage?.message?.imageMessage?.caption ||
        msgObj?.viewOnceMessage?.message?.extendedTextMessage?.text ||
        msgObj?.viewOnceMessageV2?.message?.imageMessage?.caption ||
        msgObj?.newsletterEdit?.message?.conversation ||
        '';

      const isImage = !!(msgObj?.imageMessage || msgObj?.viewOnceMessage?.message?.imageMessage || msgObj?.viewOnceMessageV2?.message?.imageMessage);
      const isVideo = !!(msgObj?.videoMessage || msgObj?.viewOnceMessage?.message?.videoMessage || msgObj?.viewOnceMessageV2?.message?.videoMessage);
      const isDocument = !!msgObj?.documentMessage;

      if (!textMessage && !isImage && !isVideo && !isDocument) {
        continue;
      }

      console.log(`📢 [Channel Message Detected from ${jid}]: "${(textMessage || 'Media Update').slice(0, 80)}..."`);

      // 5. Keyword Filters
      if (forwarderConfig?.filterKeywords && forwarderConfig.filterKeywords.length > 0) {
        const hasMatch = forwarderConfig.filterKeywords.some((kw) =>
          kw.trim() && textMessage.toLowerCase().includes(kw.trim().toLowerCase())
        );
        if (!hasMatch) {
          console.log('⏭️ [Forwarder Skipped]: Keyword filter mismatch');
          continue;
        }
      }

      // Ignore filters
      if (forwarderConfig?.ignoreKeywords && forwarderConfig.ignoreKeywords.length > 0) {
        const shouldIgnore = forwarderConfig.ignoreKeywords.some((kw) =>
          kw.trim() && textMessage.toLowerCase().includes(kw.trim().toLowerCase())
        );
        if (shouldIgnore) {
          console.log('⏭️ [Forwarder Skipped]: Ignore keyword matched');
          continue;
        }
      }

      // 6. Download media buffer if present and allowed
      let mediaBuffer = null;
      let mediaType = 'text';

      if (forwarderConfig?.includeMedia !== false && (isImage || isVideo || isDocument)) {
        try {
          mediaBuffer = await downloadMediaMessage(msg, 'buffer', {});
          if (isImage) mediaType = 'image';
          else if (isVideo) mediaType = 'video';
          else if (isDocument) mediaType = 'document';
          console.log(`📥 Downloaded ${mediaType} buffer (${(mediaBuffer.length / 1024).toFixed(1)} KB)`);
        } catch (downloadErr) {
          console.warn(`⚠️ Could not download media buffer (${downloadErr.message}). Relaying text-only.`);
        }
      }

      // 7. Resolve Target Groups
      let targets = [];
      if (
        forwarderConfig?.targetGroupMode === 'SELECTED_GROUPS' &&
        Array.isArray(forwarderConfig.targetGroupIds) &&
        forwarderConfig.targetGroupIds.length > 0
      ) {
        targets = forwarderConfig.targetGroupIds;
      } else {
        if (connectedGroups.length === 0) {
          await refreshGroupsCache();
        }
        targets = connectedGroups.length > 0 ? connectedGroups.map((g) => g.id) : TARGET_GROUPS;
      }

      // Sanitize group JIDs
      targets = targets
        .map((t) => (typeof t === 'string' && t.includes('_g_us') ? t.replace(/^grp_(waapi_)?/, '').replace('_g_us', '@g.us') : t))
        .filter((t) => typeof t === 'string' && t !== jid && t.endsWith('@g.us'));

      if (targets.length === 0) {
        console.warn('⚠️ No valid target groups for channel forwarding. Re-syncing groups...');
        await refreshGroupsCache();
        targets = connectedGroups.map((g) => g.id).filter((t) => t !== jid && t.endsWith('@g.us'));
      }

      if (targets.length === 0) {
        console.warn('❌ Still no target groups available. Forward cancelled.');
        continue;
      }

      // 8. Format Final Broadcast Message with Prefix & Footer
      const prefix = forwarderConfig?.prefixHeader !== undefined ? forwarderConfig.prefixHeader : '📢 *[অফিশিয়াল চ্যানেল আপডেট]*\n\n';
      const footer = forwarderConfig?.appendFooter || '';
      const finalMsg = `${prefix ? prefix : ''}${textMessage}${footer ? `\n\n${footer}` : ''}`.trim();

      console.log(`🚀 Relaying channel update to ${targets.length} group(s)...`);

      // 9. Dispatch to all Target Groups with throttle
      for (const groupJid of targets) {
        try {
          const matchedGroup = connectedGroups.find((g) => g.id === groupJid);
          const groupName = matchedGroup?.name || groupJid;

          if (mediaBuffer && mediaType === 'image') {
            await sendWaMessage(groupJid, {
              image: mediaBuffer,
              caption: finalMsg,
            });
          } else if (mediaBuffer && mediaType === 'video') {
            await sendWaMessage(groupJid, {
              video: mediaBuffer,
              caption: finalMsg,
            });
          } else if (mediaBuffer && mediaType === 'document') {
            await sendWaMessage(groupJid, {
              document: mediaBuffer,
              caption: finalMsg,
              mimetype: msgObj?.documentMessage?.mimetype || 'application/pdf',
              fileName: msgObj?.documentMessage?.fileName || 'document.pdf',
            });
          } else {
            await sendWaMessage(groupJid, { text: finalMsg });
          }

          console.log(`✅ [Auto-Forwarded to ${groupName} (${groupJid})]`);
          await logForwardToDb(groupJid, groupName, finalMsg, 'SENT');
        } catch (err) {
          console.error(`❌ [Forward Failed to ${groupJid}]:`, err.message);
          await logForwardToDb(groupJid, groupJid, finalMsg, 'FAILED', err.message);
        }
        await new Promise((res) => setTimeout(res, 1600));
      }
    }
  });

}

// ─── Helper: Refresh Groups Cache ────────────────────────────────────────────
async function refreshGroupsCache() {
  if (!sock || !isConnected) return;

  const participatingGroups = await sock.groupFetchAllParticipating();
  connectedGroups = Object.values(participatingGroups).map((g) => ({
    id: g.id,
    name: g.subject || 'WhatsApp Group',
    participants: g.participants?.length || 0,
  }));

  return connectedGroups;
}

// ─── Channels Cache & MongoDB Persistence ────────────────────────────────────
async function loadChannelsFromDb() {
  try {
    if (mongoose.connection && mongoose.connection.db) {
      const list = await mongoose.connection.db.collection('whatsapp_channels').find({}).toArray();
      if (list && list.length > 0) {
        for (const c of list) {
          const id = c._id || c.id;
          if (id && !connectedChannels.find((x) => x.id === id)) {
            connectedChannels.push({
              id,
              name: c.name || 'WhatsApp Channel',
              discoveredAt: c.discoveredAt || new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (e) {}
}

async function saveChannelToDb(id, name) {
  try {
    if (!id) return;
    const existing = connectedChannels.find((c) => c.id === id);
    if (!existing) {
      connectedChannels.push({ id, name: name || 'WhatsApp Channel', discoveredAt: new Date().toISOString() });
    } else if (name && name !== 'WhatsApp Channel' && existing.name === 'WhatsApp Channel') {
      existing.name = name;
    }
    if (mongoose.connection && mongoose.connection.db) {
      await mongoose.connection.db.collection('whatsapp_channels').updateOne(
        { _id: id },
        {
          $set: { _id: id, id, name: name || 'WhatsApp Channel', updatedAt: new Date().toISOString() },
          $setOnInsert: { discoveredAt: new Date().toISOString() },
        },
        { upsert: true }
      );
    }
  } catch (e) {}
}

async function refreshChannelsCache() {
  if (!sock || !isConnected) return connectedChannels;
  try {
    if (typeof sock.newsletterSubscribed === 'function') {
      const list = await sock.newsletterSubscribed();
      if (Array.isArray(list)) {
        for (const item of list) {
          const jid = item.id || item.jid;
          const name = item.name || item.subject || item.thread_metadata?.name?.text || 'WhatsApp Channel';
          if (jid) {
            await saveChannelToDb(jid, name);
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ newsletterSubscribed check:', e.message);
  }
  await loadChannelsFromDb();
  return connectedChannels;
}

// ─── Scheduled Message Cron (every minute) ───────────────────────────────────
function calculateServerNextRunTime(schedule) {
  const now = new Date();
  const nowMs = now.getTime();

  if (schedule.frequency === 'ONCE') {
    return null;
  }

  if (schedule.frequency === 'DAILY') {
    const timeStr = schedule.scheduledTime || '20:00';
    const [targetH, targetM] = timeStr.split(':').map(Number);
    const bdTimeMs = nowMs + 6 * 60 * 60 * 1000;
    const bdDateObj = new Date(bdTimeMs);

    const bdYear = bdDateObj.getUTCFullYear();
    const bdMonth = bdDateObj.getUTCMonth();
    const bdDate = bdDateObj.getUTCDate();
    const bdHours = bdDateObj.getUTCHours();
    const bdMinutes = bdDateObj.getUTCMinutes();

    let targetBdDate = new Date(Date.UTC(bdYear, bdMonth, bdDate, targetH || 0, targetM || 0, 0, 0));
    const currentBdDate = new Date(Date.UTC(bdYear, bdMonth, bdDate, bdHours, bdMinutes, 0, 0));

    if (targetBdDate.getTime() <= currentBdDate.getTime()) {
      targetBdDate.setUTCDate(targetBdDate.getUTCDate() + 1);
    }

    const nextUtcMs = targetBdDate.getTime() - 6 * 60 * 60 * 1000;
    return new Date(nextUtcMs).toISOString();
  }

  let intervalMs = 60 * 1000;
  switch (schedule.frequency) {
    case 'EVERY_1_MIN': intervalMs = 1 * 60 * 1000; break;
    case 'EVERY_2_MIN': intervalMs = 2 * 60 * 1000; break;
    case 'EVERY_5_MIN': intervalMs = 5 * 60 * 1000; break;
    case 'EVERY_10_MIN': intervalMs = 10 * 60 * 1000; break;
    case 'EVERY_15_MIN': intervalMs = 15 * 60 * 1000; break;
    case 'EVERY_30_MIN': intervalMs = 30 * 60 * 1000; break;
    case 'EVERY_1_HOUR': intervalMs = 60 * 60 * 1000; break;
    case 'EVERY_2_HOURS': intervalMs = 120 * 60 * 1000; break;
    case 'EVERY_6_HOURS': intervalMs = 360 * 60 * 1000; break;
    case 'EVERY_12_HOURS': intervalMs = 720 * 60 * 1000; break;
    case 'INTERVAL_MINUTES': intervalMs = Math.max(1, Number(schedule.intervalMinutes) || 60) * 60 * 1000; break;
    default: intervalMs = 60 * 60 * 1000;
  }

  return new Date(nowMs + intervalMs).toISOString();
}

cron.schedule('* * * * *', async () => {
  if (!isConnected || !sock) return;

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Direct MongoDB whatsapp_schedules Execution (Accurate 24/7 Engine)
  try {
    if (mongoose.connection && mongoose.connection.db) {
      const schedulesCol = mongoose.connection.db.collection('whatsapp_schedules');
      const dueSchedules = await schedulesCol.find({
        $or: [{ status: 'ACTIVE' }, { isActive: true }],
        nextRunAt: { $lte: nowIso },
      }).toArray();

      for (const sched of dueSchedules) {
        try {
          const currentRuns = sched.runCount || 0;
          const maxRuns = sched.maxExecutions || 0;
          const executionNum = currentRuns + 1;

          if (maxRuns > 0 && currentRuns >= maxRuns) {
            await schedulesCol.updateOne({ _id: sched._id }, { $set: { status: 'COMPLETED', isActive: false } });
            continue;
          }

          // Resolve destinations
          let groupTargets = [];
          const dest = sched.targetDestination || '';
          if (dest === 'ALL_GROUPS') {
            if (connectedGroups.length === 0) await refreshGroupsCache();
            groupTargets = connectedGroups.map(g => g.id);
          } else if (dest.includes(',') || dest.includes(';') || dest.includes('\n')) {
            const rawIds = dest.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
            for (const rId of rawIds) {
              const jid = await resolveWhatsAppJid(rId, sock);
              if (jid && !groupTargets.includes(jid)) groupTargets.push(jid);
            }
          } else {
            const jid = await resolveWhatsAppJid(dest, sock);
            if (jid) groupTargets.push(jid);
          }

          if (groupTargets.length === 0) {
            console.warn(`⚠️ [Cron Schedule ${sched.title || sched._id}] No valid group JIDs found. Skipping.`);
            continue;
          }

          // Format message
          let rawTemplate = sched.messageTemplate || '';
          if (Array.isArray(sched.messagesSequence) && sched.messagesSequence.length > 0) {
            const seqIdx = currentRuns % sched.messagesSequence.length;
            rawTemplate = sched.messagesSequence[seqIdx] || sched.messageTemplate;
          }

          const nowTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const nowDateStr = now.toLocaleDateString('en-GB');
          const remainingCount = maxRuns > 0 ? Math.max(0, maxRuns - executionNum) : 'Unlimited';

          const formattedMessage = rawTemplate
            .replace(/\{COUNT\}/g, String(executionNum))
            .replace(/\{MAX_COUNT\}/g, maxRuns > 0 ? String(maxRuns) : 'Unlimited')
            .replace(/\{REMAINING\}/g, String(remainingCount))
            .replace(/\{TIME\}/g, nowTimeStr)
            .replace(/\{DATE\}/g, nowDateStr)
            .replace(/\{SITE_LINK\}/g, 'https://esportszonebd.online');

          console.log(`⏰ [Direct DB Scheduler] Sending schedule "${sched.title || 'Auto Schedule'}" to ${groupTargets.length} group(s)...`);

          let sentCount = 0;
          for (let i = 0; i < groupTargets.length; i++) {
            const targetJid = groupTargets[i];
            try {
              if (sched.imageUrl && /^https?:\/\//i.test(sched.imageUrl)) {
                await sendWaMessage(targetJid, { image: { url: sched.imageUrl }, caption: formattedMessage });
              } else {
                await sendWaMessage(targetJid, { text: formattedMessage });
              }
              sentCount++;
              console.log(`✅ [Schedule Message Sent] -> ${targetJid} (${sentCount}/${groupTargets.length})`);
            } catch (sErr) {
              console.error(`❌ [Schedule Message Failed] -> ${targetJid}:`, sErr.message);
            }
            if (i < groupTargets.length - 1) {
              await new Promise(r => setTimeout(r, 1800));
            }
          }

          const isDone = (sched.frequency === 'ONCE' && sentCount > 0) || (maxRuns > 0 && executionNum >= maxRuns && sentCount > 0);
          const nextRun = isDone ? undefined : calculateServerNextRunTime(sched);

          await schedulesCol.updateOne(
            { _id: sched._id },
            {
              $set: {
                runCount: sentCount > 0 ? executionNum : currentRuns,
                lastRunAt: new Date().toISOString(),
                nextRunAt: nextRun,
                lastStatus: sentCount > 0 ? 'SUCCESS' : 'FAILED',
                status: isDone ? 'COMPLETED' : (sched.status || 'ACTIVE'),
                isActive: isDone ? false : (sched.isActive !== false),
                updatedAt: new Date().toISOString(),
              }
            }
          );
        } catch (itemErr) {
          console.error(`❌ Error executing schedule ${sched._id}:`, itemErr.message);
        }
      }
    }
  } catch (mongoCronErr) {
    console.warn('⚠️ [Direct MongoDB Schedules Runner Error]:', mongoCronErr.message);
  }

  // 3. Process legacy local MongoDB queue if any
  try {
    const pendingMessages = await ScheduledMessage.find({
      sendAt: { $lte: now },
      isSent: false,
    }).limit(5);

    for (const item of pendingMessages) {
      item.isSent = true;
      await item.save();

      for (const groupJid of item.groupJids) {
        try {
          await sendWaMessage(groupJid, { text: item.message });
          console.log(`⏰ Legacy cron message sent to: ${groupJid}`);
          await new Promise((res) => setTimeout(res, 1800));
        } catch (sendErr) {
          console.error(`❌ Legacy cron send failed for ${groupJid}:`, sendErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Legacy cron error:', err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    whatsappConnected: isConnected,
    hasApiSecret: !!process.env.API_SECRET,
    groupsCached: connectedGroups.length,
    channelsCached: connectedChannels.length,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsappConnected: isConnected,
    groups: connectedGroups.length,
    channels: connectedChannels.length,
  });
});

app.get('/api/get-status', (req, res) => {
  res.json({
    success: true,
    isConnected,
    groupsCount: connectedGroups.length,
    channelsCount: connectedChannels.length,
    channels: connectedChannels,
  });
});

// ─── GET QR / Status ──────────────────────────────────────────────────────────
app.get('/api/qr', requireApiSecret, (req, res) => {
  if (isConnected) {
    return res.json({ 
      success: true, 
      status: 'CONNECTED', 
      message: 'WhatsApp is connected',
      user: sock?.user || null,
      groupsCount: connectedGroups.length
    });
  }
  if (app.locals.latestQr) {
    return res.json({ success: true, status: 'WAITING_FOR_SCAN', qr: app.locals.latestQr });
  }
  return res.json({ success: true, status: 'INITIALIZING', message: 'Waiting for QR code generation...' });
});

// ─── POST: Logout & Clear Session (Generate Fresh QR) ────────────────────────
app.post('/api/logout', requireApiSecret, async (req, res) => {
  try {
    console.log('🔄 Logout requested. Clearing MongoDB WhatsApp session...');
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
      try {
        sock.end(new Error('Admin logged out'));
      } catch (e) {}
    }

    // Clear MongoDB sessions
    const Session = mongoose.models.BaileysSession;
    if (Session) {
      await Session.deleteMany({});
      console.log('✅ Cleared all BaileysSession documents in MongoDB.');
    }

    isConnected = false;
    app.locals.latestQr = null;
    connectedGroups = [];
    connectedChannels = [];

    // Reconnect to generate a brand new QR code
    setTimeout(() => {
      connectToWhatsApp();
    }, 1500);

    res.json({
      success: true,
      message: 'Logged out successfully. Generating a new fresh QR code...',
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST: Schedule a Message ─────────────────────────────────────────────────
app.post('/api/schedule-message', requireApiSecret, async (req, res) => {
  try {
    const { message, sendAt, groupJids, imageUrl } = req.body;

    if (!message || !sendAt) {
      return res.status(400).json({ success: false, error: 'message and sendAt are required' });
    }

    const resolvedJids =
      Array.isArray(groupJids) && groupJids.length
        ? groupJids
        : TARGET_GROUPS.length > 0
        ? TARGET_GROUPS
        : connectedGroups.map((g) => g.id);

    if (resolvedJids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No target groups configured. Set TARGET_GROUPS env or sync groups first.',
      });
    }

    const sendAtDate = new Date(sendAt);
    const isImmediate = sendAtDate <= new Date(Date.now() + 10000); // within 10 seconds = send now

    if (isImmediate) {
      if (!isConnected || !sock) {
        return res.status(503).json({
          success: false,
          error: 'WhatsApp is not connected on bot server. Please scan QR code in Admin Panel.',
        });
      }

      const errors = [];
      const sentJids = [];

      for (const groupJid of resolvedJids) {
        try {
          const isValidImageUrl = imageUrl &&
            /^https?:\/\//i.test(imageUrl) &&
            !imageUrl.includes('localhost') &&
            !imageUrl.startsWith('blob:');

          if (isValidImageUrl) {
            try {
              await sendWaMessage(groupJid, { image: { url: imageUrl }, caption: message });
            } catch (imgErr) {
              console.warn(`⚠️ Group image send failed (${imgErr.message}), falling back to text: ${groupJid}`);
              await sendWaMessage(groupJid, { text: message });
            }
          } else {
            await sendWaMessage(groupJid, { text: message });
          }
          sentJids.push(groupJid);
          console.log(`✅ Message sent to group: ${groupJid}`);
          await new Promise((res) => setTimeout(res, 1500));
        } catch (err) {
          console.error(`❌ Send failed to ${groupJid}:`, err.message);
          errors.push(`${groupJid}: ${err.message}`);
        }
      }

      if (errors.length > 0 && sentJids.length === 0) {
        return res.status(500).json({
          success: false,
          error: `Failed to deliver to group(s): ${errors.join('; ')}`,
        });
      }

      return res.json({
        success: true,
        message: `Message dispatched to ${sentJids.length} group(s)${errors.length ? ` (${errors.length} failed)` : ''}`,
        sentJids,
        errors: errors.length ? errors : undefined,
      });
    }

    const newMessage = new ScheduledMessage({
      groupJids: resolvedJids,
      message,
      sendAt: sendAtDate,
    });
    await newMessage.save();
    res.json({ success: true, message: 'Message scheduled successfully in bot database!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET: List Scheduled Messages ─────────────────────────────────────────────
app.get('/api/scheduled-messages', requireApiSecret, async (req, res) => {
  const messages = await ScheduledMessage.find().sort({ sendAt: -1 }).limit(100);
  res.json({ success: true, messages });
});

// ─── POST: Send Direct Message (to individual phone or group JID) ─────────────
// ─── Helper: Resolve WhatsApp Destination to real JID ────────────────────────
async function resolveWhatsAppJid(destination, socketInstance) {
  if (!destination) return null;
  let trimmed = destination.trim();

  // If internal format like grp_120363426443362477_g_us or grp_120363426443362477
  if (trimmed.startsWith('grp_')) {
    trimmed = trimmed.replace(/^grp_(waapi_)?/, '').replace('_g_us', '@g.us');
    if (!trimmed.includes('@') && (/^\d+$/.test(trimmed) || /^\d+-\d+$/.test(trimmed))) {
      trimmed = `${trimmed}@g.us`;
    }
  }

  // 1. Direct valid WhatsApp JID
  if (
    trimmed.endsWith('@g.us') ||
    trimmed.endsWith('@s.whatsapp.net') ||
    trimmed.endsWith('@newsletter') ||
    trimmed.endsWith('@broadcast')
  ) {
    return trimmed;
  }

  // 2. Handle group invite link (e.g. https://chat.whatsapp.com/AbCdEf123456)
  if (trimmed.includes('chat.whatsapp.com/')) {
    const code = trimmed.split('chat.whatsapp.com/')[1]?.split(/[\?\/]/)[0]?.trim();
    if (code && socketInstance) {
      try {
        const info = await socketInstance.groupGetInviteInfo(code);
        if (info?.id) {
          console.log(`🔗 Resolved invite link "${code}" -> Group JID: ${info.id}`);
          return info.id;
        }
      } catch (err) {
        console.warn(`⚠️ Could not resolve group invite link (${code}):`, err.message);
      }
    }
  }

  // 3. Match against connected groups cache by subject / name / id
  if (connectedGroups && connectedGroups.length > 0) {
    const cleanDest = trimmed.toLowerCase();
    const matched = connectedGroups.find(
      (g) => g.id === trimmed || g.id?.toLowerCase() === cleanDest || g.name?.toLowerCase() === cleanDest || g.name?.toLowerCase().includes(cleanDest)
    );
    if (matched) {
      console.log(`📋 Matched group name "${trimmed}" -> Group JID: ${matched.id}`);
      return matched.id;
    }
  }

  // 4. Try refreshing group cache if not found in initial cache
  if (socketInstance) {
    try {
      const refreshed = await refreshGroupsCache();
      const cleanDest = trimmed.toLowerCase();
      const matched = (refreshed || []).find(
        (g) => g.id === trimmed || g.id?.toLowerCase() === cleanDest || g.name?.toLowerCase() === cleanDest || g.name?.toLowerCase().includes(cleanDest)
      );
      if (matched) {
        console.log(`📋 Matched group name "${trimmed}" -> Fresh Group JID: ${matched.id}`);
        return matched.id;
      }
    } catch {}
  }

  // 5. Creator timestamp group format (e.g. 88017xxx-123456)
  if (/^\d{8,}-\d+$/.test(trimmed)) {
    return `${trimmed}@g.us`;
  }

  // 6. Detect if numeric group ID (starts with 120 and length >= 16 digits)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (/^120\d{14,}/.test(digitsOnly)) {
    return `${digitsOnly}@g.us`;
  }

  // 7. If it contains digits (phone number)
  if (digitsOnly.length >= 7) {
    let phoneDigits = digitsOnly;
    if (digitsOnly.startsWith('01') && digitsOnly.length === 11) {
      phoneDigits = `880${digitsOnly.substring(1)}`;
    }
    return `${phoneDigits}@s.whatsapp.net`;
  }

  return null;
}

// ─── POST: Send Direct Message (to individual phone or group JID) ─────────────
app.post('/api/send-direct', requireApiSecret, async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp is not connected on bot server. Please scan the QR code first.',
    });
  }

  const { to, message, jid, imageUrl } = req.body;
  const destination = jid || to;

  if (!destination || !message) {
    return res.status(400).json({ success: false, error: 'to/jid and message are required' });
  }

  try {
    // Resolve destination to actual WhatsApp JID
    const waJid = await resolveWhatsAppJid(destination, sock);
    if (!waJid) {
      return res.status(400).json({
        success: false,
        error: `Could not resolve destination "${destination}" to a valid WhatsApp group or phone JID.`,
      });
    }

    console.log(`📤 Sending message to resolved JID: ${waJid}`);

    // Check if imageUrl is a valid public URL
    const isValidImageUrl = imageUrl &&
      /^https?:\/\//i.test(imageUrl) &&
      !imageUrl.includes('localhost') &&
      !imageUrl.startsWith('blob:');

    let sendResult;
    if (isValidImageUrl) {
      try {
        // Send image with caption
        sendResult = await sendWaMessage(waJid, {
          image: { url: imageUrl },
          caption: message,
        });
        console.log(`✅ Image+message sent to: ${waJid}`);
      } catch (imgErr) {
        console.warn(`⚠️ Image send failed (${imgErr.message}), falling back to text: ${waJid}`);
        sendResult = await sendWaMessage(waJid, { text: message });
        console.log(`✅ Text-only fallback sent to: ${waJid}`);
      }
    } else {
      // Send text only
      sendResult = await sendWaMessage(waJid, { text: message });
      console.log(`✅ Message sent to: ${waJid}`);
    }

    res.json({ success: true, message: `Message sent to ${waJid}`, messageId: sendResult?.key?.id, jid: waJid });
  } catch (error) {
    console.error('❌ Direct send error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET: List Connected Groups ───────────────────────────────────────────────
app.get('/api/get-groups', requireApiSecret, async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp is not connected.',
      groups: [],
    });
  }

  try {
    // Refresh cache
    await refreshGroupsCache();
    res.json({ success: true, groups: connectedGroups, total: connectedGroups.length });
  } catch (error) {
    console.error('❌ Get groups error:', error.message);
    res.status(500).json({ success: false, error: error.message, groups: [] });
  }
});

// ─── GET: List Followed Channels ─────────────────────────────────────────────
app.get('/api/get-channels', requireApiSecret, async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp is not connected.',
      channels: [],
    });
  }

  try {
    await refreshChannelsCache();

    const forwarderConfig = await getDynamicForwarderConfig();
    const configuredChannel = (forwarderConfig?.sourceChannelId || SOURCE_CHANNEL_JID || '').trim();
    if (configuredChannel && !connectedChannels.find((c) => c.id === configuredChannel)) {
      connectedChannels.push({
        id: configuredChannel,
        name: forwarderConfig?.sourceChannelName || 'Configured Source Channel',
        isSource: true,
      });
    }

    res.json({ success: true, channels: connectedChannels, total: connectedChannels.length });
  } catch (error) {
    console.error('❌ Get channels error:', error.message);
    res.status(500).json({ success: false, error: error.message, channels: [] });
  }
});

// ─── POST: Resolve WhatsApp Channel by Link or Code ──────────────────────────
app.post('/api/resolve-channel', requireApiSecret, async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ success: false, error: 'WhatsApp is not connected.' });
  }

  const { url, code: rawCode } = req.body;
  const input = url || rawCode || '';
  if (!input) {
    return res.status(400).json({ success: false, error: 'Channel URL or Code is required.' });
  }

  try {
    let inviteCode = input.trim();
    if (inviteCode.includes('whatsapp.com/channel/')) {
      inviteCode = inviteCode.split('whatsapp.com/channel/')[1]?.split(/[\?\/]/)[0]?.trim();
    }

    // Try Baileys newsletter metadata
    if (sock.newsletterMetadata) {
      const meta = await sock.newsletterMetadata('invite', inviteCode);
      if (meta?.id) {
        await saveChannelToDb(meta.id, meta.name || 'WhatsApp Channel');
        return res.json({
          success: true,
          channel: {
            id: meta.id,
            name: meta.name || 'WhatsApp Channel',
            subscribers: meta.subscribers || 0,
            description: meta.description || '',
          },
        });
      }
    }

    // Fallback if metadata not available
    const fallbackId = inviteCode.endsWith('@newsletter') ? inviteCode : `${inviteCode}@newsletter`;
    await saveChannelToDb(fallbackId, 'Official WhatsApp Channel');
    return res.json({
      success: true,
      channel: {
        id: fallbackId,
        name: 'Official WhatsApp Channel',
      },
    });
  } catch (err) {
    console.error('❌ Resolve channel error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST: Manually Forward Channel Update to All Groups ─────────────────────
app.post('/api/forward-channel', requireApiSecret, async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ success: false, error: 'WhatsApp is not connected.' });
  }

  const { message, channelName, targetGroupIds, imageUrl } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message text is required.' });
  }

  try {
    await refreshGroupsCache();
    let targets =
      Array.isArray(targetGroupIds) && targetGroupIds.length > 0
        ? targetGroupIds
        : connectedGroups.map((g) => g.id);

    targets = targets.filter((t) => t.endsWith('@g.us'));

    if (targets.length === 0) {
      return res.status(400).json({ success: false, error: 'No connected groups found to forward to.' });
    }

    const header = `📢 *[${channelName || 'অফিশিয়াল চ্যানেল আপডেট'}]*\n\n`;
    const fullText = `${header}${message.trim()}`;

    const sentJids = [];
    const errors = [];

    for (const groupJid of targets) {
      try {
        if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
          await sendWaMessage(groupJid, { image: { url: imageUrl }, caption: fullText });
        } else {
          await sendWaMessage(groupJid, { text: fullText });
        }
        sentJids.push(groupJid);
        console.log(`✅ [Manual Channel Forward to ${groupJid}]`);
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        errors.push(`${groupJid}: ${e.message}`);
      }
    }

    return res.json({
      success: sentJids.length > 0,
      message: `Forwarded to ${sentJids.length} group(s)!`,
      sentJids,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error('❌ Forward channel error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET/POST: Bot Auto-Reply Config ─────────────────────────────────────────
app.get('/api/bot-config', requireApiSecret, async (req, res) => {
  try {
    const BotConfig = mongoose.models.BotConfig || require('./models/BotConfig');
    const config = await BotConfig.findOne({ _id: 'bot_config' });
    res.json({ success: true, config: config || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bot-config', requireApiSecret, async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, error: 'config is required' });
    }
    const BotConfig = mongoose.models.BotConfig || require('./models/BotConfig');
    await BotConfig.findOneAndUpdate(
      { _id: 'bot_config' },
      { ...config, _id: 'bot_config', updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Bot config saved.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET/POST: Channel Forwarder Config ───────────────────────────────────────
app.get('/api/forwarder-config', requireApiSecret, async (req, res) => {
  try {
    const config = await getDynamicForwarderConfig();
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/forwarder-config', requireApiSecret, async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, error: 'config is required' });
    }
    inMemoryForwarderConfig = config;
    if (mongoose.connection && mongoose.connection.db) {
      await mongoose.connection.db.collection('whatsapp_forwarder').findOneAndUpdate(
        { _id: 'forwarder_config' },
        { $set: { ...config, _id: 'forwarder_config', updatedAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );
    }
    res.json({ success: true, message: 'Forwarder config updated successfully on bot.', config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Connect DB & WhatsApp ────────────────────────────────────────────────────
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
console.log('MongoDB URI is provided:', !!uri);

if (!uri) {
  console.error('❌ MONGO_URI / MONGODB_URI is not set. Exiting.');
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(() => {
    console.log('✅ MongoDB Connected');
    connectToWhatsApp();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // ─── Self-Keepalive Heartbeat (Prevent Render Free Tier from Sleeping) ────────
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.BOT_SELF_URL || 'https://ezbd.onrender.com';
  cron.schedule('*/8 * * * *', () => {
    try {
      const https = require('https');
      const http = require('http');
      const client = SELF_URL.startsWith('https') ? https : http;
      client.get(`${SELF_URL}/`, (res) => {
        console.log(`💓 Keep-alive ping (${SELF_URL}): HTTP ${res.statusCode} | WhatsApp Connected: ${isConnected}`);
      }).on('error', (err) => {
        console.warn('⚠️ Keep-alive ping notice:', err.message);
      });
    } catch (e) {
      console.warn('⚠️ Keep-alive exception:', e.message);
    }
  });
});
