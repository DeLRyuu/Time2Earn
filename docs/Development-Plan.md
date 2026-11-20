# Time2Earn — Antigravity Phase Prompts (Credit-Efficient Edition)

One prompt per phase. Paste them into Antigravity **one at a time, in order**. Each phase has:

1. **Prompt** – copy/paste into Antigravity
2. **Commit message** – use after you review and approve the work
3. **Report** – what Antigravity must hand back (kept short on purpose)

---

## 0. How to use this file (and save AI credits)

### Credit-saving strategy

| Technique | Why it saves credits |
|---|---|
| **Shared rules file** (`docs/T2E_RULES.md`) saved once | The long global rules are never re-pasted or re-explained in each prompt |
| **Context file** (`docs/T2E_CONTEXT.md`), built in Phases 0–1 | Later phases read one small file instead of re-scanning the whole repo |
| **Progress file** (`docs/T2E_PROGRESS.md`) | Each phase appends 5–10 lines; the next phase starts from it. No need to carry chat history |
| **Short reports saved to disk** (`docs/reports/phase-N.md`) | Reports are reusable and capped in length |
| **Targeted reads** | Open only the files a phase needs; use search/grep, not "read everything" |
| **One build/test run at the end of a phase** | No repeated full builds while editing |
| **Stop-and-ask rule** | If something is ambiguous, Antigravity asks instead of looping or guessing |
| **New chat per phase** | A fresh, small context is cheaper than one huge long thread |

### Suggested mode per phase (if your Antigravity version has a mode/model picker)

- **Planning / stronger model:** Phases 0, 1, 3, 5, 6, 9, 14, 17 (logic- or security-heavy)
- **Fast / cheaper model:** Phases 2, 4, 7, 10, 11, 12, 13, 15, 18 (mostly UI or wiring)
- Phases 8 and 16: use Fast mode, switch to the stronger model only if something fails.

### Step 0 — Do this manually (costs zero credits)

1. Put your Firestore backup and the old Play Cred source in the repo (or a known folder).
2. Create `docs/T2E_RULES.md` and paste the block below into it.
3. Create empty `docs/reports/` folder.
4. Commit: `docs: add Time2Earn global rules`

#### `docs/T2E_RULES.md` (paste exactly)

```text
TIME2EARN — GLOBAL RULES (apply to every phase)

PRODUCT
Time2Earn = gaming-shop loyalty website (rebrand/rebuild of "Play Cred").
Loop: PLAY -> EARN -> LEVEL UP -> REDEEM. Browser-first, mobile-first.
Style: modern gaming + arcade + esports + light RPG + clean SaaS. Not childish.

DATA SAFETY (highest priority)
- Existing Firestore is the source of truth. Same collections, same document IDs.
- Collections: config, users, rewards, redemption_requests, reward_cooldowns,
  session_requests, debts, debt_history, debt_payment_requests,
  credit_transactions, logs.
- NEVER: delete/rename collections, duplicate users, reset Credits/EXP/rank/streak/debts,
  run destructive migrations, or create time2earn_* copies of old data.
- New collections ONLY when a genuinely new feature needs persistent data.
- Never run write scripts against production data. Use the emulator or read-only checks
  unless I explicitly say otherwise.

BUSINESS RULES
- Do not hardcode config values (rates, rank thresholds, debt tiers, reset days).
  Read them from Firestore `config`.
- Credits and EXP are separate. Never merge them in UI or logic.
- Do not invent business rules. If existing code/data defines behavior, reuse it.
  If unclear: inspect source/data first; if still unclear, STOP AND ASK me.
- Respect `isActive` on rewards. Never auto-activate inactive rewards.
- Preserve the approval model: sessions and redemptions are requested by players
  and approved/rejected by admin.
- Debt payments: do NOT assume the global creditToPhpRate. Check existing code
  (a backup record has rateUsed = 0.4).

SECURITY
- Player and Admin experiences are separate.
- Credits/EXP/rank/balance changes must be server-authoritative and protected
  (backend/Cloud Function/server route + Firestore rules). Never trust client checks.
- Never expose, log, or migrate plaintext passwords. Keep staff-assisted reset UX.

CREDIT-SAVING WORK STYLE (important)
- Read docs/T2E_CONTEXT.md and docs/T2E_PROGRESS.md first. Do NOT re-scan the whole repo.
- Open only files needed for this phase. Prefer search over reading whole files.
- No unrelated refactors, no extra features, no future-phase work.
- Run the build/tests once at the end of the phase, not after every edit.
- Fix only failures caused by this phase.
- Keep the final report short (max ~150 words) and save it to docs/reports/phase-N.md.
- Append 5-10 lines to docs/T2E_PROGRESS.md (what exists, key file paths, open issues).
- Do not commit. I will review and commit.

UI
- Mobile: bottom nav (Home, Rewards, Arcade, Leaderboard, Profile). Desktop: sidebar.
- Large touch targets, good contrast, no horizontal scroll, short tasteful animation.
- Brand: Time2Earn. Tagline: Play. Earn. Rank Up. Redeem.
```

