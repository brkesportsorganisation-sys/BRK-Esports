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
} = require('@whiskeysockets/baileys');
const { useMongoAuthState } = require('./mongoAuthState');

const ScheduledMessage = require('./models/ScheduledMessage');

const app = express();
app.use(express.json({ limit: '5mb' }));

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
    browser: ['Chrome (Windows)', 'Chrome', '120.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
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

      // Auto-fetch groups on connect
      try {
        await refreshGroupsCache();
        console.log(`📋 Cached ${connectedGroups.length} group(s) and ${connectedChannels.length} channel(s).`);
      } catch (err) {
        console.warn('⚠️ Could not prefetch groups:', err.message);
      }
    }
  });

  // ─── Channel Forwarder Listener ───────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // 1. CRITICAL: Ignore own messages to prevent infinite echo loops
      if (msg.key.fromMe) continue;

      // 2. CRITICAL: Only proceed if a valid SOURCE_CHANNEL_JID is explicitly configured
      if (!SOURCE_CHANNEL_JID || SOURCE_CHANNEL_JID.trim() === '') continue;
      if (msg.key.remoteJid !== SOURCE_CHANNEL_JID.trim()) continue;

      const textMessage =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!textMessage) continue;

      console.log(`📢 Channel message detected: "${textMessage.slice(0, 50)}..."`);

      // Load target groups: exclude the source channel to avoid loop
      const allTargets = TARGET_GROUPS.length > 0 ? TARGET_GROUPS : connectedGroups.map((g) => g.id);
      const targets = allTargets.filter((jid) => jid !== SOURCE_CHANNEL_JID && jid !== msg.key.remoteJid);

      for (const groupJid of targets) {
        try {
          await sock.sendMessage(groupJid, {
            text: `[Forwarded Notice]\n\n${textMessage}`,
          });
          console.log(`✅ Forwarded to: ${groupJid}`);
        } catch (err) {
          console.error(`❌ Failed to send to ${groupJid}:`, err.message);
        }
        await new Promise((res) => setTimeout(res, 2000));
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

// ─── Scheduled Message Cron (every minute) ───────────────────────────────────
cron.schedule('* * * * *', async () => {
  if (!isConnected || !sock) return;

  // 1. Trigger Next.js 24/7 automated scheduler runner
  try {
    const nextAppUrl = process.env.NEXT_APP_URL || 'https://www.esportszonebd.online';
    const cronSecret = process.env.CRON_SECRET || 'blackrock_secret_bot_key_2026';
    const cleanUrl = nextAppUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/admin/whatsapp/cron?secret=${cronSecret}`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      signal: AbortSignal.timeout(25000),
    }).catch(() => null);

    if (res?.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.executedCount > 0) {
        console.log(`⏰ [24/7 Scheduler] Dispatched ${data.executedCount} due schedule(s)!`);
      }
    }
  } catch (cronErr) {
    console.warn('⚠️ [Next.js Scheduler Trigger Error]:', cronErr.message);
  }

  // 2. Process legacy local MongoDB queue if any
  try {
    const now = new Date();
    const pendingMessages = await ScheduledMessage.find({
      sendAt: { $lte: now },
      isSent: false,
    }).limit(5);

    for (const item of pendingMessages) {
      // Mark as sent immediately to prevent loop if a single group fails
      item.isSent = true;
      await item.save();

      for (const groupJid of item.groupJids) {
        try {
          await sock.sendMessage(groupJid, { text: item.message });
          console.log(`⏰ Cron message sent to: ${groupJid}`);
          await new Promise((res) => setTimeout(res, 2000));
        } catch (sendErr) {
          console.error(`❌ Cron send failed for ${groupJid}:`, sendErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
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
  });
});

// ─── GET QR / Status ──────────────────────────────────────────────────────────
app.get('/api/qr', requireApiSecret, (req, res) => {
  if (isConnected) {
    return res.json({ success: true, status: 'CONNECTED', message: 'WhatsApp is connected' });
  }
  if (app.locals.latestQr) {
    return res.json({ success: true, status: 'WAITING_FOR_SCAN', qr: app.locals.latestQr });
  }
  return res.json({ success: true, status: 'INITIALIZING', message: 'Waiting for QR code generation...' });
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
            await sock.sendMessage(groupJid, { image: { url: imageUrl }, caption: message });
          } else {
            await sock.sendMessage(groupJid, { text: message });
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
    // Format destination: if phone number, convert to WhatsApp JID
    let waJid = destination.trim();
    if (!waJid.includes('@')) {
      const digits = waJid.replace(/[^\d]/g, '');
      waJid = `${digits}@s.whatsapp.net`;
    }

    // Check if imageUrl is a valid public URL
    const isValidImageUrl = imageUrl &&
      /^https?:\/\//i.test(imageUrl) &&
      !imageUrl.includes('localhost') &&
      !imageUrl.startsWith('blob:');

    let sendResult;
    if (isValidImageUrl) {
      // Send image with caption
      sendResult = await sock.sendMessage(waJid, {
        image: { url: imageUrl },
        caption: message,
      });
      console.log(`✅ Image+message sent to: ${waJid}`);
    } else {
      // Send text only
      sendResult = await sock.sendMessage(waJid, { text: message });
      console.log(`✅ Message sent to: ${waJid}`);
    }

    res.json({ success: true, message: `Message sent to ${waJid}`, messageId: sendResult?.key?.id });
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
    // Baileys doesn't expose a direct getChannels API yet.
    // We return what we've collected from message events + SOURCE_CHANNEL_JID env
    const channels = [...connectedChannels];
    if (SOURCE_CHANNEL_JID && !channels.find((c) => c.id === SOURCE_CHANNEL_JID)) {
      channels.push({
        id: SOURCE_CHANNEL_JID,
        name: 'Configured Source Channel',
        isSource: true,
      });
    }
    res.json({ success: true, channels, total: channels.length });
  } catch (error) {
    console.error('❌ Get channels error:', error.message);
    res.status(500).json({ success: false, error: error.message, channels: [] });
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
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
