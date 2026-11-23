import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import type { AuthUser } from '../types/auth';
import type {
  ArcadeSession,
  ArcadeUserStatus,
  ArcadeRewardResult,
  SanitizedQuizQuestion,
} from '../types/arcade';
import {
  getRandomQuestions,
  sanitizeQuestion,
  gradeQuiz,
  calculateArcadeRewards,
} from '../lib/arcadeQuiz';
import { calculateRankProgress } from '../lib/ranks';
import { DEFAULT_CONFIG } from '../types/config';

export const MAX_ATTEMPTS_PER_DAY = 3;
export const DAILY_CREDIT_CAP = 10;
export const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_TTL_MS = 3 * 60 * 1000; // 3 minutes
export const MIN_SUBMIT_TIME_MS = 10 * 1000; // 10 seconds anti-bot gate

const LOCAL_ARCADE_SESSIONS_KEY = 't2e_local_arcade_sessions';

let inMemoryArcadeSessions: ArcadeSession[] = [];

/**
 * Helper to fetch local sessions from localStorage or in-memory for offline/test mode.
 */
export function getLocalArcadeSessions(): ArcadeSession[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_ARCADE_SESSIONS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return inMemoryArcadeSessions;
}

/**
 * Helper to save local sessions in localStorage and in-memory.
 */
export function saveLocalArcadeSessions(sessions: ArcadeSession[]): void {
  inMemoryArcadeSessions = [...sessions];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_ARCADE_SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch {
    // Ignore storage quota errors in test environments
  }
}

/**
 * Checks whether a given ISO date string occurred on the same calendar day (UTC) as now.
 */
export function isSameUtcDay(dateStr: string, now: Date): boolean {
  try {
    const d = new Date(dateStr);
    return (
      d.getUTCFullYear() === now.getUTCFullYear() &&
      d.getUTCMonth() === now.getUTCMonth() &&
      d.getUTCDate() === now.getUTCDate()
    );
  } catch {
    return false;
  }
}

/**
 * Evaluates the current user's arcade eligibility, remaining attempts, and cooldown status.
 */
export async function getArcadeUserStatus(
  user: AuthUser,
  now: Date = new Date()
): Promise<ArcadeUserStatus> {
  // 1. Debt restriction check: restricted accounts cannot play
  if (user.isRestricted) {
    return {
      canPlay: false,
      attemptsToday: 0,
      maxAttemptsPerDay: MAX_ATTEMPTS_PER_DAY,
      dailyCreditsEarned: 0,
      dailyCreditCap: DAILY_CREDIT_CAP,
      cooldownUntil: null,
      secondsUntilNextAttempt: 0,
      isRestricted: true,
      restrictionReason: 'Your account has active debt restrictions. Clear outstanding debt to access Arcade.',
    };
  }

  let userSessions: ArcadeSession[];

  if (hasValidFirebaseConfig && db) {
    try {
      const q = query(
        collection(db, 'arcade_sessions'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      userSessions = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArcadeSession, 'id'>) }));
    } catch {
      userSessions = getLocalArcadeSessions().filter((s) => s.userId === user.uid);
    }
  } else {
    userSessions = getLocalArcadeSessions().filter((s) => s.userId === user.uid);
  }

  // Filter completed sessions for today UTC
  const todayCompletedSessions = userSessions.filter(
    (s) => s.status === 'completed' && s.completedAt && isSameUtcDay(s.completedAt, now)
  );

  const attemptsToday = todayCompletedSessions.length;
  const dailyCreditsEarned = todayCompletedSessions.reduce(
    (acc, s) => acc + (s.creditsAwarded ?? 0),
    0
  );

  // Find most recent completed attempt to compute cooldown
  let latestCompletedTime: number | null = null;
  for (const s of todayCompletedSessions) {
    if (s.completedAt) {
      const t = new Date(s.completedAt).getTime();
      if (latestCompletedTime === null || t > latestCompletedTime) {
        latestCompletedTime = t;
      }
    }
  }

  let cooldownUntil: string | null = null;
  let secondsUntilNextAttempt = 0;

  if (latestCompletedTime !== null) {
    const elapsed = now.getTime() - latestCompletedTime;
    if (elapsed < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - elapsed;
      secondsUntilNextAttempt = Math.ceil(remainingMs / 1000);
      cooldownUntil = new Date(latestCompletedTime + COOLDOWN_MS).toISOString();
    }
  }

  // Check attempt cap and cooldown
  const canPlay = attemptsToday < MAX_ATTEMPTS_PER_DAY && secondsUntilNextAttempt === 0;

  return {
    canPlay,
    attemptsToday,
    maxAttemptsPerDay: MAX_ATTEMPTS_PER_DAY,
    dailyCreditsEarned,
    dailyCreditCap: DAILY_CREDIT_CAP,
    cooldownUntil,
    secondsUntilNextAttempt,
    isRestricted: false,
  };
}

