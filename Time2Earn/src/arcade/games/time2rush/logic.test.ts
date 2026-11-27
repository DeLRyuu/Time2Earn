import {
  getDailyTrackKey,
  getDailySeed,
  getTheoreticalMinimumTimeMs,
} from './logic';
import { GAME_REWARD_RULES } from '../../rewards';
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

function createDummyTime2RushResult(overrides?: Partial<GameResult>): GameResult {
  return {
    gameId: 'time2rush',
    sessionId: 'session_t2r_' + Date.now(),
    mode: 'time-trial',
    score: 850,
    durationMs: 58000,
    difficulty: 'normal',
    performance: {
      completed: 1,
      finishTimeMs: 58000,
      pickupsScore: 850,
      tokenPickups: 24,
      collisions: 1,
      trackLengthM: 1000,
      trackRecordMs: 62000,
    },
    clientVersion: '1.0.0',
    startedAt: new Date(Date.now() - 58000).toISOString(),
    endedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Unit test suite for Time2Rush logic and minimum-time validation / reward tiers.
 */
export function runTime2RushTests(): void {
  console.log('--- RUNNING TIME2RUSH TESTS ---');

  // Test 1: Daily seed is deterministic per date
  {
    const today = getDailyTrackKey();
    const seed1 = getDailySeed(today);
    const seed2 = getDailySeed(today);
    assertEqual(seed1, seed2, 'Daily seed is reproducible for identical date');

    const seedTomorrow = getDailySeed('2026-11-28');
    const seedYesterday = getDailySeed('2026-11-26');
    assertTrue(seedTomorrow !== seedYesterday, 'Different dates generate distinct track seeds');
    console.log('PASS: Daily track seed determinism passed');
  }

  // Test 2: Theoretical minimum time calculation
  {
    const minTime = getTheoreticalMinimumTimeMs(1000);
    // 1000m / 26 m/s = ~38461.5 ms (~38.46s)
    assertTrue(minTime > 38000 && minTime < 39000, 'Theoretical minimum time is ~38.46s');

    // Plausibility check: finish time < minPossibleMs - 50 should throw error
    assertThrows(() => {
      GAME_REWARD_RULES.time2rush(
        createDummyTime2RushResult({
          durationMs: 30000,
          performance: {
            completed: 1,
            finishTimeMs: 30000, // Impossibly fast: 30s for 1000m
            trackLengthM: 1000,
          },
        })
      );
    }, 'Rejects impossibly fast finish time (anti-cheat)');
    console.log('PASS: Theoretical minimum-time validation passed');
  }

  // Test 3: Reward Tiers
  {
    // DNF case: 0 tokens, EXP 2
    const dnf = GAME_REWARD_RULES.time2rush(
      createDummyTime2RushResult({
        performance: {
          completed: 0,
          finishTimeMs: 45000,
          trackLengthM: 1000,
        },
      })
    );
    assertEqual(dnf.rawTokens, 0, 'DNF yields 0 tokens');
    assertEqual(dnf.exp, 2, 'DNF yields 2 EXP');
    assertEqual(dnf.tierLabel, 'DNF', 'DNF tier label');

    // Base completed with low pickups & no record: base 3
    const baseWin = GAME_REWARD_RULES.time2rush(
      createDummyTime2RushResult({
        performance: {
          completed: 1,
          finishTimeMs: 65000,
          trackLengthM: 1000,
          trackRecordMs: 60000, // Did not beat record
          pickupsScore: 50, // Tier 0 bonus (+0)
        },
      })
    );
    assertEqual(baseWin.rawTokens, 3, 'Base complete yields 3 tokens');

    // Beat record bonus (+2): 3 + 2 = 5
    const recordWin = GAME_REWARD_RULES.time2rush(
      createDummyTime2RushResult({
        performance: {
          completed: 1,
          finishTimeMs: 55000,
          trackLengthM: 1000,
          trackRecordMs: 60000, // Beat record!
          pickupsScore: 50,
        },
      })
    );
    assertEqual(recordWin.rawTokens, 5, 'Beat track record yields base 3 + 2 = 5 tokens');

    // High pickups tiers (+5) + beat record (+2) + base 3 = 10 tokens
    const highPickups = GAME_REWARD_RULES.time2rush(
      createDummyTime2RushResult({
        performance: {
          completed: 1,
          finishTimeMs: 52000,
          trackLengthM: 1000,
          trackRecordMs: 60000,
          pickupsScore: 1300, // >= 1200 => +5 tokens
        },
      })
    );
    assertEqual(highPickups.rawTokens, 10, 'High pickups + record yields 10 tokens');
    assertEqual(highPickups.tierLabel, 'Track Legend', 'High score receives Track Legend tier');

    // Cap test: Never exceeds 15 raw tokens
    const maxBonus = GAME_REWARD_RULES.time2rush(
      createDummyTime2RushResult({
        performance: {
          completed: 1,
          finishTimeMs: 45000,
          trackLengthM: 1000,
          trackRecordMs: 60000,
          pickupsScore: 99999,
        },
      })
    );
    assertTrue(maxBonus.rawTokens <= 15, 'Raw tokens never exceeds 15');
    console.log('PASS: Reward tiers and cap tests passed');
  }

  console.log('--- ALL TIME2RUSH TESTS PASSED ---');
}
