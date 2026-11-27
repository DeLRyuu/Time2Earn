# Time2Earn Arcade Zone: Phase-by-Phase Implementation Plan

Each phase has a goal, the files to touch, a copy-paste agent prompt, acceptance checks, and a suggested commit message. Paste the **Global rules** block at the top of every prompt.

## Read this first: things in your current code that affect the plan

1. **Client-side reward writes conflict with your Firestore rules.** `submitArcadeSession` in `arcadeService.ts` updates `users.credits`, `exp` and `rank` from the browser. `firestore.rules` blocks players from changing those fields, so this only works in offline/local mode or for an admin. Real server-authoritative rewards need a **Firebase Cloud Function (callable)**. Phase A2 builds the reward engine behind an interface so it works locally now and swaps to a Cloud Function later without touching the games.
2. **Login is not Firebase Auth.** `AuthContext` checks username/password against Firestore, so `request.auth` is null in rules. Phase L must resolve this (for example custom tokens) before a Cloud Function can trust the caller.
3. **The old Quick Quiz is removed first (Phase 0).** It carried its own 10-token cap and the client-side reward writes. The new shared **50 tokens/day** arcade cap plus per-game caps is built from scratch in Phase A2.
4. **Naming.** UI says "tokens"; code and Firestore say `credits`. Keep the field `credits`; only UI text says "tokens".
5. **Scope.** Build the foundation, then one game at a time. Never ask the agent for eight games in one prompt.

---

## Target architecture

New game code lives in one feature folder, `src/arcade/`. Everything that talks to Firestore, logs or rate limits stays in your existing `services/` and `lib/` layers, and tests sit next to the code like the rest of the repo.

```text
Time2Earn/src/
├── arcade/                          NEW feature module (games + shared engine)
│   ├── types.ts                     ArcadeGameDef, GameResult, RewardResult
│   ├── registry.ts                  ARCADE_GAMES, getGameDef, SHARED_DAILY_TOKEN_CAP
│   ├── rewards.ts                   pure reward calc + caps + plausibility limits
│   ├── rewards.test.ts              runArcadeRewardTests()
│   ├── registry.test.ts             runRegistryTests()
│   ├── leaderboard.ts               per-game score boards (scores only)
│   ├── achievements.ts              shared achievement definitions
│   ├── arcade.test.ts               runAllArcadeTests() aggregator
│   ├── engine/
│   │   ├── useGameLoop.ts           requestAnimationFrame loop hook
│   │   ├── useInput.ts              keyboard / pointer / swipe
│   │   ├── seededRng.ts             deterministic RNG
│   │   └── runner/                  shared 3-lane runner (Time2Rush, Endless, Zombie)
│   │       ├── runnerCore.ts
│   │       ├── obstacles.ts
│   │       ├── pickups.ts
│   │       ├── RunnerCanvas.tsx
│   │       └── runner.test.ts
│   ├── components/
│   │   ├── GameShell.tsx / .css     common header, caps bar, error boundary
│   │   └── ArcadeResultModal.tsx    score, +tokens, +EXP, clamp notice
│   └── games/
│       ├── reaction-rush/   ReactionRush.tsx · .css · logic.ts · logic.test.ts
│       ├── keyboard-ninja/  same four files
│       ├── target-hunter/   same four files
│       ├── color-clash/     same four files
│       ├── time2rush/       same four files
│       ├── endless-run/     same four files
│       ├── zombie-run/      same four files + chaser.ts
│       └── ball-bounce/     same four files
├── services/
│   └── arcadeResultService.ts       NEW submit result -> validate -> reward -> log
├── lib/
│   └── rateLimit.ts                 EXISTING (+ ARCADE_SUBMIT)
└── pages/player/
    └── Arcade.tsx / Arcade.css      EXISTING page: emptied in Phase 0, rebuilt as the hub

Deleted in Phase 0: lib/arcadeQuiz.ts, services/arcadeService.ts,
services/arcadeService.test.ts, types/arcade.ts (new types live in arcade/types.ts)
```

Outside `src/`: edit `firestore.rules` (arcade blocks only), `README.md` (short arcade section) and the existing docs `docs/T2E_ARCADE_ECONOMY.md` and `docs/T2E_PROGRESS.md`. Write one report per phase as `docs/reports/phase-18.md`, `phase-19.md` and so on, matching your existing phase-0 to phase-17 files.

`Arcade.tsx` becomes the **hub** (lobby, HUD, game cards). Each game is a self-contained component under `src/arcade/games/` that receives `onFinish(result)`; the hub passes the result to `arcadeResultService`, which is the only path that can award tokens or EXP.

