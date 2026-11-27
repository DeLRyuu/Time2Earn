# Time2Earn — Progress Log

## Phase 0: Project Discovery & Existing Code Audit
- **Status:** Completed
- **Stack:** React 19.3 + Vite 8.3 + TypeScript 6.0 + Firebase 13.4 + React Router DOM 7.18
- **What Exists:** Fresh Vite + React starter in `Time2Earn/src`, complete legacy Firestore backup in `Time2Earn/legacy/firestire_backup` (11 collections).
- **Key Files:**
  - `docs/T2E_RULES.md`: Global operating rules & safety constraints.
  - `docs/T2E_CONTEXT.md`: Technical context map, stack, auth model, and business logic mapping.
  - `docs/reports/phase-0.md`: Audit summary report.
- **Open Issues / Notes:** Legacy `users` collection contains plaintext passwords; debt payment calculation uses `rateUsed = 0.4` rather than global config rate.

## Phase 1: Firestore Schema & Business Logic Contract
- **Status:** Completed
- **What Exists:** Complete database schema and business logic contract in `docs/T2E_SCHEMA.md`.
- **Key Files:**
  - `docs/T2E_SCHEMA.md`: 11 Firestore collections, types, optionality, status enums, calculation formulas, and state transitions.
  - `docs/reports/phase-1.md`: Phase 1 audit report and list of UNKNOWN items.
- **Open Issues / Notes:** 4 UNKNOWN items logged for owner review before Phase 5 (credit deduction timing on redemption, session EXP formula parity, password hash migration strategy, and debt credit rate parameter in config).

## Phase 2: Application Foundation & Design System
- **Status:** Completed
- **What Exists:** Shell layout with responsive mobile bottom nav and desktop sidebar, design system tokens, 9 reusable UI components, global ErrorBoundary, Toast system, Firestore `config/settings` hook, and route skeleton for player and admin portals.
- **Key Files:**
  - `Time2Earn/src/styles/theme.css`: Dark gaming theme design tokens and reset.
  - `Time2Earn/src/components/layout/`: Responsive BottomNav, Sidebar, Header, PlayerLayout, and AdminLayout.
  - `Time2Earn/src/components/ui/`: Button, Card, ProgressBar, Badge, Modal, Skeleton, EmptyState.
  - `Time2Earn/src/context/` & `src/hooks/`: ConfigContext, useConfig, ToastContext, useToast.
  - `docs/reports/phase-2.md`: Phase 2 report.
- **Open Issues / Notes:** Phase 2 foundation complete.

## Phase 3: Secure Authentication & Authorization
- **Status:** Completed
- **What Exists:** Option 1 Auth Architecture: sanitized in-memory session (passwords strictly omitted), ProtectedRoute role guards (cross-role navigation to /admin strictly blocked), staff-assisted password reset with audit logging, ForcePasswordChangeModal, and production Firestore security rules.
- **Key Files:**
  - `Time2Earn/src/context/AuthContext.tsx` & `src/hooks/useAuth.ts`: Auth provider, credential check, session persistence, password change.
  - `Time2Earn/src/components/common/ProtectedRoute.tsx`: Route guards blocking unauthorized access.
  - `Time2Earn/src/components/common/ForcePasswordChangeModal.tsx`: Enforces password update after staff reset.
  - `Time2Earn/src/pages/admin/AdminUsers.tsx`: Staff reset workflow with audit log creation.
  - `Time2Earn/firestore.rules`: 11-collection security rules denying player writes to balances, EXP, and ranks.
  - `docs/reports/phase-3.md`: Phase 3 report.
- **Open Issues / Notes:** Phase 3 complete.

## Phase 4: Player Dashboard (/player)
- **Status:** Completed
- **What Exists:** Player Dashboard with distinct stat cards for Credits, Rank, EXP, and Streak; dynamic rank progression bar from Firestore config thresholds; quick actions hub; featured active rewards; personal recent activity feed; and mobile-first 360px responsiveness.
- **Key Files:**
  - `Time2Earn/src/pages/player/Home.tsx`: Player Dashboard UI.
  - `Time2Earn/src/hooks/usePlayerDashboard.ts`: Read-only hook for active rewards and personal activity.
  - `Time2Earn/src/lib/ranks.ts`: Dynamic rank calculation and progress percentage logic.
  - `docs/reports/phase-4.md`: Phase 4 report.
