export type EndlessDifficultyBand =
  | 'easy'
  | 'normal'
  | 'fast'
  | 'hard'
  | 'extreme'
  | 'insane';

export interface DifficultyBandInfo {
  name: EndlessDifficultyBand;
  label: string;
  minDist: number;
  speedMultiplier: number;
  densityMultiplier: number;
}

export const ENDLESS_DIFFICULTY_BANDS: DifficultyBandInfo[] = [
  { name: 'easy', label: 'Easy', minDist: 0, speedMultiplier: 1.0, densityMultiplier: 1.0 },
  { name: 'normal', label: 'Normal', minDist: 500, speedMultiplier: 1.15, densityMultiplier: 1.2 },
  { name: 'fast', label: 'Fast', minDist: 1000, speedMultiplier: 1.3, densityMultiplier: 1.4 },
  { name: 'hard', label: 'Hard', minDist: 2000, speedMultiplier: 1.45, densityMultiplier: 1.6 },
  { name: 'extreme', label: 'Extreme', minDist: 3000, speedMultiplier: 1.6, densityMultiplier: 1.8 },
  { name: 'insane', label: 'Insane', minDist: 5000, speedMultiplier: 1.75, densityMultiplier: 2.0 },
];

/**
 * Returns current difficulty band for a given distance.
 */
export function getDifficultyBand(distanceM: number): DifficultyBandInfo {
  for (let i = ENDLESS_DIFFICULTY_BANDS.length - 1; i >= 0; i--) {
    const band = ENDLESS_DIFFICULTY_BANDS[i];
    if (band && distanceM >= band.minDist) {
      return band;
    }
  }
  return ENDLESS_DIFFICULTY_BANDS[0]!;
}

/**
 * Difficulty curve callback passed to RunnerCanvas.
 */
export function endlessDifficultyCurve(distanceM: number): {
  speedMultiplier: number;
  densityMultiplier: number;
} {
  const band = getDifficultyBand(distanceM);
  return {
    speedMultiplier: band.speedMultiplier,
    densityMultiplier: band.densityMultiplier,
  };
}

/**
 * Calculates combo multiplier from consecutive pickups (1x..5x).
 * Increments each 5 consecutive pickups up to 5x.
 */
export function getComboMultiplier(consecutivePickups: number): number {
  if (consecutivePickups >= 20) return 5;
  if (consecutivePickups >= 15) return 4;
  if (consecutivePickups >= 10) return 3;
  if (consecutivePickups >= 5) return 2;
  return 1;
}

/**
 * Calculates arcade score: distance + pickupsScore * 5
 */
export function calculateEndlessArcadeScore(distanceM: number, pickupsScore: number): number {
  return Math.round(distanceM) + pickupsScore * 5;
}
