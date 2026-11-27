/**
 * Zombie types enum.
 * Only 'walker' is currently implemented; others are typed placeholders for future expansion.
 */
export type ZombieType = 'walker' | 'runner' | 'tank' | 'screamer';

export interface ChaserState {
  zombieGap: number; // distance in meters behind player (starts e.g. 25m)
  stamina: number; // 0 to 100
  maxStamina: number; // 100
  isSprinting: boolean;
  shields: number; // count of active zombie shields (blocks 1 horde hit)
  cratesOpened: number; // Survivor Crates opened
  tokenCachesOpened: number; // Safe Token Caches opened
  zombieType: ZombieType;
  isCaught: boolean;
}

export const CHASER_CONFIG = {
  INITIAL_GAP: 25.0, // meters behind player
  MIN_GAP: 0.0,
  MAX_GAP: 40.0,
  BASE_ZOMBIE_CATCHUP_RATE: 0.65, // meters per second zombies gain naturally
  SPRINT_GAP_GAIN_RATE: 4.5, // meters per second gained when sprinting away
  OBSTACLE_HIT_GAP_PENALTY: 6.0, // meters lost when tripping on an obstacle
  DANGER_LANE_GAP_PENALTY: 4.0, // meters lost when diving into a Danger Lane
  STAMINA_DRAIN_PER_SEC: 35.0, // stamina drained while sprinting
  STAMINA_REGEN_PER_SEC: 15.0, // stamina regenerated when not sprinting
  ENERGY_PICKUP_STAMINA: 40.0, // stamina refilled by energy pickup
};

export function createInitialChaserState(): ChaserState {
  return {
    zombieGap: CHASER_CONFIG.INITIAL_GAP,
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    shields: 0,
    cratesOpened: 0,
    tokenCachesOpened: 0,
    zombieType: 'walker',
    isCaught: false,
  };
}

/**
 * Updates chaser state for a delta time (dt in seconds).
 */
export function updateChaser(
  state: ChaserState,
  dtSec: number,
  wantsSprint: boolean
): ChaserState {
  if (state.isCaught) return state;

  let stamina = state.stamina;
  let isSprinting = false;

  // Sprint check
  if (wantsSprint && stamina > 5) {
    isSprinting = true;
    stamina = Math.max(0, stamina - CHASER_CONFIG.STAMINA_DRAIN_PER_SEC * dtSec);
    if (stamina === 0) {
      isSprinting = false;
    }
  } else {
    stamina = Math.min(state.maxStamina, stamina + CHASER_CONFIG.STAMINA_REGEN_PER_SEC * dtSec);
  }

  // Update zombie gap
  let gap = state.zombieGap;
  if (isSprinting) {
    gap = Math.min(CHASER_CONFIG.MAX_GAP, gap + CHASER_CONFIG.SPRINT_GAP_GAIN_RATE * dtSec);
  } else {
    gap = gap - CHASER_CONFIG.BASE_ZOMBIE_CATCHUP_RATE * dtSec;
  }

  let shields = state.shields;
  let isCaught = false;

  if (gap <= CHASER_CONFIG.MIN_GAP) {
    if (shields > 0) {
      // Shield absorbs zombie hit and pushes horde back
      shields -= 1;
      gap = 10.0;
    } else {
      gap = 0;
      isCaught = true;
    }
  }

  return {
    ...state,
    zombieGap: Math.max(0, gap),
    stamina,
    isSprinting,
    shields,
    isCaught,
  };
}

/**
 * Applies obstacle collision penalty.
 */
export function onObstacleHit(state: ChaserState): ChaserState {
  if (state.isCaught) return state;
  let gap = state.zombieGap - CHASER_CONFIG.OBSTACLE_HIT_GAP_PENALTY;
  let shields = state.shields;
  let isCaught = false;

  if (gap <= 0) {
    if (shields > 0) {
      shields -= 1;
      gap = 8.0;
    } else {
      gap = 0;
      isCaught = true;
    }
  }

  return {
    ...state,
    zombieGap: Math.max(0, gap),
    shields,
    isCaught,
  };
}

/**
 * Collects a risk/reward fork pickup:
 * 'safe-cache' => Token Cache (small reward, safe distance)
 * 'danger-crate' => Survivor Crate (big reward, zombies pull closer)
 * 'energy' => refills stamina
 * 'shield' => blocks one zombie catch
 */
export function onChaserPickup(
  state: ChaserState,
  pickupType: 'safe-cache' | 'danger-crate' | 'energy' | 'shield'
): ChaserState {
  if (state.isCaught) return state;

  switch (pickupType) {
    case 'safe-cache':
      return {
        ...state,
        tokenCachesOpened: state.tokenCachesOpened + 1,
      };
    case 'danger-crate': {
      let gap = state.zombieGap - CHASER_CONFIG.DANGER_LANE_GAP_PENALTY;
      let shields = state.shields;
      let isCaught = false;
      if (gap <= 0) {
        if (shields > 0) {
          shields -= 1;
          gap = 8.0;
        } else {
          gap = 0;
          isCaught = true;
        }
      }
      return {
        ...state,
        cratesOpened: state.cratesOpened + 1,
        zombieGap: Math.max(0, gap),
        shields,
        isCaught,
      };
    }
    case 'energy':
      return {
        ...state,
        stamina: Math.min(state.maxStamina, state.stamina + CHASER_CONFIG.ENERGY_PICKUP_STAMINA),
      };
    case 'shield':
      return {
        ...state,
        shields: state.shields + 1,
      };
  }
}
