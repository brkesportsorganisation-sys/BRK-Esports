# Blackrock Esports — In-App Squad Building System Spec

This is a permanent, structured team system — different from the earlier LFG (Looking-For-Group) matchmaking feature. LFG is for finding one-off match partners; this Squad system is for building a persistent, named team with defined roles, similar to a clan/organization.

---

## 1. Squad Creation

**What to build:**
- Any player can create a squad by giving it a **name** (and ideally a tag/short code + logo/avatar, common in esports team setups).
- Squad creator becomes the initial **Leader** by default (can be reassigned later).

**How to build it:**
- Table: `squads` (`id`, `name`, `tag`, `logo_url`, `game` [Free Fire/Valorant/eFootball — a squad could be game-specific since rosters differ by game], `created_by`, `created_at`).
- Enforce a unique squad name/tag per game via a `UNIQUE` constraint to avoid duplicate/confusing team names.

---

## 2. Roles Within a Squad

**What to build:**
- Players select their **in-game role** when joining: e.g., Rusher, Sniper, Support, IGL (In-Game Leader), etc. — role list should be configurable per game (Valorant roles differ from Free Fire roles).
- Dedicated **Manager** and **Coach** slots — non-playing roles responsible for team admin/strategy.
- A **Leader** role — one designated squad owner with control permissions.

**How to build it:**
- Table: `squad_members` (`id`, `squad_id`, `user_id`, `member_type` [`player`/`manager`/`coach`], `in_game_role` [nullable, only applies to `player` type — e.g. `rusher`, `sniper`, `support`, `igl`], `is_leader` [boolean], `joined_at`, `status` [`active`/`invited`/`removed`]).
- Table: `game_roles` (`id`, `game`, `role_name`) — an admin-configurable lookup table so you can add/edit role options per game (e.g. Free Fire: Rusher/Sniper/Support; Valorant: Duelist/Controller/Sentinel/Initiator) without a code change.
- Leader permissions (enforced via RLS): edit squad info, assign/change roles, promote/demote members, remove members, transfer leadership, disband squad (disband likely should route through the same delete-request pattern used elsewhere if you want an extra safety net, though a squad is the player's own data so this can be a lighter-weight confirmation rather than full Owner-approval).

---

## 3. Adding Members — Search by ID/Username

**What to build:**
- Leader (and possibly regular members, if you want open invites) can search for other players by their **app account number** (the bank-style unique ID from the earlier spec) or **username**, and send them a squad invite.

**How to build it:**
- Search API: `GET /api/players/search?q=...` — matches against `account_number` and `username`, returns limited public info (name, avatar, current squad status) — never expose sensitive data (phone, wallet) in this search.
- Sending an invite creates a `squad_members` row with `status = 'invited'` (not yet `active`).
- The invited player gets a notification (reuse the existing notification system) and must **accept** before becoming an active member — never auto-add someone without their confirmation.
- A player already in another active squad for the same game should either be blocked from accepting a second invite, or accepting should require them to leave their current squad first — decide this based on whether multi-squad membership is allowed (recommend: **one active squad per game** to avoid roster conflicts, similar to the Pending-lock logic already used in the LFG system).

---

## 4. Adding Members — Shareable Invite Link

**What to build:**
- An alternative invite method: generate a shareable link that, when opened by any player, lets them request/join the squad directly (instead of the leader searching them individually).

**How to build it:**
- Table: `squad_invite_links` (`id`, `squad_id`, `token` [random unique string], `created_by`, `expires_at` [optional], `max_uses` [optional], `is_active`).
- Route `/squad/join/[token]` — when opened by a logged-in player, shows squad preview (name, logo, current roster) and a "Join" button.
- On join: same flow as a direct invite — either auto-added as `active` or set to a `pending_approval` state if you want the Leader to approve link-joins manually (recommended, so randoms can't flood a squad through a leaked link).
- Leader can **revoke/regenerate** the link at any time (`is_active = false` on the old token, generate a new one) in case it's shared too widely.

---

## 5. Squad Profile / Public Page

**What to build (natural extension, worth adding):**
- A public squad page showing: name, tag, logo, game, full roster with roles (Leader/Manager/Coach/Players and their in-game roles), and squad-level stats (aggregate win rate, tournaments played, tournaments won).

**How to build it:**
- Route `/squads/[squad_id]` — server-rendered, pulls from `squads` + `squad_members` + aggregated `player_stats`/`tournament_results` already defined in earlier specs.
- This also gives squads something to feel like a real "team," which helps with the platform's community/retention goals (ties into the leaderboard idea from the earlier feature-brainstorm list).

---

## 6. Admin Panel Integration

**What to build:**
- Add a **Squad Management** menu to the existing admin panel structure:
  - View all squads, search by name/tag.
  - Moderate: remove inappropriate squad names/logos, disband a reported squad (routes through the delete-request → Owner approval flow, since disbanding by an Admin affects other people's data, not just the requester's own).
  - View squad rosters for dispute resolution (e.g., if two squads claim the same player was on their roster during a tournament).

---

## Suggested Data Flow Summary

1. Player creates squad → becomes Leader → `squads` row + first `squad_members` row (`is_leader = true`).
2. Leader/members search players → send invite → invited player accepts → `squad_members.status` becomes `active`.
3. OR Leader generates invite link → shares it (Discord, WhatsApp, wherever) → other player opens it → requests to join → Leader approves (or auto-joins, per your config) → `active`.
4. Leader assigns/edits roles per member (`in_game_role`, `member_type`).
5. Squad now appears as a unit when registering for tournaments (ties into the existing Tournament Registration flow — a squad registers as a whole roster instead of individual players signing up separately).

---

## Key Design Decisions to Confirm Before Building

- **One active squad per game per player, or can a player be in multiple squads simultaneously?** (Recommend: one per game, to keep tournament rosters unambiguous.)
- **Can regular members invite others, or only the Leader/Manager?** (Recommend: Leader + Manager can invite; regular players can only request, not directly invite, to avoid roster spam.)
- **Do link-joins need Leader approval, or auto-join?** (Recommend: approval required by default, to prevent leaked links from flooding a squad.)
- **Minimum/maximum roster size per game** — e.g., Free Fire squad = 4 players + optional manager/coach; Valorant = 5 players + optional manager/coach — should be enforced per `game` in the `squads` table logic.
