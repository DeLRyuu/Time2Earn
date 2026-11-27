export type PickupType =
  | 'token'
  | 'gem'
  | 'crystal'
  | 'diamond'
  | 'golden-token'
  | 'speed-boost'
  | 'shield'
  | 'magnet'
  | 'double-token'
  | 'ghost';

export interface PickupItem {
  id: string;
  type: PickupType;
  lane: number; // 0, 1, 2
  z: number;
  scoreValue: number;
  isPowerUp: boolean;
}

export const PICKUP_SPECS: Record<
  PickupType,
  { label: string; scoreValue: number; isPowerUp: boolean; durationMs?: number }
> = {
  token: { label: 'Token', scoreValue: 1, isPowerUp: false },
  gem: { label: 'Gem', scoreValue: 3, isPowerUp: false },
  crystal: { label: 'Crystal', scoreValue: 10, isPowerUp: false },
  diamond: { label: 'Diamond', scoreValue: 25, isPowerUp: false },
  'golden-token': { label: 'Golden Token', scoreValue: 50, isPowerUp: false },
  'speed-boost': { label: 'Speed Boost', scoreValue: 5, isPowerUp: true, durationMs: 4000 },
  shield: { label: 'Shield', scoreValue: 5, isPowerUp: true, durationMs: 8000 },
  magnet: { label: 'Magnet', scoreValue: 5, isPowerUp: true, durationMs: 6000 },
  'double-token': { label: 'Double Token', scoreValue: 5, isPowerUp: true, durationMs: 8000 },
  ghost: { label: 'Ghost Phase', scoreValue: 5, isPowerUp: true, durationMs: 5000 },
};

/**
 * Spawns pickups along a lane at distance z.
 * Score values count toward in-run score only (tokens come authoritatively from rewards.ts).
 */
export function generatePickups(
  z: number,
  lane: number,
  rng: () => number,
  allowGoldenToken: boolean = true
): PickupItem[] {
  const roll = rng();
  let type: PickupType;

  if (roll < 0.6) {
    type = 'token';
  } else if (roll < 0.8) {
    type = 'gem';
  } else if (roll < 0.9) {
    type = 'crystal';
  } else if (roll < 0.95) {
    type = 'diamond';
  } else if (roll < 0.97 && allowGoldenToken) {
    type = 'golden-token'; // rare 1 per run
  } else {
    // Power-up roll
    const pRoll = rng();
    if (pRoll < 0.3) type = 'shield';
    else if (pRoll < 0.55) type = 'magnet';
    else if (pRoll < 0.8) type = 'double-token';
    else type = 'speed-boost';
  }

  const spec = PICKUP_SPECS[type];
  return [
    {
      id: `pickup_${z}_${lane}`,
      type,
      lane,
      z,
      scoreValue: spec.scoreValue,
      isPowerUp: spec.isPowerUp,
    },
  ];
}
