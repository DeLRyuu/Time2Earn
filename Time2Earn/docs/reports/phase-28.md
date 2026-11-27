# Phase 28 Report: Zombie Run Cabinet (Phase H)

## What Was Built
- Chaser simulation module (`chaser.ts`) tracking horde distance (`zombieGap`), stamina, sprint state, and defense shields outside the runner engine.
- Zombie mechanics: zombies steadily gain ground; obstacle hits incur -6m gap penalty; Shift/touch sprint widens gap while draining stamina; Energy pickups restore +40 stamina; Shields absorb lethal catches; gap <= 0 triggers game over.
- Typed `ZombieType` enum ('walker' | 'runner' | 'tank' | 'screamer') implementing 'walker'.
- Risk/reward forks: Safe lanes (Token Cache) vs Danger lanes (Survivor Crate, +500 score & +1 bonus token, but pulls zombies 4m closer).
- Zombie Run arcade cabinet (`ZombieRun.tsx`, `ZombieRun.css`) featuring real-time gap and stamina gauge bars, sprint button, and survival HUD.
- Authoritative rewards in `rewards.ts` (cap 10/day): survivedSec 30=1, 60=2, 90=3, 120=4 tokens; Survivor Crates +1 (max +2/run). Distance vs duration anti-cheat validation.
- Unit test suite (`chaser.test.ts`) covering gap closure, sprint stamina, collision penalties, shield absorption, danger crate pull, and reward rules.
- Set `status: 'playable'` in `registry.ts` and mounted into `Arcade.tsx`.

## Files Changed/Created
- `src/arcade/games/zombie-run/chaser.ts` & `chaser.test.ts`
- `src/arcade/games/zombie-run/ZombieRun.tsx` & `ZombieRun.css`
- `src/arcade/rewards.ts`
- `src/arcade/registry.ts` & `src/pages/player/Arcade.tsx`

## How To Test
- Run tests:
  `node -e "import('vite').then(async ({ createServer }) => { const s = await createServer({ mode: 'test', server: { middlewareMode: true } }); const r = await s.ssrLoadModule('./src/arcade/games/zombie-run/chaser.test.ts'); r.runZombieRunTests(); await s.close(); });"`
- Verify build & lint: `npm run build && npm run lint`
