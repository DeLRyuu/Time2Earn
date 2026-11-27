import {
  createInitialBallState,
  stepBallBounce,
  BALL_CONFIG,
  type TargetItem,
  type ObstaclePlatform,
} from './physics';
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

function createDummyBallBounceResult(overrides?: Partial<GameResult>): GameResult {
  return {
    gameId: 'ball-bounce',
    sessionId: 'session_bounce_' + Date.now(),
    mode: 'classic',
    score: 350,
    durationMs: 45000,
    difficulty: 'normal',
    performance: {
      score: 350,
      hoops: 22,
      tokenPickups: 2,
      bestMultiplier: 3,
      durationMs: 45000,
    },
    clientVersion: '1.0.0',
    startedAt: new Date(Date.now() - 45000).toISOString(),
    endedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Unit test suite for Ball Bounce physics, targets, and rewards.
 */
export function runBallBounceTests(): void {
  console.log('--- RUNNING BALL BOUNCE TESTS ---');

  // Test 1: Gravity and Hop Impulse
  {
    const state0 = createInitialBallState();
    // 1 step with no hop => gravity accelerates downward (vy increases)
    const step1 = stepBallBounce(state0, false, [], []).nextState;
    assertTrue(step1.vy > state0.vy, 'Gravity pulls ball downward');
    assertTrue(step1.y > state0.y, 'Ball position drops downward');

    // 1 step with hop => negative velocity (upwards jump)
    const stepHop = stepBallBounce(step1, true, [], []).nextState;
    assertEqual(stepHop.vy, BALL_CONFIG.HOP_VELOCITY, 'Hop sets upward impulse velocity');
    console.log('PASS: Gravity and hop physics verified');
  }

  // Test 2: Hoops, Multiplier, and Bomb Reset
  {
    let state = createInitialBallState();
    // target.x is in world coordinates; in 1 step (1/60s) worldX advances by speed * dt (~2.33px)
    // Place target at where worldX will be (2px)
    const hoop: TargetItem = {
      id: 'hoop_1',
      type: 'hoop',
      x: 2,
      y: state.y,
      radius: 20,
      scoreValue: 10,
    };

    // Step into hoop
    const r1 = stepBallBounce(state, false, [], [hoop]);
    state = r1.nextState;
    assertEqual(state.hoops, 1, 'Hoop collected count increments');
    assertEqual(state.score, 10, 'Hoop gives +10 score at 1x multiplier');

    // Collect bomb => resets multiplier to 1
    state.multiplier = 4;
    const bomb: TargetItem = {
      id: 'bomb_1',
      type: 'bomb',
      x: state.worldX + 2,
      y: state.y,
      radius: 20,
      scoreValue: 0,
    };
    const r2 = stepBallBounce(state, false, [], [bomb]);
    assertEqual(r2.nextState.multiplier, 1, 'Bomb resets multiplier to 1x');
    console.log('PASS: Target collection and bomb multiplier reset verified');
  }

  // Test 3: Token Time Limit (Only first 3 minutes count toward tokens)
  {
    const state = createInitialBallState();
    const tokenItem: TargetItem = {
      id: 'token_1',
      type: 'token',
      x: 2,
      y: state.y,
      radius: 20,
      scoreValue: 15,
    };

    // Before 3 min => token pickup increments
    state.timeElapsedMs = 60000; // 1 minute in
    const r1 = stepBallBounce(state, false, [], [tokenItem]);
    assertEqual(r1.nextState.tokenPickups, 1, 'Tokens awarded in first 3 minutes');

    // After 3 min => tokensEligible is false, tokenPickups does not increment
    const stateAfter3Min = createInitialBallState();
    stateAfter3Min.timeElapsedMs = 181000; // > 3 minutes
    const r2 = stepBallBounce(stateAfter3Min, false, [], [tokenItem]);
    assertEqual(r2.nextState.tokenPickups, 0, 'No token pickups awarded after 3 minutes');
    assertTrue(!r2.nextState.tokensEligible, 'tokensEligible flag is false after 3 minutes');
    console.log('PASS: 3-minute token eligibility cutoff verified');
  }

  // Test 4: Platform collision causing game over
  {
    const state = createInitialBallState();
    const plat: ObstaclePlatform = {
      id: 'plat_1',
      x: 2,
      topY: 50, // gap starts at 50px
      bottomY: 80, // gap ends at 80px
      gapSize: 30,
      width: 40,
    };
    // Ball is at y = 270 (outside gap 50..80) => should collide and trigger game over
    const res = stepBallBounce(state, false, [plat], []);
    assertTrue(res.nextState.isGameOver, 'Ball colliding with platform triggers game over');
    console.log('PASS: Platform collision detection verified');
  }

  // Test 5: Reward Tiers (cap 6/day)
  // score 100=1, 300=2, 600=3, plus tokenPickups (max +3). Reject implausible score/sec.
  {
    // score < 100, 0 tokens
    const r0 = GAME_REWARD_RULES['ball-bounce'](
      createDummyBallBounceResult({
        score: 50,
        performance: { score: 50, hoops: 3, tokenPickups: 0, durationMs: 20000 },
      })
    );
    assertEqual(r0.rawTokens, 0, 'Score < 100 yields 0 tokens');

    // score 120 (tier 1) + 1 token pickup = 2 tokens
    const r1 = GAME_REWARD_RULES['ball-bounce'](
      createDummyBallBounceResult({
        score: 120,
        performance: { score: 120, hoops: 8, tokenPickups: 1, durationMs: 25000 },
      })
    );
    assertEqual(r1.rawTokens, 2, 'Score 120 (1) + 1 token = 2 tokens');

    // score 350 (tier 2) + 2 token pickups = 4 tokens
    const r2 = GAME_REWARD_RULES['ball-bounce'](
      createDummyBallBounceResult({
        score: 350,
        performance: { score: 350, hoops: 25, tokenPickups: 2, durationMs: 50000 },
      })
    );
    assertEqual(r2.rawTokens, 4, 'Score 350 (2) + 2 tokens = 4 tokens');

    // score 700 (tier 3) + 3 token pickups = 6 tokens (hard cap 6)
    const r3 = GAME_REWARD_RULES['ball-bounce'](
      createDummyBallBounceResult({
        score: 700,
        performance: { score: 700, hoops: 50, tokenPickups: 3, durationMs: 80000 },
      })
    );
    assertEqual(r3.rawTokens, 6, 'Score 700 (3) + 3 tokens = 6 tokens');

    // Anti-cheat: Implausible score per second (> 80 score/sec)
    assertThrows(() => {
      GAME_REWARD_RULES['ball-bounce'](
        createDummyBallBounceResult({
          durationMs: 5000,
          score: 1000, // 200 score/sec!
          performance: { score: 1000, hoops: 50, tokenPickups: 3, durationMs: 5000 },
        })
      );
    }, 'Rejects implausible score rate per second');
    console.log('PASS: Reward tiers & anti-cheat rate validation passed');
  }

  console.log('--- ALL BALL BOUNCE TESTS PASSED ---');
}
