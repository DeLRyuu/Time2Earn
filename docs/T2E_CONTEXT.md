# Time2Earn — Technical Context Map (Phase 0 Audit)

## 1. Stack & Scripts
- **Framework & Runtime:** React 19.3 (`react`, `react-dom`), Vite 8.3 (`vite`), TypeScript ~6.0 (`tsc`).
- **Routing:** React Router DOM 7.18 (`react-router-dom`).
- **Backend / Database:** Firebase SDK 13.4 (`firebase` — Firestore, Auth).
- **Tooling & Linting:** ESLint 10.14 (`eslint`, `@eslint/js`, `typescript-eslint`).
- **Package Manager:** npm (Vite workspace inside `./Time2Earn/`).
- **Scripts:**
  - `npm run dev`: Start local Vite dev server.
  - `npm run build`: `tsc -b && vite build` (run once at end of phase).
  - `npm run lint`: `eslint .`.
  - `npm run preview`: `vite preview`.

## 2. Firebase / Firestore Setup
- **Source of Truth:** Existing production Firestore database instance (dumped in `legacy/firestire_backup`).
- **Collections (11):**
  - `config`: Global parameters document `settings` (`phpToCreditRate`, `creditToPhpRate`, `sessionRatePerHour`, `expPerMinute`, `leaderboardResetDays`, `debtTiers`, `rankThresholds`).
  - `users`: User profiles (`username`, `password`, `role`, `credits`, `exp`, `rank`, `streak`, `streakRecoveryCharges`, `totalSessions`, `isBanned`, `isRestricted`).
  - `rewards`: Reward catalog (`name`, `category`, `creditCost`, `expReward`, `cooldownMinutes`, `minRank`, `isActive`).
  - `session_requests`: Player play session requests (`status: pending | approved | rejected`, `amountPaid`, `creditsEarned`, `unitId`).
  - `redemption_requests`: Reward claims (`status: pending | approved | rejected`, `rewardId`, `creditCost`).
  - `reward_cooldowns`: Active claim cooldowns per user/reward (`claimedAt`, `expiresAt`).
  - `debts`: Player debts (`amount`, `tier: none | low | mid | high`, `daysOverdue`, `isRestricted`).
  - `debt_payment_requests`: Requests to pay debt with credits (`status: pending`, `creditsToUse`, `rateUsed`, `phpEquivalent`).
  - `debt_history`: Audit entries of debt modifications (`action`, `amount`, `note`).
  - `credit_transactions`: Credit adjustments (`source: manual_admin`, `credits`, `userId`).
  - `logs`: System event logs (`action: session_approved | redemption_approved | debt_added | ...`).
- **Env Vars (names only):** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

## 3. Auth Model (Exact Current Behavior)
- **Mechanism:** Custom credentials authentication stored directly in Firestore `users` collection.
- **Identity Fields:**
  - `uid` / Document ID: 28-character unique alphanumeric string (e.g., `1DrJrVqcwfULvzDyyLV5S8b8ST03`).
  - `username`: Plaintext unique username (e.g., `lois_123xx`).
  - `password`: Plaintext string stored on user documents in legacy backup (CRITICAL SECURITY RISK).
  - `role`: Role string `'user' | 'admin'`.
  - Account flags: `isBanned` (bool), `isRestricted` (bool).
- **Session Handling:** Legacy app had no Firebase Auth User tokens; queried Firestore `users` where `username == input` directly from client.
- **Security Rule for Time2Earn:** Never expose or log plaintext passwords. Implement server-authoritative authentication and preserve staff-assisted reset UX.

## 4. Route Map
- **Player Portal (Mobile bottom nav / Desktop sidebar):**
  - `/login`: Player and admin authentication entry.
  - `/`: Player Dashboard (Credit balance, EXP bar, Rank badge, Daily streak card, Session request trigger).
  - `/rewards`: Reward catalog (grouped by category, active filter, eligibility check, redemption modal).
  - `/arcade`: Mini-games, streak recovery charges, daily loop.
  - `/leaderboard`: Rank & EXP leaderboards with countdown timer (`leaderboardResetDays`).
  - `/profile`: User stats, debt overview, debt payment request modal, staff reset guide.
- **Admin Portal (`/admin/*`):**
  - `/admin`: Dashboard with pending counts (sessions, redemptions, debt payments).
  - `/admin/sessions`: Review pending session requests (approve/reject with note).
  - `/admin/redemptions`: Review pending redemption claims (approve/reject).
  - `/admin/debts`: Manage debt list, approve credit-based debt payments.
  - `/admin/rewards`: CRUD rewards and toggle `isActive`.
  - `/admin/users`: User management, manual credit adjustment, staff-assisted password reset.
  - `/admin/settings`: View and edit Firestore `config/settings`.