### Standard report format (every phase uses this)

```text
PHASE N REPORT
Done:        (bullets, max 6)
Files:       (key files added/changed, max 10 lines)
Tested:      (what was run + result)
Assumptions: (bullets, or "none")
Verify before next phase: (bullets, or "none")
Known issues: (bullets, or "none")
```

---

# PHASE 0 — Project Discovery & Existing Code Audit

**Mode:** stronger model. **Writes code:** no (docs only).

### Prompt

```text
Read docs/T2E_RULES.md first.

ROLE: You are doing Phase 0 of Time2Earn: a READ-ONLY audit of the existing Play Cred project.

OBJECTIVE: Produce docs/T2E_CONTEXT.md, a compact technical map that later phases will
read instead of re-scanning the repo.

INSPECT (search/grep, do not dump files):
- Framework, language, package manager, key dependencies, scripts
- Firebase init, Firestore usage, auth implementation (how uid, username, role,
  password fields are used)
- Routes/pages, player vs admin separation
- Where business logic lives (credit calc, EXP, rank, rewards, cooldowns, streaks,
  debts, logs)
- Env variables (names only, never values), Firestore rules, indexes, deployment config
- Reusable components

OUTPUT docs/T2E_CONTEXT.md with these sections, each tight:
1. Stack & scripts
2. Firebase/Firestore setup
3. Auth model (exact current behavior)
4. Route map
5. Business-logic locations (file:function for each rule)
6. Existing security rules summary
7. Reusable components
8. Risks / unknowns
Also create docs/T2E_PROGRESS.md with a Phase 0 entry.

DO NOT: modify any source, config, or data. Do not print secrets. No refactors.

ACCEPTANCE: Context file exists, is under ~250 lines, and every business rule points
to a file path.

VALIDATION: Confirm git status shows only new files under docs/.

OUTPUT: Standard report -> docs/reports/phase-0.md
```

**Commit message:** `docs(phase-0): add project audit and technical context map`

**Report must include:** framework, where auth/business logic live, top 3 risks.

---

# PHASE 1 — Firestore Schema & Business Logic Contract

**Mode:** stronger model. **Writes code:** no (docs only).

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_PROGRESS.md.

ROLE: Phase 1 of Time2Earn: document the existing database and business rules.

OBJECTIVE: Create docs/T2E_SCHEMA.md, the contract all later phases must follow.

METHOD:
- For each collection, sample only a few docs from the backup file using a small script
  or search (do not paste the whole backup). Report field names, types, example values,
  optional fields, and status enums.
- For every business rule, read the ACTUAL existing code (locations are in T2E_CONTEXT.md)
  and describe the exact behavior, including rounding.

DOCUMENT:
- Collections, fields, types, relationships (userId, unitId, etc.)
- Status values (session, redemption, debt, payment request)
- Credit calculation from amountPaid (exact formula + rounding)
- EXP calculation
- Rank calculation from config thresholds
- Reward eligibility (isActive, minRank, creditCost, cooldownMinutes)
- Cooldown logic
- Streak logic (streak, lastStreakDate, streakClaimedDate, streakRecoveryCharges,
  streakRecoveryMonth, redeemStreak, lastRedeemDate)
- Debt logic (tiers, restrictions, which rate debt payments really use)
- Log action names and shape
- What happens to each collection on approve/reject (exact writes)

