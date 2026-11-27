import {
  calculateAccuracy,
  calculateArcadeScore,
  generateQuestion,
  getTimeLimitForProgress,
  STROOP_COLORS,
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

export function runColorClashTests(): void {
  console.log('--- RUNNING COLOR CLASH TESTS ---');

  // 1. Accessibility & Shape indicators
  assertEqual(STROOP_COLORS.length, 4, '4 colors defined');
  const ids = STROOP_COLORS.map((c) => c.id);
  assertEqual(ids.includes('red'), true, 'Has red');
  assertEqual(ids.includes('blue'), true, 'Has blue');
  assertEqual(ids.includes('green'), true, 'Has green');
  assertEqual(ids.includes('yellow'), true, 'Has yellow');
  for (const c of STROOP_COLORS) {
    assertEqual(typeof c.shapeIcon, 'string', `${c.id} has shape icon for accessibility`);
    assertEqual(typeof c.keyShortcut, 'string', `${c.id} has keyboard shortcut`);
  }

  // 2. Timer scaling per 5 correct
  assertEqual(getTimeLimitForProgress(0), 2500, '0 correct => 2500ms');
  assertEqual(getTimeLimitForProgress(4), 2500, '4 correct => 2500ms');
  assertEqual(getTimeLimitForProgress(5), 2100, '5 correct => 2100ms');
  assertEqual(getTimeLimitForProgress(9), 2100, '9 correct => 2100ms');
  assertEqual(getTimeLimitForProgress(10), 1700, '10 correct => 1700ms');
  assertEqual(getTimeLimitForProgress(15), 1300, '15 correct => 1300ms');
  assertEqual(getTimeLimitForProgress(20), 1300, '20 correct => 1300ms');

  // 3. Question generation
  const q = generateQuestion(() => 0.2);
  assertEqual(typeof q.word, 'string', 'Question has word');
  assertEqual(typeof q.inkColor, 'string', 'Question has ink color');

  // 4. Accuracy calculation
  assertEqual(calculateAccuracy(20, 20), 100, '20/20 is 100%');
  assertEqual(calculateAccuracy(18, 20), 90, '18/20 is 90%');
  assertEqual(calculateAccuracy(13, 20), 65, '13/20 is 65%');
  assertEqual(calculateAccuracy(0, 20), 0, '0/20 is 0%');

  // 5. Arcade score calculation: correct*100 + bestCombo*40 - avgTimeMs/10 (min 0)
  // 20*100 (2000) + 15*40 (600) - 1000/10 (100) = 2500
  const score1 = calculateArcadeScore(20, 15, 1000);
  assertEqual(score1, 2500, 'Arcade score matches formula');

  const scoreMin = calculateArcadeScore(0, 0, 5000);
  assertEqual(scoreMin, 0, 'Score floors at 0');

  // 6. Plausibility & Bot limit checks via computeArcadeReward
  // Reject avgTimeMs < 250 (inhuman reflex)
  assertThrows(() => {
    const botResult: GameResult = {
      gameId: 'color-clash',
      sessionId: 'test_cc_1',
      mode: 'classic',
      score: 2500,
      durationMs: 15000,
      difficulty: 'normal',
      performance: { correct: 20, total: 20, accuracy: 100, avgTimeMs: 200, bestCombo: 20 },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - 15000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    computeArcadeReward({
      result: botResult,
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'avgTimeMs < 250ms must throw');

  console.log('PASS: Color Clash Tests (accessibility, timer scaling, scoring, bot limits passed)');
}
