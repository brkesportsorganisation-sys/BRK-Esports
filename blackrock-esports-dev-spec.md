# Blackrock Esports — Full Platform Development Prompt (A–Z)

**Project:** Blackrock Esports — a Free Fire–focused (plus other games) tournament platform
**Stack:** Frontend + Backend on **Vercel**, Database/Auth/Realtime on **Supabase**

Use this document as a direct build prompt for an AI coding tool (Claude Code, Cursor, etc.) or as a spec for a human dev team. It is organized by module, each with **what to build**, **how to build it**, and **what to use**.

---

## 0. Recommended Tech Stack

| Layer | Recommendation | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** on Vercel | SSR/ISR for fast slot updates, API routes, edge functions |
| Styling | **Tailwind CSS** + shadcn/ui | Fast, consistent, mobile-first components |
| Database | **Supabase (Postgres)** | Already chosen; also gives Auth, Realtime, Row-Level Security (RLS), Storage |
| Auth | **Supabase Auth** (email/phone OTP or Google) | Native fit with Supabase; supports custom roles via metadata |
| Realtime | **Supabase Realtime (Postgres changes)** | Powers the live slot banner, notifications, pending status |
| File/Image storage | **Supabase Storage** | Player avatars, payment screenshots, org logo |
| Notifications | **Web Push (VAPID) + Supabase Edge Functions (cron)** | Scheduled auto-notifications every 10–15 min |
| Payments (manual) | **bKash Personal "Send Money" + manual TrxID verification flow** | No merchant API needed initially |
| Video/Watch & Earn | **YouTube IFrame Player API** + server-side watch-time validation | Required to count "organic" views legitimately |
| Hosting | **Vercel** | Already chosen; use Edge Middleware for role-based route protection |

---

## 1. Role, Access & Security System (Discord-Style Permission Control)

**What to build:**
- A hierarchical role system: `Owner → Admin → Manager → Player`.
- Owner can create custom roles and assign granular permissions per role (e.g., `manage_settings`, `manage_payments`, `manage_tournament_results`, `manage_players`).
- A **delete-request workflow**: Admin/Manager actions that delete data don't execute immediately — they create a `delete_requests` row that the Owner must approve/reject.
- Free slot booking is restricted to the Owner only; Admins/Managers must pay from their own wallet balance like normal users.

**How to build it:**
- Supabase tables: `roles`, `permissions`, `role_permissions` (many-to-many), `user_roles`.
- Enforce permissions with **Postgres Row-Level Security (RLS) policies** tied to `auth.uid()` and a `has_permission(uid, permission_key)` SQL function — never trust client-side checks alone.
- Build a `delete_requests` table (`requested_by`, `target_table`, `target_id`, `reason`, `status`, `approved_by`, `timestamps`). Deletes go through a Supabase Edge Function that inserts the request instead of executing `DELETE`; a separate approval function performs the actual delete only when called by a verified Owner.
- Build an Owner-only admin UI (Next.js protected route) to visually assign roles/permissions — a checkbox matrix per role, similar to Discord's permission screen.

---

## 2. Home Page, Interface & UI/UX

**What to build:**
- Header with org logo.
- A **live banner** showing real-time Available/Full slot counts per time slot (AM/PM).
- Entry-fee banners (e.g., "৳25 Tournament") that link to a tournament detail page showing rules, prize money, and a clean serial list of running slots per time period.
- Auto-notifications pushed to users every 10–15 minutes (or configurable interval) for app updates and tournament announcements.
- Fully responsive, **compact mobile UI** — no pinch-zoom, no horizontal scroll/drag; content must reflow to fit the viewport.

**How to build it:**
- Live banner: subscribe to a Supabase Realtime channel on the `slots` table; update slot counts via `postgres_changes` events so UI updates without polling.
- Tournament page: dynamic route `/tournaments/[id]` using Next.js server components for fast initial load; slot list sorted by time period and serial number.
- Notifications: Supabase Edge Function on a `pg_cron` schedule that queries new updates/tournaments and pushes via Web Push API; store subscriptions in a `push_subscriptions` table.
- Mobile fit: set `viewport` meta with `width=device-width, initial-scale=1, maximum-scale=1`; use Tailwind's responsive utilities and `overflow-x-hidden` on root layout; test with Chrome DevTools device toolbar at 320–375px widths.

---

## 3. Player & Squad Finder (LFG — Looking For Group)

**What to build:**
- A dedicated recruitment section where players can post "looking for squad" or "squad looking for player."
- When a player is confirmed into a squad, their status becomes **Pending** and they're locked from joining any other squad in the app until that match concludes.
- While Pending, the player's contact info (WhatsApp, etc.) is hidden from other users.
- Player profiles show a performance rating (win rate / percentage) based on match history.

**How to build it:**
- Tables: `lfg_posts` (type: player/squad, game, requirements, status), `squad_members`, `player_stats`.
- Add a `status` enum column (`available`, `pending`, `in_match`) on the player profile; enforce with a Postgres trigger that blocks new squad joins while `status = 'pending'`.
- Contact info visibility controlled via RLS policy: only visible to squad members or when `status = 'available'`.
- `player_stats` updated after each tournament result submission (wins, matches played) → compute win-rate as a generated/view column.

---

## 4. Free-Fire-Style Events & Referral System

**What to build:**
- A milestone **progress bar** styled like in-game Free Fire events.
- Referral targets in stages (e.g., 300 referrals = ৳500 reward), resetting on the 1st of every month.
- **Promo Wallet** policy: referral rewards go into a separate wallet that can only be spent on tournament slot purchases — not withdrawable.
- **Winning Wallet**: money earned from actually winning tournaments is withdrawable directly via bKash.
- Referral feature placed prominently on the **home page**, not buried inside the profile section.

