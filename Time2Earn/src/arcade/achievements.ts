import type { ArcadeGameId } from './types';
import type { ArcadeIconName } from '../components/ui/ArcadeIcon';

export interface ArcadeAchievementDef {
  id: string;
  title: string;
  description: string;
  icon: ArcadeIconName;
  gameId?: ArcadeGameId; // undefined = shared/global arcade achievement
  predicate: (stats: ArcadeStats) => boolean;
}

export interface ArcadeStats {
  totalGames: number;
  totalTokensEarned: number;
  bestStreak: number;
  favoriteGame?: ArcadeGameId | string;
  gameCounts: Record<string, number>;
  bestScores: Record<string, number>;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

const LOCAL_ACHIEVEMENTS_KEY = 't2e_local_arcade_achievements';
const LOCAL_STATS_KEY = 't2e_local_arcade_stats';

export const ARCADE_ACHIEVEMENTS: ArcadeAchievementDef[] = [
  {
    id: 'first_game',
    title: 'First Coin In',
    description: 'Play your first arcade cabinet in the Arcade Zone',
    icon: 'coin',
    predicate: (s) => s.totalGames >= 1,
  },
  {
    id: 'arcade_rookie',
    title: 'Arcade Rookie',
    description: 'Complete 10 total games in the arcade',
    icon: 'joystick',
    predicate: (s) => s.totalGames >= 10,
  },
  {
    id: 'arcade_addict',
    title: 'Arcade Addict',
    description: 'Complete 100 total games in the arcade',
    icon: 'crown',
    predicate: (s) => s.totalGames >= 100,
  },
  {
    id: 'token_hunter',
    title: 'Token Hunter',
    description: 'Earn 100 bonus tokens from the arcade',
    icon: 'trophy',
    predicate: (s) => s.totalTokensEarned >= 100,
  },
  // Game-specific placeholders
  {
    id: 'reaction_pro',
    title: 'Quickdraw',
    description: 'Achieve S+ grade in Reaction Rush',
    icon: 'bolt',
    gameId: 'reaction-rush',
    predicate: (s) => (s.bestScores['reaction-rush'] || 0) >= 900,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete a Time2Rush run with a record time',
    icon: 'flame',
    gameId: 'time2rush',
    predicate: (s) => (s.bestScores['time2rush'] || 0) >= 5000,
  },
];

export function getLocalArcadeStats(userId: string): ArcadeStats {
  try {
    const raw = localStorage.getItem(`${LOCAL_STATS_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    totalGames: 0,
    totalTokensEarned: 0,
    bestStreak: 0,
    favoriteGame: 'None',
    gameCounts: {},
    bestScores: {},
  };
}

export function saveLocalArcadeStats(userId: string, stats: ArcadeStats): void {
  try {
    localStorage.setItem(`${LOCAL_STATS_KEY}_${userId}`, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function getUnlockedAchievements(userId: string): UnlockedAchievement[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_ACHIEVEMENTS_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Evaluate arcade stats against achievement definitions and return newly unlocked achievements.
 */
export function evaluateAchievements(
  userId: string,
  stats: ArcadeStats
): ArcadeAchievementDef[] {
  const currentUnlocked = getUnlockedAchievements(userId);
  const unlockedIds = new Set(currentUnlocked.map((a) => a.id));
  const newlyUnlocked: ArcadeAchievementDef[] = [];

  for (const ach of ARCADE_ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id) && ach.predicate(stats)) {
      newlyUnlocked.push(ach);
      currentUnlocked.push({
        id: ach.id,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    try {
      localStorage.setItem(
        `${LOCAL_ACHIEVEMENTS_KEY}_${userId}`,
        JSON.stringify(currentUnlocked)
      );
    } catch {
      // ignore
    }
  }

  return newlyUnlocked;
}
