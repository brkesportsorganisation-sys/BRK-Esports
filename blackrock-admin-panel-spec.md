# Blackrock Esports — Admin Panel Full Specification

## Core Concept: Custom Credential-Based Access (Discord-Style)

This is the foundation the whole panel is built on, so it comes first.

**What it means:**
- The **Owner account** is the only "master" login (tied to the Owner's real Supabase Auth account).
- The Owner can create **sub-admin credentials** (a username + password, not necessarily an email-based signup) for anyone — a moderator, a payment handler, a tournament host, etc.
- When creating a credential, the Owner picks **exactly which menu items / actions** that account can see and use — via a permission checkbox list (like assigning roles in Discord).
- Someone logging in with that username/password sees **only** the menus/features the Owner enabled for them. Everything else is invisible — not just greyed out, but not rendered and not accessible even via direct URL.

**How to build it (technical):**
1. **Separate `admin_accounts` table** (independent of the public-facing player `users` table):
   - `id`, `username`, `password_hash` (bcrypt/argon2 — never plain text), `display_name`, `created_by` (Owner's id), `is_active`, `created_at`.
2. **`permissions` table** — a master list of every controllable action/menu (e.g. `manage_tournaments`, `manage_wallet_deposits`, `manage_wallet_withdrawals`, `manage_users`, `approve_deletes`, `manage_roles`, `view_analytics`, ... one row per permission below).
3. **`admin_account_permissions`** — join table (`admin_account_id`, `permission_key`) — this is literally the checkbox matrix the Owner fills in when creating/editing an account.
4. **Custom login flow** (not standard Supabase email/password Auth, since these are internal usernames, not emails):
   - Build a Next.js API route `/api/admin/login` that checks `username` + `password_hash` against `admin_accounts`.
   - On success, issue a **signed JWT** (or use Supabase's custom claims) containing `admin_account_id` and the list of permission keys, stored in an httpOnly secure cookie.
   - Every admin page and every API route checks this JWT server-side before rendering data or performing actions — **never rely on hiding a menu in the frontend alone.**
5. **Dynamic sidebar rendering** — the admin panel layout reads the JWT's permission list and renders only the matching menu items.
6. **Every sensitive/destructive action still routes through the delete-request → Owner-approval flow** described earlier, regardless of what permission the sub-admin has — permission to "manage" something ≠ permission to permanently delete it.
7. **Audit log** — every action taken by any non-Owner account is logged (`admin_activity_log`: who, what, when, before/after values) so the Owner can review what each credential did.
8. Owner should be able to **instantly revoke or edit** any account's permissions or deactivate it entirely (`is_active = false` immediately blocks login).

---

## Full Menu List (25 menus, grouped into 8 sections)

### A. Dashboard & Overview
1. **Main Dashboard** — live stats: active tournaments, slots filled today, today's deposits/withdrawals, pending approvals count, recent activity feed.
2. **Notifications Center (Admin-side)** — system alerts: suspicious deposits, repeated failed logins, pending delete requests.

### B. Tournament Operations
3. **Tournament Management** — create/edit/close tournaments (game, entry fee, prize pool, rules, schedule).
4. **Slot Management** — open/close slots per AM/PM session, view live fill status, reorder serials.
5. **Result Entry** — submit match results, kills, placements, winners.
6. **Bracket / Match Scheduling** — for knockout-style tournaments, manage bracket progression.
7. **Tournament History & Archive** — past tournament records, searchable.

### C. User & Community Management
8. **User Management** — search/view all players by app account number, name, phone; view wallet, match history.
9. **Ban / Suspend Management** — suspend accounts (routes through delete-request flow if handled by non-Owner).
10. **LFG / Squad Moderation** — manage squad-finder posts, clear stuck "Pending" statuses, remove spam.
11. **Team/Clan Management** *(if added later)* — approve team registrations, manage team stats.
12. **Reports & Complaints** — player-submitted reports (cheating, no-show, abuse) with a review/resolution workflow.

### D. Financial / Wallet Management
13. **Deposit Requests** — bKash TrxID submissions, auto-credited log, flagged/suspicious entries.
14. **Withdrawal Requests** — Winning Wallet withdrawal approvals (recommend manual review even if deposits are automatic).
15. **Manual Balance Adjustment** — with mandatory reason field, fully logged.
16. **Promo Wallet vs Winning Wallet Overview** — separate visibility of referral-earned vs match-won balances.
17. **Revenue & Payout Reports** — entry-fee income vs prize payouts vs referral payouts, daily/weekly/monthly.

### E. Referral & Rewards
18. **Referral Program Management** — set/edit milestone targets and rewards, view current progress, manual month-reset trigger.
19. **Watch & Earn Management** — add/remove YouTube videos, set coin rewards and minimum watch time, review watch logs for farming/bot patterns.
20. **Daily Check-in / Loyalty Rewards** *(if added)* — configure streak bonuses.

### F. Access & Security
21. **Role & Permission Management** *(Owner-only)* — create sub-admin credentials, assign the permission checkbox matrix, edit/revoke access.
22. **Delete Request Approval Queue** *(Owner-only)* — approve/reject pending deletions with full context.
23. **Admin Activity Log** *(Owner-only)* — full audit trail of every sub-admin action.

### G. Content & Communication
24. **Announcements / Push Notifications** — compose and schedule notifications, set auto-interval (10–15 min), view send history.
25. **Site Settings** *(Owner-only)* — logo, banner text, minimum deposit amount, bKash number, general config, language toggle.

---

## Permission Matrix Example (what the Owner checkbox screen looks like)

| Permission Key | What it unlocks |
|---|---|
| `view_dashboard` | Menu 1 |
| `manage_tournaments` | Menus 3, 4, 6 |
| `enter_results` | Menu 5 |
| `manage_users` | Menu 8 |
| `manage_bans` (delete-request gated) | Menu 9 |
| `moderate_lfg` | Menu 10, 12 |
| `manage_deposits` | Menu 13 |
| `manage_withdrawals` | Menu 14 |
| `adjust_wallets` | Menu 15 |
| `view_financial_reports` | Menus 16, 17 |
| `manage_referrals` | Menu 18 |
| `manage_watch_earn` | Menu 19 |
| `manage_roles` (Owner-only, never assignable) | Menu 21 |
| `approve_deletes` (Owner-only, never assignable) | Menu 22 |
| `send_notifications` | Menu 24 |
| `manage_settings` (Owner-only recommended) | Menu 25 |

Each row = one checkbox in the "create/edit sub-admin account" screen. The Owner ticks whichever apply, and that account's sidebar + API access is scoped to exactly those.

---

## Key Security Rules to Enforce

1. **Two permissions should never be assignable to anyone but the Owner:** `manage_roles` (creating other admin accounts) and `approve_deletes` (final delete approval). If a sub-admin could grant themselves more access or approve their own delete requests, the whole system is bypassable.
2. **Every permission check happens server-side** (API route / RLS policy), not just in the React UI — a hidden menu is not real security.
3. **Passwords:** hash with bcrypt/argon2, never store plain text; enforce a minimum password strength for sub-admin accounts.
4. **Session expiry:** admin JWTs should expire (e.g. 8–12 hours) and require re-login, especially for accounts with financial permissions.
5. **Rate-limit login attempts** on `/api/admin/login` to prevent brute-forcing sub-admin credentials.
6. **Log everything:** the `admin_activity_log` is what lets the Owner actually trust giving out limited access — make sure every write action logs who/what/when/old value/new value.
