# Phase 29 Report: Ball Bounce Cabinet (Phase I)

## What Was Built
- Custom canvas physics engine (`physics.ts`) without external physics dependencies, operating on a deterministic 60Hz fixed timestep.
- Tap/click/Space hop impulse physics with downward gravity and forward world scrolling.
- Moving platforms with narrowing vertical gaps, increasing horizontal speed, and ceiling/floor collision detection.
- Targets & pickups:
  - Hoops (+10 pts) and Stars (+5 pts) building Perfect Bounce multiplier (x1..x5).
  - Rare Gems (+25 pts).
  - Token pickups granting bonus tokens (max 3 per run).
  - Bombs resetting combo multiplier to 1x.
- 3-Minute Token Eligibility Limit: Only first 180 seconds qualify for tokens; subsequent survival is score and leaderboard only (with live status badge indicator).
- Ball Bounce cabinet UI (`BallBounce.tsx`, `BallBounce.css`) with interactive canvas, HUD, and multiplier animations.
- Authoritative rewards in `rewards.ts` (cap 6/day): score 100=1, 300=2, 600=3, plus tokenPickups (max +3). Anti-cheat rejects implausible score rates (> 80 pts/sec).
- Unit test suite (`physics.test.ts`) validating gravity/hop, target collection, bomb resets, 3-minute cutoff, platform collisions, and reward tiers.
- Enabled cabinet in `registry.ts` with `'playable'` status and mounted into `Arcade.tsx`.

## Files Changed/Created
- `src/arcade/games/ball-bounce/physics.ts` & `physics.test.ts`
- `src/arcade/games/ball-bounce/BallBounce.tsx` & `BallBounce.css`
- `src/arcade/rewards.ts`
- `src/arcade/registry.ts` & `src/pages/player/Arcade.tsx`

## How To Test
- Run tests:
  `node -e "import('vite').then(async ({ createServer }) => { const s = await createServer({ mode: 'test', server: { middlewareMode: true } }); const r = await s.ssrLoadModule('./src/arcade/games/ball-bounce/physics.test.ts'); r.runBallBounceTests(); await s.close(); });"`
- Verify build & lint: `npm run build && npm run lint`
