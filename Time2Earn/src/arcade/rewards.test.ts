import { computeArcadeReward } from './rewards';
import type { GameResult } from './types';
import { SHARED_DAILY_TOKEN_CAP } from './registry';

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

function createDummyResult(overrides?: Partial<GameResult>): GameResult {
  return {
    gameId: 'reaction-rush',
    sessionId: 'test_session_' + Date.now(),
    mode: 'classic',
    score: 800,
    durationMs: 25000,
    difficulty: 'normal',
    performance: { avgMs: 175 },
    clientVersion: '1.0.0',
    startedAt: new Date(Date.now() - 25000).toISOString(),
    endedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function runArcadeRewardTests(): void {
  console.log('--- RUNNING ARCADE REWARD TESTS ---');

  // Test 1: Full reward under caps
  const res1 = computeArcadeReward({
    result: createDummyResult(), // reaction-rush avgMs 175 => rawTokens 4, exp 9
    tokensEarnedTodayAll: 10,
    tokensEarnedTodayForGame: 0,
  });
  assertEqual(res1.tokensAwarded, 4, 'Full tokens awarded when under caps');
  assertEqual(res1.rawTokens, 4, 'Raw tokens matches output');
  assertEqual(res1.expAwarded, 9, 'EXP calculated accurately');
  assertEqual(res1.clamped, 'none', 'Clamped is none');
  assertEqual(res1.arcadeScore, 800, 'Arcade score preserved');

  // Test 2: Per-game cap clamp
  // reaction-rush cap is 8. If player already has 6, only 2 remaining
  const res2 = computeArcadeReward({
    result: createDummyResult(), // raw 4
    tokensEarnedTodayAll: 10,
    tokensEarnedTodayForGame: 6,
  });
  assertEqual(res2.tokensAwarded, 2, 'Tokens clamped to remaining game cap');
  assertEqual(res2.clamped, 'game-cap', 'Clamped status is game-cap');
  assertEqual(res2.expAwarded, 9, 'EXP is uncapped even when tokens clamped');

  // Test 3: Shared daily cap clamp
  // Shared cap is 50. If player has 48 earned today across all games, only 2 remaining
  const res3 = computeArcadeReward({
    result: createDummyResult(), // raw 4
    tokensEarnedTodayAll: SHARED_DAILY_TOKEN_CAP - 2, // 48
    tokensEarnedTodayForGame: 0, // game cap has 8 left
  });
  assertEqual(res3.tokensAwarded, 2, 'Tokens clamped to remaining shared daily cap');
  assertEqual(res3.clamped, 'daily-cap', 'Clamped status is daily-cap');
  assertEqual(res3.expAwarded, 9, 'EXP is uncapped during daily cap clamp');

  // Test 4: Zero remaining cap gives 0 tokens, but score still returned
  const res4 = computeArcadeReward({
    result: createDummyResult(),
    tokensEarnedTodayAll: SHARED_DAILY_TOKEN_CAP, // 50
    tokensEarnedTodayForGame: 8,
  });
  assertEqual(res4.tokensAwarded, 0, 'Zero tokens awarded when cap is exhausted');
  assertEqual(res4.arcadeScore, 800, 'Score is still returned for leaderboard');
  assertTrue(res4.expAwarded > 0, 'EXP is still granted when token cap is reached');

  // Test 5: Reject invalid / too short duration
  assertThrows(() => {
    computeArcadeReward({
      result: createDummyResult({ durationMs: 2000 }), // reaction-rush min is 10000ms
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Duration below minDurationMs must throw');

  // Test 6: Reject duration exceeding maximum allowed
  assertThrows(() => {
    computeArcadeReward({
      result: createDummyResult({ durationMs: 200000 }), // reaction-rush max is 120000ms
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Duration above maxDurationMs must throw');

  // Test 7: Reject negative score
  assertThrows(() => {
    computeArcadeReward({
      result: createDummyResult({ score: -50 }),
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Negative score must throw');

  // Test 8: Reject score above max plausible limit
  assertThrows(() => {
    computeArcadeReward({
      result: createDummyResult({ score: 999999 }), // reaction-rush max is 1000
      tokensEarnedTodayAll: 0,
      tokensEarnedTodayForGame: 0,
    });
  }, 'Score above maxPlausibleScore must throw');

  console.log('PASS: Arcade Reward Tests (caps clamping, exp uncapped, sanity limits verified)');
}