/**
 * Initiates an authoritative arcade quiz session.
 * Generates random questions on server, persists session token with question IDs,
 * and returns sanitized questions (without answers) to the client.
 */
export async function startArcadeSession(
  user: AuthUser,
  now: Date = new Date()
): Promise<{ sessionId: string; questions: SanitizedQuizQuestion[]; expiresAt: string }> {
  const status = await getArcadeUserStatus(user, now);

  if (status.isRestricted) {
    throw new Error(status.restrictionReason || 'Account is restricted from playing arcade.');
  }

  if (status.attemptsToday >= status.maxAttemptsPerDay) {
    throw new Error(`Daily limit reached (${status.maxAttemptsPerDay}/${status.maxAttemptsPerDay}). Come back tomorrow!`);
  }

  if (status.secondsUntilNextAttempt > 0) {
    const mins = Math.ceil(status.secondsUntilNextAttempt / 60);
    throw new Error(`Arcade machine is cooling down. Please wait ${mins} minute(s).`);
  }

  const selectedQuestions = getRandomQuestions(5);
  const questionIds = selectedQuestions.map((q) => q.id);
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  const newSession: ArcadeSession = {
    id: 'arc_' + Math.random().toString(36).substring(2, 11),
    userId: user.uid,
    username: user.username,
    gameType: 'quick_quiz',
    questionIds,
    status: 'active',
    startedAt: nowIso,
    expiresAt,
  };

  if (hasValidFirebaseConfig && db) {
    try {
      const sessionRef = doc(collection(db, 'arcade_sessions'));
      newSession.id = sessionRef.id;
      const sessionData = {
        userId: newSession.userId,
        username: newSession.username,
        gameType: newSession.gameType,
        questionIds: newSession.questionIds,
        status: newSession.status,
        startedAt: newSession.startedAt,
        expiresAt: newSession.expiresAt,
      };
      await runTransaction(db, async (t) => {
        t.set(sessionRef, sessionData);
      });
    } catch {
      // Local fallback
      const list = getLocalArcadeSessions();
      list.push(newSession);
      saveLocalArcadeSessions(list);
    }
  } else {
    const list = getLocalArcadeSessions();
    list.push(newSession);
    saveLocalArcadeSessions(list);
  }

  const sanitizedQuestions = selectedQuestions.map(sanitizeQuestion);

  return {
    sessionId: newSession.id,
    questions: sanitizedQuestions,
    expiresAt,
  };
}

/**
 * Submits answers for grading and credit disbursement.
 * Enforces:
 * - Anti-replay (only active sessions can be submitted)
 * - Expiration check (< 3 min)
 * - Anti-bot duration gate (> 10 seconds total)
 * - Authoritative grading from server question bank
 * - Daily credit cap clamping (max 10 Credits/day)
 * - Atomic credit and EXP update
 * - Ledger entry in credit_transactions
 * - Audit log entry with action arcade_reward_granted
 */
