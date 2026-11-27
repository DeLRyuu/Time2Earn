# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

## Cyber Arcade Architecture

Time2Earn features an 8-cabinet retro arcade subsystem (`src/arcade`) with zero-trust token rewards:
- **Never Client-Authoritative**: Clients never decide or write their own rewards. Results are submitted with performance telemetry to `src/services/arcadeResultService.ts` and evaluated purely via `src/arcade/rewards.ts`. In production, this evaluation executes inside a secured Firebase Cloud Function (`submitArcadeSession`) before Firestore balances are touched.
- **Caps & Anti-Cheat**: Enforces a shared 50 tokens/day cap across all games plus individual per-game daily caps. Implausible speeds, auto-clickers, and fake timestamps are strictly rejected.

### Adding a New Arcade Game
1. **Registry Entry**: Add definition to `src/arcade/registry.ts` with ID, dailyTokenCap, and metadata.
2. **Cabinet Component**: Build cabinet under `src/arcade/games/<gameId>/` exporting a React component and `logic.ts`.
3. **Reward Rule**: Add rule function to `GAME_REWARD_RULES` in `src/arcade/rewards.ts` with anti-cheat checks.
4. **Mount Cabinet**: Add cabinet render case to `src/pages/player/Arcade.tsx`.
5. **Unit Tests**: Export `runXTests()` in `<gameId>/logic.test.ts` and wire into `src/arcade/arcade.test.ts`.
