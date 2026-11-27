export type TargetType = 'normal' | 'small' | 'moving' | 'golden' | 'fake';

export interface TargetDef {
  id: string;
  type: TargetType;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  lifetimeMs: number;
  ageMs: number;
  basePoints: number;
}

export interface HunterPerformance {
  hits: number;
  misses: number;
  accuracy: number;
  bestCombo: number;
  goldenHits: number;
  fakeHits: number;
}

export const TARGET_SPECS: Record<
  TargetType,
  { basePoints: number; baseRadius: number; lifetimeMs: number }
> = {
  normal: { basePoints: 1, baseRadius: 28, lifetimeMs: 2500 },
  small: { basePoints: 3, baseRadius: 18, lifetimeMs: 2000 },
  moving: { basePoints: 5, baseRadius: 24, lifetimeMs: 2500 },
  golden: { basePoints: 10, baseRadius: 22, lifetimeMs: 1400 },
  fake: { basePoints: -5, baseRadius: 26, lifetimeMs: 3000 },
};

/**
 * Returns combo multiplier: x1..x5 (capped at x5, applies to SCORE ONLY).
 */
export function getComboMultiplier(combo: number): number {
  if (combo >= 20) return 5;
  if (combo >= 15) return 4;
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

/**
 * Computes accuracy percentage: round(hits / (hits + misses) * 100).
 */
export function calculateAccuracy(hits: number, misses: number): number {
  const total = hits + misses;
  if (total <= 0) return 100;
  return Math.round((hits / total) * 100);
}

/**
 * Computes score adjustment for a target hit.
 * Fake targets penalize 5 points directly (multiplier does not magnify penalty).
 * Positive targets multiply base points by current combo multiplier.
 */
export function calculateHitPoints(type: TargetType, combo: number): number {
  const spec = TARGET_SPECS[type];
  if (type === 'fake') {
    return spec.basePoints; // -5 points
  }
  const multiplier = getComboMultiplier(combo);
  return spec.basePoints * multiplier;
}

/**
 * Generates a target at a random position inside (width, height) with boundary padding.
 */
export function spawnTarget(
  type: TargetType,
  width: number,
  height: number,
  rng: () => number
): TargetDef {
  const spec = TARGET_SPECS[type];
  const padding = spec.baseRadius + 20;

  const x = padding + rng() * Math.max(10, width - padding * 2);
  const y = padding + rng() * Math.max(10, height - padding * 2);

  let vx = 0;
  let vy = 0;
  if (type === 'moving') {
    const speed = 60 + rng() * 80; // px/sec
    const angle = rng() * Math.PI * 2;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }

  return {
    id: `tgt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    x,
    y,
    radius: spec.baseRadius,
    vx,
    vy,
    lifetimeMs: spec.lifetimeMs,
    ageMs: 0,
    basePoints: spec.basePoints,
  };
}

/**
 * Checks if a click/pointer coordinate (px, py) intersects a target circle.
 */
export function isPointInsideTarget(px: number, py: number, target: TargetDef): boolean {
  const dx = px - target.x;
  const dy = py - target.y;
  return dx * dx + dy * dy <= target.radius * target.radius;
}
