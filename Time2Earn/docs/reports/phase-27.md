# Phase 27 Report: Endless Run Cabinet (Phase G)

## What Was Built
- Distance-based survival arcade cabinet (`EndlessRun.tsx`, `EndlessRun.css`, `logic.ts`, `logic.test.ts`) using the runner engine.
- Difficulty bands escalation: Easy (0m), Normal (500m), Fast (1000m), Hard (2000m), Extreme (3000m), Insane (5000m+) scaling speed and hazard density while guaranteeing passable patterns.
- Consecutive pickup score combo multiplier (x1..x5) for score only.
- Authoritative distance-based rewards in `rewards.ts` (cap 8/day): 300m=1, 800m=2, 1500m=3, 2500m=4, 4000m=5, 6000m=6 tokens. Plausibility guard rejects distance exceeding max speed * duration * 1.05.
- Arcade score formula: `distance + pickupsScore * 5`.
- Updated `ArcadeResultModal.tsx` to explicitly indicate that when daily token cap is hit, players can continue playing for score and leaderboard ranking.
- Enabled cabinet in `registry.ts` with `'playable'` status and mounted into `Arcade.tsx`.

## Files Changed/Created
- `src/arcade/games/endless-run/EndlessRun.tsx` & `EndlessRun.css`
- `src/arcade/games/endless-run/logic.ts` & `logic.test.ts`
- `src/arcade/engine/runner/RunnerCanvas.tsx`
- `src/arcade/rewards.ts`
- `src/arcade/registry.ts`, `src/pages/player/Arcade.tsx`, `src/arcade/components/ArcadeResultModal.tsx`

## How To Test
- Run tests:
  `node -e "import('vite').then(async ({ createServer }) => { const s = await createServer({ mode: 'test', server: { middlewareMode: true } }); const r = await s.ssrLoadModule('./src/arcade/games/endless-run/logic.test.ts'); r.runEndlessRunTests(); await s.close(); });"`
- Verify build & lint: `npm run build && npm run lint`