| Layer | Where it goes | Why it fits your repo |
|---|---|---|
| Game UI and logic | `src/arcade/games/<id>/` | One folder per game; no page bloat |
| Reward rules, caps | `src/arcade/rewards.ts` (pure) | Testable without Firebase, like `lib/credits.ts` |
| Firestore, logs, rate limit | `src/services/arcadeResultService.ts` | Same layer as `redemptionService.ts` and `sessionService.ts` |
| Local fallback | `localStorage` keys prefixed `t2e_local_arcade_` | Matches the `t2e_local_*` pattern; works when `hasValidFirebaseConfig` is false |
| Styling | CSS next to each component, using `--y --g --r --s --v --panel --line --ink --mute` | Matches `pages/player/*.css`; no new theme tokens |
| Icons and tokens | `ArcadeIcon` plus canvas shapes; `src/assets/token/token-coin.png` for the token icon | No new art needed for first release |
| Tests | Exported `runXTests()` beside the code, aggregated in `arcade.test.ts` | Same style as `lib/*.test.ts` and `services/*.test.ts` |

Rules the agent must respect: keep the Firestore field name `credits` (UI says "tokens") and do not edit `theme.css`.

---

## Token economy (starting values, tune later)

| Rule | Value |
|---|---|
| Shared daily arcade token cap | 50 |
| Time2Rush | 15 |
| Keyboard Ninja | 10 |
| Target Hunter | 10 |
| Zombie Run | 10 |
| Reaction Rush | 8 |
| Color Clash | 8 |
| Endless Run | 8 |
| Ball Bounce | 6 |
| Above a cap | Score, EXP and leaderboard still count; tokens stop |
| Max tokens from a single in-game drop | 50 (no +100 drops) |

Per-game caps can sum above 50 on purpose. The shared cap is the hard ceiling.

---

## Global rules prompt (paste at the top of EVERY phase prompt)

```text
GLOBAL RULES FOR THIS TASK
- Do NOT scan or analyze the whole repo. Open ONLY the files listed under "Read only" for this phase, plus files they directly import if strictly needed.
- Do not refactor unrelated code, rename existing Firestore fields (keep `credits`, `exp`, `rank`), or change the visual theme tokens in src/styles/theme.css.
- Follow existing patterns: React function components, TypeScript strict (verbatimModuleSyntax: use `import type`), one CSS file per component, theme variables (--y, --g, --r, --s, --v, --panel, --panel2, --line, --ink, --mute, --on), chunky arcade style, ArcadeIcon for icons.
- UI text says "tokens" (lowercase). Code/DB uses `credits`.
- Never let the client decide its own reward. Rewards come only from src/arcade/rewards.ts via src/services/arcadeResultService.ts.
- Tests follow the repo style: exported runXTests() functions with assertEqual/assertTrue and console PASS/FAIL, placed next to the code.
- When finished: run `npm run build` and `npm run lint`, fix only errors you caused, write a short report to docs/reports/phase-NN.md (what was built, files changed, how to test; max 25 lines) and add one line to docs/T2E_PROGRESS.md. Then summarize the files changed in 5 lines max. Do not commit; I will commit.
```

Report numbering: A1 = phase-18, A2 = 19, A3 = 20, B = 21, C = 22, D = 23, E = 24, F1 = 25, F2 = 26, G = 27, H = 28, I = 29, J0 = 30, K = 31, L = 32.

---

## Phase 0: Remove the existing Quick Quiz (clean slate)

**Goal:** Delete the old quiz game and everything only it used, leave `/player/arcade` as a working empty placeholder, and keep the app building.

**Before you start (you run this, not the agent):**

```text
git status                      # make sure the working tree is clean
git tag pre-arcade-cleanup      # easy rollback point
git checkout -b arcade/cleanup
```

**What gets deleted:** `src/lib/arcadeQuiz.ts`, `src/services/arcadeService.ts`, `src/services/arcadeService.test.ts`, `src/types/arcade.ts`.

**What gets edited:** `src/pages/player/Arcade.tsx` (reduced to a placeholder), `src/pages/player/Arcade.css` (quiz styles removed), `src/pages/player/Home.tsx` (one badge line), `public/manifest.json` (one shortcut description), `docs/T2E_ARCADE_ECONOMY.md` (mark the old quiz as removed).

**What must be KEPT (other code depends on it):**

| Keep | Why |
|---|---|
| `.hud-bar` and `.hud-bar-fill` in `Arcade.css` | `Profile.tsx` uses these classes for the rank progress bar, and they are only defined in `Arcade.css` |
| `src/components/common/GainFeedback.tsx` and `.css` | Reused by the new games |
| `src/components/common/CooldownTimer.tsx` | Used by `Rewards.tsx` |
| `arcade_reward_granted` in `logService.ts` | Reused by the new reward engine |
| `arcade_sessions` block in `firestore.rules` and the `arcade_sessions` cases in `securityRules.test.ts` | Reused for arcade result records in Phase A2 |
| Sidebar "Arcade Zone" link and the `/player/arcade` route | The page stays, only its content is reset |

**Read only:** `src/pages/player/Arcade.tsx`, `src/pages/player/Arcade.css`. For everything else use `grep`, do not open the files.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase 0, remove the legacy Quick Quiz and reset the Arcade Zone to an empty placeholder (report: docs/reports/phase-17b.md). The cleanup tag and branch are already created by me.

