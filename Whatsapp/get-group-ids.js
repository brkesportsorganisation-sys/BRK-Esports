// Run this ONCE locally after you've scanned the QR code and connected successfully,
// to print out all group JIDs so you can copy them into your .env file.
//
// Usage: node get-group-ids.js

require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { makeWASocket, useMultiFileAuthState, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');

async function run() {
  const { version } = await fetchLatestWaWebVersion();
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  const sock = makeWASocket({ version, auth: state, printQRInTerminal: true });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log('Scan this QR code:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log('✅ Connected. Fetching your groups...\n');
      const groups = await sock.groupFetchAllParticipating();
      Object.values(groups).forEach((g) => {
        console.log(`${g.subject}  →  ${g.id}`);
      });
      console.log('\nCopy the JIDs you need into TARGET_GROUPS in your .env file.');
      process.exit(0);
    }
  });
}

run();
