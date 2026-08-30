# BLACKROCK ESPORTS — MASTER BUILD PROMPT

Use this as the complete build prompt for the entire platform. It consolidates every
module discussed. Build in the order laid out in the "Build Order" section at the end —
don't try to build everything simultaneously.

---

## 0. PROJECT OVERVIEW

Build **Blackrock Esports** — a multi-game esports tournament platform.

- **Games supported:** Free Fire (primary), Valorant, eFootball.
- **Hosting:** Frontend + API on **Vercel** (Next.js, App Router).
- **Database:** **Supabase** (Postgres, Auth, Realtime, Storage, Row-Level Security).
- **Styling:** Tailwind CSS + shadcn/ui, mobile-first, must run smoothly on low-end
  phones (2–3GB RAM) with no lag, low storage footprint, and a fully responsive layout
  with no pinch-zoom or horizontal scrolling required on mobile.
- **Payments:** Manual bKash Personal ("Send Money") flow — no merchant API initially.

---

## 1. ROLE, ACCESS & SECURITY SYSTEM (Discord-Style)

- Hierarchy: `Owner → Admin → Manager → Player`.
- Owner creates admin/manager credentials directly (username + password, not necessarily
  email signup) and assigns a **custom permission checkbox matrix** per account —
  Discord-style. A logged-in sub-admin sees and can do *only* what's checked for them.
- Two permissions are **Owner-only, never assignable**: creating/editing other admin
  accounts (`manage_roles`), and final delete approval (`approve_deletes`).
- **Delete-request workflow:** Admin/Manager actions that delete data don't execute
  immediately — they create a `delete_requests` row the Owner must approve.
- Only the Owner can book tournament slots for free; everyone else pays from real wallet
  balance.
- Enforce everything server-side via Postgres **Row-Level Security (RLS)** — never rely
  on hiding UI elements alone.
- Full audit log (`admin_activity_log`) of every non-Owner action: who, what, when,
  before/after values.

---

## 2. HOME PAGE, UI/UX & NOTIFICATIONS

- Header with org logo.
- **Live banner**: real-time available/full slot counts per time period (AM/PM), powered
  by Supabase Realtime — no polling.
- Entry-fee banners (e.g. "৳25 Tournament") linking to a tournament detail page with
  rules, prize money, and a clean serial list of slots per time period.
- Auto-notifications (app updates, tournament alerts) pushed every 10–15 minutes or on a
  configurable interval, via Web Push + a Supabase Edge Function cron job.
- Fully responsive, compact mobile layout (`maximum-scale=1`, `overflow-x-hidden`).

---

## 3. TOURNAMENT SYSTEM (Multi-Game)

- Tournament creation form must be **game-aware**: Free Fire/eFootball use
  kill/point-based scoring fields; Valorant uses 5v5 team format, map-pick/ban, and
  round-score fields — don't force one generic form onto every game.
- Slot management: open/close slots per session, live fill tracking, manual reorder.
- Result entry, bracket/knockout support for elimination-style tournaments.
- Tournament history/archive, searchable.

---

## 4. PLAYER & SQUAD SYSTEMS

### 4a. LFG (Looking For Group) — one-off match matchmaking
- Dedicated recruitment section for finding a player/squad for a single match.
- Confirmed players lock to `Pending` status until that match ends — can't join others.
- Contact info (WhatsApp etc.) hidden while `Pending`.
- Player profiles show a performance/win-rate rating.

### 4b. Persistent Squad System — permanent named teams
- Players create a squad: name, tag, logo, tied to a specific game.
- Configurable in-game roles per game (e.g. Free Fire: Rusher/Sniper/Support; Valorant:
  Duelist/Controller/Sentinel/Initiator).
- Dedicated **Manager** and **Coach** slots (non-playing roles), plus a **Leader** with
  control permissions (edit squad, assign roles, remove members, transfer leadership).
- Add members two ways: (1) search by app account number/username and send an invite
  requiring acceptance, or (2) generate a **shareable invite link** (revocable,
  optionally expiring) that lets others request to join.
- Recommend: one active squad per game per player; Leader/Manager can invite directly,
  regular players can only request; link-joins require Leader approval by default.
- Public squad profile page with roster and aggregate stats.

---

## 5. REFERRAL & ENGAGEMENT

- Free-Fire-style milestone **progress bar** for referrals (e.g. 300 refers = ৳500),
  resetting on the 1st of each month.
