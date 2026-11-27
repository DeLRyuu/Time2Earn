import type { GameResult, RewardResult, ArcadeGameId } from './types';
import { getGameDef, SHARED_DAILY_TOKEN_CAP } from './registry';

export interface ComputeRewardInput {
  result: GameResult;
  tokensEarnedTodayAll: number;
  tokensEarnedTodayForGame: number;
}

export interface GameRewardRuleOutput {
  rawTokens: number;
  exp: number;
  tierLabel: string;
}

export type GameRewardRuleFn = (result: GameResult) => GameRewardRuleOutput;

/**
 * Per-game reward calculation rules.
 * Initial placeholder tiers return baseline rewards based on performance/score.
 * Each dedicated game phase will refine its rule.
 */
export const GAME_REWARD_RULES: Record<ArcadeGameId, GameRewardRuleFn> = {
  time2rush: (result) => {
    // Placeholder: completed track yields 3 base tokens + 2 for score tiers
    const completed = result.performance.completed ?? (result.score > 0 ? 1 : 0);
    if (!completed) return { rawTokens: 0, exp: 2, tierLabel: 'DNF' };
    const rawTokens = result.score >= 5000 ? 5 : result.score >= 2000 ? 3 : 2;
    return {
      rawTokens,
      exp: 10 + rawTokens * 2,
      tierLabel: result.score >= 5000 ? 'Gold Racer' : 'Silver Racer',
    };
  },
  'endless-run': (result) => {
    // Placeholder distance tiers
    const dist = result.performance.distanceM ?? result.score;
    const rawTokens = dist >= 2500 ? 4 : dist >= 1500 ? 3 : dist >= 800 ? 2 : dist >= 300 ? 1 : 0;
    return {
      rawTokens,
      exp: 2 + rawTokens * 2,
      tierLabel: rawTokens >= 3 ? 'Endurance Master' : rawTokens > 0 ? 'Survivor' : 'Rookie',
    };
  },
  'zombie-run': (result) => {
    // Placeholder survival time tiers
    const sec = result.performance.survivedSec ?? Math.floor(result.durationMs / 1000);
    const rawTokens = sec >= 120 ? 4 : sec >= 90 ? 3 : sec >= 60 ? 2 : sec >= 30 ? 1 : 0;
    return {
      rawTokens,
      exp: 2 + rawTokens * 2,
      tierLabel: rawTokens >= 3 ? 'Zombie Slayer' : rawTokens > 0 ? 'Escaped' : 'Bitten',
    };
  },
  'reaction-rush': (result) => {
    // S+ 5, S 4, A 3, B 2, C 1, D 0 tokens; EXP = 1 + tokens*2
    const avgMs = result.performance.avgMs ?? 300;
    const minRoundMs = result.performance.minRoundMs ?? avgMs;

    // Plausibility limits: reject human limit < 80ms or avgMs < 90ms
    if (minRoundMs < 80) {
      throw new Error(`Implausible reaction time detected: ${minRoundMs}ms (human limit is 80ms)`);
    }
    if (avgMs < 90) {
      throw new Error(`Implausible average reaction time detected: ${avgMs}ms (bot limit is 90ms)`);
    }

    let rawTokens: number;
    let tierLabel: string;

    if (avgMs < 150) {
      rawTokens = 5;
      tierLabel = 'Grade S+ (Lightning)';
    } else if (avgMs <= 180) {
      rawTokens = 4;
      tierLabel = 'Grade S (Supersonic)';
    } else if (avgMs <= 220) {
      rawTokens = 3;
      tierLabel = 'Grade A (Sharp)';
    } else if (avgMs <= 270) {
      rawTokens = 2;
      tierLabel = 'Grade B (Fast)';
    } else if (avgMs <= 350) {
      rawTokens = 1;
      tierLabel = 'Grade C (Steady)';
    } else {
      rawTokens = 0;
      tierLabel = 'Grade D (Slow)';
    }

    return {
      rawTokens,
      exp: 1 + rawTokens * 2,
      tierLabel,
    };
  },
  'color-clash': (result) => {
    // Placeholder Stroop accuracy tiers
    const acc = result.performance.accuracy ?? (result.score > 0 ? 80 : 0);
    const rawTokens = acc >= 90 ? 3 : acc >= 80 ? 2 : acc >= 65 ? 1 : 0;
    return {
      rawTokens,
      exp: 2 + rawTokens * 2,
      tierLabel: acc >= 90 ? 'Color Master' : 'Focus Kept',
    };
  },
  'target-hunter': (result) => {
    // Placeholder click score tiers
    const rawTokens = result.score >= 80 ? 3 : result.score >= 40 ? 2 : result.score >= 20 ? 1 : 0;
    return {
      rawTokens,
      exp: 2 + rawTokens * 2,
      tierLabel: rawTokens >= 3 ? 'Sharpshooter' : 'Marksman',
    };
  },
  'keyboard-ninja': (result) => {
    // Rewards: accuracy>=97 && kps>=4 => 6 tokens; >=93 && >=3 => 4; >=85 && >=2 => 2; >=70 => 1; else 0. EXP = 2 + tokens*2.
    // Reject keysPerSec > 14 (bot suspicion) and hits > 600.
    const hits = result.performance.hits ?? 0;
    const kps = result.performance.keysPerSec ?? 0;
    const acc = result.performance.accuracy ?? 0;

    if (kps > 14) {
      throw new Error(`Suspicious typing speed detected: ${kps} keys/sec (bot limit is 14 kps)`);
    }
    if (hits > 600) {
      throw new Error(`Suspicious hit count detected: ${hits} hits in single session (limit is 600)`);
    }

    let rawTokens: number;
    let tierLabel: string;

    if (acc >= 97 && kps >= 4) {
      rawTokens = 6;
      tierLabel = 'Grandmaster Ninja';
    } else if (acc >= 93 && kps >= 3) {
      rawTokens = 4;
      tierLabel = 'Master Ninja';
    } else if (acc >= 85 && kps >= 2) {
      rawTokens = 2;
      tierLabel = 'Adept Ninja';
    } else if (acc >= 70) {
      rawTokens = 1;
      tierLabel = 'Apprentice Ninja';
    } else {
      rawTokens = 0;
      tierLabel = 'Novice';
    }

    return {
      rawTokens,
      exp: 2 + rawTokens * 2,
      tierLabel,
    };
  },
  'ball-bounce': (result) => {
    // Placeholder physics score tiers
    const rawTokens = result.score >= 300 ? 3 : result.score >= 100 ? 2 : result.score >= 30 ? 1 : 0;
    return {
      rawTokens,
      exp: 1 + rawTokens * 2,
      tierLabel: rawTokens >= 3 ? 'Bounce Champion' : 'Hoop Star',
    };
  },
};

