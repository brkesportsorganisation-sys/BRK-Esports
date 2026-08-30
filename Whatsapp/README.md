# Blackrock Esports — WhatsApp Channel-to-Group Forwarder & Scheduler

Forwards messages from a WhatsApp Channel into 5 target groups, and lets your Vercel
frontend/admin panel schedule messages to be sent later.

⚠️ **Important:** This uses Baileys, an **unofficial** WhatsApp Web automation library —
not the official WhatsApp Business API. Using it risks the connected number being banned
by WhatsApp, especially with bulk/automated sending. Recommendations:
- Use a **separate/spare number**, not your main personal or business number.
- Keep the 1.5s delay between sends (already in the code) — don't remove it.
- Don't scale this to sending hundreds of messages per minute.

---

## Step 1 — Set up MongoDB Atlas (free)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free **M0 cluster**.
3. Under "Database Access," create a user with a username/password.
4. Under "Network Access," allow access from anywhere (`0.0.0.0/0`) — needed since Render's IP isn't static.
5. Click "Connect" → "Drivers" → copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority`
6. Add a database name to the end, e.g. `.../whatsapp_bot?retryWrites=true...`

## Step 2 — Install dependencies locally

```bash
cd wa-bot-backend
npm install
```

## Step 3 — Create your `.env` file

Copy `.env.example` to `.env` and fill in:
- `MONGO_URI` — from Step 1.
- `API_SECRET` — make up any long random string; your frontend will send this in a header to prove it's allowed to schedule messages.
- Leave `TARGET_GROUPS` and `SOURCE_CHANNEL_JID` as placeholders for now — you'll fill them in Step 5.

## Step 4 — First run & connect WhatsApp

```bash
node server.js
```

A QR code will print in your terminal. On your **spare WhatsApp number**:
`WhatsApp → Settings → Linked Devices → Link a Device` → scan the QR code.

Once connected you'll see `✅ WhatsApp successfully connected!`. This creates a
`baileys_auth_info/` folder holding your session — **never commit this folder to git**
(it's already in `.gitignore`).

## Step 5 — Get your Group JIDs and Channel JID

Stop the server (Ctrl+C), then run:

```bash
node get-group-ids.js
```

This prints every group you're in with its JID, like:
```
Blackrock Tournament Updates  →  120363012345678901@g.us
```

Copy the 5 group JIDs you want into `TARGET_GROUPS` in `.env` (comma-separated, no spaces).

For the **channel** JID (the source you're forwarding *from*), channel JIDs end in
`@newsletter` — the easiest way to get this is to send a test message referencing the
channel while your bot is logged/connected and check the console log, since Baileys
doesn't currently expose a simple "list my channels" call the way it does for groups.
If you get stuck here, share what you see in the console and I'll help you pin it down.

## Step 6 — Deploy to Render

1. Push this project to a **private** GitHub repo (make sure `.env` and `baileys_auth_info/` are NOT included — check `.gitignore`).
2. On https://render.com → New → Web Service → connect your repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all your `.env` values under Render's "Environment" tab (Render doesn't read your local `.env` file).
6. Deploy. Watch the logs — you'll need to scan the QR code again in Render's log output for this deployed instance (session isn't shared from your local run).

**Keep-alive:** Render's free tier sleeps after 15 minutes of inactivity, which will
disconnect WhatsApp. Set up a free ping service like https://cron-job.org to hit your
Render URL (e.g. `https://your-app.onrender.com/`) every 5 minutes.

## Step 7 — Connect your Vercel frontend

From your Next.js API route or admin panel action, call:

```javascript
await fetch('https://your-app.onrender.com/api/schedule-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-secret': process.env.WA_BOT_API_SECRET, // same value as API_SECRET on Render
  },
  body: JSON.stringify({
    message: 'Tournament starts in 30 minutes!',
    sendAt: '2026-08-30T18:00:00.000Z', // ISO timestamp
  }),
});
```

Store `WA_BOT_API_SECRET` in your Vercel project's environment variables — never expose
it in client-side code, only call this from a server-side API route.

---

## Known Limitations / Next Steps

- Session is stored on Render's local disk (`baileys_auth_info/`) — if Render restarts
  the container's filesystem in a way that wipes it (shouldn't normally happen on a
  paid/persistent instance, but can on some free-tier redeploys), you'll need to re-scan
  the QR code. For full resilience later, the session data can be moved into MongoDB
  instead of the filesystem — let me know if you want that version.
- No retry/alerting if WhatsApp disconnects and doesn't reconnect — consider adding an
  email/Telegram alert to yourself for production use.
