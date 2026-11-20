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