Mark anything not determinable as "UNKNOWN - needs owner decision". Do not guess.
Add a short "Open questions" list at the end.

DO NOT: change source or data; invent rules.

ACCEPTANCE: Every collection and every rule in the list above is covered; unknowns
are explicitly flagged; formulas match existing code.

OUTPUT: Standard report -> docs/reports/phase-1.md. Update T2E_PROGRESS.md.
```

**Commit message:** `docs(phase-1): add Firestore schema and business-logic contract`

**Report must include:** list of UNKNOWN items I need to answer before Phase 5.

---

# PHASE 2 — Application Foundation

**Mode:** fast model. 

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 2 of Time2Earn: application foundation and design system.

OBJECTIVE: Set up the Time2Earn shell that all later phases plug into.

TASKS:
- Project structure and routing skeleton for /player/* and /admin/* (placeholder pages ok)
- Reuse the existing Firebase init; add env config (document variable NAMES in
  .env.example, no secrets)
- Shared layout: mobile bottom nav (Home, Rewards, Arcade, Leaderboard, Profile),
  desktop sidebar
- Design tokens (colors, spacing, type, radius, glow), dark gaming theme
- Reusable components: Button, Card, ProgressBar, Badge, Modal, Toast, Skeleton,
  EmptyState, ErrorBoundary
- Global loading and error handling
- Visible rebrand Play Cred -> Time2Earn + tagline "Play. Earn. Rank Up. Redeem."
  (UI text only; do not change any database value)
- Config hook that reads Firestore `config` (read-only) and exposes it app-wide

DO NOT: build real features, change auth, touch business logic, change DB values,
add heavy animation libraries.

ACCEPTANCE: App builds and runs; both layouts render; no horizontal scroll at 360px;
config hook returns real config values; no "Play Cred" text left in the UI.

VALIDATION: Run build once. Open the app and check mobile + desktop widths.

OUTPUT: Standard report -> docs/reports/phase-2.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-2): add Time2Earn app shell, design system and config hook`

**Report must include:** component list and where design tokens live.

---

# PHASE 3 — Authentication & Authorization

**Mode:** stronger model. 

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 3 of Time2Earn: secure authentication and authorization.

BEFORE CODING: Re-read the existing auth code listed in T2E_CONTEXT.md. Preserve how
the existing account identity (uid, username, role) works. If the safest design is
unclear, STOP and ask me with 2-3 options and your recommendation.

TASKS:
- Player login and admin login, session persistence, logout
- Route guards: player-only and admin-only (manual navigation to /admin as a player
  must fail)
- Staff-assisted password recovery: admin verifies player -> secure reset ->
  temporary credential or reset flow -> player changes it on next login
- Do NOT expose existing passwords in any UI; do NOT log passwords; do NOT silently
  migrate plaintext passwords into a new provider without telling me the plan first
- Server-side role checks for privileged operations
- Firestore security rules: players read only their own user doc and own requests;
  only admin can write rewards/config/debts/logs; players cannot write balances,
  rank, EXP, status fields
- Test rules with the emulator if available

DO NOT: change user document IDs, delete users, alter balances, or weaken existing rules.

ACCEPTANCE:
- Player can log in and sees only own data
- Player visiting /admin is blocked
- Direct Firestore write attempts to credits/exp/rank by a player are denied
- Admin reset action creates an audit log entry without any password in it

VALIDATION: Run rules tests/emulator checks, then manual login as player and admin
(using test accounts only).

OUTPUT: Standard report -> docs/reports/phase-3.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-3): add role-based auth, route guards, staff reset and Firestore rules`

**Report must include:** the auth approach chosen, rules summary, any plaintext-password decision I must approve.

---

# PHASE 4 — Player Dashboard

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 4 of Time2Earn: player dashboard (/player/home).

TASKS (read-only; all values from existing Firestore users/config/rewards/logs):
- Header: "Welcome back, <username>"
- Stat cards: Credits (💰), Rank (🏆), EXP (⭐ current / next threshold), Streak (🔥 days).
  Credits and EXP must be visually distinct.
- Rank progress: current rank, next rank, EXP remaining, progress bar. Thresholds come
  from config, never hardcoded. Handle top rank (no next rank).
- Quick actions: Play & Earn, Rewards, Arcade, Leaderboard (Arcade/Leaderboard may link
  to "coming soon" placeholders)
- Featured rewards (active rewards only, max 2-3)
- Recent activity (last ~5 items from the player's own records; read only what the
  player is allowed to read)
- Loading skeletons and empty states; mobile-first

DO NOT: write to Firestore, recompute or "fix" stored values, expose other players' data.

ACCEPTANCE: Existing player (e.g., one with 863 EXP) shows correct rank and progress
from stored data; top-rank player doesn't crash; works at 360px.

VALIDATION: Build once; check two or three real accounts.

OUTPUT: Standard report -> docs/reports/phase-4.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-4): add gamified player dashboard with rank progress`

