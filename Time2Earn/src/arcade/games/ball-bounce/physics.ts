export type TargetType = 'hoop' | 'star' | 'token' | 'gem' | 'bomb';

export interface TargetItem {
  id: string;
  type: TargetType;
  x: number; // horizontal world position
  y: number; // vertical world position (0 is top, height is bottom)
  radius: number;
  scoreValue: number;
  collected?: boolean;
}

export interface ObstaclePlatform {
  id: string;
  x: number;
  topY: number; // gap top
  bottomY: number; // gap bottom
  gapSize: number;
  width: number;
  isMoving?: boolean;
  vy?: number;
  minY?: number;
  maxY?: number;
}

export interface BallPhysicsState {
  x: number; // fixed screen X (e.g. 100px)
  worldX: number; // distance traveled
  y: number;
  vy: number;
  radius: number;
  isGameOver: boolean;
  score: number;
  hoops: number;
  tokenPickups: number; // max 3 rewarded
  multiplier: number; // 1x..5x perfect bounce
  bestMultiplier: number;
  consecutivePasses: number;
  timeElapsedMs: number;
  tokensEligible: boolean; // Only first 3 minutes (180,000 ms) count toward tokens
}

export const BALL_CONFIG = {
  FIXED_DT_SEC: 1 / 60,
  GRAVITY: 880, // px/s^2 downwards
  HOP_VELOCITY: -330, // px/s upwards impulse
  BASE_SPEED: 140, // px/s forward scroll
  MAX_SPEED: 280, // px/s
  MAX_TOKEN_PICKUPS: 3,
  TOKEN_TIME_LIMIT_MS: 180000, // 3 minutes
  CANVAS_WIDTH: 360,
  CANVAS_HEIGHT: 540,
  BALL_RADIUS: 12,
  BALL_X: 90, // player fixed horizontal offset
};

export function createInitialBallState(): BallPhysicsState {
  return {
    x: BALL_CONFIG.BALL_X,
    worldX: 0,
    y: BALL_CONFIG.CANVAS_HEIGHT / 2,
    vy: 0,
    radius: BALL_CONFIG.BALL_RADIUS,
    isGameOver: false,
    score: 0,
    hoops: 0,
    tokenPickups: 0,
    multiplier: 1,
    bestMultiplier: 1,
    consecutivePasses: 0,
    timeElapsedMs: 0,
    tokensEligible: true,
  };
}

/**
 * Executes one step of ball physics and target collisions.
 */
export function stepBallBounce(
  state: BallPhysicsState,
  wantsHop: boolean,
  platforms: ObstaclePlatform[],
  targets: TargetItem[]
): {
  nextState: BallPhysicsState;
  remainingPlatforms: ObstaclePlatform[];
  remainingTargets: TargetItem[];
} {
  if (state.isGameOver) {
    return { nextState: state, remainingPlatforms: platforms, remainingTargets: targets };
  }

  const dt = BALL_CONFIG.FIXED_DT_SEC;
  const timeElapsedMs = state.timeElapsedMs + dt * 1000;
  const tokensEligible = timeElapsedMs <= BALL_CONFIG.TOKEN_TIME_LIMIT_MS;

  // Speed scaling as worldX progresses
  const speed = Math.min(
    BALL_CONFIG.MAX_SPEED,
    BALL_CONFIG.BASE_SPEED + (state.worldX / 3000) * (BALL_CONFIG.MAX_SPEED - BALL_CONFIG.BASE_SPEED)
  );

  const worldX = state.worldX + speed * dt;

  // Vertical physics
  let vy = state.vy;
  if (wantsHop) {
    vy = BALL_CONFIG.HOP_VELOCITY;
  } else {
    vy += BALL_CONFIG.GRAVITY * dt;
  }

  let y = state.y + vy * dt;
  let isGameOver = false;

  // Screen ceiling / floor collision
  if (y - state.radius <= 0) {
    y = state.radius;
    vy = 0;
  }
  if (y + state.radius >= BALL_CONFIG.CANVAS_HEIGHT) {
    isGameOver = true;
  }

  let score = state.score;
  let hoops = state.hoops;
  let tokenPickups = state.tokenPickups;
  let multiplier = state.multiplier;
  let bestMultiplier = state.bestMultiplier;
  let consecutivePasses = state.consecutivePasses;

  // 1. Platform updates & collision checks
  const remainingPlatforms: ObstaclePlatform[] = [];
  for (const plat of platforms) {
    // If moving platform, update vertical position
    let topY = plat.topY;
    let bottomY = plat.bottomY;
    let platVy = plat.vy ?? 0;

    if (plat.isMoving && plat.minY !== undefined && plat.maxY !== undefined) {
      topY += platVy * dt;
      bottomY += platVy * dt;
      if (topY < plat.minY || topY > plat.maxY) {
        platVy = -platVy;
      }
    }

    // Platform screen X relative to ball
    const screenX = plat.x - worldX + BALL_CONFIG.BALL_X;

    // Ball horizontal overlap with platform
    if (
      BALL_CONFIG.BALL_X + state.radius > screenX &&
      BALL_CONFIG.BALL_X - state.radius < screenX + plat.width
    ) {
      // Collision with upper or lower pipe/wall
      if (y - state.radius < topY || y + state.radius > bottomY) {
        isGameOver = true;
      }
    }

    if (screenX + plat.width > -50) {
      remainingPlatforms.push({
        ...plat,
        topY,
        bottomY,
        vy: platVy,
      });
    }
  }

  // 2. Targets & pickups collision
  const remainingTargets: TargetItem[] = [];
  for (const target of targets) {
    const screenX = target.x - worldX + BALL_CONFIG.BALL_X;
    const dx = screenX - BALL_CONFIG.BALL_X;
    const dy = target.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < state.radius + target.radius) {
      // Collected!
      switch (target.type) {
        case 'hoop':
          hoops += 1;
          score += 10 * multiplier;
          consecutivePasses += 1;
          if (consecutivePasses % 3 === 0) {
            multiplier = Math.min(5, multiplier + 1);
            bestMultiplier = Math.max(bestMultiplier, multiplier);
          }
          break;
        case 'star':
          score += 5 * multiplier;
          consecutivePasses += 1;
          if (consecutivePasses % 3 === 0) {
            multiplier = Math.min(5, multiplier + 1);
            bestMultiplier = Math.max(bestMultiplier, multiplier);
          }
          break;
        case 'token':
          score += 15 * multiplier;
          if (tokensEligible && tokenPickups < BALL_CONFIG.MAX_TOKEN_PICKUPS) {
            tokenPickups += 1;
          }
          break;
        case 'gem':
          score += 25 * multiplier;
          break;
        case 'bomb':
          // Bomb resets perfect bounce multiplier
          multiplier = 1;
          consecutivePasses = 0;
          break;
      }
    } else if (screenX > -50) {
      remainingTargets.push(target);
    }
  }

  return {
    nextState: {
      x: state.x,
      worldX,
      y,
      vy,
      radius: state.radius,
      isGameOver,
      score,
      hoops,
      tokenPickups,
      multiplier,
      bestMultiplier,
      consecutivePasses,
      timeElapsedMs,
      tokensEligible,
    },
    remainingPlatforms,
    remainingTargets,
  };
}
