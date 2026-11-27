/**
 * Key pools by stage:
 * Stage 0: 'ASDF' (home row left)
 * Stage 1: 'JKL' (home row right)
 * Stage 2: 'ASDFJKL' (full home row)
 * Stage 3: 'QWERTY' (top row common)
 * Stage 4+: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' (full letters)
 */
export const STAGE_KEY_POOLS: string[] = [
  'ASDF',
  'JKL',
  'ASDFJKL',
  'QWERTY',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
];

export interface NinjaStats {
  hits: number;
  misses: number;
  accuracy: number;
  keysPerSec: number;
  bestCombo: number;
  stage: number;
}

/**
 * Returns key pool string for the given stage index.
 */
export function getKeyPoolForStage(stage: number): string {
  const idx = Math.min(Math.max(0, stage), STAGE_KEY_POOLS.length - 1);
  return STAGE_KEY_POOLS[idx];
}

/**
 * Deterministically generates the next target key from a pool using an RNG function.
 */
export function getNextKey(pool: string, rng: () => number, lastKey?: string): string {
  if (pool.length === 0) return 'A';
  if (pool.length === 1) return pool[0];

  let candidate: string;
  let attempts = 0;
  do {
    const idx = Math.floor(rng() * pool.length);
    candidate = pool[idx];
    attempts++;
  } while (candidate === lastKey && attempts < 5);

  return candidate;
}

/**
 * Computes combo multiplier: starts at 1, goes up to x5 (x1: 0-4 combo, x2: 5-9, x3: 10-14, x4: 15-19, x5: 20+).
 * Multiplier applies to SCORE ONLY.
 */
export function getComboMultiplier(combo: number): number {
  if (combo >= 20) return 5;
  if (combo >= 15) return 4;
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

/**
 * Computes player accuracy percentage: round(hits / (hits + misses) * 100).
 */
export function calculateAccuracy(hits: number, misses: number): number {
  const total = hits + misses;
  if (total <= 0) return 100;
  return Math.round((hits / total) * 100);
}

/**
 * Computes keys per second: hits / (durationMs / 1000).
 */
export function calculateKps(hits: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const sec = durationMs / 1000;
  return Math.round((hits / sec) * 10) / 10;
}

/**
 * Calculates arcade score: hits * 10 + bestCombo * 25 - misses * 15 (min 0).
 */
export function calculateArcadeScore(hits: number, bestCombo: number, misses: number): number {
  return Math.max(0, hits * 10 + bestCombo * 25 - misses * 15);
}
