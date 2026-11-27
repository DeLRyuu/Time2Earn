# Phase 23 Report: Target Hunter Cabinet (Phase D)

### What Was Built
- Created `src/arcade/games/target-hunter/logic.ts`: pure functions for target specs (normal +1, small +3, moving +5, golden +10, fake -5), combo multiplier (x1..x5), accuracy calculation, hit point resolution with fake penalty, circle collision, and seeded RNG target spawning.
- Created `src/arcade/games/target-hunter/TargetHunter.tsx` and `TargetHunter.css`: 30-second canvas aim game driven by `useGameLoop`, handling `devicePixelRatio` scaling, responsive container resizing, pointer events for mouse/touch, visual lifespan countdown rings, and floating indicator labels.
- Updated `src/arcade/rewards.ts`: defined Target Hunter rewards (accuracy>=92% && score>=120 => 5 tokens down to 0, EXP = 2 + tokens*2, arcadeScore = score * 10), and anti-cheat checks rejecting 100% accuracy with >90 hits and rapid clicks > 6 hits/sec.
- Set `target-hunter` status to `'playable'` in `src/arcade/registry.ts` and mounted `<TargetHunter onFinish={handleGameFinish} />` in `Arcade.tsx`.
- Created `src/arcade/games/target-hunter/logic.test.ts`: test suite verifying combo multipliers, scoring, fake penalties, collisions, and auto-clicker rejections.

### Files Changed
- Created: `Time2Earn/src/arcade/games/target-hunter/TargetHunter.tsx`, `TargetHunter.css`, `logic.ts`, `logic.test.ts`
- Modified: `Time2Earn/src/arcade/rewards.ts`, `Time2Earn/src/arcade/registry.ts`, `Time2Earn/src/arcade/registry.test.ts`, `Time2Earn/src/pages/player/Arcade.tsx`, `docs/T2E_PROGRESS.md`

### How to Test
1. Run `npm run build && npm run lint` in `Time2Earn` (0 errors).
2. Run test suites: `node -e "import('vite').then(async ({ createServer }) => { const s = await createServer({ mode: 'test', server: { middlewareMode: true } }); const th = await s.ssrLoadModule('./src/arcade/games/target-hunter/logic.test.ts'); th.runTargetHunterTests(); await s.close(); });"`
3. Navigate to `/player/arcade`: verify Target Hunter is marked "Playable" with "Insert coin".
4. Click "Insert coin": play the 30s session, verify targets spawn and move, empty clicks drop combo and add misses, fake targets deduct 5 points, and result modal awards tokens/EXP.