- **Open Issues / Notes:** Phase 4 complete.

## Phase 5: Play & Earn Session Workflow
- **Status:** Completed
- **What Exists:** Player session claim submission with live rate calculation, player's personal session request history list, admin approval queue with approve and reject actions, idempotent server-authoritative Firestore transaction updating credits, EXP (1:1 parity), total sessions, and rank promotion, plus audit logging.
- **Key Files:**
  - `Time2Earn/src/services/sessionService.ts`: Session submission, player history query, admin pending query, and atomic approval/rejection transaction.
  - `Time2Earn/src/lib/credits.ts` & `credits.test.ts`: Credit preview, floor rounding, and 1:1 EXP parity functions and tests.
  - `Time2Earn/src/pages/player/Home.tsx`: Session claim modal and personal session history feed.
  - `Time2Earn/src/pages/admin/AdminSessions.tsx`: Admin approval queue with rejection reason dialog.
  - `docs/reports/phase-5.md`: Phase 5 report.
- **Open Issues / Notes:** Ready for Phase 6 (Rewards Catalog & Redemption Flow).

## Phase 6: Rewards Shop & Redemption Workflow
- **Status:** Completed
- **What Exists:** Player rewards shop UI (/player/rewards) with category filtering (All, Play Time, Snacks, Game Top-Up); complete reward card state handling (available, locked by rank, insufficient credits, on cooldown, pending, inactive); player redemption request flow and personal redemption history; admin redemption approval queue (/admin/redemptions); server-authoritative Firestore approval transaction (re-validating rank, credits, cooldown, and isActive; deducting credits, awarding EXP, recording reward_cooldowns, incrementing redeemStreak and totalRedemptions, updating lastRedeemDate, and audit logging); rejection dialog with custom note.
- **Key Files:**
  - `Time2Earn/src/pages/player/Rewards.tsx`: Player rewards catalog and history.
  - `Time2Earn/src/pages/admin/AdminRedemptions.tsx`: Admin redemption approval queue and modal.
  - `Time2Earn/src/services/redemptionService.ts`: Redemption queries, claim submission, and atomic transaction.
  - `Time2Earn/src/lib/rewards.ts` & `rewards.test.ts`: Reward eligibility evaluation and unit tests.
  - `Time2Earn/src/types/redemption.ts`: Redemption types and status enums.
  - `firestore.rules`: Security rules for redemption_requests, reward_cooldowns, and user balance protection.
  - `docs/reports/phase-6.md`: Phase 6 report.
- **Open Issues / Notes:** Phase 6 complete.

## Phase 7: Player Profile & History (/player/profile)
- **Status:** Completed
- **What Exists:** Player profile dashboard with identity stats (username, level badge, credits, EXP, streak); rank progression ladder featuring all 12 tiers from config (reached, current active with progress, locked with missing EXP); separate session and redemption histories; combined activity timeline with filter tabs and client-side pagination; friendly empty states for 0-activity accounts; verified with 2 real accounts from backup.
- **Key Files:**
  - `Time2Earn/src/pages/player/Profile.tsx`: Player profile, rank ladder, and activity timeline UI.
  - `Time2Earn/src/lib/ranks.ts` & `ranks.test.ts`: Dynamic rank progression, tier ladder generator, and unit tests.
  - `Time2Earn/src/services/sessionService.ts`: Session queries with limit and real backup seeds.
  - `Time2Earn/src/services/redemptionService.ts`: Redemption queries with limit and real backup seeds.
  - `Time2Earn/src/context/AuthContext.tsx`: Test account definitions (lois_123xx & Phay) for offline validation.
  - `docs/reports/phase-7.md`: Phase 7 report.
- **Open Issues / Notes:** Phase 7 complete.

