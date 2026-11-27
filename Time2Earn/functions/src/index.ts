import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface GameResultPayload {
  gameId: string;
  sessionId: string;
  mode: string;
  score: number;
  durationMs: number;
  difficulty: string;
  performance: Record<string, number>;
  clientVersion: string;
  startedAt: string;
  endedAt: string;
}

export interface SubmitArcadeRequest {
  userId: string;
  result: GameResultPayload;
}

export const SHARED_DAILY_TOKEN_CAP = 50;

export const ARCADE_GAME_CAPS: Record<string, number> = {
  'time2rush': 15,
  'endless-run': 8,
  'zombie-run': 10,
  'reaction-rush': 8,
  'color-clash': 8,
  'target-hunter': 10,
  'keyboard-ninja': 10,
  'ball-bounce': 6,
};

// Rate limiting in-memory bucket (max 6 submissions / min per user)
const userSubmissionTimestamps: Map<string, number[]> = new Map();

function assertCallableRateLimit(userId: string): void {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxCalls = 6;

  const timestamps = (userSubmissionTimestamps.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxCalls) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Rate limit exceeded: max 6 arcade submissions per minute.'
    );
  }
  timestamps.push(now);
  userSubmissionTimestamps.set(userId, timestamps);
}

/**
 * Pure reward calculation duplicated authoritatively on server
 */
