import {
  calculateAccuracy,
  calculateKps,
  calculateArcadeScore,
  getComboMultiplier,
  getKeyPoolForStage,
  getNextKey,
  STAGE_KEY_POOLS,
} from './logic';
import { computeArcadeReward } from '../../rewards';
import type { GameResult } from '../../types';

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertThrows(fn: () => void, msg: string): void {
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

export function runKeyboardNinjaTests(): void {
  console.log('--- RUNNING KEYBOARD NINJA TESTS ---');

  // 1. Stage key pools
  assertEqual(getKeyPoolForStage(0), 'ASDF', 'Stage 0 pool');
  assertEqual(getKeyPoolForStage(1), 'JKL', 'Stage 1 pool');
  assertEqual(getKeyPoolForStage(2), 'ASDFJKL', 'Stage 2 pool');
  assertEqual(getKeyPoolForStage(3), 'QWERTY', 'Stage 3 pool');
  assertEqual(getKeyPoolForStage(4), STAGE_KEY_POOLS[4], 'Stage 4 full letters pool');
  assertEqual(getKeyPoolForStage(10), STAGE_KEY_POOLS[4], 'Stage 10 clamps to max pool');

  // Next key generation
  const mockRng = () => 0.5;
  const key = getNextKey('ABCD', mockRng);
  assertEqual(key, 'C', 'RNG picks correct character');

  // 2. Combo multiplier (x1..x5)
  assertEqual(getComboMultiplier(0), 1, 'Combo 0 => x1');
  assertEqual(getComboMultiplier(4), 1, 'Combo 4 => x1');
  assertEqual(getComboMultiplier(5), 2, 'Combo 5 => x2');
  assertEqual(getComboMultiplier(10), 3, 'Combo 10 => x3');
  assertEqual(getComboMultiplier(15), 4, 'Combo 15 => x4');
  assertEqual(getComboMultiplier(20), 5, 'Combo 20 => x5');
  assertEqual(getComboMultiplier(50), 5, 'Combo 50 caps at x5');

  // 3. Accuracy calculation
  assertEqual(calculateAccuracy(100, 0), 100, '100% accuracy');
  assertEqual(calculateAccuracy(90, 10), 90, '90% accuracy');
  assertEqual(calculateAccuracy(49, 1), 98, '98% accuracy');
  assertEqual(calculateAccuracy(0, 0), 100, '0 hits 0 misses default to 100');

  // 4. Keys per second
  assertEqual(calculateKps(180, 45000), 4, '180 hits in 45s = 4.0 kps');
  assertEqual(calculateKps(90, 30000), 3, '90 hits in 30s = 3.0 kps');

  // 5. Arcade score formula: hits*10 + bestCombo*25 - misses*15 (min 0)
  const score1 = calculateArcadeScore(100, 20, 5);
  // 100*10 (1000) + 20*25 (500) - 5*15 (75) = 1425
  assertEqual(score1, 1425, 'Score matches formula');
  const scoreMin = calculateArcadeScore(0, 0, 10);
  assertEqual(scoreMin, 0, 'Score floors at 0');

  // 6. Plausibility & Bot-rate validation via computeArcadeReward
  // Reject keysPerSec > 14 (bot suspicion)
  assertThrows(() => {
    const botResult: GameResult = {
      gameId: 'keyboard-ninja',
      sessionId: 'test_kn_1',
      mode: 'classic',
      score: 5000,
      durationMs: 45000,
      difficulty: 'normal',
      performance: { hits: 700, misses: 0, accuracy: 100, keysPerSec: 15.5 },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - 45000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    computeArcadeReward({
      result: botResult,
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'keysPerSec > 14 must throw');

  // Reject hits > 600
  assertThrows(() => {
    const spamResult: GameResult = {
      gameId: 'keyboard-ninja',
      sessionId: 'test_kn_2',
      mode: 'classic',
      score: 7000,
      durationMs: 45000,
      difficulty: 'normal',
      performance: { hits: 650, misses: 0, accuracy: 100, keysPerSec: 10 },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - 45000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    computeArcadeReward({
      result: spamResult,
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'hits > 600 must throw');

  console.log('PASS: Keyboard Ninja Tests (combo, accuracy, kps, score, bot rejection verified)');
}
