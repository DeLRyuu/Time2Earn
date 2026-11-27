# Phase 17b Report: Legacy Arcade Removal & Clean Slate

### What Was Built
- Removed the legacy Quick Quiz files and types (`arcadeQuiz.ts`, `arcadeService.ts`, `arcadeService.test.ts`, `types/arcade.ts`).
- Rewrote `Arcade.tsx` as a clean empty-state placeholder keeping the header and styling, displaying the rebuilding message.
- Cleaned legacy quiz styles from `Arcade.css` while preserving `.hud-bar` and `.hud-bar-fill` used by `Profile.tsx`.
- Updated Home tile badge to "Coming soon" and manifest description to "Arcade games for bonus tokens and EXP".
- Added transition notice to `docs/T2E_ARCADE_ECONOMY.md`.

### Files Changed
- Deleted: `Time2Earn/src/lib/arcadeQuiz.ts`, `Time2Earn/src/services/arcadeService.ts`, `Time2Earn/src/services/arcadeService.test.ts`, `Time2Earn/src/types/arcade.ts`
- Modified: `Time2Earn/src/pages/player/Arcade.tsx`, `Time2Earn/src/pages/player/Arcade.css`, `Time2Earn/src/pages/player/Home.tsx`, `Time2Earn/public/manifest.json`, `docs/T2E_ARCADE_ECONOMY.md`, `docs/T2E_PROGRESS.md`

### How to Test
1. Run `npm run build && npm run lint` in `Time2Earn` (both compile and pass cleanly).
2. Visit `/player/arcade`: verify the header and empty-state panel ("Arcade games are being rebuilt") render properly.
3. Check `/player/profile`: verify the rank progress bar continues to render correctly using `.hud-bar`.
4. Check `/player/home`: verify the Arcade Zone card badge says "Coming soon".
5. Note: Testers with the legacy localStorage key `t2e_local_arcade_sessions` can safely clear it via DevTools.
