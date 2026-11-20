import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  runTransaction,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import type { SessionRequest, SessionSubmissionParams } from '../types/session';
import type { AuthUser } from '../types/auth';
import { calculateCreditPreview, calculateAwardedCredits, calculateAwardedExp } from '../lib/credits';
import { calculateRankProgress } from '../lib/ranks';
import { DEFAULT_CONFIG } from '../types/config';

const LOCAL_SESSIONS_KEY = 't2e_local_sessions';

// Helper for local mock storage
function getLocalSessions(): SessionRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (!raw) {
      // Seed default demo sessions from backup
      const seeded: SessionRequest[] = [
        {
          id: 'demo-sess-1',
          userId: 'player_test_uid',
          username: 'lois_123xx',
          unitId: 'PC-01',
          amountPaid: 20.0,
          creditsEarned: 27.6,
          status: 'pending',
          requestedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          resolvedAt: null,
          rejectNote: '',
        },
        {
          id: 'demo-sess-2',
          userId: 'player_test_uid',
          username: 'lois_123xx',
          unitId: 'PC-02',
          amountPaid: 50.0,
          creditsEarned: 69.0,
          status: 'approved',
          requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
          rejectNote: '',
        },
      ];
      localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: SessionRequest[]) {
  localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * Submits a new player session request
 */
export async function submitSessionRequest(params: SessionSubmissionParams): Promise<SessionRequest> {
  const { userId, username, unitId, amountPaid, phpToCreditRate } = params;

  if (amountPaid <= 0) {
    throw new Error('Payment amount must be greater than 0.');
  }
  if (!unitId.trim()) {
    throw new Error('Please select or specify a PC Unit ID.');
  }

  const preview = calculateCreditPreview(amountPaid, phpToCreditRate);
  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    // 1. Create document in session_requests
    const docRef = await addDoc(collection(db, 'session_requests'), {
      userId,
      username,
      unitId: unitId.toUpperCase(),
      amountPaid: Number(amountPaid),
      creditsEarned: preview,
      status: 'pending',
      requestedAt: nowIso,
      resolvedAt: null,
      rejectNote: '',
    });

    // 2. Create audit log
    await addDoc(collection(db, 'logs'), {
      action: 'session_requested',
      userId,
      adminId: '',
      amount: 0.0,
      details: `${username} requested on ${unitId.toUpperCase()} | ₱${amountPaid} = ${preview} credits`,
      createdAt: nowIso,
    });

    return {
      id: docRef.id,
      userId,
      username,
      unitId: unitId.toUpperCase(),
      amountPaid: Number(amountPaid),
      creditsEarned: preview,
      status: 'pending',
      requestedAt: nowIso,
      resolvedAt: null,
      rejectNote: '',
    };
  } else {
    // Mock local store
    const local = getLocalSessions();
    const newReq: SessionRequest = {
      id: `local-req-${Date.now()}`,
      userId,
      username,
      unitId: unitId.toUpperCase(),
      amountPaid: Number(amountPaid),
      creditsEarned: preview,
      status: 'pending',
      requestedAt: nowIso,
      resolvedAt: null,
      rejectNote: '',
    };
    local.unshift(newReq);
    saveLocalSessions(local);
    return newReq;
  }
}

/**
 * Fetches player's own session request history
 */
export async function fetchPlayerSessions(userId: string): Promise<SessionRequest[]> {
  if (hasValidFirebaseConfig) {
    const q = query(
      collection(db, 'session_requests'),
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId),
        username: String(data.username),
        unitId: String(data.unitId),
        amountPaid: Number(data.amountPaid),
        creditsEarned: Number(data.creditsEarned),
        status: data.status,
        requestedAt: data.requestedAt,
        resolvedAt: data.resolvedAt || null,
        rejectNote: String(data.rejectNote || ''),
      };
    });
  } else {
    return getLocalSessions().filter((s) => s.userId === userId);
  }
}

/**
 * Fetches pending session requests for Admin queue
 */
export async function fetchPendingSessions(): Promise<SessionRequest[]> {
  if (hasValidFirebaseConfig) {
    const q = query(
      collection(db, 'session_requests'),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId),
        username: String(data.username),
        unitId: String(data.unitId),
        amountPaid: Number(data.amountPaid),
        creditsEarned: Number(data.creditsEarned),
        status: data.status,
        requestedAt: data.requestedAt,
        resolvedAt: data.resolvedAt || null,
        rejectNote: String(data.rejectNote || ''),
      };
    });
  } else {
    return getLocalSessions().filter((s) => s.status === 'pending');
  }
}

/**
 * Approves a session request via protected, idempotent transaction
 */
