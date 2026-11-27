import { createInitialRunnerState, stepRunner } from './runnerCore';
import type { RunnerAction, RecordedInput } from './runnerCore';
import { generateObstaclePattern } from './obstacles';
import { createMulberry32 } from '../seededRng';
import type { PickupItem } from './pickups';

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message} - expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertTrue(actual: boolean, message: string) {
  if (!actual) {
    throw new Error(`FAIL: ${message} - expected true, got ${String(actual)}`);
  }
}

/**
 * Runs test suite for deterministic runner engine.
 */
export function runRunnerTests(): void {
  console.log('--- RUNNING RUNNER ENGINE TESTS ---');

  // Test 1: Determinism
  // Running identical inputs with identical seed yields identical results
  {
    const simulateRun = (seed: number, inputs: RecordedInput[]) => {
      let state = createInitialRunnerState(3);
      const rng = createMulberry32(seed);
      let obstacles: ReturnType<typeof generateObstaclePattern>['obstacles'] = [];
      const pickups: PickupItem[] = [];

      for (let z = 30; z < 200; z += 24) {
        const pattern = generateObstaclePattern(z, rng);
        obstacles.push(...pattern.obstacles);
      }

      let inputIdx = 0;
      const totalSteps = 300; // 5 seconds at 60Hz

      for (let step = 0; step < totalSteps; step++) {
        const t = step * (1000 / 60);
        const actions: RunnerAction[] = [];
        while (inputIdx < inputs.length && (inputs[inputIdx]?.t ?? 0) <= t) {
          actions.push(inputs[inputIdx].action);
          inputIdx++;
        }

        const res = stepRunner(state, actions, obstacles, pickups);
        state = res.nextState;
        obstacles = res.remainingObstacles;
      }

      return state;
    };

    const recordedInputs: RecordedInput[] = [
      { t: 200, action: 'laneRight' },
      { t: 600, action: 'jump' },
      { t: 1200, action: 'laneLeft' },
      { t: 1800, action: 'slide' },
      { t: 2500, action: 'laneLeft' },
    ];

    const run1 = simulateRun(42, recordedInputs);
    const run2 = simulateRun(42, recordedInputs);

    assertEqual(run1.distance, run2.distance, 'Determinism: distance matches exactly across runs');
    assertEqual(run1.score, run2.score, 'Determinism: score matches exactly across runs');
    assertEqual(run1.lives, run2.lives, 'Determinism: lives match exactly across runs');
    assertEqual(run1.collisions, run2.collisions, 'Determinism: collisions match exactly across runs');
    assertEqual(run1.lane, run2.lane, 'Determinism: final lane matches');
    console.log('PASS: Determinism test passed (identical inputs & seed produce bit-exact simulation)');
  }

  // Test 2: Passable Patterns Guarantee
  // Every pattern generated across 100 seeds must have at least 1 passable lane
  {
    for (let s = 1; s <= 100; s++) {
      const rng = createMulberry32(s);
      for (let z = 30; z <= 300; z += 30) {
        const pattern = generateObstaclePattern(z, rng);
        assertTrue(pattern.passableLanes.length >= 1, `Passable pattern: seed ${s} at z=${z} has open lane`);
        assertTrue(pattern.passableLanes.length <= 3, `Passable pattern: valid open lanes count`);
        for (const lane of pattern.passableLanes) {
          assertTrue(lane >= 0 && lane <= 2, `Passable pattern: open lane is in 0..2 range`);
        }
      }
    }
    console.log('PASS: Passable patterns guarantee passed (all 100 seeds always have safe passage)');
  }

  // Test 3: Power-up Timers Countdown & Expiry
  {
    const state = createInitialRunnerState(3);
    state.shieldMs = 100; // 100ms remaining
    state.doubleMs = 200; // 200ms remaining

    // Step 1: 1/60s = ~16.67ms
    const step1 = stepRunner(state, [], [], []);
    assertTrue(step1.nextState.shieldMs < 100, 'Shield countdown ticks down');
    assertTrue(step1.nextState.shieldMs > 80, 'Shield countdown is within expected dt delta');
    assertTrue(step1.nextState.doubleMs < 200, 'Double token countdown ticks down');

    // Run enough steps to expire shield (6 more steps = ~100ms total)
    let curState = step1.nextState;
    for (let i = 0; i < 10; i++) {
      curState = stepRunner(curState, [], [], []).nextState;
    }
    assertEqual(curState.shieldMs, 0, 'Shield timer hits exactly 0 and does not go negative');
    assertTrue(curState.doubleMs > 0, 'Double token still has remaining time');
    console.log('PASS: Power-up timers countdown & expire accurately');
  }

  console.log('--- ALL RUNNER ENGINE TESTS PASSED ---');
}