function evaluateServerReward(
  result: GameResultPayload,
  tokensEarnedTodayAll: number,
  tokensEarnedTodayGame: number
) {
  const gameCap = ARCADE_GAME_CAPS[result.gameId] || 8;
  let rawTokens: number;
  let exp: number;
  let tierLabel = 'Player';

  switch (result.gameId) {
    case 'time2rush': {
      const completed = Boolean(result.performance.completed);
      if (!completed) {
        rawTokens = 0;
        exp = 2;
        tierLabel = 'DNF';
      } else {
        const finishTimeMs = result.performance.finishTimeMs ?? result.durationMs;
        const trackLengthM = result.performance.trackLengthM ?? 1000;
        const minPossibleMs = (trackLengthM / 26.0) * 1000;
        if (finishTimeMs < minPossibleMs - 50) {
          throw new functions.https.HttpsError('invalid-argument', 'Implausible finish time');
        }
        let tokens = 3;
        const trackRecordMs = result.performance.trackRecordMs;
        if (typeof trackRecordMs === 'number' && trackRecordMs > 0 && finishTimeMs < trackRecordMs) {
          tokens += 2;
        }
        const pickupsScore = result.performance.pickupsScore ?? result.score;
        if (pickupsScore >= 1200) tokens += 5;
        else if (pickupsScore >= 800) tokens += 4;
        else if (pickupsScore >= 500) tokens += 3;
        else if (pickupsScore >= 250) tokens += 2;
        else if (pickupsScore >= 100) tokens += 1;

        rawTokens = Math.min(15, tokens);
        exp = 10 + rawTokens * 3;
        tierLabel = rawTokens >= 10 ? 'Track Legend' : rawTokens >= 8 ? 'Hyper Driver' : 'Neon Speeder';
      }
      break;
    }

    case 'endless-run': {
      const distanceM = result.performance.distanceM ?? result.score;
      const durationSec = Math.max(0.5, result.durationMs / 1000);
      const maxAllowedDist = 26.0 * durationSec * 1.05;
      if (distanceM > maxAllowedDist + 10) {
        throw new functions.https.HttpsError('invalid-argument', 'Implausible distance');
      }
      if (distanceM >= 6000) { rawTokens = 6; tierLabel = 'Immortal Cyber Runner'; }
      else if (distanceM >= 4000) { rawTokens = 5; tierLabel = 'Neon Marathoner'; }
      else if (distanceM >= 2500) { rawTokens = 4; tierLabel = 'Endurance Master'; }
      else if (distanceM >= 1500) { rawTokens = 3; tierLabel = 'Highway Strider'; }
      else if (distanceM >= 800) { rawTokens = 2; tierLabel = 'Grid Survivor'; }
      else if (distanceM >= 300) { rawTokens = 1; tierLabel = 'Street Dasher'; }
      else { rawTokens = 0; tierLabel = 'Rookie Runner'; }
      exp = 2 + rawTokens * 2;
      break;
    }

    case 'zombie-run': {
      const durationSec = Math.max(0.5, result.durationMs / 1000);
      const distanceM = result.performance.distanceM ?? 0;
      if (distanceM > 26.0 * durationSec * 1.05 + 10) {
        throw new functions.https.HttpsError('invalid-argument', 'Implausible distance');
      }
      const sec = result.performance.survivedSec ?? Math.floor(durationSec);
      let timeTokens = 0;
      if (sec >= 120) { timeTokens = 4; tierLabel = 'Immortal Outrunner'; }
      else if (sec >= 90) { timeTokens = 3; tierLabel = 'Horde Evader'; }
      else if (sec >= 60) { timeTokens = 2; tierLabel = 'Sprint Survivor'; }
      else if (sec >= 30) { timeTokens = 1; tierLabel = 'Close Escape'; }
      else { tierLabel = 'Fallen Survivor'; }

      const cratesOpened = result.performance.cratesOpened ?? 0;
      const crateBonus = Math.min(2, Math.max(0, cratesOpened));
      rawTokens = timeTokens > 0 ? timeTokens + crateBonus : 0;
      rawTokens = Math.min(10, rawTokens);
      exp = 2 + rawTokens * 3;
      break;
    }

    case 'reaction-rush': {
      const avgMs = result.performance.avgMs ?? 300;
      if (avgMs < 90) throw new functions.https.HttpsError('invalid-argument', 'Bot limit exceeded');
      if (avgMs < 150) { rawTokens = 5; tierLabel = 'Grade S+ (Lightning)'; }
      else if (avgMs <= 180) { rawTokens = 4; tierLabel = 'Grade S (Supersonic)'; }
      else if (avgMs <= 220) { rawTokens = 3; tierLabel = 'Grade A (Sharp)'; }
      else if (avgMs <= 270) { rawTokens = 2; tierLabel = 'Grade B (Fast)'; }
      else if (avgMs <= 350) { rawTokens = 1; tierLabel = 'Grade C (Steady)'; }
      else { rawTokens = 0; tierLabel = 'Grade D (Slow)'; }
      exp = 1 + rawTokens * 2;
      break;
    }

    case 'color-clash': {
      const acc = result.performance.accuracy ?? 0;
      const avgTimeMs = result.performance.avgTimeMs ?? 1500;
      if (avgTimeMs < 250) throw new functions.https.HttpsError('invalid-argument', 'Inhuman speed');
      if (acc >= 95 && avgTimeMs <= 1200) { rawTokens = 4; tierLabel = 'Chromatic Master'; }
      else if (acc >= 90 && avgTimeMs <= 1600) { rawTokens = 3; tierLabel = 'Color Wizard'; }
      else if (acc >= 80) { rawTokens = 2; tierLabel = 'Sharp Focus'; }
      else if (acc >= 65) { rawTokens = 1; tierLabel = 'Steady Eye'; }
      else { rawTokens = 0; tierLabel = 'Color Confused'; }
      exp = 2 + rawTokens * 2;
      break;
    }

    case 'target-hunter': {
      const hits = result.performance.hits ?? 0;
      const acc = result.performance.accuracy ?? 0;
      const durationSec = Math.max(1, result.durationMs / 1000);
      if (hits / durationSec > 6 && acc === 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Auto-clicker detected');
      }
      if (acc >= 92 && result.score >= 120) { rawTokens = 5; tierLabel = 'Dead-Eye Legend'; }
      else if (acc >= 85 && result.score >= 80) { rawTokens = 3; tierLabel = 'Sharpshooter'; }
      else if (acc >= 70 && result.score >= 40) { rawTokens = 2; tierLabel = 'Marksman'; }
      else if (acc >= 50) { rawTokens = 1; tierLabel = 'Recruit'; }
      else { rawTokens = 0; tierLabel = 'Miss-Heavy'; }
      exp = 2 + rawTokens * 2;
      break;
    }

    case 'keyboard-ninja': {
      const kps = result.performance.keysPerSec ?? 0;
      const acc = result.performance.accuracy ?? 0;
      if (kps > 14) throw new functions.https.HttpsError('invalid-argument', 'Suspicious typing speed');
      if (acc >= 97 && kps >= 4) { rawTokens = 6; tierLabel = 'Grandmaster Ninja'; }
      else if (acc >= 93 && kps >= 3) { rawTokens = 4; tierLabel = 'Master Ninja'; }
      else if (acc >= 85 && kps >= 2) { rawTokens = 2; tierLabel = 'Adept Ninja'; }
      else if (acc >= 70) { rawTokens = 1; tierLabel = 'Apprentice Ninja'; }
      else { rawTokens = 0; tierLabel = 'Novice'; }
      exp = 2 + rawTokens * 2;
      break;
    }

    case 'ball-bounce': {
      const durationSec = Math.max(1, result.durationMs / 1000);
      if (result.score / durationSec > 80) throw new functions.https.HttpsError('invalid-argument', 'Implausible score velocity');
      let scoreTokens = 0;
      if (result.score >= 600) { scoreTokens = 3; tierLabel = 'Bounce Champion'; }
      else if (result.score >= 300) { scoreTokens = 2; tierLabel = 'Hoop Star'; }
      else if (result.score >= 100) { scoreTokens = 1; tierLabel = 'Gravity Hopper'; }
      const tokenPickups = Math.min(3, Math.max(0, result.performance.tokenPickups ?? 0));
      rawTokens = scoreTokens > 0 || tokenPickups > 0 ? scoreTokens + tokenPickups : 0;
      rawTokens = Math.min(6, rawTokens);
      exp = 1 + rawTokens * 2;
      break;
    }

    default:
      rawTokens = 1;
      exp = 5;
      tierLabel = 'Player';
  }

  // Clamping against caps
  const remainingGame = Math.max(0, gameCap - tokensEarnedTodayGame);
  const remainingDaily = Math.max(0, SHARED_DAILY_TOKEN_CAP - tokensEarnedTodayAll);

  let tokensAwarded = rawTokens;
  let clamped: 'none' | 'game-cap' | 'daily-cap' = 'none';

  if (tokensAwarded > remainingGame) {
    tokensAwarded = remainingGame;
    clamped = 'game-cap';
  }
  if (tokensAwarded > remainingDaily) {
    tokensAwarded = remainingDaily;
    clamped = 'daily-cap';
  }

  return {
    tokensAwarded,
    expAwarded: exp,
    rawTokens,
    clamped,
    tierLabel,
    arcadeScore: result.score,
  };
}

