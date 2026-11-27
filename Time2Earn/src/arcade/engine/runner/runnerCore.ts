import type { Obstacle } from './obstacles';
import type { PickupItem } from './pickups';

export type RunnerAction = 'jump' | 'slide' | 'laneLeft' | 'laneRight';

export interface RecordedInput {
  t: number; // millisecond timestamp relative to run start
  action: RunnerAction;
}

export interface RunnerState {
  distance: number; // distance traveled in meters
  speed: number; // current speed in m/s (baseline: 12 m/s)
  lane: number; // 0: left, 1: center, 2: right
  targetLane: number; // lane transitioning toward
  laneTransitionProgress: number; // 0 to 1
  y: number; // vertical height (0 = ground, >0 = in air)
  vy: number; // vertical velocity
  sliding: boolean;
  slideTimeRemainingMs: number;
  lives: number;
  shieldMs: number;
  magnetMs: number;
  doubleMs: number;
  speedBoostMs: number;
  ghostMs: number;
  score: number;
  pickupsCollected: number;
  goldenTokensCollected: number;
  collisions: number;
  isGameOver: boolean;
  timeElapsedMs: number;
}

export const RUNNER_CONFIG = {
  FIXED_DT_SEC: 1 / 60, // 60hz deterministic fixed timestep
  BASE_SPEED: 14.0, // m/s
  MAX_SPEED: 26.0,
  GRAVITY: -32.0, // m/s^2
  JUMP_VELOCITY: 10.5, // m/s
  SLIDE_DURATION_MS: 600,
  LANE_WIDTH: 2.2, // meters
  HITBOX_DEPTH: 0.8, // meters around player z position
};

export function createInitialRunnerState(initialLives: number = 3): RunnerState {
  return {
    distance: 0,
    speed: RUNNER_CONFIG.BASE_SPEED,
    lane: 1, // Start in center lane
    targetLane: 1,
    laneTransitionProgress: 1,
    y: 0,
    vy: 0,
    sliding: false,
    slideTimeRemainingMs: 0,
    lives: initialLives,
    shieldMs: 0,
    magnetMs: 0,
    doubleMs: 0,
    speedBoostMs: 0,
    ghostMs: 0,
    score: 0,
    pickupsCollected: 0,
    goldenTokensCollected: 0,
    collisions: 0,
    isGameOver: false,
    timeElapsedMs: 0,
  };
}

/**
 * Executes a single deterministic simulation step (1/60s).
 */