- **Two-wallet split:**
  - **Promo Wallet** — referral earnings, spendable *only* on buying tournament slots,
    never withdrawable.
  - **Winning Wallet** — actual tournament winnings, withdrawable directly via bKash.
- Referral feature placed prominently on the **home page**, not buried in the profile.

## 6. WATCH & EARN

- Sequential YouTube videos with visible coin/point value per video.
- Use the **YouTube IFrame Player API** (not a generic video tag) so watch time counts
  toward real organic YouTube metrics; validate watch-time server-side before crediting
  coins (don't trust client-reported time — prevents farming).
- In-app like/comment via YouTube Data API v3 with user OAuth.
- ⚠️ Review YouTube's API Terms of Service before launch — incentivized engagement can
  risk API access being revoked.

---

## 7. WALLET & PAYMENTS

- Top-ups via bKash Personal Send Money; minimum deposit threshold (e.g. ৳20/25/30).
- Balance auto-credited once user submits their TrxID + details — but log everything for
  reconciliation, block duplicate TrxIDs (`UNIQUE` constraint), and give Admins
  (`manage_payments` permission) a review dashboard since instant-credit is fraud-prone
  without an official merchant API.
- Withdrawals from Winning Wallet should go through manual/admin approval.

## 8. UNIQUE ACCOUNT ID SYSTEM

- Generate a bank-style unique app account number per user (e.g. `BRE-0001234`) at
  signup — shown publicly instead of their real Free Fire UID, which stays private and
  is only used internally to verify match participation.

---

## 9. ADMIN PANEL (25 Menus, Permission-Gated)

**A. Dashboard & Overview:** 1. Main Dashboard 2. Notifications Center

**B. Tournament Ops:** 3. Tournament Management 4. Slot Management 5. Result Entry
6. Bracket/Match Scheduling 7. Tournament History

**C. User & Community:** 8. User Management 9. Ban/Suspend Management
10. LFG/Squad Moderation 11. Team/Clan Management 12. Reports & Complaints

**D. Financial:** 13. Deposit Requests 14. Withdrawal Requests
15. Manual Balance Adjustment 16. Promo vs Winning Wallet Overview
17. Revenue & Payout Reports

**E. Referral & Rewards:** 18. Referral Program Management 19. Watch & Earn Management
20. Daily Check-in/Loyalty Rewards

**F. Access & Security (Owner-only):** 21. Role & Permission Management
22. Delete Request Approval Queue 23. Admin Activity Log

**G. Content & Communication:** 24. Announcements/Push Notifications
25. Site Settings

**Plus, from later additions:**
- **Vendor Management**, **Vendor Tournament Review Queue**, **Vendor Payout Requests**,
  **Vendor Accounts** (credential creation, tier control), **Vendor Performance/Ratings**
- **Chat Moderation**, **Contact Unlock Transactions**, **Service Charge Settings**
- **Squad Management** (moderate names/logos, disband reported squads)

**Every menu is permission-gated** via the same JWT + RLS pattern from Section 1.

---

## 10. MESSAGING & ANNOUNCEMENTS

### 10a. Public Announcement Board (Admin-only feed)
- Homepage section where only Admin/Management can post; regular users view-only.
- For tournament notices and official updates. RLS: write access gated by
  `manage_announcements` permission; read access public.

### 10b. Buyer–Seller Private Inbox (Daraz/Fiverr-style)
- In-website "Contact Seller" chat between customers and sellers/vendors — fully
  in-app, powered by Supabase Realtime.

### 10c. Chat Security — Automatic Link Filter
- Server-side regex blocks any URL pattern (`http`, `https`, `www.`, `.com`, `.net`,
  etc.) before the message sends; shows a warning; logs the attempt for moderation.

### 10d. Paid Contact Unlock (Monetization)
- Phone/WhatsApp numbers auto-detected and hidden/masked in chat by default.
- Customer must pay a configurable **service charge** (from wallet) to unlock a
  seller's real contact info — tracked in a `contact_unlocks` table, feeding into
  revenue reports. Normal text messaging stays free.
- Decide and configure: does the charge go 100% to platform, or split with the seller?

---

## 11. MULTI-VENDOR / MULTI-MANAGER MARKETPLACE

**Important distinction:** Sub-Admins (Section 1) = internal staff. **Vendors** = outside
independent organizers selling their own tournaments through your platform.

- **Vendors do not self-register.** Only the Owner (or an Admin with `manage_vendors`)
  creates vendor accounts directly from the admin panel — username + password, same
  pattern as sub-admin creation.
- **Access tiers per vendor:**
  - **Limited** (new vendor default): tournaments need Admin pre-approval before going
    live, can't edit their own public store page, fixed commission rate.
  - **Full** (trusted/promoted vendors): auto-publish (spot-checked), can edit their
    store page, negotiable commission rate.
  - Tier = starting permission template; Owner can fine-tune individual checkboxes
    beyond the tier default.
- Vendor gets a **scoped mini-dashboard** (`/vendor-panel`): My Tournaments, My Slots,
  My Results, My Earnings, My Payout Requests, My Store Profile (Full tier only) — all
  RLS-scoped strictly to that `vendor_id`.
- **Commission split:** on entry-fee payment, split server-side into platform commission
  + vendor net earnings (`vendor_earnings` table for audit trail).
- ⚠️ Recommend **escrow-style payout** — hold vendor earnings until the tournament +
  prize distribution is confirmed complete, rather than instant release, to protect
  player trust.
- Public tournament cards show "Hosted by Blackrock Esports" vs "Hosted by [Vendor
  Name]"; each vendor gets a public storefront page with rating and history.