## 5. Business-Logic Locations (file:function)
*Legacy Play Cred source was not committed to repo; business logic reconstructed from `legacy/firestire_backup` and mapped to target implementation files:*
- **Credit Calculation:** `src/lib/credits.ts:calculateCredits(amountPaid, rate)`
  - Reads `config/settings.phpToCreditRate` (current: 1.38; historical in backup: 1.49). Formula: `amountPaid * phpToCreditRate`.
- **EXP Calculation:** `src/lib/exp.ts:calculateExp(minutes, rate)`
  - Reads `config/settings.expPerMinute` (default: 1). Formula: `minutes * expPerMinute`.
- **Rank Determination:** `src/lib/ranks.ts:getRankFromExp(exp, thresholds)`
  - Reads `config/settings.rankThresholds` (12 tiers: Newbie: 0, Visitor: 100, Regular: 300, Grinder: 600, Gamer: 1000, Elite: 2000, VIP: 3500, VIP+: 5000, MVP: 7500, MVP+: 10000, Legend: 15000, OG Player: 25000).
- **Reward Eligibility & Cooldown:** `src/lib/rewards.ts:canRedeemReward(user, reward, cooldowns)`
  - Enforces `reward.isActive === true`, `user.credits >= reward.creditCost`, rank eligibility (`rankThresholds[user.rank] >= rankThresholds[reward.minRank]`), and `reward_cooldowns` lock expiration.
- **Daily Streak Logic:** `src/lib/streaks.ts:updateStreak(user, todayDate)`
  - Evaluates `lastStreakDate`, `streakClaimedDate`, increments `streak`, handles `streakRecoveryCharges` (reset per `streakRecoveryMonth`).
- **Debt Tiers & Payment:** `src/lib/debts.ts:processDebtPayment(debt, creditsToUse)`
  - Tiers from `config/settings.debtTiers` (`low: 10, mid: 20, high: 30`).
  - Debt payment rate: Uses `rateUsed = 0.4` (verified from backup records), NOT global `creditToPhpRate = 0.035`.
- **Approval Transactions:** `src/lib/approvals.ts:approveSessionRequest(id)` / `approveRedemptionRequest(id)`
  - Server-authoritative atomic transaction updating request status, modifying `users` credits/exp, creating cooldowns, and logging to `logs`.

## 6. Existing Security Rules Summary
- **Current Repo State:** No `firestore.rules` file in repository.
- **Legacy Risk:** Legacy client queried Firestore directly with full read/write capabilities and plaintext passwords.
- **Required Time2Earn Firestore Rules:**
  - Players may read only their own `users/{userId}` and their own requests/debts.
  - Players may read only `rewards` where `isActive == true` and public `config`.
  - Block all client-side writes to `credits`, `exp`, `rank`, `debts`, `credit_transactions`, `logs`.
  - All balance-mutating operations must run through server-side Cloud Functions / API routes.

## 7. Reusable Components (Target Architecture)
- `src/components/layout/BottomNav.tsx`: Mobile 5-item navigation bar.
- `src/components/layout/Sidebar.tsx`: Desktop responsive drawer/sidebar.
- `src/components/layout/Header.tsx`: Balance indicators (Credits badge, EXP progress bar, Rank icon).
- `src/components/ui/Button.tsx`: Tactile arcade/gaming action button.
- `src/components/ui/Modal.tsx`: Accessible modal for redemptions and approvals.
- `src/components/ui/Card.tsx`: Dark neon container card.
- `src/components/ui/Badge.tsx`: Rank and category pill.

## 8. Risks / Unknowns
1. **Plaintext Password Legacy Data:** Existing `users` records in Firestore contain plaintext password strings. Time2Earn must safeguard these during authentication and prevent exposure in client bundles or logs.
2. **Missing Legacy Frontend Source:** The legacy Play Cred repository was not provided; only `legacy/firestire_backup` exists. All frontend code must be built cleanly against the documented schema.
3. **Debt Payment Conversion Rate:** `debt_payment_requests` in backup explicitly used `rateUsed = 0.4`, while `config.settings.creditToPhpRate` is `0.035`. Debt payments must strictly follow `rateUsed = 0.4`.
4. **Historical vs. Current Session Rate:** Backup contains sessions with `1.49` ratio, but config now has `1.38`. Time2Earn must always dynamically read rates from `config/settings`.