/**
 * Calculates rank from EXP
 */
function getRankForExp(exp: number): string {
  if (exp >= 25000) return 'ADMIN';
  if (exp >= 10000) return 'OG Player';
  if (exp >= 5000) return 'VIP';
  if (exp >= 3500) return 'MVP+';
  if (exp >= 2000) return 'MVP';
  if (exp >= 1000) return 'Gamer';
  if (exp >= 500) return 'Grinder';
  return 'Newbie';
}

/**
 * Firebase callable function: submitArcadeResult
 */
export const submitArcadeResult = functions.https.onCall(
  async (data: SubmitArcadeRequest, context) => {
    // 1. Caller verification (Option A: check context.auth if present, else verify userId)
    const userId = context.auth ? context.auth.uid : data.userId;
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to submit arcade results.'
      );
    }
    if (context.auth && data.userId && context.auth.uid !== data.userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Cannot submit results for another user.'
      );
    }

    const { result } = data;
    if (!result || !result.sessionId || !result.gameId) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid arcade result payload.');
    }

    // 2. Enforce rate limiting
    assertCallableRateLimit(userId);

    // 3. Single-use session check: Prevent replay attacks
    const sessionQuery = await db
      .collection('arcade_sessions')
      .where('sessionId', '==', result.sessionId)
      .limit(1)
      .get();

    if (!sessionQuery.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'This arcade session has already been claimed.'
      );
    }

    // 4. Calculate today's existing earnings in UTC
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    const todaySessionsSnap = await db
      .collection('arcade_sessions')
      .where('userId', '==', userId)
      .where('completedAt', '>=', startIso)
      .get();

    let tokensEarnedTodayAll = 0;
    let tokensEarnedTodayGame = 0;

    todaySessionsSnap.forEach((docSnap) => {
      const s = docSnap.data();
      const t = Number(s.tokensAwarded || 0);
      tokensEarnedTodayAll += t;
      if (s.gameId === result.gameId) {
        tokensEarnedTodayGame += t;
      }
    });

    // 5. Authoritative Reward Calculation
    const reward = evaluateServerReward(result, tokensEarnedTodayAll, tokensEarnedTodayGame);

    // 6. Firestore atomic transaction updating users, credit_transactions, arcade_sessions, and logs
    const userRef = db.collection('users').doc(userId);

    const outcome = await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User record does not exist.');
      }

      const userData = userSnap.data() || {};
      const currentCredits = Number(userData.credits || 0);
      const currentExp = Number(userData.exp || 0);

      const newTotalCredits = currentCredits + reward.tokensAwarded;
      const newTotalExp = currentExp + reward.expAwarded;
      const newRank = getRankForExp(newTotalExp);
      const nowIso = new Date().toISOString();

      // Update user doc
      transaction.update(userRef, {
        credits: newTotalCredits,
        exp: newTotalExp,
        rank: newRank,
        totalCreditsEarned: admin.firestore.FieldValue.increment(reward.tokensAwarded),
      });

      // Insert arcade session
      const sessionRef = db.collection('arcade_sessions').doc();
      transaction.set(sessionRef, {
        userId,
        gameId: result.gameId,
        sessionId: result.sessionId,
        score: result.score,
        tokensAwarded: reward.tokensAwarded,
        expAwarded: reward.expAwarded,
        completedAt: nowIso,
        clientVersion: result.clientVersion || '1.0.0',
      });

      // Insert credit transaction if tokens awarded
      if (reward.tokensAwarded > 0) {
        const txRef = db.collection('credit_transactions').doc();
        transaction.set(txRef, {
          userId,
          amount: reward.tokensAwarded,
          type: 'arcade_payout',
          description: `Arcade payout: ${result.gameId} (${reward.tierLabel})`,
          createdAt: nowIso,
          balanceAfter: newTotalCredits,
        });
      }

      // Insert audit log
      const logRef = db.collection('logs').doc();
      transaction.set(logRef, {
        userId,
        action: 'arcade_result_submitted',
        details: `Played ${result.gameId}: score ${result.score}, tokens +${reward.tokensAwarded}, exp +${reward.expAwarded}`,
        timestamp: nowIso,
        metadata: {
          gameId: result.gameId,
          score: result.score,
          tokensAwarded: reward.tokensAwarded,
          expAwarded: reward.expAwarded,
        },
      });

      return {
        ...reward,
        newTotalCredits,
        newTotalExp,
        newRank,
      };
    });

    return outcome;
  }
);