1. Delete these files: src/lib/arcadeQuiz.ts, src/services/arcadeService.ts, src/services/arcadeService.test.ts, src/types/arcade.ts.
2. Rewrite src/pages/player/Arcade.tsx as a small placeholder component (export const Arcade: React.FC) that keeps the existing header ("Arcade Zone" + subtitle) and shows an empty-state panel: ArcadeIcon name="joystick", title "Arcade games are being rebuilt", text "New games are coming soon. Your tokens and EXP are safe." It must NOT import anything from the deleted files, and must not import services or hooks it does not use.
3. Edit src/pages/player/Arcade.css: remove all styles used only by the old quiz and game cards (.arcade-hud, .hud-stat, .hud-label, .hud-val, .hud-status-badge*, .games-grid, .game-card*, .game-scr*, .game-info, .game-reward, .game-btn*, .arcade-tiers-card, .tiers-table*, .arcade-notes, .quiz-*, .result-*, .reward-pill*, .review-*, @keyframes pulse). KEEP .arcade-view, .arcade-head, .arcade-sub, and KEEP .hud-bar and .hud-bar-fill (and .hud-bar-fill.mint) because src/pages/player/Profile.tsx uses them. Add a minimal .arcade-empty style for the placeholder using theme variables only.
4. src/pages/player/Home.tsx: change the Arcade tile badge text "1 game open" to "Coming soon". Do not change anything else in that file.
5. public/manifest.json: change the "Cyber Arcade" shortcut description to "Arcade games for bonus tokens and EXP". Do not change anything else.
6. docs/T2E_ARCADE_ECONOMY.md: add a short note at the top saying the legacy Quick Quiz (daily cap 10, 3 attempts/day) was removed and the economy is being redesigned for the 8-game arcade. Do not rewrite the rest.
7. DO NOT touch: src/components/common/GainFeedback.*, CooldownTimer.tsx, logService.ts, firestore.rules, securityRules.test.ts, package.json, the Sidebar or App.tsx routes.
8. Verify with grep (do not open files) that nothing still references the removed code. These searches must return nothing in src/, public/ and package.json: "arcadeQuiz", "arcadeService", "types/arcade", "ARCADE_TIERS", "QUIZ_QUESTION_BANK", "startArcadeSession", "submitArcadeSession", "getArcadeUserStatus", "runArcadeTests". Also grep "quick_quiz" and "Quick Quiz" in src/ and public/ and fix any user-facing leftovers you find (leave docs alone except item 6).
9. Run npm run build and npm run lint. Open /player/arcade mentally via the code: it must compile and render the placeholder. Also confirm Profile.tsx still uses .hud-bar and that the class still exists in Arcade.css.

Note: the old localStorage key t2e_local_arcade_sessions may exist in browsers; do not write migration code, just mention in the report that testers can clear it.
```

**Acceptance:**

- `npm run build` and `npm run lint` pass.
- `/player/arcade` shows the placeholder; the sidebar link still works.
- The Profile page rank progress bar still looks the same.
- The grep checks for the removed names return nothing.
- `Rewards`, `Home` and `Leaderboard` pages still load.

**Commit message:**

```text
chore(arcade): remove legacy Quick Quiz and reset Arcade Zone to an empty placeholder
```

---

## Phase A1: Arcade foundation (types, registry, engine hooks)

**Goal:** Create the shared scaffolding with no gameplay yet.

**Read only:** `src/components/ui/ArcadeIcon.tsx` (for the `ArcadeIconName` type). Create: `src/arcade/types.ts`, `registry.ts`, `registry.test.ts`, `engine/useGameLoop.ts`, `engine/useInput.ts`, `engine/seededRng.ts`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase A1, Arcade foundation scaffolding (report: docs/reports/phase-18.md).

Create:
1. src/arcade/types.ts
   - ArcadeGameId = 'time2rush' | 'endless-run' | 'zombie-run' | 'reaction-rush' | 'color-clash' | 'target-hunter' | 'ball-bounce' | 'keyboard-ninja'
   - ArcadeGameDef { id, name, tagline, icon: ArcadeIconName, color (css var string), status: 'playable'|'coming-soon', modes: string[], minDurationMs, maxDurationMs, maxPlausibleScore, dailyTokenCap, input: ('keyboard'|'mouse'|'touch')[] }
   - GameResult { gameId, sessionId, mode, score, durationMs, difficulty, performance: Record<string, number>, clientVersion, startedAt, endedAt }
   - RewardResult { tokensAwarded, expAwarded, rawTokens, clamped: 'none'|'game-cap'|'daily-cap', tierLabel, arcadeScore }
2. src/arcade/registry.ts: export ARCADE_GAMES containing all 8 games (all 'coming-soon' for now) with these daily token caps: time2rush 15, endless-run 8, zombie-run 10, reaction-rush 8, color-clash 8, target-hunter 10, keyboard-ninja 10, ball-bounce 6. Export getGameDef(id) and export const SHARED_DAILY_TOKEN_CAP = 50.
3. src/arcade/engine/useGameLoop.ts: hook useGameLoop(update:(dtMs:number)=>void, running:boolean) using requestAnimationFrame, clamping dt to 50ms, cleaning up on unmount, pausing when document.hidden.
4. src/arcade/engine/useInput.ts: hook tracking pressed keys (Set), pointer position relative to a given element ref, and swipe direction (left/right/up/down) for touch. Clean up listeners.
5. src/arcade/engine/seededRng.ts: mulberry32 seeded RNG factory.
6. src/arcade/registry.test.ts exporting runRegistryTests(): 8 games, unique ids, caps > 0, none playable yet.

Do not modify Arcade.tsx yet.
```

