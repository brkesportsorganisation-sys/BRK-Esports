# Blackrock Esports — Vendor System (Full Setup, Admin-Created Credentials)

This replaces the "self-signup + approval" model with an **Owner-controlled credential creation model** — same architecture as the sub-admin system, extended for vendors.

---

## 1. Core Concept

- Vendors **do not self-register**. Only the **Owner** (or an Admin with a `manage_vendors` permission) creates a vendor account directly from the admin panel — a username + password, just like sub-admin creation.
- Every vendor account has an **access tier**:
  - **Limited Access** (default for new vendors) — can create/manage their own tournaments and view their own earnings, but restricted from sensitive actions (see table below).
  - **Full Access** — trusted/established vendors get expanded control, closer to near-autonomous management of their own tournament operations.
- The Owner can **upgrade a vendor from Limited → Full** (or downgrade back) at any time from the admin panel, without the vendor needing to do anything.
- This reuses the exact same JWT + permission-matrix architecture already built for sub-admins — a vendor account is really just another row in a credentialed-accounts system, scoped by `vendor_id` instead of by admin permission.

---

## 2. Data Model

- **`vendor_accounts`** (`id`, `username`, `password_hash`, `vendor_id`, `access_tier` [`limited`/`full`], `is_active`, `created_by`, `created_at`) — the login credential itself, separate table from the public `vendors` profile info (org name, logo, public rating, etc.) which already exists in the base vendor spec.
- **`vendor_permissions`** — a permission list scoped to vendor-relevant actions only (smaller set than the full admin permission matrix). Example keys:
  - `create_tournaments`
  - `edit_own_tournaments`
  - `manage_own_slots`
  - `submit_results`
  - `view_own_earnings`
  - `request_payout`
  - `edit_store_profile` (logo, description, public page)
  - `set_custom_entry_fees` (vs. platform-fixed fee ranges)
  - `delete_own_tournament` (dangerous — see tier table below)
- **`vendor_account_permissions`** — join table, same checkbox-matrix pattern as sub-admins. **Access Tier sets the default checkbox state**, but the Owner can still fine-tune individual vendors beyond the tier default if needed (tier = starting template, not a hard lock).

---

## 3. Access Tier Defaults

| Permission | Limited (new vendor default) | Full (trusted vendor) |
|---|---|---|
| Create tournaments | ✅ | ✅ |
| Edit own tournaments | ✅ (pre-live only) | ✅ (anytime) |
| Manage own slots | ✅ | ✅ |
| Submit results | ✅ | ✅ |
| View own earnings | ✅ | ✅ |
| Request payout | ✅ (manual review every time) | ✅ (faster/auto-approved review) |
| Edit store/public profile | ❌ (Admin sets it initially) | ✅ |
| Go live without Admin pre-approval | ❌ (all tournaments need review — Section 4 of the base vendor spec) | ✅ (auto-published, spot-checked) |
| Set custom commission rate negotiation | ❌ (fixed default rate) | ✅ (Owner can assign a custom lower rate) |
| Delete own tournament directly | ❌ (still routes through delete-request → Owner approval, like everything else in the system) | ❌ *(recommend keeping this Owner-gated for every tier — it's a shared safety rule, not tier-based)* |

This table is the **starting template** applied automatically when the Owner picks a tier during vendor creation — but every checkbox remains individually editable afterward.

---

## 4. Admin Panel: Vendor Credential Management Screen

**What the Owner sees/does (new admin panel menu — "Vendor Accounts"):**
1. **Create Vendor** — form with: organization name, contact info, username, auto-generated or manual password, **access tier selector (Limited/Full)**.
2. **Vendor List** — table of all vendors: username, org name, tier, status (active/suspended), earnings summary, tournaments count.
3. **Edit Vendor Access** — open a vendor row → see the full permission checkbox matrix (pre-filled from their tier) → toggle individual permissions if you want to deviate from the tier default.
4. **Change Tier** — one-click promote Limited → Full (or demote), which resets checkboxes to that tier's template (with a confirmation, since it overwrites custom tweaks unless the Owner chooses "keep custom permissions").
5. **Suspend/Deactivate Vendor** — immediately blocks login (`is_active = false`), unpublishes their live tournaments.
6. **Reset Password** — Owner can force-reset a vendor's password (e.g., if compromised or vendor forgets it).

---

## 5. Vendor Login & Session

**How to build it:**
- Same pattern as the sub-admin login (`/api/vendor/login` route, separate from both player Auth and admin Auth — three distinct login surfaces: Player, Admin/Sub-admin, Vendor).
- On successful login, issue a JWT containing `vendor_id`, `access_tier`, and the resolved permission list.
- Vendor dashboard (`/vendor-panel`) reads this JWT to render only the menus/actions the vendor's permissions allow — same "hide AND block server-side" rule as the admin panel; a Limited vendor hitting a Full-only API route directly must be rejected server-side, not just hidden in the UI.

---

## 6. Vendor Dashboard Menus (reused from the base vendor spec, now permission-gated per tier)

1. My Tournaments
2. My Slots
3. My Results
4. My Earnings
5. My Payout Requests
6. My Store/Profile Page *(Full tier only, per the table above; Limited vendors submit changes to Admin instead)*

---

## 7. What Stays the Same From the Base Vendor Spec

Everything else from the earlier vendor system doc still applies as-is on top of this credential layer:
- **Commission split** (`vendor_earnings` table, platform cut vs vendor net) — tier can optionally affect the commission rate (Full-tier vendors negotiable, Limited fixed default).
- **Escrow-style payout** — hold vendor earnings until tournament + prize distribution is confirmed complete, regardless of tier, to protect player trust.
- **Public tournament labeling** ("Hosted by [Vendor Name]") and vendor storefront page.
- **Rating/review system** feeding into whether a vendor is a good candidate for Owner to promote from Limited → Full.
- **Reports/disputes** flow if a vendor doesn't deliver — still routes to the admin Reports & Complaints menu.

---

## 8. Key Security Rules (same principles as sub-admin system, restated for vendors)

1. **Every vendor permission check happens server-side / via RLS**, scoped by `vendor_id` — a Limited vendor must never be able to query or act on another vendor's data, ever, even by guessing IDs in a URL.
2. **Password hashing** (bcrypt/argon2), no plain text, same as sub-admin accounts.
3. **Owner-only actions**: creating vendor accounts, changing tiers, resetting passwords, and final approval on delete/suspend requests — a vendor (even Full tier) should never be able to grant itself more access.
4. **Audit log**: log every tier change, permission edit, and suspend/reactivate action against a vendor account (`vendor_admin_log`: who did it, what changed, when) — this protects the Owner if a vendor disputes an action later.
5. **Session expiry** for vendor logins, same as admin (e.g. 8–12 hours), especially since vendors handle money (their own earnings + entry fees collected from players).

---

## Suggested Build Order for This Module

1. `vendor_accounts` + `vendor_permissions` + `vendor_account_permissions` tables, with RLS scoped by `vendor_id`.
2. Vendor login route + JWT issuance.
3. Admin panel "Vendor Accounts" screen (create/list/edit/tier-change/suspend).
4. Vendor dashboard shell with dynamic, tier/permission-aware sidebar.
5. Wire vendor's tournament CRUD into the existing `tournaments` table (already has `vendor_id` column from the base spec) with permission checks.
6. Commission/earnings/payout logic (mostly already spec'd — just connect it to this new credential layer).
7. Audit logging last, once the core flows are stable, so you're logging real action shapes and not guessing the schema early.
