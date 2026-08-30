require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
} = require('@whiskeysockets/baileys');

const ScheduledMessage = require('./models/ScheduledMessage');

const app = express();
app.use(express.json());
app.use(cors()); // In production, restrict this to your Vercel domain only

const TARGET_GROUPS = (process.env.TARGET_GROUPS || '')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

const SOURCE_CHANNEL_JID = process.env.SOURCE_CHANNEL_JID;
const API_SECRET = process.env.API_SECRET;

let sock;
let isConnected = false;
let reconnectAttempts = 0;

async function connectToWhatsApp() {
  const { version } = await fetchLatestWaWebVersion();
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Scan this QR code with WhatsApp (Linked Devices):');
      qrcode.generate(qr, { small: true });
      app.locals.latestQr = qr; // Store for API access
    }

    if (connection === 'close') {
      isConnected = false;
      app.locals.latestQr = null; // Clear QR on close
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.log('❌ Logged out from WhatsApp. Delete baileys_auth_info/ and re-scan QR.');
        return; // Don't loop-reconnect on a real logout
      }

      reconnectAttempts += 1;
      const delay = Math.min(reconnectAttempts * 3000, 30000); // backoff, capped at 30s
      console.log(`⚠️ Connection closed. Reconnecting in ${delay / 1000}s...`);
      setTimeout(connectToWhatsApp, delay);
    } else if (connection === 'open') {
      console.log('✅ WhatsApp successfully connected!');
      isConnected = true;
      reconnectAttempts = 0;
      app.locals.latestQr = null; // Clear QR on successful connect
    }
  });

  // 📩 Channel Forwarder Listener
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.remoteJid !== SOURCE_CHANNEL_JID) continue;

      const textMessage =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!textMessage) continue;

      console.log(`📢 Channel message detected: "${textMessage}"`);

      for (const groupJid of TARGET_GROUPS) {
        try {
          await sock.sendMessage(groupJid, {
            text: `[Forwarded Notice]\n\n${textMessage}`,
          });
          console.log(`✅ Forwarded to: ${groupJid}`);
        } catch (err) {
          console.error(`❌ Failed to send to ${groupJid}:`, err.message);
        }
        await new Promise((res) => setTimeout(res, 1500)); // safety delay between sends
      }
    }
  });
}

// 🕒 Scheduler — runs every minute, checks DB for due messages
cron.schedule('* * * * *', async () => {
  if (!isConnected || !sock) return;

  try {
    const now = new Date();
    const pendingMessages = await ScheduledMessage.find({
      sendAt: { $lte: now },
      isSent: false,
    });

    for (const item of pendingMessages) {
      try {
        for (const groupJid of item.groupJids) {
          await sock.sendMessage(groupJid, { text: item.message });
          await new Promise((res) => setTimeout(res, 1500));
        }
        item.isSent = true;
        await item.save();
        console.log('⏰ Scheduled message sent successfully!');
      } catch (sendErr) {
        item.failReason = sendErr.message;
        await item.save();
        console.error('❌ Scheduled message failed:', sendErr.message);
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

// Simple auth middleware for the schedule endpoint
function requireApiSecret(req, res, next) {
  const provided = req.headers['x-api-secret'];
  if (!API_SECRET || provided !== API_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// 🌐 API: Vercel frontend calls this to schedule a message
app.post('/api/schedule-message', requireApiSecret, async (req, res) => {
  try {
    const { message, sendAt, groupJids } = req.body;

    if (!message || !sendAt) {
      return res.status(400).json({ success: false, error: 'message and sendAt are required' });
    }

    const newMessage = new ScheduledMessage({
      groupJids: Array.isArray(groupJids) && groupJids.length ? groupJids : TARGET_GROUPS,
      message,
      sendAt: new Date(sendAt),
    });
    await newMessage.save();
    res.json({ success: true, message: 'Message scheduled successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🌐 API: list scheduled messages (for an admin panel view)
app.get('/api/scheduled-messages', requireApiSecret, async (req, res) => {
  const messages = await ScheduledMessage.find().sort({ sendAt: -1 }).limit(100);
  res.json({ success: true, messages });
});

// Health check + keep-alive ping target (see README step 6)
app.get('/', (req, res) => {
  res.json({ status: 'ok', whatsappConnected: isConnected });
});

// 🌐 API: Vercel frontend calls this to get QR or status
app.get('/api/qr', requireApiSecret, (req, res) => {
  if (isConnected) {
    return res.json({ success: true, status: 'CONNECTED', message: 'WhatsApp is connected' });
  }
  if (app.locals.latestQr) {
    return res.json({ success: true, status: 'WAITING_FOR_SCAN', qr: app.locals.latestQr });
  }
  return res.json({ success: true, status: 'INITIALIZING', message: 'Waiting for QR code generation...' });
});

// Connect DB & WhatsApp
mongoose
  .connect(process.env.MONGO_URI)
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
