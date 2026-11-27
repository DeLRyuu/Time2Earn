import type { ArcadeGameId } from './types';
import type { AuthUser } from '../types/auth';

export const ARCADE_SCORES_COLLECTION = 'arcade_scores';

export interface ArcadeScoreRecord {
  id?: string;
  gameId: ArcadeGameId;
  userId: string;
  username: string;
  score: number;
  recordedAt: string;
}

const LOCAL_LEADERBOARD_KEY = 't2e_local_arcade_scores';

function getLocalScores(): ArcadeScoreRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalScores(scores: ArcadeScoreRecord[]): void {
  try {
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(scores));
  } catch {
    // ignore
  }
}

/**
 * Record a game score for a user.
 * Leaderboards track SCORES only, never token balances.
 */
export async function recordScore(
  gameId: ArcadeGameId,
  user: AuthUser,
  score: number
): Promise<ArcadeScoreRecord> {
  const record: ArcadeScoreRecord = {
    id: `score_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    gameId,
    userId: user.uid,
    username: user.username,
    score: Math.max(0, Math.round(score)),
    recordedAt: new Date().toISOString(),
  };

  const scores = getLocalScores();
  scores.push(record);
  saveLocalScores(scores);

  return record;
}

/**
 * Get top N scores all-time for a given game.
 */
export async function getTopScores(
  gameId: ArcadeGameId,
  n: number = 10
): Promise<ArcadeScoreRecord[]> {
  const scores = getLocalScores();
  return scores
    .filter((s) => s.gameId === gameId)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * Get top N scores today (UTC) for a given game.
 */
export async function getDailyTop(
  gameId: ArcadeGameId,
  n: number = 10
): Promise<ArcadeScoreRecord[]> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startIso = startOfDay.toISOString();

  const scores = getLocalScores();
  return scores
    .filter((s) => s.gameId === gameId && s.recordedAt >= startIso)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
