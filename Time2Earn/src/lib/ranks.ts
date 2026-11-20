export interface RankCalculationResult {
  currentRank: string;
  currentThreshold: number;
  nextRank: string | null;
  nextThreshold: number | null;
  expRemaining: number;
  progressPercent: number;
  isMaxRank: boolean;
}

export function calculateRankProgress(
  currentExp: number,
  rankThresholds: Record<string, number>
): RankCalculationResult {
  // Sort ranks ascending by EXP threshold
  const sorted = Object.entries(rankThresholds).sort(([, a], [, b]) => a - b);

  if (sorted.length === 0) {
    return {
      currentRank: 'Newbie',
      currentThreshold: 0,
      nextRank: null,
      nextThreshold: null,
      expRemaining: 0,
      progressPercent: 100,
      isMaxRank: true,
    };
  }

  // Find highest threshold <= currentExp
  let currentRankIndex = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (currentExp >= sorted[i][1]) {
      currentRankIndex = i;
    } else {
      break;
    }
  }

  const [currentRank, currentThreshold] = sorted[currentRankIndex];
  const hasNextRank = currentRankIndex < sorted.length - 1;

  if (!hasNextRank) {
    // Top-rank player (e.g. OG Player)
    return {
      currentRank,
      currentThreshold,
      nextRank: null,
      nextThreshold: null,
      expRemaining: 0,
      progressPercent: 100,
      isMaxRank: true,
    };
  }

  const [nextRank, nextThreshold] = sorted[currentRankIndex + 1];
  const range = nextThreshold - currentThreshold;
  const progressInTier = Math.max(0, currentExp - currentThreshold);
  const progressPercent = Math.min(100, Math.max(0, Math.round((progressInTier / (range || 1)) * 100)));
  const expRemaining = Math.max(0, nextThreshold - currentExp);

  return {
    currentRank,
    currentThreshold,
    nextRank,
    nextThreshold,
    expRemaining,
    progressPercent,
    isMaxRank: false,
  };
}

export interface RankLadderTier {
  name: string;
  threshold: number;
  status: 'reached' | 'current' | 'locked';
  expNeeded: number;
}

/**
 * Generates the full rank progression ladder
 * indicating which tiers are reached, currently active, or locked
 */
export function getRankLadder(
  currentExp: number,
  rankThresholds: Record<string, number>
): RankLadderTier[] {
  const sorted = Object.entries(rankThresholds).sort(([, a], [, b]) => a - b);
  if (sorted.length === 0) return [];

  // Determine current tier index by highest threshold <= currentExp
  let currentTierIndex = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (currentExp >= sorted[i][1]) {
      currentTierIndex = i;
    } else {
      break;
    }
  }

  return sorted.map(([name, threshold], idx) => {
    let status: 'reached' | 'current' | 'locked';
    if (idx === currentTierIndex) {
      status = 'current';
    } else if (idx < currentTierIndex) {
      status = 'reached';
    } else {
      status = 'locked';
    }

    const expNeeded = Math.max(0, threshold - currentExp);
    return {
      name,
      threshold,
      status,
      expNeeded,
    };
  });
}