## Phase 8: Admin Control Center (/admin/*)
- **Status:** Completed
- **What Exists:** Comprehensive Admin Control Center consisting of: Overview dashboard (/admin) with live queue metrics, alerts, and recent activities; Session queue (/admin/sessions) with pending/resolved/all filtering tabs and rapid 2-tap approve/reject; Rewards management (/admin/rewards) with add, edit, category filtering, and active/inactive toggles; Player management (/admin/users) with search, detailed profile drawer/modal, staff password resets, and server-authoritative manual credit adjustments requiring non-empty reasons and recording audit entries in `credit_transactions` and `logs`. Nav placeholders added for Debts (Phase 9), Logs (Phase 10), and Settings (Phase 11).
- **Key Files:**
  - `Time2Earn/src/pages/admin/AdminDashboard.tsx`: Overview metric cards, alerts, and recent activity feed.
  - `Time2Earn/src/pages/admin/AdminSessions.tsx`: Enhanced session approvals with status filter tabs.
  - `Time2Earn/src/pages/admin/AdminRewards.tsx`: Rewards catalog CRUD, category filters, and active toggle.
  - `Time2Earn/src/pages/admin/AdminUsers.tsx`: Player search, profile modal, and manual credit adjustments.
  - `Time2Earn/src/services/adminService.ts` & `adminService.test.ts`: Admin operations, protected credit adjustment, and test suite.
  - `Time2Earn/src/components/layout/Sidebar.tsx` & `src/App.tsx`: Navigation routes including placeholders.
  - `docs/reports/phase-8.md`: Phase 8 report.
- **Open Issues / Notes:** Phase 8 complete.

## Phase 9: Shop Debt System & Credit Payments (/admin/debts)
- **Status:** Completed
- **What Exists:** Complete shop debt management system preserving exact existing database documents and business rules. Verified and implemented fixed conversion rate of `rateUsed = 0.4` (₱0.40/CR) for credit debt payments; player debt status, restriction alert, and payment modal in `/player/profile`; Admin Debt Center (`/admin/debts`) with live ledger displaying the 3 existing debts, pending credit payment request queue with 1-click approval/rejection (NINI123: 38 CR -> ₱15.20 relief), add debt and cash payment modals, and debt audit history. Server-side atomic transactions for approvals and debt modifications with full audit logging.
- **Key Files:**
  - `Time2Earn/src/pages/admin/AdminDebts.tsx`: Admin debt ledger, queue approvals, add debt, and cash payment modals.
  - `Time2Earn/src/pages/player/Profile.tsx`: Player debt overview and credit payment submission modal.
  - `Time2Earn/src/services/debtService.ts`: Debt queries, atomic transactions, and backup data seeding.
  - `Time2Earn/src/lib/debts.ts` & `debts.test.ts`: Debt payment calculation (rate 0.4), tier boundaries, and unit tests.
  - `Time2Earn/src/types/debt.ts`: Debt data contracts, tiers, and payment status enums.
  - `docs/reports/phase-9.md`: Phase 9 report.
- **Open Issues / Notes:** Phase 9 complete.

## Phase 10: Audit Trail & System Logs (/admin/logs)
- **Status:** Completed
- **What Exists:** Complete audit trail viewer (/admin/logs) with bounded pagination (preventing bulk loading of 596+ logs), filtering across all 14 legacy actions plus security events, category filters, text/user search, date range pickers, CSV export, and raw JSON payload inspection. Audited all privileged operations from Phases 3–9 ensuring consistent append-only `{ action, userId, adminId, amount, details, createdAt }` log generation without passwords or secrets. Updated Firestore security rules strictly forbidding client edits and deletions.
- **Key Files:**
  - `Time2Earn/src/pages/admin/AdminLogs.tsx`: Audit logs viewer UI with filters, pagination, badges, and JSON inspector modal.
  - `Time2Earn/src/services/logService.ts` & `logService.test.ts`: Log query service, metadata mappings, date/amount formatters, and test suite.
  - `Time2Earn/src/services/sampleLogs.json`: Representative offline sample covering all 14 legacy action types.
  - `firestore.rules` & `Time2Earn/firestore.rules`: Append-only rules (`allow update, delete: if false;`).
  - `docs/reports/phase-10.md`: Phase 10 report.
- **Open Issues / Notes:** Phase 10 complete.

