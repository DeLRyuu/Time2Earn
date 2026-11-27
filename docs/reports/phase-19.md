# Phase 19 Report: Shared Reward Engine & Anti-Abuse (Phase A2)

### What Was Built
- Created `src/arcade/rewards.ts`: pure functions computing game payouts (`computeArcadeReward`), lookup `GAME_REWARD_RULES`, dual-cap clamping (game-specific cap and shared 50-token daily cap), uncapped EXP granting, and sanity limit assertions (min/max duration, NaN/negative/max score checks).
- Created `src/arcade/rewards.test.ts`: test suite verifying clamping under game cap, daily cap, zero remaining cap behavior, and sanity error rejections.
- Updated `src/lib/rateLimit.ts`: added `ARCADE_SUBMIT` quota (max 6 requests per minute).
- Created `src/services/arcadeResultService.ts`: `ArcadeResultSubmitter` interface, `LocalArcadeSubmitter` fallback with `t2e_local_arcade_sessions_v2`, `FirestoreArcadeSubmitter` stub with documentation on firestore.rules constraints, `submitArcadeResult` endpoint enforcing rate limits, restricted account checks, anti-replay guards, audit logging (`arcade_reward_granted`), and `getArcadeDailyTotals`.
- Updated `docs/T2E_ARCADE_ECONOMY.md`: added cap table (shared 50 tokens/day and 8-game breakdown).

### Files Changed
- Created: `Time2Earn/src/arcade/rewards.ts`, `Time2Earn/src/arcade/rewards.test.ts`, `Time2Earn/src/services/arcadeResultService.ts`
- Modified: `Time2Earn/src/lib/rateLimit.ts`, `docs/T2E_ARCADE_ECONOMY.md`, `docs/T2E_PROGRESS.md`

### How to Test
1. Run reward and registry tests: `node -e "import('vite').then(async ({ createServer }) => { const s = await createServer({ mode: 'test', server: { middlewareMode: true } }); const m = await s.ssrLoadModule('./src/arcade/rewards.test.ts'); m.runArcadeRewardTests(); await s.close(); });"`
2. Run `npm run build && npm run lint` in `Time2Earn` to confirm 0 compilation or lint errors.
