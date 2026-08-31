# Blackrock Esports — WhatsApp Bot Backend

Channel-to-Group auto-forwarder + Scheduled messenger + Auto-reply bot for Blackrock Esports.

⚠️ **Important:** This uses Baileys — an **unofficial** WhatsApp Web library. Use a **spare number**, not your main number.

---

## Architecture Overview

```
Vercel (Next.js Admin Panel)
    │
    │  HTTP API calls (x-api-secret header)
    ▼
Render (Node.js + Baileys) ←──── WhatsApp Web QR Session
    │
    ▼
MongoDB Atlas (whatsapp_automation database)
```

---

## Step 1 — MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas/register — create free M0 cluster
2. Database Access → create user with password
3. Network Access → add `0.0.0.0/0` (needed since Render IP isn't static)
4. Connect → Drivers → copy connection string
5. Your URI format: `mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/whatsapp_automation?retryWrites=true&w=majority`

---

## Step 2 — Local Setup

```bash
cd Whatsapp
npm install
cp .env.example .env
# Fill in your .env values
node server.js
```

A QR code appears in terminal. On your **spare WhatsApp number**:
`WhatsApp → Settings → Linked Devices → Link a Device` → scan QR

Once connected: `✅ WhatsApp successfully connected!`

---

## Step 3 — Get Group & Channel JIDs

After connecting, run:
```bash
node get-group-ids.js
```

This prints all groups with JIDs like:
```
Blackrock Tournament Updates  →  120363012345678901@g.us
```

Or use the Admin Panel → WhatsApp → Sync Groups button (calls `/api/get-groups`).

---

## Step 4 — Deploy to Render

1. Push `Whatsapp/` folder to a **private** GitHub repo
   - Make sure `.gitignore` excludes `.env` and `baileys_auth_info/`
2. Render → New → Web Service → connect your repo
3. **Build command:** `npm install`
4. **Start command:** `npm start`
5. Set these **Environment Variables** in Render:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | Your MongoDB Atlas URI |
| `API_SECRET` | A long random secret (must match `WHATSAPP_BOT_SECRET` on Vercel) |
| `ALLOWED_ORIGIN` | Your Vercel URL (e.g. `https://esportszonebd.online`) |
| `TARGET_GROUPS` | Comma-separated group JIDs (can set later via Sync) |
| `SOURCE_CHANNEL_JID` | Your channel JID ending in `@newsletter` |

6. Deploy → watch logs → scan QR code in Render log output

---

## Step 5 — Keep Render Alive (Free Tier)

Render free tier sleeps after 15 minutes. Set up https://cron-job.org to ping your Render URL every **5 minutes**:
```
https://your-app.onrender.com/
```

Or your Vercel cron (already configured at `* * * * *`) will also hit the WhatsApp cron endpoint which keeps Render awake as a side effect.

---

## Step 6 — Connect Vercel Frontend

Set these in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `WHATSAPP_BOT_URL` | Your Render URL (e.g. `https://ezbd.onrender.com`) |
| `WHATSAPP_BOT_SECRET` | Same as `API_SECRET` on Render |
| `MONGODB_URI` | Your MongoDB Atlas URI |
| `CRON_SECRET` | Any random string for cron security |

---

## API Endpoints (All require `x-api-secret` header)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check (no auth needed) |
| `GET` | `/api/qr` | Get QR code or CONNECTED status |
| `POST` | `/api/schedule-message` | Schedule or send immediate message |
| `GET` | `/api/scheduled-messages` | List scheduled messages |
| `POST` | `/api/send-direct` | Send to individual phone or group JID |
| `GET` | `/api/get-groups` | List all connected WhatsApp groups |
| `GET` | `/api/get-channels` | List followed WhatsApp channels |
| `GET` | `/api/bot-config` | Get auto-reply bot config |
| `POST` | `/api/bot-config` | Save auto-reply bot config |

---

## Known Limitations

- Session stored in `baileys_auth_info/` on Render filesystem — restart may require re-scan
- Baileys channel listing is limited; channels detected from message events
- WhatsApp rate limits: keep 1.5s+ delay between messages (already configured)