**Acceptance:** build is clean; registry test logic passes; no existing page changed.

**Commit message:**
```text
feat(arcade): add arcade foundation types, game registry and engine hooks
```

---

## Phase A2: Reward engine and anti-abuse

**Goal:** Central, testable reward calculation, shared daily cap, per-game caps, rate limits, transaction logging, with a swappable submitter for a future Cloud Function.

**Read only:** `src/arcade/types.ts`, `src/arcade/registry.ts`, `src/lib/rateLimit.ts`, `src/services/logService.ts` (`KNOWN_LOG_ACTIONS` only), `firestore.rules` (`arcade_sessions` and `logs` blocks).

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase A2, reward engine + anti-abuse (report: docs/reports/phase-19.md).

1. src/arcade/rewards.ts (PURE functions, no Firebase):
   - computeArcadeReward({ result: GameResult, tokensEarnedTodayAll, tokensEarnedTodayForGame }): RewardResult
   - Per-game rules as a lookup GAME_REWARD_RULES[gameId] returning { rawTokens, exp, tierLabel } from result.performance. Start with simple placeholder tiers; each game phase will fill in its own rule.
   - Clamp: tokens = min(rawTokens, gameCapRemaining, sharedCapRemaining). EXP is never capped. Set `clamped` accordingly. arcadeScore is always returned (used for leaderboards).
   - Sanity limits: throw if durationMs is below the game's minDurationMs or above maxDurationMs, or score is negative/NaN/above maxPlausibleScore.
2. src/services/arcadeResultService.ts:
   - interface ArcadeResultSubmitter { submit(user, result): Promise<RewardResult & { newTotalCredits, newTotalExp, newRank }> }
   - LocalArcadeSubmitter (offline/test mode, localStorage keys prefixed t2e_local_arcade_, same pattern as arcadeService.ts local fallback).
   - FirestoreArcadeSubmitter: a documented stub that calls a Firebase callable named `submitArcadeResult` (do NOT implement the function), with a clear error if functions are not configured. Add a comment that the client cannot write users.credits under current firestore.rules.
   - export submitArcadeResult(user, result): assert rate limit, reject restricted users (isRestricted), reject duplicate sessionId (anti-replay), call computeArcadeReward, delegate to the active submitter, write a credit_transactions-style record and a log with action 'arcade_reward_granted' (details include gameId, score, tokens, exp).
3. src/lib/rateLimit.ts: add ARCADE_SUBMIT: { maxRequests: 6, windowMs: 60000 }.
4. Daily totals (replaces the deleted quiz logic): store each validated result in the existing `arcade_sessions` collection (offline: localStorage) with fields userId, gameId, sessionId, score, tokensAwarded, expAwarded, completedAt. Add getArcadeDailyTotals(userId, now) returning { allTokens, perGame } for the current UTC day. The same store powers the sessionId anti-replay check.
5. src/arcade/rewards.test.ts exporting runArcadeRewardTests(): game cap clamp, shared cap clamp, EXP uncapped, invalid duration rejected, negative score rejected, zero remaining cap gives 0 tokens but score still returned.
6. Update docs/T2E_ARCADE_ECONOMY.md with the cap table (shared 50, per-game caps) in a short section.

