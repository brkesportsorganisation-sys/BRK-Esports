# BRK Esports — Tournament & WhatsApp Automation Platform

Free Fire esports tournament platform with bKash/Nagad payment, admin dashboard, automated WhatsApp bot scheduling (Zavu API), community features, and live match tracking.


## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **Auth**: Custom HMAC session tokens + bcrypt

---

## 🚀 Deploy to Vercel

### Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open **SQL Editor** and run the entire contents of `supabase-schema.sql`.
3. Go to **Storage** → create a new bucket named `tournament-images` → set it to **Public**.
4. Go to **Settings → API** and note down:
   - `Project URL`
   - `anon/public` key
   - `service_role` key (keep this secret!)

### Step 2 — Set Environment Variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ADMIN_SESSION_SECRET` | A random 32+ char string |
| `ADMIN_EMAIL` | Your admin login email |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of your admin password |

**Generate `ADMIN_SESSION_SECRET`:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generate `ADMIN_PASSWORD_HASH`:**
```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('YOUR_PASSWORD_HERE', 12))"
```

### Step 3 — Deploy

1. Push your code to GitHub.
2. Import the repository in [vercel.com](https://vercel.com).
3. Vercel will auto-detect Next.js and build automatically.
4. Done! 🎉

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Create local env file
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local

# Run dev server
npm run dev
```

---

## Admin Dashboard

The admin panel is at `/admin`. Login with the credentials set in your environment variables.

**Default route:** `/admin/login`

---

## Database Schema

Run `supabase-schema.sql` in your Supabase SQL Editor to create all required tables.