/**
 * Pure reward calculation and anti-abuse verification.
 * Clamps tokens strictly against remaining per-game cap and shared daily cap.
 * Throws on invalid / implausible game results.
 */
export function computeArcadeReward(input: ComputeRewardInput): RewardResult {
  const { result, tokensEarnedTodayAll, tokensEarnedTodayForGame } = input;
  const gameDef = getGameDef(result.gameId);

  if (!gameDef) {
    throw new Error(`Invalid game ID: ${result.gameId}`);
  }

  // 1. Sanity limits validation
  if (typeof result.durationMs !== 'number' || isNaN(result.durationMs)) {
    throw new Error('Invalid durationMs: duration must be a valid number');
  }
  if (result.durationMs < gameDef.minDurationMs) {
    throw new Error(
      `Game run duration too short: ${result.durationMs}ms (min required: ${gameDef.minDurationMs}ms)`
    );
  }
  if (result.durationMs > gameDef.maxDurationMs) {
    throw new Error(
      `Game run duration exceeds limit: ${result.durationMs}ms (max allowed: ${gameDef.maxDurationMs}ms)`
    );
  }

  if (typeof result.score !== 'number' || isNaN(result.score)) {
    throw new Error('Invalid score: score must be a valid number');
  }
  if (result.score < 0) {
    throw new Error(`Negative score rejected: ${result.score}`);
  }
  if (result.score > gameDef.maxPlausibleScore) {
    throw new Error(
      `Score exceeds max plausible limit: ${result.score} (max: ${gameDef.maxPlausibleScore})`
    );
  }

  // 2. Compute raw reward according to game rules
  const ruleFn = GAME_REWARD_RULES[result.gameId];
  const { rawTokens, exp, tierLabel } = ruleFn(result);

  // 3. Compute remaining caps
  const gameCapRemaining = Math.max(0, gameDef.dailyTokenCap - tokensEarnedTodayForGame);
  const sharedCapRemaining = Math.max(0, SHARED_DAILY_TOKEN_CAP - tokensEarnedTodayAll);

  // 4. Clamping logic: tokens cannot exceed game cap remaining or shared cap remaining
  let clamped: 'none' | 'game-cap' | 'daily-cap' = 'none';
  let tokensAwarded = rawTokens;

  const effectiveCap = Math.min(gameCapRemaining, sharedCapRemaining);

  if (tokensAwarded > effectiveCap) {
    tokensAwarded = effectiveCap;
    if (sharedCapRemaining <= gameCapRemaining) {
      clamped = 'daily-cap';
    } else {
      clamped = 'game-cap';
    }
  }

  // Ensure tokensAwarded is non-negative integer
  tokensAwarded = Math.max(0, Math.floor(tokensAwarded));

  // arcadeScore is always preserved for leaderboards
  const arcadeScore = Math.max(0, Math.round(result.score));

  return {
    tokensAwarded,
    expAwarded: Math.max(0, Math.round(exp)), // EXP is never capped
    rawTokens,
    clamped,
    tierLabel,
    arcadeScore,
  };
}