**Report must include:** which Firestore reads the page performs (to watch read costs).

---

# PHASE 5 — Session / Play & Earn

**Mode:** stronger model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 5 of Time2Earn: Play & Earn session workflow.

BEFORE CODING: Use the EXACT existing logic documented in T2E_SCHEMA.md for credit
calculation, rounding, EXP, streak updates, and logs. If any item is marked UNKNOWN,
STOP and ask me.

PLAYER FLOW: select unit -> enter amount paid -> see calculated Credits (rate from
config) -> submit -> status pending. Show the player's own request history with status.

ADMIN FLOW: pending list with player, unit, amount, credits, requested time ->
Approve / Reject (rejection reason if existing system has one).

SERVER-AUTHORITATIVE: Credit/EXP/streak updates on approval run in a protected backend
function (or equivalent) using a Firestore transaction. Client only shows a preview.
Make approval idempotent (approving twice must not double-award).

WRITES: Use existing session_requests fields (amountPaid, creditsEarned, requestedAt,
resolvedAt, status, unitId, userId, username), existing credit_transactions and logs
(session_requested, session_approved, session_rejected). No duplicate records.

DO NOT: let the client set creditsEarned authoritatively, create new collections,
change formulas.

ACCEPTANCE:
- Preview matches existing examples (e.g., 10 PHP -> 13.80 Credits at rate 1.38,
  using the existing rounding rule)
- Approve updates credits/EXP once; reject changes nothing but status/log
- Player cannot approve own request

VALIDATION: Run against the emulator or test accounts; run unit tests for the formula.

OUTPUT: Standard report -> docs/reports/phase-5.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-5): add session request and server-side admin approval flow`

**Report must include:** formula/rounding used, idempotency approach, tests run.

---

# PHASE 6 — Rewards Shop

**Mode:** stronger model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 6 of Time2Earn: rewards shop and redemption workflow.

BEFORE CODING: Follow the existing redemption/cooldown/streak behavior in T2E_SCHEMA.md.
STOP and ask if anything is UNKNOWN.

PLAYER UI (/player/rewards): category tabs (All, Play Time, Snacks, Game Top-Up) mapped
to existing categories (PLAY-TIME, SNACK-PACK, GAME TOP-UP). Reward card shows name,
icon, credit cost, EXP reward, min rank, cooldown, state. States: available, locked by
rank ("Requires GRINDER - 137 more EXP"), not enough credits, on cooldown (countdown),
pending request, inactive (respect isActive; show only if existing app does, else hide).

FLOW: Redeem -> creates redemption_request (pending) -> admin approves/rejects.
On approve (server-side transaction, idempotent): deduct Credits, award EXP, update
streak/reward state, write/update reward_cooldowns, increment totalRedemptions if the
existing app does, write logs (redemption_approved / credits_deducted). Reject: status
+ log only.

Server must re-validate rank, credits, cooldown, isActive at request AND approval time.

DO NOT: auto-activate inactive rewards, skip approval, trust client eligibility checks,
create new collections.

ACCEPTANCE: Locked/cooldown/insufficient states display correctly for real accounts;
double-approve doesn't double-deduct; player can't redeem a locked reward via direct
API call.

VALIDATION: Emulator/test accounts; unit tests for eligibility; build once.

OUTPUT: Standard report -> docs/reports/phase-6.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-6): add rewards shop with server-validated redemption flow`

**Report must include:** eligibility checks enforced server-side, cooldown source of truth.

---

# PHASE 7 — Player Profile & History

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 7 of Time2Earn: player profile and history (/player/profile).