**How to build it:**
- Tables: `referrals` (referrer_id, referred_id, created_at), `referral_milestones` (target_count, reward_amount, month), `wallets` split into `promo_balance` and `winning_balance` columns (or two separate wallet rows per user with a `wallet_type` field).
- Use a Postgres function + cron job to reset referral progress on the 1st of each month (archive previous month's data before reset).
- Wallet spend logic: enforce at the database/API layer that promo balance can only be debited via the "buy slot" transaction type — never via a withdrawal transaction type.
- Progress bar as a React component driven by `referral_count / current_milestone_target`.

---

## 5. Ads & Watch-and-Earn

**What to build:**
- Sequential YouTube video watching with visible coin/point value shown next to each video.
- Videos must generate **organic YouTube views, watch time, likes, and comments** on the real channel — not fake/simulated engagement.
- Users can like/comment directly from within the app.

**How to build it:**
- Embed videos using the **YouTube IFrame Player API** (not a generic `<video>` tag) — this is what actually counts toward real YouTube view/watch-time metrics.
- Track watch progress via the IFrame API's `onStateChange`/`getCurrentTime()` events; only credit coins after a minimum watch-time threshold is met server-side (validate on your backend, don't trust the client value alone, to prevent farming).
- Like/comment: use the **YouTube Data API v3** with OAuth on behalf of the logged-in user (requires the user to connect their Google/YouTube account) — this is the only legitimate way to post real likes/comments from your app.
- Table: `watch_earn_videos` (youtube_id, coin_reward, min_watch_seconds), `watch_earn_logs` (user_id, video_id, watched_seconds, credited).
- **Note:** YouTube's API quotas and policies restrict incentivized engagement — review YouTube's Terms of Service / API Policies before launch, since "pay-to-like/comment" schemes can violate platform policy and risk API access being revoked.

---

## 6. Wallet & Minimum Deposit

**What to build:**
- Top-ups via **bKash Personal "Send Money."**
- Minimum deposit threshold (e.g., no cash-in requests below ৳20/25/30).
- Balance auto-added the moment the user submits their bKash TrxID and transaction details.

**How to build it:**
- Table: `deposit_requests` (user_id, amount, trx_id, bkash_number, status, submitted_at).
- Since there's no official bKash merchant API for personal numbers, build a submission form (amount + TrxID) → validate TrxID format and minimum amount server-side → auto-credit `wallets.balance` on submission, then flag it for manual/automated reconciliation.
- Add fraud protection: rate-limit submissions per user, block duplicate TrxIDs (`UNIQUE` constraint on `trx_id`), and give Admin (with `manage_payments` permission) a review dashboard to spot anomalies even though credit is instant.

---

## 7. Unique App Account Number (User ID System)

**What to build:**
- Instead of publicly showing a player's Free Fire UID, generate a unique bank-style app account number per user for internal tracking.

**How to build it:**
- On user signup (Postgres trigger or Edge Function), generate a unique formatted ID (e.g., `BRE-0001234`) stored in a `account_number` column with a `UNIQUE` constraint.
- This becomes the public-facing identifier shown on profiles/leaderboards; the real Free Fire UID stays private and is only used internally to verify match participation.

---

## 8. Performance & Lightweight Optimization

**What to build:**
- Smooth performance on low-end devices (2–3GB RAM phones) with minimal lag and low storage footprint.

**How to build it:**
- Use Next.js **Image component** with automatic compression/lazy-loading; serve images via Supabase Storage with resized variants.
- Minimize client-side JavaScript: prefer Server Components, avoid heavy client libraries, code-split with dynamic `import()` for non-critical UI (e.g., admin panels).
- Avoid large animation libraries; use CSS transitions instead of JS-driven animation where possible.
- Enable Vercel's Edge caching / ISR for static-ish pages (tournament rules, home page shell).
- If wrapping as a mobile app later, prefer a **lightweight PWA** (installable, offline shell via service worker) over a full native/WebView wrapper to keep storage size down.
- Regularly audit with Lighthouse (mobile profile) and test on an actual low-end/throttled device, not just desktop DevTools.

---

## Suggested Build Order

1. **Foundation:** Next.js + Supabase project setup, Auth, base DB schema (users, wallets, roles/permissions with RLS).
2. **Role & permission system** (Section 1) — build this early since almost everything else depends on permission checks.
3. **Wallet + deposit flow** (Section 6) — core monetization plumbing.
4. **Tournament & live slot banner** (Section 2) — the core product.
5. **Unique account number system** (Section 7) — tie into signup flow.
6. **LFG / squad finder** (Section 3).
7. **Referral system + wallets split** (Section 4).
8. **Watch & Earn** (Section 5) — do this later since it has the most external-API/policy dependency risk.
9. **Notifications** (part of Section 2).
10. **Performance pass** (Section 8) — ongoing, but do a dedicated optimization sprint before launch.

---

## Key Risks to Flag Before Building

- **Watch & Earn (Section 5):** incentivized YouTube engagement can violate YouTube's API Terms of Service and risk losing API access — get this reviewed before investing heavily in it.
- **Manual bKash flow (Section 6):** auto-crediting on TrxID submission alone is fraud-prone without an official merchant API; plan for a verification/reconciliation safety net even if credit is instant.
- **RLS is critical:** since Admin/Manager permissions are custom and delete requests must be gated, all of this must be enforced in Postgres RLS/functions, not just hidden in the frontend UI.
