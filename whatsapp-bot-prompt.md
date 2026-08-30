# BLACKROCK ESPORTS — WHATSAPP BOT BUILD PROMPT

Build a standalone backend service that: (1) auto-forwards messages from a WhatsApp
Channel into WhatsApp groups, and (2) lets the main website's admin panel schedule
WhatsApp messages to be sent later.

---

## Stack

- **Backend:** Node.js + Express
- **WhatsApp connection:** `@whiskeysockets/baileys` (unofficial WhatsApp Web
  automation library — no official Business API needed, but connects via QR code like
  WhatsApp Web)
- **Database:** MongoDB Atlas (free M0 tier) — stores the WhatsApp auth session and
  scheduled messages
- **Scheduler:** `node-cron` — checks every minute for due messages
- **Hosting:** Render (free/paid Web Service) — NOT Vercel, since this needs a
  persistent long-running Node process, which Vercel's serverless functions don't
  support well for a stateful WhatsApp connection
- **Frontend integration:** the main site (on Vercel) calls this service's API to
  schedule messages, from a server-side route only (never client-side)

⚠️ **Risk note:** Baileys is unofficial automation — using it risks the connected
number being banned by WhatsApp, especially with heavy bulk sending. Use a **spare
WhatsApp number**, not your personal or main business number, and keep delays between
sends.

---

## Core Features to Build

### 1. WhatsApp Connection
- Connect via QR code (scan with Linked Devices on the spare number).
- Persist the auth session (`useMultiFileAuthState`) so it doesn't need re-scanning on
  every restart.
- Auto-reconnect with backoff on disconnect, but detect a real logout
  (`DisconnectReason.loggedOut`) and stop looping in that case — it needs a fresh QR
  scan then.

### 2. Channel-to-Group Forwarder
- Listen for new messages (`messages.upsert`) on one source WhatsApp **Channel**.
- When a message arrives from that channel, forward its text into a configurable list
  of target **groups** (e.g. 5 groups).
- Add a ~1.5 second delay between each group send (safety, avoid rate-limit/ban
  triggers).
- Log every forward attempt (success/failure per group).

### 3. Scheduled Messaging
- Store scheduled messages in MongoDB: target group(s), message text, send-at
  timestamp, sent status.
- A cron job runs every minute, finds due-and-unsent messages, sends them, and marks
  them sent (with the same safety delay between groups).
- Expose a protected API endpoint (`POST /api/schedule-message`) that the main
  website's admin panel calls to queue a new scheduled message. Protect it with a
  shared secret header (`x-api-secret`) — never leave it open/public.
- Optionally expose a `GET /api/scheduled-messages` endpoint so the admin panel can
  display a list/history of scheduled and sent messages.

### 4. Reliability
- Health-check route (`GET /`) that returns connection status — used both for manual
  checks and for a keep-alive ping service (Render's free tier sleeps after 15 minutes
  idle, which disconnects WhatsApp — ping the URL every 5 minutes via something like
  cron-job.org to prevent this).
- Don't let one failed group-send crash the whole batch — catch and log per-group
  errors, keep going.

### 5. Getting Group & Channel IDs
- Provide a one-off helper script that connects, calls
  `sock.groupFetchAllParticipating()`, and prints every group's name + JID
  (`...@g.us`) so they can be copied into config.
- The source channel's JID ends in `@newsletter` — trickier to enumerate directly;
  identify it by watching the console log when a test message arrives from that
  channel while connected.

---

## Data Model

**Session storage (Mongo):**
- `id`, `data` (encoded Baileys auth JSON)

**Scheduled messages (Mongo):**
- `groupJids` (array of strings)
- `message` (string)
- `sendAt` (datetime)
- `isSent` (boolean, default false)
- `failReason` (string, nullable)
- timestamps

---

## Environment Variables Needed

- `PORT`
- `MONGO_URI` — MongoDB Atlas connection string
- `TARGET_GROUPS` — comma-separated group JIDs
- `SOURCE_CHANNEL_JID` — the channel to forward from
- `API_SECRET` — shared secret for the scheduling API

---

## Deployment Steps (Render)

1. Push the project to a **private** GitHub repo — exclude `.env` and the Baileys auth
   session folder via `.gitignore`.
2. Create a new Web Service on Render pointing at that repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all environment variables in Render's dashboard (Render won't read a local
   `.env` file).
5. Deploy, watch the logs, and scan the QR code again for this live instance (the
   session from local testing isn't automatically carried over).
6. Set up a free keep-alive ping (cron-job.org) hitting the Render URL every 5 minutes.

---

## What NOT to Do

- Don't send at high volume/frequency — this is what gets WhatsApp numbers banned.
- Don't skip the inter-message delay.
- Don't expose the scheduling API without the secret-header check.
- Don't commit the auth session folder or `.env` to git.
- Don't use your primary/personal WhatsApp number for this.