TASKS (read-only):
- Profile: username, rank badge, EXP, Credits, streak
- Rank progression ladder showing all ranks from config, reached vs locked
- Session history (own requests, status, credits)
- Redemption history (own requests, status)
- Activity timeline combining the above, paginated (limit queries; avoid loading all docs)
- Friendly empty states, skeletons

SECURITY: Only the player's own data. No admin notes, no passwords, no logs collection
access if rules forbid it.

DO NOT: write data; add new collections; expose other players.

ACCEPTANCE: A real account shows its true history; a new account shows empty states;
queries use limits.

VALIDATION: Build once; check 2 accounts.

OUTPUT: Standard report -> docs/reports/phase-7.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-7): add player profile, rank ladder and activity history`

**Report must include:** queries used and their limits.

---

# PHASE 8 — Admin Control Center

**Mode:** fast model (escalate if needed).

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 8 of Time2Earn: admin control center (/admin/*). Reuse the session and
redemption approval screens from Phases 5-6; do not rebuild them.

SECTIONS in this phase: Overview, Sessions, Rewards, Players.
(Debts = Phase 9, Logs = Phase 10, Settings = Phase 11; add nav entries as placeholders.)

- Overview: pending sessions, pending redemptions, active players, recent activity,
  outstanding debts (count only for now), alerts
- Sessions: pending/resolved list with filters, one-tap approve/reject
- Rewards: list, create/edit, activate/deactivate, cost, EXP, min rank, cooldown,
  totalRedemptions. Writes via protected admin-only functions and log
  reward_updated / reward_toggled.
- Players: search, profile view (Credits, EXP, rank, sessions, redemptions, streak,
  debts). Manual add/remove Credits via protected function with required reason,
  credit_transactions entry, and log (credits_added / credits_deducted).

UX: fast operation on shop PC and phone; large buttons; confirm destructive actions.

DO NOT: allow client-side balance edits; show passwords; build debts/logs/settings yet.

ACCEPTANCE: Admin can process a request in 2 taps; manual credit change requires a
reason and is logged; non-admin is blocked from every admin function.

VALIDATION: Emulator/test accounts; build once.

OUTPUT: Standard report -> docs/reports/phase-8.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-8): add admin overview, sessions, rewards and player management`

**Report must include:** list of protected admin functions created.

---

# PHASE 9 — Debt System

**Mode:** stronger model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 9 of Time2Earn: recreate the existing debt system without changing rules.

BEFORE CODING: Read the existing debt code. Determine which rate debt payments truly
use (backup shows rateUsed = 0.4 vs config creditToPhpRate = 0.035). Do NOT assume the
global rate. If it's unclear, STOP and ask me.

PLAYER: view own outstanding debt, tier, restriction status, history, submit a debt
payment request.

ADMIN (/admin/debts): outstanding debts, add debt, update debt, debt history, review
debt_payment_requests (approve/reject), apply restrictions exactly as existing logic.
All mutations server-side, idempotent, logged (debt_added, debt_payment_requested, etc.).

DO NOT: change tier values, restriction behavior, or existing debt documents; create
new collections.

ACCEPTANCE: Existing 3 debts and 1 payment request display correctly and unchanged;
approving a payment uses the same rate/logic as the old app; restrictions match old
behavior.

VALIDATION: Unit tests for payment calculation; emulator run; build once.

OUTPUT: Standard report -> docs/reports/phase-9.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-9): add debt management and payment review with legacy-accurate rules`

**Report must include:** which rate debt payments use and the evidence (file/line).

---

# PHASE 10 — Logs & Auditability

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 10 of Time2Earn: audit trail.

TASKS:
- /admin/logs: paginated, filter by action, user, date; readable rendering of existing
  action types (session_requested, session_approved, session_rejected, reward_requested,
  redemption_approved, redemption_rejected, credits_deducted, credits_added,
  reward_toggled, reward_updated, config_updated, debt_added, debt_payment_requested,
  rewards_bulk_imported). Unknown actions render generically.
- Audit that every privileged action from Phases 3-9 writes a log entry; add missing ones
  (admin password reset, manual credit adjustment, reward changes, debt changes) in the
  SAME log shape the existing logs use.
- Verify no log ever contains a password or secret.
- Logs are append-only: no edit/delete from UI; rules deny client deletes.

DO NOT: modify or delete existing logs; load all 596+ logs at once.

ACCEPTANCE: Existing logs readable; each privileged action produces exactly one log;
pagination works.

VALIDATION: Emulator checks; build once.

OUTPUT: Standard report -> docs/reports/phase-10.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-10): add admin log viewer and complete privileged-action auditing`

