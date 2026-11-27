import {
  calculateAccuracy,
  calculateHitPoints,
  getComboMultiplier,
  isPointInsideTarget,
  spawnTarget,
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

export function runTargetHunterTests(): void {
  console.log('--- RUNNING TARGET HUNTER TESTS ---');

  // 1. Combo multiplier (x1..x5)
  assertEqual(getComboMultiplier(0), 1, 'Combo 0 => x1');
  assertEqual(getComboMultiplier(4), 1, 'Combo 4 => x1');
  assertEqual(getComboMultiplier(5), 2, 'Combo 5 => x2');
  assertEqual(getComboMultiplier(10), 3, 'Combo 10 => x3');
  assertEqual(getComboMultiplier(15), 4, 'Combo 15 => x4');
  assertEqual(getComboMultiplier(20), 5, 'Combo 20 => x5');
  assertEqual(getComboMultiplier(50), 5, 'Combo 50 caps at x5');

  // 2. Hit points scoring & fake target penalty
  assertEqual(calculateHitPoints('normal', 0), 1, 'Normal hit combo 0 is 1pt');
  assertEqual(calculateHitPoints('small', 5), 6, 'Small hit (3pts) * x2 combo = 6pts');
  assertEqual(calculateHitPoints('moving', 10), 15, 'Moving hit (5pts) * x3 combo = 15pts');
  assertEqual(calculateHitPoints('golden', 20), 50, 'Golden hit (10pts) * x5 combo = 50pts');
  assertEqual(calculateHitPoints('fake', 20), -5, 'Fake hit penalty is strictly -5pts');

  // 3. Accuracy calculation
  assertEqual(calculateAccuracy(92, 8), 92, '92% accuracy');
  assertEqual(calculateAccuracy(0, 5), 0, '0% accuracy');
  assertEqual(calculateAccuracy(50, 50), 50, '50% accuracy');
  assertEqual(calculateAccuracy(0, 0), 100, '0/0 defaults to 100%');

  // 4. Circle collision
  const target = spawnTarget('normal', 400, 300, () => 0.5);
  // target.x = 200, target.y = 150, radius = 28
  assertEqual(isPointInsideTarget(target.x, target.y, target), true, 'Center hits');
  assertEqual(isPointInsideTarget(target.x + 20, target.y, target), true, 'Inside radius hits');
  assertEqual(isPointInsideTarget(target.x + 35, target.y, target), false, 'Outside radius misses');

  // 5. Plausibility & Auto-clicker rejections via computeArcadeReward
  // Reject accuracy 100% with hits > 90 (auto-clicker)
  assertThrows(() => {
    const autoClickerResult: GameResult = {
      gameId: 'target-hunter',
      sessionId: 'test_th_1',
      mode: 'classic',
      score: 150,
      durationMs: 30000,
      difficulty: 'normal',
      performance: { hits: 95, misses: 0, accuracy: 100, bestCombo: 95, goldenHits: 2, fakeHits: 0 },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - 30000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    computeArcadeReward({
      result: autoClickerResult,
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Auto-clicker 100% accuracy with >90 hits must throw');

  // Reject hits/sec > 6
  assertThrows(() => {
    const rapidClickerResult: GameResult = {
      gameId: 'target-hunter',
      sessionId: 'test_th_2',
      mode: 'classic',
      score: 150,
      durationMs: 30000,
      difficulty: 'normal',
      performance: { hits: 190, misses: 20, accuracy: 90, bestCombo: 50, goldenHits: 3, fakeHits: 0 },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - 30000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    computeArcadeReward({
      result: rapidClickerResult,
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Clicks > 6 hits/sec must throw');

  console.log('PASS: Target Hunter Tests (scoring, combo, fake penalty, plausibility passed)');
}