export async function approveSessionRequest(
  requestId: string,
  adminUser: AuthUser
): Promise<{ creditsAwarded: number; expAwarded: number }> {
  // Authorization check
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can approve session requests.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    return await runTransaction(db, async (transaction) => {
      const sessionRef = doc(db, 'session_requests', requestId);
      const sessionSnap = await transaction.get(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Session request document not found.');
      }

      const sessionData = sessionSnap.data();

      // Idempotency check: Abort if already resolved
      if (sessionData.status !== 'pending') {
        throw new Error(`Request has already been ${sessionData.status}.`);
      }

      // Guard: Player cannot approve own request
      if (sessionData.userId === adminUser.uid) {
        throw new Error('Action blocked: Staff members cannot approve their own session requests.');
      }

      // Read config for dynamic rate
      const configRef = doc(db, 'config', 'settings');
      const configSnap = await transaction.get(configRef);
      const configData = configSnap.exists() ? configSnap.data() : DEFAULT_CONFIG;
      const rate = Number(configData.phpToCreditRate ?? DEFAULT_CONFIG.phpToCreditRate);
      const rankThresholds = configData.rankThresholds ?? DEFAULT_CONFIG.rankThresholds;

      // Authoritative Calculations (Exact floor formula)
      const creditsAwarded = calculateAwardedCredits(Number(sessionData.amountPaid), rate);
      const expAwarded = calculateAwardedExp(creditsAwarded);

      // Read target user doc
      const userRef = doc(db, 'users', sessionData.userId);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error(`Target user "${sessionData.username}" not found.`);
      }

      const userData = userSnap.data();
      const currentCredits = Number(userData.credits ?? 0);
      const currentExp = Number(userData.exp ?? 0);
      const currentSessions = Number(userData.totalSessions ?? 0);
      const currentTotalCredits = Number(userData.totalCreditsEarned ?? 0);

      const updatedCredits = currentCredits + creditsAwarded;
      const updatedExp = currentExp + expAwarded;
      const updatedSessions = currentSessions + 1;
      const updatedTotalCredits = currentTotalCredits + creditsAwarded;

      // Compute rank update
      const rankResult = calculateRankProgress(updatedExp, rankThresholds);

      // 1. Update session request
      transaction.update(sessionRef, {
        status: 'approved',
        resolvedAt: nowIso,
        creditsEarned: creditsAwarded,
      });

      // 2. Update user balances and rank
      transaction.update(userRef, {
        credits: updatedCredits,
        exp: updatedExp,
        totalSessions: updatedSessions,
        totalCreditsEarned: updatedTotalCredits,
        rank: rankResult.currentRank,
      });

      // 3. Create credit_transactions audit record
      const txRef = doc(collection(db, 'credit_transactions'));
      transaction.set(txRef, {
        userId: sessionData.userId,
        adminId: adminUser.uid,
        credits: creditsAwarded,
        source: 'session',
        createdAt: nowIso,
      });

      // 4. Create system log record
      const logRef = doc(collection(db, 'logs'));
      transaction.set(logRef, {
        action: 'session_approved',
        userId: sessionData.userId,
        adminId: adminUser.uid,
        amount: Number(creditsAwarded),
        details: `Session approved (dashboard) — +${creditsAwarded} cr, +${expAwarded} EXP to ${sessionData.username}`,
        createdAt: nowIso,
      });

      return { creditsAwarded, expAwarded };
    });
  } else {
    // Offline local simulation
    const sessions = getLocalSessions();
    const idx = sessions.findIndex((s) => s.id === requestId);
    if (idx === -1) throw new Error('Session request not found.');

    const sess = sessions[idx];
    if (sess.status !== 'pending') {
      throw new Error(`Request has already been ${sess.status}.`);
    }

    const creditsAwarded = calculateAwardedCredits(sess.amountPaid, DEFAULT_CONFIG.phpToCreditRate);
    const expAwarded = calculateAwardedExp(creditsAwarded);

    sess.status = 'approved';
    sess.resolvedAt = nowIso;
    sess.creditsEarned = creditsAwarded;
    saveLocalSessions(sessions);

    return { creditsAwarded, expAwarded };
  }
}

/**
 * Rejects a session request with reason
 */
export async function rejectSessionRequest(
  requestId: string,
  adminUser: AuthUser,
  rejectNote: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can reject session requests.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const sessionRef = doc(db, 'session_requests', requestId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error('Session request not found.');
    }

    const sessionData = sessionSnap.data();
    if (sessionData.status !== 'pending') {
      throw new Error(`Request has already been ${sessionData.status}.`);
    }

    // 1. Update session request status
    await runTransaction(db, async (t) => {
      t.update(sessionRef, {
        status: 'rejected',
        resolvedAt: nowIso,
        rejectNote: rejectNote || 'Rejected by staff',
      });

      // 2. Add audit log
      const logRef = doc(collection(db, 'logs'));
      t.set(logRef, {
        action: 'session_rejected',
        userId: sessionData.userId,
        adminId: adminUser.uid,
        amount: 0.0,
        details: `Session rejected (dashboard) for ${sessionData.username}. Reason: ${rejectNote || 'None provided'}`,
        createdAt: nowIso,
      });
    });
  } else {
    const sessions = getLocalSessions();
    const idx = sessions.findIndex((s) => s.id === requestId);
    if (idx === -1) throw new Error('Session request not found.');
    if (sessions[idx].status !== 'pending') {
      throw new Error(`Request has already been ${sessions[idx].status}.`);
    }
    sessions[idx].status = 'rejected';
    sessions[idx].resolvedAt = nowIso;
    sessions[idx].rejectNote = rejectNote || 'Rejected by staff';
    saveLocalSessions(sessions);
  }
}