**Report must include:** table of action -> where it is logged.

---

# PHASE 11 — Settings / Configuration

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 11 of Time2Earn: admin settings (/admin/settings) backed by existing `config`.

TASKS:
- Edit supported settings that exist in config: sessionRatePerHour, phpToCreditRate,
  creditToPhpRate, expPerMinute, rank thresholds, leaderboardResetDays, debt tiers.
- Validate inputs (numbers, positive, rank thresholds strictly ascending, Newbie = 0).
- Show a diff + confirmation before saving; write via admin-only protected function;
  log config_updated with old/new values (no secrets).
- Confirm the whole app reads config dynamically (changing a threshold changes ranks
  without code changes).

DO NOT: rewrite the config document shape; auto-recalculate or modify any user's
stored rank/Credits/EXP because a threshold changed (flag it to me instead).

ACCEPTANCE: Changing a value updates UI behavior; invalid input rejected; log entry
created; non-admin cannot write.

VALIDATION: Emulator/test config only (never change production config); build once.

OUTPUT: Standard report -> docs/reports/phase-11.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-11): add audited admin settings editor for config`

**Report must include:** how stored ranks behave after a threshold change.

---

# PHASE 12 — Polish, Responsive UX & Gamification

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_PROGRESS.md and docs/T2E_CONTEXT.md.

ROLE: Phase 12 of Time2Earn: polish and gamification. UI only.

TASKS:
- Rank-up celebration (short, dismissible, shown once per rank change)
- Credit-gain feedback (+N CREDITS / +N EXP toast or counter)
- Achievement-style rank badges, better progress bars
- Consistent reward lock states and cooldown countdown timers
- Friendly empty states, loading skeletons everywhere data loads
- Mobile and desktop polish; accessibility (contrast, focus states, aria labels,
  prefers-reduced-motion respected)

CONSTRAINTS: Animations <= ~1.2s, CSS-based where possible, no heavy new dependencies.
No logic or data changes.

DO NOT: touch business logic, Firestore writes, or rules.

ACCEPTANCE: Animations trigger correctly and respect reduced motion; no layout shift
or horizontal scroll at 360px; Lighthouse accessibility check not worse than before.

VALIDATION: Build once; manual check on mobile width.

OUTPUT: Standard report -> docs/reports/phase-12.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-12): add rank-up, credit-gain animations and accessibility polish`

**Report must include:** how "rank-up seen" is tracked without new DB writes (e.g., local state).

---

# PHASE 13 — Leaderboard

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 13 of Time2Earn: leaderboard (/player/leaderboard).

BEFORE CODING: Check how the old app used leaderboardResetDays and what metric it ranked.
Use the same metric first (most likely EXP). Do NOT invent another reset system.
If the old behavior is unclear, STOP and ask me.

TASKS:
- Top N players (limit queries, e.g., 20), highlight the current player, show rank badge
  and score
- Reset window derived from config.leaderboardResetDays
- Expose only public-safe fields (username, rank, score). No credits balances or private
  data unless old app showed them.
- If rules block cross-user reads, use a protected function or a minimal public
  leaderboard view; do not loosen user-document read rules.

DO NOT: add multiple leaderboard modes; create new collections unless a window snapshot
is truly required (ask first).

ACCEPTANCE: Leaderboard matches stored data; reset window follows config; players can't
read other users' private fields.

VALIDATION: Emulator/test accounts; build once.

