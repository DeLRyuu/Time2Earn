import {
  createInitialChaserState,
  updateChaser,
  onObstacleHit,
  onChaserPickup,
  CHASER_CONFIG,
} from './chaser';
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

function createDummyZombieResult(overrides?: Partial<GameResult>): GameResult {
  return {
    gameId: 'zombie-run',
    sessionId: 'session_zombie_' + Date.now(),
    mode: 'classic',
    score: 1200,
    durationMs: 65000,
    difficulty: 'normal',
    performance: {
      distanceM: 950,
      survivedSec: 65,
      cratesOpened: 1,
      shieldsUsed: 1,
      durationMs: 65000,
    },
    clientVersion: '1.0.0',
    startedAt: new Date(Date.now() - 65000).toISOString(),
    endedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Test suite for Zombie Run chaser logic, stamina, and rewards.
 */
export function runZombieRunTests(): void {
  console.log('--- RUNNING ZOMBIE RUN TESTS ---');

  // Test 1: Zombie gap decreases over time when walking
  {
    let state = createInitialChaserState();
    assertEqual(state.zombieGap, CHASER_CONFIG.INITIAL_GAP, 'Initial gap is 25m');

    // 10 seconds of walking
    state = updateChaser(state, 10, false);
    assertTrue(state.zombieGap < CHASER_CONFIG.INITIAL_GAP, 'Zombies close in when walking');
    assertEqual(state.stamina, 100, 'Stamina stays full while walking');
    console.log('PASS: Zombie gap closure verified');
  }

  // Test 2: Sprinting widens gap and drains stamina
  {
    let state = createInitialChaserState();
    const initialGap = state.zombieGap;

    // 2 seconds of sprint (drains 2 * 35 = 70 stamina, leaving 30)
    state = updateChaser(state, 2, true);
    assertTrue(state.isSprinting, 'Sprint is active');
    assertTrue(state.stamina < 100, 'Stamina drains while sprinting');
    assertTrue(state.zombieGap > initialGap, 'Zombie gap widens while sprinting');

    // Energy pickup refills stamina (+40 stamina, reaching 70)
    const preEnergyStamina = state.stamina;
    state = onChaserPickup(state, 'energy');
    assertTrue(state.stamina >= preEnergyStamina + 35, 'Energy pickup refills stamina');
    console.log('PASS: Sprint and stamina mechanics verified');
  }

  // Test 3: Obstacle hit penalty & game over on gap <= 0
  {
    let state = createInitialChaserState();
    state.zombieGap = 5.0; // dangerously close

    // Hit obstacle => -6m penalty => gap <= 0
    state = onObstacleHit(state);
    assertTrue(state.isCaught, 'Player is caught when gap reaches 0');
    assertEqual(state.zombieGap, 0, 'Zombie gap is 0 on catch');

    // Shield blocks catch
    let shieldedState = createInitialChaserState();
    shieldedState = onChaserPickup(shieldedState, 'shield');
    shieldedState.zombieGap = 3.0;
    shieldedState = onObstacleHit(shieldedState);
    assertTrue(!shieldedState.isCaught, 'Shield prevented game over on zombie catch');
    assertEqual(shieldedState.shields, 0, 'Shield consumed to push back zombies');
    assertTrue(shieldedState.zombieGap > 0, 'Zombie pushed back by shield');
    console.log('PASS: Collision penalties and shield defense verified');
  }

  // Test 4: Danger Lane risk/reward (Survivor Crate pulls zombies closer)
  {
    let state = createInitialChaserState();
    const preGap = state.zombieGap;
    state = onChaserPickup(state, 'danger-crate');
    assertEqual(state.cratesOpened, 1, 'Survivor crate opened');
    assertEqual(state.zombieGap, preGap - CHASER_CONFIG.DANGER_LANE_GAP_PENALTY, 'Zombies pulled closer by danger lane');
    console.log('PASS: Danger crate risk/reward verified');
  }

  // Test 5: Reward Tiers (cap 10/day)
  // survivedSec 30=1, 60=2, 90=3, 120=4 tokens; crate opened +1 (max +2 per run).
  {
    // < 30s => 0 tokens
    const r0 = GAME_REWARD_RULES['zombie-run'](
      createDummyZombieResult({
        performance: { survivedSec: 20, cratesOpened: 0, distanceM: 250, durationMs: 20000 },
      })
    );
    assertEqual(r0.rawTokens, 0, '< 30s yields 0 tokens');

    // 30s survived => 1 token
    const r1 = GAME_REWARD_RULES['zombie-run'](
      createDummyZombieResult({
        performance: { survivedSec: 35, cratesOpened: 0, distanceM: 450, durationMs: 35000 },
      })
    );
    assertEqual(r1.rawTokens, 1, '30s yields 1 token');

    // 60s survived + 1 crate => 2 + 1 = 3 tokens
    const r2 = GAME_REWARD_RULES['zombie-run'](
      createDummyZombieResult({
        performance: { survivedSec: 65, cratesOpened: 1, distanceM: 900, durationMs: 65000 },
      })
    );
    assertEqual(r2.rawTokens, 3, '60s + 1 crate yields 3 tokens');

    // 120s survived + 2 crates => 4 + 2 = 6 tokens
    const r3 = GAME_REWARD_RULES['zombie-run'](
      createDummyZombieResult({
        performance: { survivedSec: 130, cratesOpened: 3, distanceM: 1800, durationMs: 130000 },
      })
    );
    assertEqual(r3.rawTokens, 6, '120s + crates (max +2 crate bonus) yields 6 tokens');

    // Anti-cheat distance vs time check
    assertThrows(() => {
      GAME_REWARD_RULES['zombie-run'](
        createDummyZombieResult({
          durationMs: 20000,
          performance: { survivedSec: 20, distanceM: 800, durationMs: 20000 },
        })
      );
    }, 'Rejects impossible speed/distance in zombie run');
    console.log('PASS: Zombie run reward tiers and validation verified');
  }

  console.log('--- ALL ZOMBIE RUN TESTS PASSED ---');
}
