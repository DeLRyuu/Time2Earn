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
    // Placeholder reflex timing tiers
    const avgMs = result.performance.avgMs ?? 300;
    const rawTokens = avgMs <= 180 ? 4 : avgMs <= 220 ? 3 : avgMs <= 270 ? 2 : avgMs <= 350 ? 1 : 0;
    return {
      rawTokens,
      exp: 1 + rawTokens * 2,
      tierLabel: avgMs <= 180 ? 'Lightning Reflex' : avgMs <= 270 ? 'Sharp Reflex' : 'Normal',
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
    // Placeholder typing accuracy / kps tiers
    const acc = result.performance.accuracy ?? 85;
    const rawTokens = acc >= 93 ? 4 : acc >= 85 ? 2 : acc >= 70 ? 1 : 0;
    return {
      rawTokens,
      exp: 2 + rawTokens * 2,
      tierLabel: acc >= 93 ? 'Ninja Master' : 'Typist',
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