OUTPUT: Standard report -> docs/reports/phase-13.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-13): add config-driven player leaderboard`

**Report must include:** metric used, reset logic, how privacy is preserved.

---

# PHASE 14 — Time2Earn Arcade (one game only)

**Mode:** stronger model. **Do not start until Phase 16-style data checks pass on the core.**

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 14 of Time2Earn: Arcade with ONE small, polished game (suggest: Quick Quiz
or Reaction Rush; pick the cheaper to build well).

STEP 1 (STOP AFTER THIS AND WAIT FOR MY APPROVAL): write docs/T2E_ARCADE_ECONOMY.md
answering for the chosen game:
1. Max Credits per attempt   2. Attempts per day   3. Daily Credit cap
4. Cooldown between attempts   5. Score -> reward tiers   6. Server-side score validation
7. Anti-cheat / rate limiting   8. Logging   9. Admin audit view   10. Collections needed
(create new ones only if required, e.g., arcade_sessions)
Keep the economy conservative; Credits must not be farmable.

STEP 2 (only after I approve): implement the game and /player/arcade.
- Server creates the attempt and the question/seed; client submits answers/score;
  server validates and grants Credits via transaction, logs it, writes a
  credit_transactions record, and enforces daily cap and cooldown.
- Client never sets the final Credit amount.

DO NOT: build multiple games; give unlimited Credits; skip logging.

ACCEPTANCE: Cap and cooldown can't be bypassed by replaying requests or editing the
client; every grant is logged and auditable.

VALIDATION: Unit tests for reward tiers/caps; replay/abuse tests; build once.

OUTPUT: Standard report -> docs/reports/phase-14.md. Update T2E_PROGRESS.md.
```

**Commit message (Step 1):** `docs(phase-14): define arcade credit economy and anti-abuse rules`
**Commit message (Step 2):** `feat(phase-14): add first arcade mini-game with server-validated rewards`

**Report must include:** economy numbers, new collections (if any), abuse tests run.

---

# PHASE 15 — PWA / Browser-First Experience

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_PROGRESS.md.

ROLE: Phase 15 of Time2Earn: PWA.

TASKS:
- Web manifest (name Time2Earn, theme/background colors, icons)
- Service worker: cache the static app shell only. NEVER cache authenticated Firestore
  data or API responses in a way that shows stale balances.
- Add-to-home-screen support, offline fallback page
- QR entry page/route (static; points to the site URL)
- Keep it working in a normal browser without install

DO NOT: add push notifications; cache user data; break existing routing.

ACCEPTANCE: Installable on Android Chrome; offline shows the fallback shell; online
balances are always fresh; Lighthouse PWA checks pass.

VALIDATION: Production build + Lighthouse once.

OUTPUT: Standard report -> docs/reports/phase-15.md. Update T2E_PROGRESS.md.
```

**Commit message:** `feat(phase-15): add PWA manifest, app-shell caching and offline fallback`

**Report must include:** what is cached and what is explicitly not.

---

# PHASE 16 — Testing Against Real Existing Data

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 16 of Time2Earn: verify the new app against the existing data.
Use the Firestore EMULATOR seeded from the backup (or a cloned test project). NEVER the
production database.

TASKS: Write a compact automated test/verification suite (reuse existing test tooling)
plus a short manual checklist in docs/T2E_TEST_CHECKLIST.md covering:

PLAYERS: all 24 accounts load; Credits, EXP, ranks, streak fields unchanged; computed
rank matches stored/expected rank.
SESSIONS: 215 existing requests render; approve/reject on test copies; calculations
match old behavior.
REWARDS: 12 rewards render; inactive respected; min rank, deduction, EXP award,
cooldown correct.
DEBTS: 3 debts, history, 1 payment request intact; restrictions correct.
LOGS: 596 existing logs readable; new actions log correctly.
DATA INTEGRITY: before/after snapshot diff shows no unintended changes to untouched docs.

Fix only real bugs found; list anything ambiguous instead of guessing.

DO NOT: write to production; rewrite features.

ACCEPTANCE: Suite passes; diff of untouched documents is empty; checklist complete.

VALIDATION: Run suite once, then re-run only failed tests after fixes.

OUTPUT: Standard report -> docs/reports/phase-16.md. Update T2E_PROGRESS.md.
```

**Commit message:** `test(phase-16): verify app against existing Firestore data and add checklist`

**Report must include:** pass/fail counts, bugs fixed, data-integrity diff result.

---

# PHASE 17 — Security & Abuse Testing

**Mode:** stronger model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_SCHEMA.md, docs/T2E_PROGRESS.md.

