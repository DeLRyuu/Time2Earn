export type ObstacleType = 'barricade' | 'low-barrier' | 'puddle' | 'moving';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  lane: number; // 0: left, 1: center, 2: right
  z: number; // Distance along track (in meters)
  length: number; // Obstacle length in meters
  // Moving obstacle properties
  vx?: number; // lane drift speed
  laneOffset?: number; // floating lane position
}

export interface ObstaclePattern {
  z: number;
  obstacles: Obstacle[];
  passableLanes: number[];
}

export const OBSTACLE_SPECS: Record<
  ObstacleType,
  { label: string; length: number; clearMethod: 'jump' | 'slide' | 'avoid'; speedPenalty: number }
> = {
  barricade: { label: 'Barricade', length: 1.2, clearMethod: 'jump', speedPenalty: 0.5 },
  'low-barrier': { label: 'Laser Barrier', length: 1.0, clearMethod: 'slide', speedPenalty: 0.5 },
  puddle: { label: 'Oil Puddle', length: 3.5, clearMethod: 'avoid', speedPenalty: 0.6 },
  moving: { label: 'Drone Hazard', length: 1.5, clearMethod: 'avoid', speedPenalty: 0.5 },
};

/**
 * Generates passable obstacle patterns along the track.
 * Guarantee: Every pattern has at least one completely clear or passable lane.
 * Never blocks all 3 lanes with unavoidable obstacles.
 */
export function generateObstaclePattern(
  z: number,
  rng: () => number,
  difficultyMultiplier: number = 1.0
): ObstaclePattern {
  const obstacles: Obstacle[] = [];
  const roll = rng();

  // Pattern templates:
  // 1 lane blocked (60%), 2 lanes blocked (40%)
  const twoBlocked = roll < Math.min(0.5, 0.25 * difficultyMultiplier);
  let passableLanes: number[];

  if (twoBlocked) {
    // Pick 1 safe lane, block the other two
    const safeLane = Math.floor(rng() * 3);
    const blockedLanes = [0, 1, 2].filter((l) => l !== safeLane);
    passableLanes = [safeLane];

    for (const lane of blockedLanes) {
      const typeRoll = rng();
      let type: ObstacleType;
      if (typeRoll < 0.35) type = 'barricade';
      else if (typeRoll < 0.7) type = 'low-barrier';
      else type = 'puddle';

      obstacles.push({
        id: `obs_${z}_${lane}`,
        type,
        lane,
        z,
        length: OBSTACLE_SPECS[type].length,
      });
    }
  } else {
    // 1 lane blocked
    const blockedLane = Math.floor(rng() * 3);
    passableLanes = [0, 1, 2].filter((l) => l !== blockedLane);
    const typeRoll = rng();
    let type: ObstacleType;
    if (typeRoll < 0.3) type = 'barricade';
    else if (typeRoll < 0.55) type = 'low-barrier';
    else if (typeRoll < 0.8) type = 'puddle';
    else type = 'moving';

    obstacles.push({
      id: `obs_${z}_${blockedLane}`,
      type,
      lane: blockedLane,
      z,
      length: OBSTACLE_SPECS[type].length,
      vx: type === 'moving' ? (rng() > 0.5 ? 1 : -1) * 0.8 : undefined,
      laneOffset: blockedLane,
    });
  }

  return { z, obstacles, passableLanes };
}