export async function submitArcadeSession(
  user: AuthUser,
  sessionId: string,
  answers: Record<string, number>,
  now: Date = new Date()
): Promise<ArcadeRewardResult> {
  const nowIso = now.toISOString();

  if (hasValidFirebaseConfig && db) {
    return await runTransaction(db, async (transaction) => {
      const sessionRef = doc(db, 'arcade_sessions', sessionId);
      const sessionSnap = await transaction.get(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Arcade session not found.');
      }

      const sessionData = sessionSnap.data() as ArcadeSession;

      // Anti-spoofing: Verify session ownership
      if (sessionData.userId !== user.uid) {
        throw new Error('Unauthorized: Session does not belong to the authenticated user.');
      }

      // Anti-replay: Must be currently active
      if (sessionData.status !== 'active') {
        throw new Error(`Session has already been ${sessionData.status}. Replay rejected.`);
      }

      // Expiration check
      const expiresAtMs = new Date(sessionData.expiresAt).getTime();
      if (now.getTime() > expiresAtMs) {
        transaction.update(sessionRef, { status: 'expired' });
        throw new Error('Session has expired. Attempts must be completed within 3 minutes.');
      }

      // Anti-bot minimum duration check
      const startedAtMs = new Date(sessionData.startedAt).getTime();
      if (now.getTime() - startedAtMs < MIN_SUBMIT_TIME_MS) {
        throw new Error('Submitted too quickly. Answers must take at least 10 seconds.');
      }

      // Authoritative grading
      const gradeResult = gradeQuiz(sessionData.questionIds, answers);

      // Compute today's prior earned credits for this user
      const q = query(
        collection(db, 'arcade_sessions'),
        where('userId', '==', user.uid)
      );
      const priorSnaps = await getDocs(q);
      const priorCompleted = priorSnaps.docs
        .map((d) => d.data() as ArcadeSession)
        .filter((s) => s.status === 'completed' && s.completedAt && isSameUtcDay(s.completedAt, now));

      const dailyCreditsEarned = priorCompleted.reduce(
        (acc, s) => acc + (s.creditsAwarded ?? 0),
        0
      );

      // Read config for dynamic rank thresholds
      const configRef = doc(db, 'config', 'settings');
      const configSnap = await transaction.get(configRef);
      const configData = configSnap.exists() ? configSnap.data() : DEFAULT_CONFIG;
      const rankThresholds = configData.rankThresholds ?? DEFAULT_CONFIG.rankThresholds;

      // Authoritative reward calculation
      const rewardCalc = calculateArcadeRewards(gradeResult.score, dailyCreditsEarned, DAILY_CREDIT_CAP);

      // Read target user document
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error(`User account "${user.username}" not found.`);
      }

      const userData = userSnap.data();
      const currentCredits = Number(userData.credits ?? 0);
      const currentExp = Number(userData.exp ?? 0);
      const currentTotalCredits = Number(userData.totalCreditsEarned ?? 0);

      const newTotalCredits = currentCredits + rewardCalc.creditsAwarded;
      const newTotalExp = currentExp + rewardCalc.expAwarded;
      const newLifetimeCredits = currentTotalCredits + rewardCalc.creditsAwarded;
      const rankResult = calculateRankProgress(newTotalExp, rankThresholds);

      // 1. Mark session completed
      transaction.update(sessionRef, {
        status: 'completed',
        completedAt: nowIso,
        answers,
        score: gradeResult.score,
        creditsAwarded: rewardCalc.creditsAwarded,
        expAwarded: rewardCalc.expAwarded,
        tier: rewardCalc.tier,
      });

      // 2. Update user balances and rank
      transaction.update(userRef, {
        credits: newTotalCredits,
        exp: newTotalExp,
        totalCreditsEarned: newLifetimeCredits,
        rank: rankResult.currentRank,
      });

      // 2b. Maintain public_leaderboard projection
      const lbRef = doc(db, 'public_leaderboard', user.uid);
      transaction.set(lbRef, {
        username: userData.username,
        rank: rankResult.currentRank,
        exp: newTotalExp,
        updatedAt: nowIso,
      }, { merge: true });

      // 3. Create credit_transactions audit record
      if (rewardCalc.creditsAwarded > 0) {
        const txRef = doc(collection(db, 'credit_transactions'));
        transaction.set(txRef, {
          userId: user.uid,
          credits: rewardCalc.creditsAwarded,
          source: 'arcade',
          details: `Quick Quiz reward: ${gradeResult.score}/${gradeResult.total} (${rewardCalc.tier})`,
          createdAt: nowIso,
        });
      }

      // 4. Create system log record
      const logRef = doc(collection(db, 'logs'));
      transaction.set(logRef, {
        action: 'arcade_reward_granted',
        userId: user.uid,
        amount: rewardCalc.creditsAwarded,
        details: `Quick Quiz completed by ${user.username}: ${gradeResult.score}/${gradeResult.total} correct (+${rewardCalc.creditsAwarded} CR, +${rewardCalc.expAwarded} EXP) [${rewardCalc.tier}]`,
        createdAt: nowIso,
      });

      return {
        score: gradeResult.score,
        totalQuestions: gradeResult.total,
        creditsAwarded: rewardCalc.creditsAwarded,
        expAwarded: rewardCalc.expAwarded,
        tier: rewardCalc.tier,
        rawCredits: rewardCalc.rawCredits,
        isClamped: rewardCalc.isClamped,
        newTotalCredits,
        newTotalExp,
        newRank: rankResult.currentRank,
        review: gradeResult.results,
      };
    });
  } else {
    // Offline / Local storage fallback
    const sessions = getLocalArcadeSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      throw new Error('Arcade session not found.');
    }

    const sess = sessions[idx];
    if (sess.userId !== user.uid) {
      throw new Error('Unauthorized: Session does not belong to the authenticated user.');
    }

    if (sess.status !== 'active') {
      throw new Error(`Session has already been ${sess.status}. Replay rejected.`);
    }

    const expiresAtMs = new Date(sess.expiresAt).getTime();
    if (now.getTime() > expiresAtMs) {
      sess.status = 'expired';
      saveLocalArcadeSessions(sessions);
      throw new Error('Session has expired. Attempts must be completed within 3 minutes.');
    }

    const startedAtMs = new Date(sess.startedAt).getTime();
    if (now.getTime() - startedAtMs < MIN_SUBMIT_TIME_MS) {
      throw new Error('Submitted too quickly. Answers must take at least 10 seconds.');
    }

    const gradeResult = gradeQuiz(sess.questionIds, answers);

    const todayPrior = sessions.filter(
      (s) => s.userId === user.uid && s.status === 'completed' && s.completedAt && isSameUtcDay(s.completedAt, now)
    );
    const dailyCreditsEarned = todayPrior.reduce((acc, s) => acc + (s.creditsAwarded ?? 0), 0);

    const rewardCalc = calculateArcadeRewards(gradeResult.score, dailyCreditsEarned, DAILY_CREDIT_CAP);

    const currentCredits = Number(user.credits ?? 0);
    const currentExp = Number(user.exp ?? 0);
    const newTotalCredits = currentCredits + rewardCalc.creditsAwarded;
    const newTotalExp = currentExp + rewardCalc.expAwarded;
    const rankResult = calculateRankProgress(newTotalExp, DEFAULT_CONFIG.rankThresholds);

    sess.status = 'completed';
    sess.completedAt = nowIso;
    sess.answers = answers;
    sess.score = gradeResult.score;
    sess.creditsAwarded = rewardCalc.creditsAwarded;
    sess.expAwarded = rewardCalc.expAwarded;
    sess.tier = rewardCalc.tier;

    saveLocalArcadeSessions(sessions);

    return {
      score: gradeResult.score,
      totalQuestions: gradeResult.total,
      creditsAwarded: rewardCalc.creditsAwarded,
      expAwarded: rewardCalc.expAwarded,
      tier: rewardCalc.tier,
      rawCredits: rewardCalc.rawCredits,
      isClamped: rewardCalc.isClamped,
      newTotalCredits,
      newTotalExp,
      newRank: rankResult.currentRank,
      review: gradeResult.results,
    };
  }
}
