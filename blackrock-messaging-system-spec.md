# Blackrock Esports — Messaging & Announcement System Spec

This module has two distinct parts: (1) a one-way admin announcement board, and (2) a two-way buyer-seller private inbox with built-in moderation and a monetized contact-unlock flow.

---

## 1. Public Announcement / Notice Board (Admin-Only Feed)

**What to build:**
- A homepage section (or dedicated `/announcements` page) that displays official posts.
- Only Admin/Management accounts (based on the role/permission system already defined) can create posts here.
- Regular users/customers can view but cannot post or reply.
- Used for tournament notices, site updates, and official announcements.

**How to build it:**
- Table: `announcements` (`id`, `posted_by` [admin_account_id], `title`, `body`, `pinned`, `created_at`).
- Enforce write access with a Postgres RLS policy: `INSERT`/`UPDATE`/`DELETE` allowed only where `posted_by` has the `send_notifications` or a dedicated `manage_announcements` permission (from the permission matrix already defined). `SELECT` is public.
- This ties directly into Menu 24 (Announcements/Push Notifications) from the admin panel spec — same permission-gated screen can manage both push notifications and this feed.
- Optionally add a "pinned" flag so important announcements stay at the top.

---

## 2. Buyer–Seller Private Inbox (Daraz/Bikroy/Upwork-Style)

**What to build:**
- Any customer can open a seller's/supplier's profile and click "Contact Seller" / "Message" to start a private, in-website chat thread.
- Fully in-app — no external app needed to start the conversation.
- This is a two-party (buyer + seller) private thread, separate from the admin-only announcement board above.

**How to build it:**
- Tables:
  - `conversations` (`id`, `buyer_id`, `seller_id`, `created_at`, `last_message_at`)
  - `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`, `is_flagged`, `contact_unlocked` reference)
- Use **Supabase Realtime** on the `messages` table so both sides see new messages instantly without polling.
- RLS: a message/conversation row is only readable by its `buyer_id` or `seller_id` (or an Admin with a `moderate_messages` permission) — never publicly visible.
- "Contact Seller" button on a seller profile either opens an existing conversation or creates a new one via an API route.

---

## 3. Chat Security & Automatic Link Filter

**What to build:**
- Any message containing a link pattern (`http`, `https`, `www.`, `.com`, `.net`, etc.) is automatically blocked before sending.
- The sender sees a warning instead of the message going through.

**How to build it:**
- Run a **server-side regex filter** in the message-send API route (never rely on frontend validation alone, since it can be bypassed by calling the API directly):
  - Pattern example (illustrative, refine before production): matches `http(s)://`, `www.`, and common TLD patterns like `.com`, `.net`, `.org`, `.io`, etc., including spaced-out attempts like "dot com" or "d o t c o m" if you want stricter filtering.
- On match: reject the insert, return a warning message to the client, and log the attempt (`is_flagged = true`) so Admins can review repeat offenders in the moderation panel.
- Consider also filtering common link-obfuscation tricks (extra spaces/dots, Unicode lookalikes) since determined users will try to evade a naive regex.

---

## 4. Off-Platform Contact / WhatsApp Number Monetization

**What to build:**
- Phone numbers and WhatsApp numbers are automatically detected and hidden/filtered in normal chat — they cannot be exchanged directly for free.
- If a customer wants direct WhatsApp/phone contact with a seller, they must first pay a **service charge**.
- Only after payment is completed does the seller's real contact info become visible to that specific customer.
- Normal text messaging within the app itself remains free — the charge applies only to unlocking direct off-platform contact info.

**How to build it:**
- **Phone number detection:** server-side regex/pattern matching for common phone number formats (with and without country code, spaced/dashed digits) — same server-side enforcement principle as the link filter. Detected numbers get masked (e.g., `01•••••••2`) or the message is blocked with a warning, your choice depending on desired strictness.
- **Unlock flow:**
  - Table: `contact_unlocks` (`id`, `conversation_id`, `buyer_id`, `seller_id`, `amount_paid`, `status`, `unlocked_at`).
  - Customer clicks "Unlock Seller Contact" on the conversation → charged from their wallet (reuse the existing wallet/payment system already built for tournament deposits) → on success, insert a `contact_unlocks` row with `status = 'completed'`.
  - Once unlocked, the frontend checks for an active `contact_unlocks` row for that conversation before revealing the seller's real WhatsApp/phone number (stored separately in the seller's profile, never sent as a plain chat message).
  - Decide split: does the service charge go entirely to the platform (Blackrock Esports), or is it shared with the seller? This should be a configurable setting (Site Settings menu) since it affects seller incentives.
- **Enforcement:** even after unlock, the actual number should be delivered via a dedicated UI element ("Reveal Contact" button showing the number), not by allowing it through the normal message filter — keeps the block airtight and the transaction auditable.

---

## 5. Admin Panel Integration

**What to build:**
- The entire messaging system (announcements + buyer-seller inbox) should be visible/manageable from the admin panel.

**How to build it — new admin menu items to add to the existing 25-menu structure:**
- **Menu: Announcement Management** *(already covered under Menu 24, just extend it to include this board)*.
- **Menu: Chat Moderation** — view flagged messages (link/number attempts), search/monitor conversations if needed for dispute resolution, ban/warn repeat offenders.
- **Menu: Contact Unlock Transactions** — log of all paid unlocks (buyer, seller, amount, timestamp) — feeds into the existing Revenue & Payout Reports menu (Menu 17) as a new revenue stream.
- **Menu: Service Charge Settings** *(Owner-only, under Site Settings)* — configure the unlock price, and the platform/seller revenue split if applicable.
- All of this is permission-gated the same way as the rest of the admin panel — a `moderate_messages` permission key should be added to the permission matrix so it can be assigned independently.

---

## Key Notes / Risks to Flag

- **Server-side enforcement is non-negotiable** for both the link filter and the number filter — determined users will try to bypass frontend-only checks (typing numbers as words, spacing out letters, using images of text, etc.). Plan for iterative filter improvement post-launch, not a one-time perfect regex.
- **Users may still try to evade filters via images or voice notes** if you later add media messages — decide up front whether media attachments are allowed in this inbox at all, since they bypass text-based filtering entirely.
- **Legal/policy consideration:** charging for revealing contact info is a real monetization model (similar to freelance platforms), but make sure the pricing and refund policy (what if the seller doesn't respond after unlock?) is clearly stated to avoid disputes — consider a Menu item for a clear refund/dispute policy tied to unlock transactions.