Do not touch Arcade.tsx.
```

**Acceptance:** reward tests cover caps and rejections; no component changes.

**Commit message:**
```text
feat(arcade): add shared reward engine, daily/game caps, replay and rate-limit guards
```

---

## Phase A3: Arcade hub, shared leaderboard, achievements

**Goal:** Turn `Arcade.tsx` into a hub driven by the registry, with a game launcher, shared arcade profile, per-game score leaderboard and achievements.

**Read only:** `src/pages/player/Arcade.tsx`, `src/pages/player/Arcade.css`, `src/arcade/registry.ts`, `src/arcade/types.ts`, `src/services/arcadeResultService.ts`. Create: `src/arcade/leaderboard.ts`, `src/arcade/achievements.ts`, `src/arcade/components/GameShell.tsx`, `GameShell.css`, `ArcadeResultModal.tsx`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase A3, hub UI (report: docs/reports/phase-20.md).

1. Build the lobby in src/pages/player/Arcade.tsx (currently the Phase 0 placeholder) so the cards render from ARCADE_GAMES. All games are 'coming-soon' at this stage, so every card is locked. Add a `selectedGame` state; when a game def is playable, render its component inside <GameShell>. Add a single mount switch (gameId -> component) so each later phase adds one line.
2. src/arcade/components/GameShell.tsx (+ GameShell.css): common header (game name, back to lobby, tokens-left-today bar vs the 50 shared cap, per-game cap), slot for the game, and an error boundary.
3. src/arcade/components/ArcadeResultModal.tsx: shows score, tier label, +tokens, +EXP, a note when clamped ("Daily token cap reached. Score and EXP still count."), and buttons Play again / Back to lobby. Reuse the .modal-overlay/.modal-card pattern from Rewards.css/Profile.css.
4. src/arcade/leaderboard.ts: per-game best-score store. Local implementation (localStorage) + a Firestore collection name constant `arcade_scores` (not written yet). Functions: recordScore(gameId, user, score), getTopScores(gameId, n), getDailyTop(gameId, n). Leaderboards use SCORES only, never token balance.
5. src/arcade/achievements.ts: definitions (First Game, Arcade Rookie 10 games, Arcade Addict 100 games, Token Hunter 100 arcade tokens, plus placeholders for game-specific ones) and evaluateAchievements(stats). Local storage only for now. Show newly unlocked ones as toasts via useToast.
6. Add a small "Arcade profile" panel in the hub: total games, tokens earned from arcade, best streak, favorite game (derived from local stats).

Keep CSS in Arcade.css using existing classes where possible. Do not implement any new game.
```

**Acceptance:** all 8 locked cards render from the registry; the shell and result modal exist.

**Commit message:**
```text
feat(arcade): registry-driven arcade hub with game shell, result modal, leaderboard and achievements
```

---

## Phase B: Reaction Rush (first game; validates the pipeline)

Moved ahead of Time2Rush on purpose: it is tiny, so it proves the reward pipeline before the hard flagship game.

**Read only:** `src/arcade/types.ts`, `registry.ts`, `rewards.ts`, `components/GameShell.tsx`, and the game-mount switch in `Arcade.tsx`. Create: `src/arcade/games/reaction-rush/ReactionRush.tsx`, `ReactionRush.css`, `logic.ts`, `logic.test.ts`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase B, Reaction Rush (report: docs/reports/phase-21.md).

Build src/arcade/games/reaction-rush/:
- logic.ts (pure): gradeFromAverage(avgMs) with S+ <150, S 150-180, A 181-220, B 221-270, C 271-350, D 351+; computeStats(rounds); false-start handling.
- ReactionRush.tsx: 10 rounds. Screen shows WAIT (red) for a random 1.2-4s delay using the seeded RNG, then GO (green); measure with performance.now(). Clicking/pressing Space early = false start: the round is voided and repeated; after 3 false starts, add +100ms to the average per extra false start. Show per-round ms, final average, best, grade. Call onFinish(GameResult) with performance { avgMs, bestMs, falseStarts, rounds }.
- Rewards (in rewards.ts GAME_REWARD_RULES): S+ 5, S 4, A 3, B 2, C 1, D 0 tokens; EXP = 1 + tokens*2. Plausibility: reject if any single round < 80ms (human limit) or avgMs < 90.
- arcadeScore = max(0, 1000 - avgMs*2), rounded.
- Set registry status to 'playable'. Add its line to the mount switch in Arcade.tsx.
- Tests: logic.test.ts exporting runReactionRushTests() (grade boundaries, false-start penalty, implausible average rejected). Add it to src/arcade/arcade.test.ts if that file exists; otherwise note it.
Mobile: tap anywhere works. Respect prefers-reduced-motion (no flashing).
```

**Acceptance:** full 10-round game, result modal, tokens limited to 8/day.

**Commit message:**
```text
feat(arcade): add Reaction Rush game with graded rewards and false-start penalties
```

---

## Phase C: Keyboard Ninja

**Read only:** shared arcade files (`types`, `registry`, `rewards`, `GameShell`, mount switch in `Arcade.tsx`). Create: `src/arcade/games/keyboard-ninja/KeyboardNinja.tsx`, `.css`, `logic.ts`, `logic.test.ts`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase C, Keyboard Ninja (report: docs/reports/phase-22.md).

Build src/arcade/games/keyboard-ninja/:
- logic.ts (pure): key pools by stage ['ASDF','JKL','ASDFJKL','QWERTY', full letters]; next-key generator using the seeded RNG; combo multiplier (x1..x5, capped at x5, SCORE ONLY); accuracy; keys/sec.
- KeyboardNinja.tsx: 45-second Classic mode. A target key appears; correct key = +1 hit and combo up; wrong key = combo reset and -1 life (3 lives). Stage advances every 15 correct keys. Show combo, lives, timer, and an on-screen key hint row. Prevent browser defaults (Space scroll, Tab). Ignore held-key auto-repeat (e.repeat). On touch-only devices show "Keyboard required" and disable start.
- performance: { hits, misses, accuracy, keysPerSec, bestCombo, stage }.
- Rewards: accuracy>=97 && kps>=4 => 6 tokens; >=93 && >=3 => 4; >=85 && >=2 => 2; >=70 => 1; else 0. EXP = 2 + tokens*2. Reject keysPerSec > 14 (bot suspicion) and hits > 600.
- arcadeScore = hits*10 + bestCombo*25 - misses*15 (min 0).
- Tests: runKeyboardNinjaTests() for combo reset, accuracy calc, bot-rate rejection.
Boss mode: do NOT build now. Leave a TODO comment.
```

