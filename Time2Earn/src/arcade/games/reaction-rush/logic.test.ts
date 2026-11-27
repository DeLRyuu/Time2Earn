import { gradeFromAverage, computeStats } from './logic';
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

export function runReactionRushTests(): void {
  console.log('--- RUNNING REACTION RUSH TESTS ---');

  // 1. Grade boundaries
  assertEqual(gradeFromAverage(140), 'S+', 'Under 150 is S+');
  assertEqual(gradeFromAverage(149), 'S+', '149 is S+');
  assertEqual(gradeFromAverage(150), 'S', '150 is S');
  assertEqual(gradeFromAverage(180), 'S', '180 is S');
  assertEqual(gradeFromAverage(181), 'A', '181 is A');
  assertEqual(gradeFromAverage(220), 'A', '220 is A');
  assertEqual(gradeFromAverage(221), 'B', '221 is B');
  assertEqual(gradeFromAverage(270), 'B', '270 is B');
  assertEqual(gradeFromAverage(271), 'C', '271 is C');
  assertEqual(gradeFromAverage(350), 'C', '350 is C');
  assertEqual(gradeFromAverage(351), 'D', '351 is D');
  assertEqual(gradeFromAverage(500), 'D', '500 is D');

  // 2. Stats calculation without false start penalty (<= 3 false starts)
  const rounds1 = [160, 170, 180, 170, 170];
  const stats1 = computeStats(rounds1, 2);
  assertEqual(stats1.avgMs, 170, 'Raw average calculated correctly');
  assertEqual(stats1.effectiveAvgMs, 170, 'No penalty when false starts <= 3');
  assertEqual(stats1.bestMs, 160, 'Best ms is 160');
  assertEqual(stats1.grade, 'S', 'Grade matches effective average');

  // 3. False start penalty (+100ms per extra false start after 3)
  const stats2 = computeStats(rounds1, 5); // 2 extra false starts => +200ms
  assertEqual(stats2.avgMs, 170, 'Raw average unchanged');
  assertEqual(stats2.effectiveAvgMs, 370, 'Effective average includes +200ms penalty');
  assertEqual(stats2.grade, 'D', 'Grade dropped to D due to penalties');

  // 4. Plausibility validation via computeArcadeReward
  // Human limit: round < 80ms must throw
  assertThrows(() => {
    const badRoundResult: GameResult = {
      gameId: 'reaction-rush',
      sessionId: 'test_rr_1',
      mode: 'classic',
      score: 700,
      durationMs: 25000,
      difficulty: 'normal',
      performance: { avgMs: 150, minRoundMs: 70 },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - 25000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    computeArcadeReward({
      result: badRoundResult,
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Single round < 80ms must throw');

  // Implausible average: avgMs < 90ms must throw
  assertThrows(() => {
    const botAvgResult: GameResult = {
      gameId: 'reaction-rush',
      sessionId: 'test_rr_2',
      mode: 'classic',
      score: 820,
      durationMs: 25000,
      difficulty: 'normal',
      performance: { avgMs: 85 },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - 25000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    computeArcadeReward({
      result: botAvgResult,
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Average ms < 90ms must throw');

  console.log('PASS: Reaction Rush Tests (grades, penalties, bot-limits passed)');
}
