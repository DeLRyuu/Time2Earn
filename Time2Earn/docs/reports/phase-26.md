# Phase 26 Report: Time2Rush Cabinet (Phase F2)

## What Was Built
- Time2Rush game cabinet (`Time2Rush.tsx`, `Time2Rush.css`, `logic.ts`, `logic.test.ts`) mounted into the Arcade lobby and set to `'playable'` in `registry.ts`.
- Two playable game modes:
  - `time-trial`: Fixed 1000m track (~60-70 seconds), reach finish line in record time comparing against personal best and a translucent ghost runner.
  - `token-run`: High-risk track with shortcut lane (lane 2) holding bonus Diamonds (+25) and Crystals (+10) against denser obstacles.
- Daily deterministic track seed (`hashSeed('time2rush_daily_' + dateKey)`) ensuring everyone shares the identical daily course.
- Ghost recording and playback via `localStorage` storing input timestamps `[{t, action}]` and rendering translucent ghost avatar.
- Authoritative reward calculation in `rewards.ts`: base 3 tokens for completing track, +2 for beating track record, pickups score tiers (+0..+5), DNF => 0 tokens, EXP 2. Never exceeds 15 raw tokens per run. Anti-cheat minimum-time validation rejects times faster than theoretical minimum at max speed.
- Typed placeholder for Phase J race placement rewards (`RacePlacementRewardPlaceholder`).

## Files Changed/Created
- `src/arcade/games/time2rush/Time2Rush.tsx` & `Time2Rush.css`
- `src/arcade/games/time2rush/logic.ts` & `logic.test.ts`
- `src/arcade/engine/runner/RunnerCanvas.tsx`
- `src/arcade/rewards.ts`
- `src/arcade/registry.ts` & `src/pages/player/Arcade.tsx`

## How To Test
- Run tests:
  `node -e "import('vite').then(async ({ createServer }) => { const s = await createServer({ mode: 'test', server: { middlewareMode: true } }); const r = await s.ssrLoadModule('./src/arcade/games/time2rush/logic.test.ts'); r.runTime2RushTests(); await s.close(); });"`
- Verify build & lint: `npm run build && npm run lint`
