export type ReactionGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface ReactionStats {
  rounds: number[];
  avgMs: number;
  bestMs: number;
  falseStarts: number;
  effectiveAvgMs: number;
  grade: ReactionGrade;
}

/**
 * Returns grade based on average reaction time:
 * S+ <150ms, S 150-180ms, A 181-220ms, B 221-270ms, C 271-350ms, D 351ms+
 */
export function gradeFromAverage(avgMs: number): ReactionGrade {
  if (avgMs < 150) return 'S+';
  if (avgMs <= 180) return 'S';
  if (avgMs <= 220) return 'A';
  if (avgMs <= 270) return 'B';
  if (avgMs <= 350) return 'C';
  return 'D';
}

/**
 * Computes reaction run stats including false start penalties.
 * After 3 false starts, adds +100ms penalty to the average per extra false start.
 */
export function computeStats(rounds: number[], falseStarts: number): ReactionStats {
  if (rounds.length === 0) {
    return {
      rounds: [],
      avgMs: 0,
      bestMs: 0,
      falseStarts,
      effectiveAvgMs: 0,
      grade: 'D',
    };
  }

  const sum = rounds.reduce((acc, r) => acc + r, 0);
  const rawAvg = Math.round(sum / rounds.length);
  const bestMs = Math.round(Math.min(...rounds));

  // False start penalty: after 3 false starts, +100ms per extra false start
  const penaltyFalseStarts = Math.max(0, falseStarts - 3);
  const falseStartPenaltyMs = penaltyFalseStarts * 100;
  const effectiveAvgMs = rawAvg + falseStartPenaltyMs;

  const grade = gradeFromAverage(effectiveAvgMs);

  return {
    rounds,
    avgMs: rawAvg,
    bestMs,
    falseStarts,
    effectiveAvgMs,
    grade,
  };
}