export function stepRunner(
  state: RunnerState,
  actions: RunnerAction[],
  obstacles: Obstacle[],
  pickups: PickupItem[]
): {
  nextState: RunnerState;
  remainingObstacles: Obstacle[];
  remainingPickups: PickupItem[];
} {
  if (state.isGameOver) {
    return { nextState: state, remainingObstacles: obstacles, remainingPickups: pickups };
  }

  const dt = RUNNER_CONFIG.FIXED_DT_SEC;
  const dtMs = dt * 1000;

  let lane = state.lane;
  let targetLane = state.targetLane;
  let laneProgress = state.laneTransitionProgress;
  let y = state.y;
  let vy = state.vy;
  let sliding = state.sliding;
  let slideTimeRemainingMs = state.slideTimeRemainingMs;

  let shieldMs = Math.max(0, state.shieldMs - dtMs);
  let magnetMs = Math.max(0, state.magnetMs - dtMs);
  let doubleMs = Math.max(0, state.doubleMs - dtMs);
  let speedBoostMs = Math.max(0, state.speedBoostMs - dtMs);
  let ghostMs = Math.max(0, state.ghostMs - dtMs);

  let lives = state.lives;
  let score = state.score;
  let pickupsCollected = state.pickupsCollected;
  let goldenTokensCollected = state.goldenTokensCollected;
  let collisions = state.collisions;
  let isGameOver = false;

  // 1. Process Actions
  for (const action of actions) {
    switch (action) {
      case 'laneLeft':
        if (targetLane > 0) {
          lane = targetLane;
          targetLane = targetLane - 1;
          laneProgress = 0;
        }
        break;
      case 'laneRight':
        if (targetLane < 2) {
          lane = targetLane;
          targetLane = targetLane + 1;
          laneProgress = 0;
        }
        break;
      case 'jump':
        if (y === 0 && !sliding) {
          vy = RUNNER_CONFIG.JUMP_VELOCITY;
        }
        break;
      case 'slide':
        if (y > 0) {
          // Fast dive down from jump
          vy = -18.0;
        }
        sliding = true;
        slideTimeRemainingMs = RUNNER_CONFIG.SLIDE_DURATION_MS;
        break;
    }
  }

  // 2. Physics: Lane transition interpolation
  if (laneProgress < 1) {
    laneProgress = Math.min(1, laneProgress + dt * 8); // ~0.12s lane switch
    if (laneProgress >= 1) {
      lane = targetLane;
    }
  }

  // 3. Physics: Jump & Gravity
  if (y > 0 || vy !== 0) {
    y = Math.max(0, y + vy * dt);
    vy += RUNNER_CONFIG.GRAVITY * dt;
    if (y === 0) {
      vy = 0;
    }
  }

  // 4. Slide countdown
  if (sliding) {
    slideTimeRemainingMs -= dtMs;
    if (slideTimeRemainingMs <= 0) {
      sliding = false;
      slideTimeRemainingMs = 0;
    }
  }

  // 5. Speed & Distance
  let currentSpeed = RUNNER_CONFIG.BASE_SPEED;
  if (speedBoostMs > 0) {
    currentSpeed = RUNNER_CONFIG.MAX_SPEED;
  }
  const distance = state.distance + currentSpeed * dt;

  // 6. Pickup Collection & Magnet effect
  const playerLane = laneProgress >= 0.5 ? targetLane : lane;
  const remainingPickups: PickupItem[] = [];

  for (const p of pickups) {
    // Check magnet pull
    let pLane = p.lane;
    if (magnetMs > 0 && Math.abs(p.z - distance) < 12) {
      pLane = playerLane; // Magnet draws pickup to current player lane
    }

    const distDelta = Math.abs(p.z - distance);
    const inHitbox = distDelta < 1.2 && pLane === playerLane;

    if (inHitbox) {
      // Collected!
      const multiplier = doubleMs > 0 ? 2 : 1;
      score += p.scoreValue * multiplier;
      pickupsCollected += 1;
      if (p.type === 'golden-token') {
        goldenTokensCollected += 1;
      }

      // Activate power-up effects
      if (p.type === 'shield') shieldMs = 8000;
      if (p.type === 'magnet') magnetMs = 6000;
      if (p.type === 'double-token') doubleMs = 8000;
      if (p.type === 'speed-boost') speedBoostMs = 4000;
      if (p.type === 'ghost') ghostMs = 5000;
    } else if (p.z > distance - 10) {
      // Keep upcoming pickups
      remainingPickups.push(p);
    }
  }

  // 7. Obstacle Collisions
  const remainingObstacles: Obstacle[] = [];
  for (const obs of obstacles) {
    const isPlayerInObstacleZ =
      distance >= obs.z - RUNNER_CONFIG.HITBOX_DEPTH &&
      distance <= obs.z + obs.length;

    const obstacleLane = obs.lane;
    const sameLane = obstacleLane === playerLane;

    let cleared = false;
    if (obs.type === 'barricade' && y > 0.8) {
      cleared = true; // Jumped over barricade
    }
    if (obs.type === 'low-barrier' && sliding) {
      cleared = true; // Slid under barrier
    }
    if (ghostMs > 0 || speedBoostMs > 0) {
      cleared = true; // Ghost phases through or boost bulldozes
    }

    if (isPlayerInObstacleZ && sameLane && !cleared) {
      // Collision!
      collisions += 1;
      if (shieldMs > 0) {
        // Shield absorbs hit
        shieldMs = 0;
      } else {
        lives -= 1;
        if (lives <= 0) {
          isGameOver = true;
        }
      }
    } else if (obs.z + obs.length > distance - 10) {
      remainingObstacles.push(obs);
    }
  }

  return {
    nextState: {
      distance,
      speed: currentSpeed,
      lane,
      targetLane,
      laneTransitionProgress: laneProgress,
      y,
      vy,
      sliding,
      slideTimeRemainingMs,
      lives,
      shieldMs,
      magnetMs,
      doubleMs,
      speedBoostMs,
      ghostMs,
      score,
      pickupsCollected,
      goldenTokensCollected,
      collisions,
      isGameOver,
      timeElapsedMs: state.timeElapsedMs + dtMs,
    },
    remainingObstacles,
    remainingPickups,
  };
}