**Commit message:**
```text
feat(arcade): add Keyboard Ninja with staged key pools, combo scoring and bot-rate validation
```

---

## Phase D: Target Hunter

**Read only:** shared arcade files plus `engine/useGameLoop.ts` and `engine/useInput.ts`. Create: `src/arcade/games/target-hunter/*`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase D, Target Hunter (report: docs/reports/phase-23.md).

Build src/arcade/games/target-hunter/ using a <canvas> and useGameLoop:
- 30-second Classic mode. Target types: normal (+1), small (+3), moving (+5), golden (+10, rare, short lifetime), fake (-5, clearly marked, do not click). Spawn rates driven by the seeded RNG and elapsed time; targets expire.
- Combo x1..x5 (score only). Clicks on empty canvas are misses: they drop combo and count against accuracy.
- Handle devicePixelRatio and canvas resize; touch works via pointer events.
- performance: { hits, misses, accuracy, bestCombo, goldenHits, fakeHits }.
- Rewards: accuracy>=92 && score>=120 => 5 tokens; >=85 && >=80 => 3; >=70 && >=40 => 2; >=50 => 1; else 0. Reject accuracy 100% with hits > 90 (auto-clicker) and hits/sec > 6.
- arcadeScore = score * 10.
- Record scores via src/arcade/leaderboard.ts (scores only).
- Tests: runTargetHunterTests() for scoring, combo, fake penalty, plausibility rejections.
Modes Precision/Speed/Chaos: do NOT build now; keep a typed `mode` prop with only 'classic'.
```

**Commit message:**
```text
feat(arcade): add Target Hunter canvas aim game with combo, fake targets and plausibility checks
```

---

## Phase E: Color Clash

**Read only:** shared arcade files. Create: `src/arcade/games/color-clash/*`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase E, Color Clash, Stroop-style (report: docs/reports/phase-24.md).

Build src/arcade/games/color-clash/:
- Show a color WORD rendered in a different ink color. The player picks the INK color from 4 buttons (red, blue, green, yellow). Keyboard shortcuts 1-4 and touch buttons. Never rely on color alone: each button also has a text label and a shape icon (accessibility).
- Classic mode only (20 questions). Scaling: faster timer after every 5 correct.
- Combo (score only), per-question time recorded.
- performance: { correct, total, accuracy, avgTimeMs, bestCombo }.
- Rewards: accuracy>=95 && avgTimeMs<=1200 => 4 tokens; >=90 && <=1600 => 3; >=80 => 2; >=65 => 1; else 0. EXP = 2 + tokens*2. Reject avgTimeMs < 250.
- arcadeScore = correct*100 + bestCombo*40 - avgTimeMs/10.
- Tests: runColorClashTests().
```

**Commit message:**
```text
feat(arcade): add Color Clash Stroop game with accessible color options and speed/accuracy rewards
```

---

## Phase F: Time2Rush, solo and ghost runs (flagship)

Split into two prompts. Multiplayer comes later (Phase J).

### F1: Runner engine (shared by Time2Rush, Endless Run, Zombie Run)

**Read only:** `src/arcade/engine/*`, `src/arcade/types.ts`. Create: `src/arcade/engine/runner/` (`runnerCore.ts`, `obstacles.ts`, `pickups.ts`, `RunnerCanvas.tsx`, `runner.test.ts`).

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase F1, reusable runner engine (report: docs/reports/phase-25.md).

Build a deterministic 3-lane runner core (pure logic + a canvas renderer):
- runnerCore.ts: state { distance, speed, lane, y, vy, sliding, lives, shieldMs, magnetMs, doubleMs }, step(state, input, dtMs, rng). Actions: jump, slide, laneLeft, laneRight. Fixed timestep (accumulator at 1/60s) so results are reproducible from (seed, input log).
- obstacles.ts: barricade (jump), low barrier (slide), puddle (slow zone), moving obstacle. Pattern generator from the seeded RNG ensuring every pattern is passable (never block all 3 lanes with unavoidable obstacles).
- pickups.ts: Token (+1), Gem (+3), Crystal (+10), Diamond (+25), Golden Token (+50, very rare, once per run max), power-ups Speed Boost, Shield, Magnet, Double Token, Ghost. Pickup values are SCORE units inside the run; tokens come only from the reward engine.
- RunnerCanvas.tsx: renders with simple shapes (no external assets); keyboard (arrows/WASD/Space) and swipe via useInput.
- Record an input log [{t, action}] so a run can be replayed (ghost) and validated later.
- Tests: determinism (same seed+inputs => same distance), passable patterns, power-up timers.
No game wrapper yet.
```

**Commit message:**
```text
feat(arcade): add deterministic 3-lane runner engine with obstacles, pickups and input recording
```

### F2: Time2Rush game (Solo Time Trial + Token Run + ghost)

**Read only:** `src/arcade/engine/runner/*`, shared arcade files, the mount switch in `Arcade.tsx`. Create: `src/arcade/games/time2rush/*`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase F2, Time2Rush on the runner engine (report: docs/reports/phase-26.md).

Build src/arcade/games/time2rush/:
- Modes: 'time-trial' (fixed-length track, reach the finish line; compare to personal best and a recorded ghost) and 'token-run' (same track with a risky shortcut lane holding Diamonds/Crystals vs a safe lane).
- Track length ~60-90 seconds of play. Deterministic seed per DAILY track (seed = date string) so everyone shares the daily course and times are comparable.
- Ghost: store the best run's input log (localStorage for now) and render a translucent ghost runner replaying it.
- performance: { finishTimeMs, pickupsScore, tokenPickups, collisions, completed }.
- Rewards (cap 15/day via registry): finished => base 3; finish under the track record => +2; pickupsScore tiers +0..+5; DNF => 0 tokens, EXP 2. Never award more than 15 raw tokens per run. Validate finishTimeMs >= theoretical minimum for the track length at max speed; reject otherwise.
- Race placement rewards (1st 10, 2nd 7, 3rd 5, 4th 3) are for Phase J. Leave a typed placeholder only.
- Leaderboard by finishTimeMs (daily + all-time), scores only.
- Tests: runTime2RushTests() for minimum-time validation and reward tiers.
```

**Commit message:**
```text
feat(arcade): add Time2Rush solo time trial and token run with daily seeded track and ghost replay
```

---

## Phase G: Endless Run

**Read only:** `src/arcade/engine/runner/*` and shared arcade files. Create: `src/arcade/games/endless-run/*`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase G, Endless Run (report: docs/reports/phase-27.md). Do not modify the runner engine except to add an optional `difficultyCurve` parameter if truly required.

- Distance-based survival using the runner engine. Difficulty bands: 0m easy, 500 normal, 1000 fast, 2000 hard, 3000 extreme, 5000 insane (speed + obstacle density increase; patterns must stay passable).
- Combo: consecutive pickups without a miss, x1..x5, SCORE ONLY.
- performance: { distanceM, pickupsScore, bestCombo, durationMs }.
- Rewards (cap 8/day via registry): distance 300m=1, 800m=2, 1500m=3, 2500m=4, 4000m=5, 6000m=6 tokens. Reject distance that exceeds max speed * duration * 1.05.
- When the cap is hit the result modal must say the player can keep playing for score and leaderboard only.
- arcadeScore = distance + pickupsScore*5.
- Tests: runEndlessRunTests().
```

**Commit message:**
```text
feat(arcade): add Endless Run survival game with difficulty bands and distance-based rewards
```

---

## Phase H: Zombie Run

**Read only:** `src/arcade/engine/runner/*` and shared arcade files. Create: `src/arcade/games/zombie-run/*` (including `chaser.ts`).

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase H, Zombie Run (report: docs/reports/phase-28.md).

Extend the runner WITHOUT breaking Endless Run/Time2Rush: put the chaser logic in src/arcade/games/zombie-run/chaser.ts (not in the engine). It tracks zombieGap (distance behind the player), stamina and sprint.
- Mechanics: zombies gain slowly over time; hitting obstacles shrinks the gap; stamina powers a temporary sprint (Shift/double-tap) that regenerates; Energy pickup refills stamina; Shield blocks one zombie hit; gap <= 0 = game over.
- One zombie type only: Walker. Leave a typed enum for Runner/Tank/Screamer but do not implement them.
- Risk/reward fork: periodic split with a SAFE lane (Token Cache, small) and a DANGER lane (Survivor Crate, bigger reward, zombies closer).
- performance: { distanceM, survivedSec, cratesOpened, shieldsUsed }.
- Rewards (cap 10/day): survivedSec 30=1, 60=2, 90=3, 120=4 tokens; crate opened +1 (max +2 per run). Validate distance vs time as in Endless Run.
- Tests: runZombieRunTests() for gap logic and stamina.
```

**Commit message:**
```text
feat(arcade): add Zombie Run with chaser gap, stamina sprint and risk/reward lane forks
```

---

## Phase I: Ball Bounce

**Read only:** shared arcade files and engine hooks. Create: `src/arcade/games/ball-bounce/*`.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase I, Ball Bounce (report: docs/reports/phase-29.md).

- Canvas physics game: click/tap/Space makes the ball hop up; gravity pulls it down; scroll through gaps and hoops. Fixed-timestep physics. No physics library.
- Targets: Hoop +10, Star +5, Token pickup (counts for rewards, max 3 per run), Rare Gem bonus, Bomb (resets multiplier). Perfect Bounce multiplier x1..x5, resets on a miss (score only).
- Difficulty ramps: moving platforms, narrower gaps, faster ball.
- ONLY the first 3 minutes of a run count toward tokens; afterwards score only (show a clear indicator).
- performance: { score, hoops, tokenPickups, bestMultiplier, durationMs }.
- Rewards (cap 6/day): score 100=1, 300=2, 600=3, plus tokenPickups (max +3). Reject implausible score per second.
- Tests: runBallBounceTests().
```

**Commit message:**
```text
feat(arcade): add Ball Bounce physics game with multiplier scoring and 3-minute token window
```

---

## Phase J: Time2Rush multiplayer (optional, after everything else is stable)

Roadmap: V1 ghost/async (done in F2), V2 real-time lobby, V3 private rooms. V2 needs a real-time backend decision first.

**Agent prompt (decision phase, no feature code):**

```text
[PASTE GLOBAL RULES]

TASK: Phase J0, multiplayer design only (report: docs/reports/phase-30.md). Do NOT write feature code. Read only src/arcade/games/time2rush/* and firestore.rules.

Produce docs/TIME2RUSH_MULTIPLAYER.md comparing 3 approaches (Firestore realtime listeners, Firebase Realtime Database, dedicated WebSocket server) for 2-4 player races on the same seeded track. For each: latency, cost, anti-cheat (server-validated finish times from input logs), Firestore rules changes needed, and a recommended MVP. Recommend one. Include a data model for rooms (code, players, seed, status, results) and the placement reward table (1st 10, 2nd 7, 3rd 5, 4th 3) clamped by the shared daily cap.
```

**Commit message:**
```text
docs(arcade): add Time2Rush multiplayer architecture options and recommendation
```

After you pick a backend, the J1 (rooms/lobby) and J2 (race sync + placement rewards) prompts get written for it.

---

## Phase K: Security, tests and economy hardening

**Read only:** `firestore.rules` (arcade blocks; add `arcade_scores` and `arcade_profiles`), `src/services/securityRules.test.ts` (the `evaluateFirestoreRule` function and one section header), `package.json` (scripts only), the arcade test files.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase K, hardening (report: docs/reports/phase-31.md).

1. Add Firestore rules: arcade_scores readable by authenticated users (username, gameId, score only), create only for the player's own userId with score a number; update/delete admin only. arcade_profiles readable/writable by the owner for non-sensitive stats only (no credits/exp).
2. Extend evaluateFirestoreRule in securityRules.test.ts with these two collections and add tests: a player cannot write another player's score, cannot change credits via arcade, cannot read others' profiles.
3. Create or finish src/arcade/arcade.test.ts exporting runAllArcadeTests(), which calls every runXTests() from src/arcade, and hook it into the existing `npm test` script without breaking the current ones.
4. Replace any hardcoded 10-token cap text in Arcade.tsx with values from the registry / SHARED_DAILY_TOKEN_CAP.
5. README.md: add a short section (max 25 lines): arcade architecture, how to add a new game (registry entry, component, reward rule, tests), and the Cloud Function requirement for production rewards.
```

**Commit message:**
```text
chore(arcade): harden arcade rules and tests, add aggregator and contributor docs
```

---

## Phase L (before launch): Cloud Function reward authority

**Why:** without this, production rewards cannot be written securely under your current rules.

**Agent prompt:**

```text
[PASTE GLOBAL RULES]

TASK: Phase L, Firebase callable function `submitArcadeResult` (report: docs/reports/phase-32.md). Read only src/arcade/rewards.ts, src/arcade/types.ts, src/services/arcadeResultService.ts, src/context/AuthContext.tsx (login/session parts) and firestore.rules (users block).

FIRST: the project uses a custom username/password check against Firestore, not Firebase Auth, so request.auth will be null in the callable. Tell me this and propose the smallest change (for example minting custom tokens) and WAIT for my confirmation before writing code.

After I confirm: create a `functions/` folder (TypeScript) with a callable that verifies the caller, loads the user + today's arcade totals, re-runs computeArcadeReward (share or copy the pure logic), enforces single-use sessions and rate limits, and writes users.credits/exp/rank, credit_transactions and logs in one Firestore transaction. Wire FirestoreArcadeSubmitter to it. Do not change the client games. Add deploy instructions in functions/README.md.
```

**Commit message:**
```text
feat(functions): add submitArcadeResult callable as authoritative arcade reward writer
```

---

## Suggested order and release plan

0. Phase 0 (remove the old Quick Quiz), then A1, A2, A3 (foundation)
2. B Reaction Rush, then C Keyboard Ninja, then D Target Hunter (fast wins, test the economy)
3. F1 and F2 Time2Rush (flagship)
4. E Color Clash, G Endless Run, H Zombie Run, I Ball Bounce
5. K hardening, then L before tokens have real shop value in production
6. J multiplayer last

**First public release suggestion:** Reaction Rush + Keyboard Ninja + solo Time2Rush. Keep the other cabinets as "Coming soon".

## Tips for working with the agent

- Paste the Global rules block plus only one phase prompt per session.
- If the agent starts reading many files, stop it: "Only the files listed. Ask me if something else is needed."
- After each phase run `npm run build` and `npm run lint`, and play the game for 2 minutes on desktop and phone before committing.