## Phase 11: Admin Settings & System Configuration (/admin/settings)
- **Status:** Completed
- **What Exists:** Interactive system configuration management center (/admin/settings) backed by Firestore `config/settings`. Supports real-time editing of sessionRatePerHour, phpToCreditRate, creditToPhpRate, expPerMinute, leaderboardResetDays, 3 debt tiers (low, mid, high), and 12 rank thresholds (Newbie to OG Player). Enforces strict input validation (positive values, integer reset cycles, strictly ascending debt tiers, fixed Newbie = 0 EXP, and strictly ascending rank thresholds), visual diff modal before saving, admin-only mutation function (`updateAdminConfig`), `config_updated` audit logging, and dynamic app-wide reactivity without altering stored user documents.
- **Key Files:**
  - `Time2Earn/src/pages/admin/AdminSettings.tsx`: System settings editor with live validation and confirmation diff modal.
  - `Time2Earn/src/lib/settingsValidation.ts` & `settingsValidation.test.ts`: Settings validation, diff computation, and unit tests.
  - `Time2Earn/src/services/configService.ts` & `configService.test.ts`: Protected update service, Firestore persistence, audit logging, and test suite.
  - `Time2Earn/src/context/ConfigContext.tsx` & `src/context/configContextDef.ts`: Config state synchronization with immediate UI reactivity.
  - `docs/reports/phase-11.md`: Phase 11 report.
- **Open Issues / Notes:** Phase 11 complete.

## Phase 12: Polish & Gamification (UI Enhancement)
- **Status:** Completed
- **What Exists:** Comprehensive UI gamification and polish layer without altering business logic or database writes. Features dismissible rank-up celebration modal (`RankUpCelebrationModal`) shown once per promotion; floating credit/EXP gain feedback chips (`GainFeedback`); dedicated achievement-style rank badges (`RankBadge`) for all 12 ranks with unique icons and glowing tier palettes; enhanced `ProgressBar` with accessible ARIA attributes and shimmer animation; live ticking cooldown countdown timers (`CooldownTimer`) on reward locks; consistent reward lock states (rank badges with missing EXP, credit deficits, pending badges); `:focus-visible` focus rings, full `@media (prefers-reduced-motion: reduce)` accessibility, and guaranteed zero horizontal scroll at 360px viewport.
- **Key Files:**
  - `Time2Earn/src/components/ui/RankBadge.tsx` & `src/lib/rankIcons.ts`: Achievement rank badges and icon mappings.
  - `Time2Earn/src/components/common/RankUpCelebrationModal.tsx`: Celebratory promotion modal with perks summary.
  - `Time2Earn/src/components/common/GainFeedback.tsx`: Floating pop-in credit and EXP gain chips.
  - `Time2Earn/src/components/common/CooldownTimer.tsx`: Live second-by-second countdown timer for reward cooldowns.
  - `Time2Earn/src/components/ui/ProgressBar.tsx` & `ProgressBar.css`: Accessible shimmer progress bar.
  - `Time2Earn/src/styles/theme.css`: Focus rings and reduced motion media queries.
  - `Time2Earn/src/pages/player/Home.tsx`, `Rewards.tsx`, `Profile.tsx`, `Leaderboard.tsx`: Integrated polish.
  - `docs/reports/phase-12.md`: Phase 12 report.
- **Open Issues / Notes:** Phase 12 complete. All 12 project phases delivered.

