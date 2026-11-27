import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import type { AuthUser } from '../types/auth';
import type { GameResult, RewardResult } from '../arcade/types';
import { computeArcadeReward } from '../arcade/rewards';
import { assertRateLimit, RATE_LIMITS } from '../lib/rateLimit';
import { appendAuditLog } from './logService';
import { calculateRankProgress } from '../lib/ranks';
import { DEFAULT_CONFIG } from '../types/config';

export interface StoredArcadeSession {
  id?: string;
  userId: string;
  gameId: string;
  sessionId: string;
  score: number;
  tokensAwarded: number;
  expAwarded: number;
  completedAt: string;
}

export interface ArcadeDailyTotals {
  allTokens: number;
  perGame: Record<string, number>;
}

export interface ArcadeSubmissionOutcome extends RewardResult {
  newTotalCredits: number;
  newTotalExp: number;
  newRank: string;
}

export interface ArcadeResultSubmitter {
  submit(user: AuthUser, result: GameResult): Promise<ArcadeSubmissionOutcome>;
}

const LOCAL_ARCADE_SESSIONS_KEY = 't2e_local_arcade_sessions_v2';
const LOCAL_USERS_KEY = 't2e_local_users';

function getUtcStartOfDay(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Retrieve local arcade sessions from localStorage
 */
function getLocalArcadeSessions(): StoredArcadeSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_ARCADE_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a session to local arcade sessions store
 */
function saveLocalArcadeSession(session: StoredArcadeSession): void {
  const sessions = getLocalArcadeSessions();
  sessions.push(session);
  localStorage.setItem(LOCAL_ARCADE_SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * Fetch daily arcade token totals for a user on the current UTC calendar day.
 * Replaces the legacy quiz daily total query.
 */
export async function getArcadeDailyTotals(
  userId: string,
  now: Date = new Date()
): Promise<ArcadeDailyTotals> {
  const startOfDay = getUtcStartOfDay(now);

  if (hasValidFirebaseConfig && db) {
    try {
      const q = query(
        collection(db, 'arcade_sessions'),
        where('userId', '==', userId),
        where('completedAt', '>=', startOfDay)
      );
      const snap = await getDocs(q);
      let allTokens = 0;
      const perGame: Record<string, number> = {};

      snap.forEach((docSnap) => {
        const data = docSnap.data() as DocumentData;
        const tokens = typeof data.tokensAwarded === 'number' ? data.tokensAwarded : 0;
        const gId = data.gameId || 'unknown';

        allTokens += tokens;
        perGame[gId] = (perGame[gId] || 0) + tokens;
      });

      return { allTokens, perGame };
    } catch (err) {
      console.warn('Failed to query arcade daily totals from Firestore, falling back to local:', err);
    }
  }

  // Local / offline fallback
  const sessions = getLocalArcadeSessions();
  let allTokens = 0;
  const perGame: Record<string, number> = {};

  for (const s of sessions) {
    if (s.userId === userId && s.completedAt >= startOfDay) {
      allTokens += s.tokensAwarded || 0;
      perGame[s.gameId] = (perGame[s.gameId] || 0) + (s.tokensAwarded || 0);
    }
  }

  return { allTokens, perGame };
}

/**
 * Check if a session ID has already been submitted (anti-replay guard).
 */
export async function isSessionReplayed(sessionId: string): Promise<boolean> {
  if (hasValidFirebaseConfig && db) {
    try {
      const q = query(collection(db, 'arcade_sessions'), where('sessionId', '==', sessionId));
      const snap = await getDocs(q);
      if (!snap.empty) return true;
    } catch {
      // ignore and check local
    }
  }

  const sessions = getLocalArcadeSessions();
  return sessions.some((s) => s.sessionId === sessionId);
}

/**
 * LocalArcadeSubmitter: handles local offline testing and mock mode.
 * Stores result in localStorage and calculates new total credits/exp/rank locally.
 */
export class LocalArcadeSubmitter implements ArcadeResultSubmitter {
  async submit(user: AuthUser, result: GameResult): Promise<ArcadeSubmissionOutcome> {
    const totals = await getArcadeDailyTotals(user.uid);
    const reward = computeArcadeReward({
      result,
      tokensEarnedTodayAll: totals.allTokens,
      tokensEarnedTodayForGame: totals.perGame[result.gameId] || 0,
    });

    const completedAt = new Date().toISOString();
    const storedSession: StoredArcadeSession = {
      userId: user.uid,
      gameId: result.gameId,
      sessionId: result.sessionId,
      score: reward.arcadeScore,
      tokensAwarded: reward.tokensAwarded,
      expAwarded: reward.expAwarded,
      completedAt,
    };

    saveLocalArcadeSession(storedSession);

    // Update local user if available in localStorage
    const newTotalCredits = (user.credits || 0) + reward.tokensAwarded;
    const newTotalExp = (user.exp || 0) + reward.expAwarded;
    const rankProgress = calculateRankProgress(newTotalExp, DEFAULT_CONFIG.rankThresholds);

    try {
      const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const idx = users.findIndex((u: AuthUser) => u.uid === user.uid);
        if (idx !== -1) {
          users[idx].credits = newTotalCredits;
          users[idx].exp = newTotalExp;
          users[idx].rank = rankProgress.currentRank;
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        }
      }
    } catch {
      // ignore
    }

    return {
      ...reward,
      newTotalCredits,
      newTotalExp,
      newRank: rankProgress.currentRank,
    };
  }
}

/**
 * FirestoreArcadeSubmitter: Documented stub for production Cloud Function.
 * Note: Under current firestore.rules, client apps cannot write directly to
 * `users.credits`, `users.exp`, or `users.rank`. Authoritative reward writing
 * requires a Firebase Cloud Function callable (e.g. `submitArcadeResult`).
 */
export class FirestoreArcadeSubmitter implements ArcadeResultSubmitter {
  async submit(user: AuthUser, result: GameResult): Promise<ArcadeSubmissionOutcome> {
    void user;
    void result;
    // Cloud Functions callable will be implemented in Phase L.
    // Client write is prohibited by security rules: match /users/{userId} does not allow updating credits/exp/rank by owners.
    throw new Error(
      'FirestoreArcadeSubmitter: Production Firebase callable function `submitArcadeResult` is not yet configured. Under firestore.rules, clients cannot write credits directly. Please use LocalArcadeSubmitter for development/offline testing.'
    );
  }
}

// Active submitter: defaults to LocalArcadeSubmitter for development/local execution
let activeSubmitter: ArcadeResultSubmitter = new LocalArcadeSubmitter();

export function setArcadeSubmitter(submitter: ArcadeResultSubmitter): void {
  activeSubmitter = submitter;
}

/**
 * Main arcade session submission endpoint.
 * Enforces rate limiting, debt restriction checks, anti-replay guards,
 * computes rewards authoritatively, delegates to the active submitter,
 * records the session in arcade_sessions, writes an audit log, and returns the outcome.
 */
export async function submitArcadeResult(
  user: AuthUser,
  result: GameResult
): Promise<ArcadeSubmissionOutcome> {
  if (!user || !user.uid) {
    throw new Error('Unauthorized: User must be authenticated to submit arcade results');
  }

  // 1. Rate limiting guard (Max 6 arcade submissions per minute)
  assertRateLimit(`arcade_submit_${user.uid}`, RATE_LIMITS.ARCADE_SUBMIT);

  // 2. Restricted account guard
  if (user.isRestricted || user.isBanned) {
    throw new Error(
      'Account is restricted from earning arcade rewards. Clear outstanding shop debt to play.'
    );
  }

  // 3. Anti-replay check: ensure sessionId has not already been processed
  const replayed = await isSessionReplayed(result.sessionId);
  if (replayed) {
    throw new Error(`Duplicate session ID rejected (anti-replay): ${result.sessionId}`);
  }

  // 4. Delegate to active submitter (which computes reward via computeArcadeReward)
  const outcome = await activeSubmitter.submit(user, result);

  // 5. Append audit log and store arcade_sessions record in Firestore if available
  const completedAt = new Date().toISOString();
  if (hasValidFirebaseConfig && db) {
    try {
      await addDoc(collection(db, 'arcade_sessions'), {
        userId: user.uid,
        gameId: result.gameId,
        sessionId: result.sessionId,
        score: outcome.arcadeScore,
        tokensAwarded: outcome.tokensAwarded,
        expAwarded: outcome.expAwarded,
        completedAt,
      });
    } catch {
      // Handled or offline
    }
  }

  await appendAuditLog(
    'arcade_reward_granted',
    `Arcade run completed: ${result.gameId} (${outcome.tierLabel}). Score: ${outcome.arcadeScore}. Payout: +${outcome.tokensAwarded} tokens, +${outcome.expAwarded} EXP.`,
    {
      userId: user.uid,
      amount: outcome.tokensAwarded,
    }
  );

  return outcome;
}
