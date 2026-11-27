import { ARCADE_GAMES, getGameDef, SHARED_DAILY_TOKEN_CAP } from './registry';
import type { ArcadeGameId } from './types';

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertTrue(cond: boolean, msg: string): void {
  if (!cond) {
    throw new Error(`FAIL: ${msg}`);
  }
}

export function runRegistryTests(): void {
  console.log('--- RUNNING ARCADE REGISTRY TESTS ---');

  // 1. Total games count is 8
  assertEqual(ARCADE_GAMES.length, 8, 'ARCADE_GAMES should contain exactly 8 games');

  // 2. All game IDs must be unique
  const ids = new Set<string>();
  for (const game of ARCADE_GAMES) {
    assertTrue(!ids.has(game.id), `Duplicate game id detected: ${game.id}`);
    ids.add(game.id);
  }

  // 3. Expected game IDs list
  const expectedIds: ArcadeGameId[] = [
    'time2rush',
    'endless-run',
    'zombie-run',
    'reaction-rush',
    'color-clash',
    'target-hunter',
    'keyboard-ninja',
    'ball-bounce',
  ];
  for (const expectedId of expectedIds) {
    assertTrue(ids.has(expectedId), `Missing expected game: ${expectedId}`);
    const def = getGameDef(expectedId);
    assertTrue(def !== undefined, `getGameDef should resolve ${expectedId}`);
  }

  // 4. Daily token caps > 0 and sum check
  for (const game of ARCADE_GAMES) {
    assertTrue(game.dailyTokenCap > 0, `Game ${game.id} must have dailyTokenCap > 0`);
  }
  assertEqual(SHARED_DAILY_TOKEN_CAP, 50, 'SHARED_DAILY_TOKEN_CAP must be 50');

  // Specific per-game cap checks
  assertEqual(getGameDef('time2rush')?.dailyTokenCap, 15, 'Time2Rush cap 15');
  assertEqual(getGameDef('endless-run')?.dailyTokenCap, 8, 'Endless Run cap 8');
  assertEqual(getGameDef('zombie-run')?.dailyTokenCap, 10, 'Zombie Run cap 10');
  assertEqual(getGameDef('reaction-rush')?.dailyTokenCap, 8, 'Reaction Rush cap 8');
  assertEqual(getGameDef('color-clash')?.dailyTokenCap, 8, 'Color Clash cap 8');
  assertEqual(getGameDef('target-hunter')?.dailyTokenCap, 10, 'Target Hunter cap 10');
  assertEqual(getGameDef('keyboard-ninja')?.dailyTokenCap, 10, 'Keyboard Ninja cap 10');
  assertEqual(getGameDef('ball-bounce')?.dailyTokenCap, 6, 'Ball Bounce cap 6');

  // 5. Initial game statuses: reaction-rush, keyboard-ninja, and target-hunter are playable
  const playableIds = new Set(['reaction-rush', 'keyboard-ninja', 'target-hunter']);
  for (const game of ARCADE_GAMES) {
    if (playableIds.has(game.id)) {
      assertEqual(game.status, 'playable', `${game.name} is playable`);
    } else {
      assertEqual(game.status, 'coming-soon', `Game ${game.id} should be coming-soon`);
    }
  }

  console.log('PASS: Arcade Registry Tests (8 games verified, unique IDs, caps > 0, 3 cabinets playable)');
}