## Phase 13: Player Leaderboard (/player/leaderboard)
- **Status:** Completed
- **What Exists:** Public-safe player leaderboard center (/player/leaderboard) ranking contenders by lifetime EXP. Includes live ticking tournament cycle timer derived from `config.leaderboardResetDays`, top-3 champion podium with trophy/medal styling, current player standing highlight card (#4 for lois_123xx) with live gap calculation to next rank, and full top 20 standings table with RankBadges. Strict privacy preservation: user document Firestore security rules remain untouched, and zero private fields (passwords, credits balances, debts, personal info) are exposed.
- **Key Files:**
  - `Time2Earn/src/pages/player/Leaderboard.tsx`: Leaderboard UI with top-3 podium, cycle countdown, and standing card.
  - `Time2Earn/src/services/leaderboardService.ts`: Public leaderboard queries, cycle countdown math, and user projection.
  - `Time2Earn/src/services/leaderboardService.test.ts`: Test suite verifying ranking order, cycle calculations, user highlights, and zero sensitive data leakage.
  - `docs/reports/phase-13.md`: Phase 13 report.
- **Open Issues / Notes:** Phase 13 complete.

## Phase 14: Arcade & Cyber Trivia Mini-Game (/player/arcade)
- **Status:** Completed
- **What Exists:** Server-authoritative Cyber Arcade mini-game with Quick Quiz ("Cyber Trivia"). Features 20 curated gaming lounge & esports trivia questions, strict client question sanitization (zero correct answer or explanation leakage), deterministic server-side answer grading, 5-tier score reward payouts (5/5 = 5 CR, 4/5 = 3 CR, 3/5 = 2 CR, 2/5 = 1 CR, 0-1/5 = 0 CR), conservative daily limits (max 3 attempts/day, 15m cooldown, 10 CR daily credit cap clamping), anti-bot 10-second time gate, 3-minute session expiration, anti-replay single-use tokens, debt restriction lockout, atomic user balance updates, immutable `credit_transactions` ledger entries, `arcade_reward_granted` audit logging, and responsive `/player/arcade` UI with live HUD counters and victory celebration.
- **Key Files:**
  - `docs/T2E_ARCADE_ECONOMY.md`: Formal 10-point economy and anti-cheat specification.
  - `Time2Earn/src/types/arcade.ts`: Data types and models for questions, sessions, status, and rewards.
  - `Time2Earn/src/lib/arcadeQuiz.ts`: 20-question trivia bank, sanitization, authoritative grading, and reward tiers.
  - `Time2Earn/src/services/arcadeService.ts`: Attempt lifecycle, cooldown tracking, daily quota limits, atomic transactions, and audit logging.
  - `Time2Earn/src/services/arcadeService.test.ts`: 65 unit assertions verifying scoring tiers, daily cap clamps, cooldown enforcement, anti-replay, expiration, anti-bot gates, and debt locks.
  - `Time2Earn/src/pages/player/Arcade.tsx`: Interactive arcade page with HUD, live cooldown timers, 5-question round loop, and victory results screen.
  - `Time2Earn/src/services/logService.ts`: Added `arcade_reward_granted` metadata and category.
  - `Time2Earn/firestore.rules`: Security rules for `/arcade_sessions/{sessionId}`.
  - `docs/reports/phase-14.md`: Phase 14 audit report.
- **Open Issues / Notes:** Phase 14 complete.

## Phase 15: Progressive Web App & Offline Shell (PWA)
- **Status:** Completed
- **What Exists:** Full PWA support with Web App Manifest (`manifest.json`, standalone display, portrait orientation, theme/background `#080b11`), generated 192x192, 512x512, 512x512 maskable, and 180x180 apple-touch-icon. Static app-shell service worker (`sw.js`) pre-caching shell assets while strictly bypassing Firestore/Firebase/Auth requests to guarantee 100% fresh balances. Responsive offline fallback page (`offline.html`) with network listener. Dedicated Add-to-Home-Screen hook (`usePwaInstall`) with install buttons in Profile and QR route. Public static shop desk QR route (`/qr`) with zero-dependency vector QR generator (`src/lib/qr.ts`).
- **Key Files:**
  - `Time2Earn/public/manifest.json`: Web app manifest with install metadata and shortcuts.
  - `Time2Earn/public/sw.js`: Static shell service worker with strict network-only guards for Firestore.
  - `Time2Earn/public/offline.html`: Cyber gaming lounge styled offline fallback shell.
  - `Time2Earn/src/lib/pwa.ts`: Service worker registration and `usePwaInstall` A2HS hook.
  - `Time2Earn/src/lib/qr.ts`: Self-contained ISO/IEC 18004 QR Code matrix and SVG generator.
  - `Time2Earn/src/pages/QrEntry.tsx`: Public static desk QR entry screen (`/qr`).
  - `Time2Earn/src/services/pwa.test.ts`: 43 unit assertions verifying manifest, icons, freshness, and QR generation.
  - `docs/reports/phase-15.md`: Phase 15 report.
- **Open Issues / Notes:** Phase 15 complete.
 
## Phase 16: Verification Against Existing Data
- **Status:** Completed
- **What Exists:** Automated verification test suite and manual verification checklist asserting 100% data fidelity against `legacy/firestore_backup`. Validates all 24 user accounts (23 players, 1 admin) with untouched credits, EXP, ranks, and streaks (100% computed rank parity); 215 session requests (208 approved, 7 pending) verifying historical rates (1.49 and 1.38); 12 rewards catalog items (7 active, 5 inactive) verifying rank/credit gating and cooldowns; 3 debts, 4 history records, and 1 pending payment request (verifying 0.4 relief rate and tier boundaries); 596 audit logs verifying zero sensitive data exposure and comprehensive action mapping; and a before/after snapshot diff confirming 0 mutations to original backup documents.
- **Key Files:**
  - `Time2Earn/src/services/dataVerification.test.ts`: Complete automated verification test suite (245 assertions).
  - `docs/T2E_TEST_CHECKLIST.md`: Manual verification checklist covering Players, Sessions, Rewards, Debts, Logs, and Data Integrity.
  - `Time2Earn/docs/T2E_TEST_CHECKLIST.md`: Synced copy of manual checklist in frontend workspace.
  - `docs/reports/phase-16.md`: Phase 16 report.
- **Open Issues / Notes:** Phase 16 complete.

## Phase 17: Security and Abuse Testing
- **Status:** Completed
- **What Exists:** Comprehensive automated security, abuse, and rules testing suite (`Time2Earn/src/services/securityRules.test.ts`) with 93 passing assertions runnable via `npm run test:security` and unified `npm run test`. Evaluates route guards, privileged admin calls, cross-player isolation, client-side balance/rank/streak tampering, inactive/cooldown redemption bypass, double-approval replay, rate-limiting DoS defense, auth anti-enumeration, and all 12 Firestore collections. Hardened `firestore.rules` to protect `streak`, `streakRecoveryCharges`, `debtAmount`, and `debtTier`. Added staff self-approval prevention across session, redemption, and debt payment relief. Built in-memory rate limiter `src/lib/rateLimit.ts` for sensitive actions. Unified login error messages to generic `Invalid username or password.` Detailed security report generated in `docs/T2E_SECURITY_REPORT.md`.
- **Key Files:**
  - `Time2Earn/src/services/securityRules.test.ts`: Automated security test suite (93 assertions).
  - `Time2Earn/src/lib/rateLimit.ts`: Rate limiting utility for sensitive transactions.
  - `Time2Earn/firestore.rules` & `firestore.rules`: Hardened Firestore security rules with full protected field keys.
  - `Time2Earn/src/services/sessionService.ts`: Added rate limiting and self-approval prevention.
  - `Time2Earn/src/services/redemptionService.ts`: Added rate limiting and self-approval prevention.
  - `Time2Earn/src/services/debtService.ts`: Added rate limiting and self-approval prevention.
  - `Time2Earn/src/pages/admin/AdminUsers.tsx`: Added rate limiting on staff password resets.
  - `Time2Earn/src/context/AuthContext.tsx`: Anti-enumeration error handling and login rate limiting.
  - `docs/T2E_SECURITY_REPORT.md`: Audit matrix and security verification documentation.
  - `docs/reports/phase-17.md`: Phase 17 report.
- **Open Issues / Notes:** Phase 17 complete. All security and abuse tests pass (93/93) with zero errors across linting and production builds. Ready for final review.

## Phase 18: Live Data Recon, Safety & Schema Audit
- **Status:** Completed
- **What Exists:** Non-destructive live data audit of the production Firestore database (`playcred-fd217`) against TypeScript models across all 12 core collections. Created full lossless timestamp-preserving export to `legacy/backups/2026-11-22T12-20-54.469Z/` (905 documents, SHA-256 manifest). Audit report cataloged missing fields on `users` (`mustChangePassword`, `redeemStreak`, `streak`, `streakRecoveryCharges`, `totalSessions`, `totalCreditsEarned`) and `rewards` (`totalRedemptions`), identified Python space-formatted strings vs native Firestore Timestamps vs ISO strings, and confirmed 0 numeric string mismatches, 0 invalid passwords, and 0 duplicate usernames.
- **Key Files:**
  - `Time2Earn/scripts/backup.mjs`: Lossless Firestore export tool.
  - `Time2Earn/scripts/audit.mjs`: Comprehensive schema & data discrepancy audit tool.
  - `docs/reports/phase-18-data-audit.md`: Formal Phase 18 audit report.
- **Open Issues / Notes:** Phase 18 complete. Zero business values modified.

## Phase 19: Safe Schema Normalization & Lossless Verification
- **Status:** Completed
- **What Exists:** Idempotent, batch-written schema normalization (`npm run db:migrate -- --apply`) with automated rollback snapshot (`legacy/backups/2026-11-22T12-30-47.131Z-pre-migration/`). Normalized 1,184 timestamp fields across all 12 collections to standard ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`), preserving 100% of exact millisecond instants (`Math.round(nanos / 1e6)`). Injected neutral default fields (`mustChangePassword=false`, `isBanned=false`, `isRestricted=false`, `totalRedemptions=0`, `rejectNote=''`). Executed field-by-field verification (`npm run db:verify`) against baseline backup, confirming exactly 0 unexpected diffs across all 905 documents.
- **Key Files:**
  - `Time2Earn/scripts/migrate.mjs`: Idempotent batch-migration script with dry-run default.
  - `Time2Earn/scripts/verify.mjs`: Automated field-by-field snapshot diff verification tool.
  - `Time2Earn/scripts/restore.mjs`: Reversible disaster recovery restore utility.
  - `docs/reports/phase-19-migration.md`: Detailed migration summary report.
- **Open Issues / Notes:** Phase 19 complete. Live database normalized and verified.

## Phase 20: Authentication Fix, Public Leaderboard & Live E2E Verification
- **Status:** Completed
- **What Exists:** Production Firebase Authentication migration and live end-to-end operational verification:
  1. **Firebase Authentication Migration:** Deterministic `@time2earn.app` email mapping (`src/lib/authEmail.ts`). Migrated all 24 users to Firebase Auth (`npm run auth:migrate -- --apply`) with exact UID alignment and custom claim `{ role: 'admin' }` assigned to `Whindell_TheDev`. Rewrote `AuthContext.tsx` to use Firebase Auth SDK with persistent session and offline mock fallback.
  2. **Public Leaderboard Projection:** Built `public_leaderboard` collection in Firestore backfilled with 23 active players (`scripts/backfill-leaderboard.mjs`). Updated services (`leaderboardService.ts`, `sessionService.ts`, `redemptionService.ts`, `arcadeService.ts`) to maintain live projections while preserving user privacy and security isolation.
  3. **Production Security Rules Deployment:** Built direct REST deployment pipeline (`scripts/deploy-rules.mjs`) releasing hardened ruleset to `cloud.firestore`.
  4. **Live End-to-End Verification:** Automated live test suite (`npm run test:live`) executing 10/10 assertions against `playcred-fd217`: player auth (`lois_123xx`), dashboard balance/rank/streak, cross-player read blocking (HTTP 403), balance tampering blocking (HTTP 403), public leaderboard read, atomic session approval & rollback, reward cooldown conventions (`${uid}_${rewardId}`), debt payment conversions (rate 0.4), and admin config audit logging.
  5. **Operations Runbook:** Comprehensive documentation in `docs/T2E_FIRESTORE_RUNBOOK.md` detailing environment configuration, command lifecycle, disaster rollback, and key rotation.
- **Key Files:**
  - `Time2Earn/src/lib/authEmail.ts` & `Time2Earn/scripts/auth-migrate.mjs`: Firebase Auth sync engine.
  - `Time2Earn/src/context/AuthContext.tsx`: Firebase Auth client provider.
  - `Time2Earn/scripts/deploy-rules.mjs`: Cloud Firestore ruleset deployment pipeline.
  - `Time2Earn/scripts/verify-live-e2e.mjs`: Live 10-point E2E verification test suite (`npm run test:live`).
  - `docs/reports/phase-20-live-e2e.md`: Live E2E test report and checklist.
  - `docs/T2E_FIRESTORE_RUNBOOK.md`: Complete operations and disaster recovery runbook.
- **Open Issues / Notes:** All phases complete. Ready for final review.

## Phase 17b: Legacy Arcade Removal & Clean Slate
- **Status:** Completed
- **What Exists:** Removed legacy Quick Quiz files and types, reset Arcade Zone to an empty placeholder, updated Home badge and manifest shortcut, and prepared codebase for the 8-game arcade rebuild.
- **Key Files:**
  - `Time2Earn/src/pages/player/Arcade.tsx`: Rebuilt empty-state placeholder cabinet.
  - `Time2Earn/src/pages/player/Arcade.css`: Cleaned old quiz CSS while preserving Profile progress bar classes.
  - `docs/reports/phase-17b.md`: Phase 17b audit report.
- **Open Issues / Notes:** Local storage key `t2e_local_arcade_sessions` can be manually cleared by testers.

## Phase 18: Arcade Foundation Scaffolding (Phase A1)
- **Status:** Completed
- **What Exists:** Created arcade type system (`src/arcade/types.ts`), 8-game registry with per-game caps and shared 50-token cap (`src/arcade/registry.ts`), `useGameLoop` animation hook, `useInput` keyboard/touch hook, Mulberry32 deterministic PRNG (`seededRng.ts`), and registry test suite (`src/arcade/registry.test.ts`).
- **Key Files:**
  - `Time2Earn/src/arcade/types.ts`: Core arcade interfaces (`ArcadeGameDef`, `GameResult`, `RewardResult`).
  - `Time2Earn/src/arcade/registry.ts`: Registry for 8 games and `SHARED_DAILY_TOKEN_CAP`.
  - `Time2Earn/src/arcade/engine/useGameLoop.ts`: RAF loop hook with dt clamping.
  - `Time2Earn/src/arcade/engine/useInput.ts`: Keyboard, pointer, and swipe input tracker.
  - `Time2Earn/src/arcade/engine/seededRng.ts`: Mulberry32 seeded RNG.
  - `docs/reports/phase-18.md`: Phase 18 report.
- **Open Issues / Notes:** Ready for Phase A2 (shared reward engine and rate limits).

## Phase 19: Shared Reward Engine & Anti-Abuse (Phase A2)
- **Status:** Completed
- **What Exists:** Built pure reward engine (`src/arcade/rewards.ts`) enforcing dual-cap token clamping and uncapped EXP, `ARCADE_SUBMIT` rate limiter (6/min), `submitArcadeResult` endpoint with anti-replay and debt checks, local and callable submitter interfaces (`src/services/arcadeResultService.ts`), and reward unit tests (`src/arcade/rewards.test.ts`).
- **Key Files:**
  - `Time2Earn/src/arcade/rewards.ts`: Authoritative pure reward calculator and rules lookup.
  - `Time2Earn/src/arcade/rewards.test.ts`: Reward clamping and validation test suite.
  - `Time2Earn/src/services/arcadeResultService.ts`: Submission pipeline with rate limiting, anti-replay, audit logging, and swappable submitters.
  - `Time2Earn/src/lib/rateLimit.ts`: Added `ARCADE_SUBMIT` policy.
  - `docs/T2E_ARCADE_ECONOMY.md`: Documented shared 50 cap and per-game cap table.
  - `docs/reports/phase-19.md`: Phase 19 report.
- **Open Issues / Notes:** Ready for Phase A3 (Arcade hub UI, game shell, modal, and leaderboards).

## Phase 20: Registry-Driven Arcade Hub (Phase A3)
- **Status:** Completed
- **What Exists:** Built the registry-driven arcade lobby hub in `Arcade.tsx` with locked cabinets for all 8 games, `GameShell` with dual-cap tracking and error boundary, `ArcadeResultModal`, per-game score leaderboards (`src/arcade/leaderboard.ts`), arcade achievements engine (`src/arcade/achievements.ts`), and player arcade profile stats panel.
- **Key Files:**
  - `Time2Earn/src/pages/player/Arcade.tsx` & `Arcade.css`: Rebuilt hub lobby and arcade profile overview.
  - `Time2Earn/src/arcade/components/GameShell.tsx` & `GameShell.css`: Cabinet launcher shell with error boundary and caps bar.
  - `Time2Earn/src/arcade/components/ArcadeResultModal.tsx`: Post-game score and reward modal.
  - `Time2Earn/src/arcade/leaderboard.ts`: Score-only leaderboard engine.
  - `Time2Earn/src/arcade/achievements.ts`: Achievement definitions and evaluation.
  - `docs/reports/phase-20.md`: Phase 20 report.
- **Open Issues / Notes:** Ready for Phase B (Reaction Rush first playable cabinet).