- "Delete own tournament" is **never** a self-service action for any tier — always
  routes through the delete-request → Owner approval flow, same as everything else.

---

## 12. WHATSAPP NOTIFICATION BOT (Supporting Service)

Separate Node.js service (not on Vercel — deployed on Render), used to auto-forward
official announcements into WhatsApp groups and support scheduled WhatsApp messages
triggered from the admin panel.

- **Stack:** Express + `@whiskeysockets/baileys` (unofficial WhatsApp Web automation) +
  MongoDB Atlas (session + scheduled-message storage) + `node-cron`.
- Listens for new messages on a source WhatsApp Channel and forwards them into up to 5
  target WhatsApp groups, with a safety delay between sends.
- Exposes a secret-protected API (`/api/schedule-message`) that the Vercel admin panel
  calls to queue a message for future delivery; a cron job checks the DB every minute
  and sends due messages.
- Needs a keep-alive ping (Render free tier sleeps after 15 min idle) and, ideally, a
  spare WhatsApp number rather than a personal/business one, given the ban risk of
  unofficial automation.
- (Full working code + step-by-step deployment guide already provided separately.)

---

## RECOMMENDED BUILD ORDER

1. **Foundation** — Next.js + Supabase setup, Auth, base schema (users, wallets,
   roles/permissions with RLS).
2. **Role & permission system** (Section 1) — nearly everything else depends on it.
3. **Wallet + deposit flow** (Section 7) — core monetization plumbing.
4. **Unique account ID system** (Section 8) — tie into signup.
5. **Tournament system + live slot banner** (Sections 2–3) — the core product.
6. **LFG + persistent Squad system** (Section 4).
7. **Referral system + two-wallet split** (Section 5).
8. **Admin Panel core menus** (Section 9, A–D) — needed to operate everything above.
9. **Watch & Earn** (Section 6) — later, due to external API/policy dependency risk.
10. **Messaging system** (Section 10) — announcement board first, then buyer-seller
    inbox + link filter + paid unlock.
11. **Multi-vendor marketplace** (Section 11) — significant scope increase, build as
    its own clean module once the core platform is stable.
12. **WhatsApp bot** (Section 12) — independent service, can be built in parallel by a
    separate track since it's a separate deployment (Render, not Vercel).
13. **Performance optimization pass** — ongoing, but do a dedicated sprint before
    launch (Lighthouse mobile audits, low-end device testing, image/JS optimization).

---

## KEY RISKS TO KEEP IN MIND THROUGHOUT

- **RLS is the real security boundary** — every permission, tier, and vendor-scoping
  rule must be enforced in Postgres, not just hidden in the frontend.
- **Instant bKash credit on TrxID submission** is fraud-prone without an official
  merchant API — build the reconciliation/review safety net from day one.
- **YouTube Watch & Earn** — confirm compliance with YouTube's API policy before
  investing heavily; incentivized engagement is a grey area.
- **Vendor trust/escrow** — the platform is on the hook for player trust if a vendor
  doesn't pay out prizes properly; don't release vendor earnings until commitments are
  confirmed fulfilled.
- **WhatsApp bot ban risk** — unofficial automation; use a spare number, respect rate
  limits, don't scale send volume aggressively.