ROLE: Phase 17 of Time2Earn: security and abuse testing. Emulator/test project only.

TEST AND, WHERE FAILING, FIX:
- Unauthorized admin route access and admin function calls as a player / unauthenticated
- Player reading/writing another player's data
- Client-side Credit/EXP/rank manipulation (direct Firestore writes)
- Fake or locked reward redemption; cooldown bypass
- Session approval manipulation; self-approval
- Debt manipulation
- Request replay / double-approval; concurrent approvals
- Excessive requests (rate limiting on sensitive functions)
- Firestore rules coverage (write rules tests for each collection)
- Auth edge cases; password reset abuse (enumeration, reuse of temporary credentials)
- Secrets: no keys or passwords in the repo, logs, or client bundle

OUTPUT a table in docs/T2E_SECURITY_REPORT.md: Test | Result | Fix (if any).
Add automated rules tests to the repo.

DO NOT: weaken rules to make tests pass; touch production.

ACCEPTANCE: All critical tests pass; automated rules tests exist and run in one command.

VALIDATION: Run the rules/security suite once; re-run only failures.

OUTPUT: Standard report -> docs/reports/phase-17.md. Update T2E_PROGRESS.md.
```

**Commit message:** `test(phase-17): add security and abuse tests, fix discovered vulnerabilities`

**Report must include:** number of vulnerabilities found/fixed and any accepted risks.

---

# PHASE 18 — Production Readiness

**Mode:** fast model.

### Prompt

```text
Read docs/T2E_RULES.md, docs/T2E_CONTEXT.md, docs/T2E_PROGRESS.md and
docs/T2E_SECURITY_REPORT.md.

ROLE: Phase 18 of Time2Earn: production readiness. Checklist work, no new features.

TASKS:
- Env vars documented (.env.example), no secrets committed
- Firebase config, Firestore rules and indexes ready to deploy (do NOT deploy)
- Error handling and loading states audited across routes
- Mobile + desktop responsiveness and accessibility pass
- Performance: bundle size, lazy-load routes, Firestore read counts on main pages
- Backup and rollback plan: docs/T2E_DEPLOY.md with (1) Firestore export before
  launch, (2) how to roll back the site, (3) cutover steps from Play Cred,
  (4) smoke-test list for launch day
- Deployment configuration verified

DO NOT: deploy, change production data, or add features.

ACCEPTANCE: Production build passes; deploy doc is complete; no TODO/FIXME blockers
remain in critical paths.

VALIDATION: Production build once; list any remaining risks.

OUTPUT: Standard report -> docs/reports/phase-18.md. Update T2E_PROGRESS.md.
```

**Commit message:** `chore(phase-18): production readiness checks, deploy and rollback docs`

**Report must include:** go/no-go recommendation with remaining risks.

---

## Quick reference

| Phase | Topic | Mode | Commit prefix |
|---|---|---|---|
| 0 | Discovery & audit | Strong | `docs` |
| 1 | Schema & logic contract | Strong | `docs` |
| 2 | App foundation | Fast | `feat` |
| 3 | Auth & authorization | Strong | `feat` |
| 4 | Player dashboard | Fast | `feat` |
| 5 | Play & Earn sessions | Strong | `feat` |
| 6 | Rewards shop | Strong | `feat` |
| 7 | Profile & history | Fast | `feat` |
| 8 | Admin control center | Fast | `feat` |
| 9 | Debt system | Strong | `feat` |
| 10 | Logs & audit | Fast | `feat` |
| 11 | Settings | Fast | `feat` |
| 12 | Polish & gamification | Fast | `feat` |
| 13 | Leaderboard | Fast | `feat` |
| 14 | Arcade | Strong | `docs` + `feat` |
| 15 | PWA | Fast | `feat` |
| 16 | Real-data testing | Fast | `test` |
| 17 | Security testing | Strong | `test` |
| 18 | Production readiness | Fast | `chore` |

### Your checklist between phases (about 2 minutes, no credits)

1. Read `docs/reports/phase-N.md`.
2. Answer any "Verify before next phase" items or UNKNOWN questions.
3. `git diff --stat` looks reasonable (no surprise files).
4. Commit with the suggested message.
5. Start a **new Antigravity chat** and paste the next phase prompt.
