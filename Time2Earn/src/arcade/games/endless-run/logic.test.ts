import {
  getDifficultyBand,
  getComboMultiplier,
  calculateEndlessArcadeScore,
} from './logic';
import { GAME_REWARD_RULES } from '../../rewards';
import { generateObstaclePattern } from '../../engine/runner/obstacles';
import { createMulberry32 } from '../../engine/seededRng';
import type { GameResult } from '../../types';

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} - expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) {
    throw new Error(`FAIL: ${msg}`);
  }
}

function assertThrows(fn: () => void, msg: string) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`FAIL: Expected function to throw: ${msg}`);
  }
}

function createDummyEndlessResult(overrides?: Partial<GameResult>): GameResult {
  return {
    gameId: 'endless-run',
    sessionId: 'session_endless_' + Date.now(),
    mode: 'classic',
    score: 3500, // arcadeScore = distance + pickupsScore*5
    durationMs: 70000,
    difficulty: 'normal',
    performance: {
      distanceM: 1600,
      pickupsScore: 380,
      bestCombo: 12,
      durationMs: 70000,
    },
    clientVersion: '1.0.0',
    startedAt: new Date(Date.now() - 70000).toISOString(),
    endedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Unit test suite for Endless Run difficulty bands, combo, and rewards.
 */
export function runEndlessRunTests(): void {
  console.log('--- RUNNING ENDLESS RUN TESTS ---');

  // Test 1: Difficulty Bands Scaling
  {
    assertEqual(getDifficultyBand(100).name, 'easy', '0-499m is easy');
    assertEqual(getDifficultyBand(500).name, 'normal', '500m is normal');
    assertEqual(getDifficultyBand(1200).name, 'fast', '1000m-1999m is fast');
    assertEqual(getDifficultyBand(2500).name, 'hard', '2000m-2999m is hard');
    assertEqual(getDifficultyBand(3500).name, 'extreme', '3000m-4999m is extreme');
    assertEqual(getDifficultyBand(6000).name, 'insane', '5000m+ is insane');
    console.log('PASS: Difficulty bands scaling verified');
  }

  // Test 2: Patterns stay passable at all difficulty levels
  {
    for (const mult of [1.0, 1.2, 1.4, 1.6, 1.8, 2.0]) {
      const rng = createMulberry32(12345);
      for (let z = 100; z <= 1000; z += 50) {
        const pattern = generateObstaclePattern(z, rng, mult);
        assertTrue(pattern.passableLanes.length >= 1, `Multiplier ${mult} at z=${z} has passable lane`);
      }
    }
    console.log('PASS: All difficulty multipliers maintain passable lanes');
  }

  // Test 3: Combo Multipliers (1x..5x)
  {
    assertEqual(getComboMultiplier(0), 1, '0 pickups = 1x');
    assertEqual(getComboMultiplier(4), 1, '4 pickups = 1x');
    assertEqual(getComboMultiplier(5), 2, '5 pickups = 2x');
    assertEqual(getComboMultiplier(9), 2, '9 pickups = 2x');
    assertEqual(getComboMultiplier(10), 3, '10 pickups = 3x');
    assertEqual(getComboMultiplier(15), 4, '15 pickups = 4x');
    assertEqual(getComboMultiplier(25), 5, '20+ pickups = 5x (max)');
    console.log('PASS: Combo multiplier progression verified');
  }

  // Test 4: Score Calculation: distance + pickupsScore * 5
  {
    const score = calculateEndlessArcadeScore(1500, 200);
    assertEqual(score, 2500, 'Arcade score matches distance + pickupsScore*5 (1500 + 1000)');
    console.log('PASS: Arcade score formula verified');
  }

  // Test 5: Reward Tiers & Anti-Cheat Distance Limits
  {
    // Under 300m => 0 tokens
    const r0 = GAME_REWARD_RULES['endless-run'](
      createDummyEndlessResult({
        performance: { distanceM: 200, durationMs: 20000 },
      })
    );
    assertEqual(r0.rawTokens, 0, '< 300m yields 0 tokens');

    // 300m = 1 token
    const r1 = GAME_REWARD_RULES['endless-run'](
      createDummyEndlessResult({
        performance: { distanceM: 350, durationMs: 25000 },
      })
    );
    assertEqual(r1.rawTokens, 1, '>= 300m yields 1 token');

    // 800m = 2 tokens
    const r2 = GAME_REWARD_RULES['endless-run'](
      createDummyEndlessResult({
        performance: { distanceM: 900, durationMs: 50000 },
      })
    );
    assertEqual(r2.rawTokens, 2, '>= 800m yields 2 tokens');

    // 1500m = 3 tokens
    const r3 = GAME_REWARD_RULES['endless-run'](
      createDummyEndlessResult({
        performance: { distanceM: 1600, durationMs: 90000 },
      })
    );
    assertEqual(r3.rawTokens, 3, '>= 1500m yields 3 tokens');

    // 2500m = 4 tokens
    const r4 = GAME_REWARD_RULES['endless-run'](
      createDummyEndlessResult({
        durationMs: 140000,
        performance: { distanceM: 2700, durationMs: 140000 },
      })
    );
    assertEqual(r4.rawTokens, 4, '>= 2500m yields 4 tokens');

    // 4000m = 5 tokens
    const r5 = GAME_REWARD_RULES['endless-run'](
      createDummyEndlessResult({
        durationMs: 200000,
        performance: { distanceM: 4200, durationMs: 200000 },
      })
    );
    assertEqual(r5.rawTokens, 5, '>= 4000m yields 5 tokens');

    // 6000m = 6 tokens
    const r6 = GAME_REWARD_RULES['endless-run'](
      createDummyEndlessResult({
        durationMs: 300000,
        performance: { distanceM: 6100, durationMs: 300000 },
      })
    );
    assertEqual(r6.rawTokens, 6, '>= 6000m yields 6 tokens');

    // Anti-cheat speed check: Reject distance > max speed (26 m/s) * duration * 1.05
    // 10 seconds => max distance ~273m. Claiming 500m should throw.
    assertThrows(() => {
      GAME_REWARD_RULES['endless-run'](
        createDummyEndlessResult({
          durationMs: 10000,
          performance: { distanceM: 500, durationMs: 10000 },
        })
      );
    }, 'Rejects distance exceeding max possible speed * duration * 1.05');
    console.log('PASS: Reward tiers & anti-cheat distance validation passed');
  }

  console.log('--- ALL ENDLESS RUN TESTS PASSED ---');
}
