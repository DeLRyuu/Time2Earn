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
import type { DebtRecord, DebtPaymentRequest, DebtHistoryRecord } from '../types/debt';
import type { AuthUser } from '../types/auth';
import {
  DEBT_CREDIT_RATE,
  calculateDebtTier,
  calculateDebtPaymentPhp,
  calculateRemainingDebt,
} from '../lib/debts';

const LOCAL_DEBTS_KEY = 't2e_local_debts';
const LOCAL_DEBT_REQUESTS_KEY = 't2e_local_debt_requests';
const LOCAL_DEBT_HISTORY_KEY = 't2e_local_debt_history';

// Exact 3 debts from firestire_backup
export const BACKUP_DEBTS: DebtRecord[] = [
  {
    userId: 'SPP7CNsr1SeKZHodgAMjV209aPA3',
    username: 'KACO123',
    amount: 5,
    tier: 'none',
    daysOverdue: 0,
    isRestricted: false,
    updatedAt: '2026-08-01 12:18:45.244224+00:00',
  },
  {
    userId: 'YPggiam7YeRSXqEzsu9Te5fcejo2',
    username: 'NINI123',
    amount: 15,
    tier: 'low',
    daysOverdue: 0,
    isRestricted: false,
    updatedAt: '2026-06-22 11:49:34.780329+00:00',
  },
  {
    userId: 'kBir0H3RdFMWzkqTJY77Lbe08Ul2',
    username: 'PLAY_CRED',
    amount: 15,
    tier: 'low',
    daysOverdue: 0,
    isRestricted: false,
    updatedAt: '2026-08-16 12:39:16.090229+00:00',
  },
];

// Exact 1 payment request from firestire_backup
export const BACKUP_DEBT_PAYMENT_REQUESTS: DebtPaymentRequest[] = [
  {
    id: 'vYDmlZaxUAayHNOthrBH',
    userId: 'YPggiam7YeRSXqEzsu9Te5fcejo2',
    username: 'NINI123',
    currentDebt: 15,
    creditsToUse: 38,
    rateUsed: 0.4,
    phpEquivalent: 15.2,
    note: 'Player requested credit payment for debt',
    requestedAt: '2026-08-16 11:56:45.411908+00:00',
    status: 'pending',
    resolvedAt: null,
  },
];

// Exact 4 debt history entries from firestire_backup
export const BACKUP_DEBT_HISTORY: DebtHistoryRecord[] = [
  {
    id: 'SYVMGAJWSbaUgDyOF47h',
    userId: 'kBir0H3RdFMWzkqTJY77Lbe08Ul2',
    username: 'PLAY_CRED',
    adminId: 'DdebNzS77bMzHSvbam1yOKI7aBm2',
    amount: 15,
    action: 'add',
    note: 'Admin added ₱15 debt',
    createdAt: '2026-08-16 12:39:16.164708+00:00',
  },
  {
    id: 'W37A4ApWKQwBBn0sFKYk',
    userId: 'SPP7CNsr1SeKZHodgAMjV209aPA3',
    username: 'KACO123',
    adminId: 'DdebNzS77bMzHSvbam1yOKI7aBm2',
    amount: 5,
    action: 'add',
    note: 'Admin added ₱5 debt',
    createdAt: '2026-08-01 12:18:45.319565+00:00',
  },
  {
    id: 'gccWZi4rj0eo75ZczFho',
    userId: 'YPggiam7YeRSXqEzsu9Te5fcejo2',
    username: 'NINI123',
    adminId: 'DdebNzS77bMzHSvbam1yOKI7aBm2',
    amount: 10,
    action: 'add',
    note: 'Admin added ₱10 debt',
    createdAt: '2026-06-01 04:25:59.362897+00:00',
  },
  {
    id: 'tuRgFhleA4QQ9rskNplX',
    userId: 'YPggiam7YeRSXqEzsu9Te5fcejo2',
    username: 'NINI123',
    adminId: 'DdebNzS77bMzHSvbam1yOKI7aBm2',
    amount: 5,
    action: 'add',
    note: 'Admin added ₱5 debt',
    createdAt: '2026-06-22 11:49:34.842465+00:00',
  },
];

function getLocalDebts(): DebtRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEBTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_DEBTS_KEY, JSON.stringify(BACKUP_DEBTS));
      return BACKUP_DEBTS;
    }
    return JSON.parse(raw);
  } catch {
    return BACKUP_DEBTS;
  }
}

function saveLocalDebts(debts: DebtRecord[]) {
  localStorage.setItem(LOCAL_DEBTS_KEY, JSON.stringify(debts));
}

function getLocalDebtRequests(): DebtPaymentRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEBT_REQUESTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_DEBT_REQUESTS_KEY, JSON.stringify(BACKUP_DEBT_PAYMENT_REQUESTS));
      return BACKUP_DEBT_PAYMENT_REQUESTS;
    }
    return JSON.parse(raw);
  } catch {
    return BACKUP_DEBT_PAYMENT_REQUESTS;
  }
}

function saveLocalDebtRequests(requests: DebtPaymentRequest[]) {
  localStorage.setItem(LOCAL_DEBT_REQUESTS_KEY, JSON.stringify(requests));
}

function getLocalDebtHistory(): DebtHistoryRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEBT_HISTORY_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_DEBT_HISTORY_KEY, JSON.stringify(BACKUP_DEBT_HISTORY));
      return BACKUP_DEBT_HISTORY;
    }
    return JSON.parse(raw);
  } catch {
    return BACKUP_DEBT_HISTORY;
  }
}

function saveLocalDebtHistory(history: DebtHistoryRecord[]) {
  localStorage.setItem(LOCAL_DEBT_HISTORY_KEY, JSON.stringify(history));
}

/**
 * 1. PLAYER: Fetch player's current debt record
 */
export async function fetchPlayerDebt(userId: string): Promise<DebtRecord | null> {
  if (hasValidFirebaseConfig) {
    const snap = await getDoc(doc(db, 'debts', userId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        userId: snap.id,
        username: String(data.username || ''),
        amount: Number(data.amount ?? 0),
        tier: data.tier,
        daysOverdue: Number(data.daysOverdue ?? 0),
        isRestricted: Boolean(data.isRestricted),
        updatedAt: String(data.updatedAt || ''),
      };
    }
    return null;
  }
  const local = getLocalDebts();
  return local.find((d) => d.userId === userId) || null;
}

/**
 * 1b. PLAYER: Fetch player's debt history
 */
export async function fetchPlayerDebtHistory(userId: string): Promise<DebtHistoryRecord[]> {
  if (hasValidFirebaseConfig) {
    const q = query(
      collection(db, 'debt_history'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as DebtHistoryRecord));
  }
  return getLocalDebtHistory().filter((h) => h.userId === userId);
}

/**
 * 1c. PLAYER: Fetch player's debt payment requests
 */
export async function fetchPlayerDebtRequests(userId: string): Promise<DebtPaymentRequest[]> {
  if (hasValidFirebaseConfig) {
    const q = query(
      collection(db, 'debt_payment_requests'),
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as DebtPaymentRequest));
  }
  return getLocalDebtRequests().filter((r) => r.userId === userId);
}

/**
 * 1d. PLAYER: Submit debt payment request
 */
export async function submitDebtPaymentRequest(params: {
  userId: string;
  username: string;
  currentDebt: number;
  creditsToUse: number;
  userCredits: number;
  note?: string;
}): Promise<DebtPaymentRequest> {
  const { userId, username, currentDebt, creditsToUse, userCredits, note = '' } = params;

  if (creditsToUse <= 0) {
    throw new Error('Please specify an amount of credits to use greater than 0.');
  }
  if (creditsToUse > userCredits) {
    throw new Error(`Insufficient credits. You only have ${userCredits} Credits available.`);
  }
  if (currentDebt <= 0) {
    throw new Error('You do not have any outstanding shop debt.');
  }

  const phpEquivalent = calculateDebtPaymentPhp(creditsToUse, DEBT_CREDIT_RATE);
  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const docRef = await addDoc(collection(db, 'debt_payment_requests'), {
      userId,
      username,
      currentDebt,
      creditsToUse,
      rateUsed: DEBT_CREDIT_RATE,
      phpEquivalent,
      note: note.trim() || 'Player requested credit payment for debt',
      requestedAt: nowIso,
      status: 'pending',
    });

    // Audit log
    await addDoc(collection(db, 'logs'), {
      action: 'debt_payment_requested',
      adminId: '',
      userId,
      amount: phpEquivalent,
      details: `${username} requested to pay ₱${phpEquivalent.toFixed(2)} using ${creditsToUse} credits`,
      createdAt: nowIso,
    });

    return {
      id: docRef.id,
      userId,
      username,
      currentDebt,
      creditsToUse,
      rateUsed: DEBT_CREDIT_RATE,
      phpEquivalent,
      note: note.trim() || 'Player requested credit payment for debt',
      requestedAt: nowIso,
      status: 'pending',
    };
  } else {
    const local = getLocalDebtRequests();
    const newReq: DebtPaymentRequest = {
      id: `local-debt-req-${Date.now()}`,
      userId,
      username,
      currentDebt,
      creditsToUse,
      rateUsed: DEBT_CREDIT_RATE,
      phpEquivalent,
      note: note.trim() || 'Player requested credit payment for debt',
      requestedAt: nowIso,
      status: 'pending',
    };
    local.unshift(newReq);
    saveLocalDebtRequests(local);
    return newReq;
  }
}

/**
 * 2. ADMIN: Fetch all outstanding debts
 */
export async function fetchAllDebtsAdmin(): Promise<DebtRecord[]> {
  if (hasValidFirebaseConfig) {
    const snap = await getDocs(collection(db, 'debts'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        userId: d.id,
        username: String(data.username || ''),
        amount: Number(data.amount ?? 0),
        tier: data.tier,
        daysOverdue: Number(data.daysOverdue ?? 0),
        isRestricted: Boolean(data.isRestricted),
        updatedAt: String(data.updatedAt || ''),
      };
    });
  }
  return getLocalDebts();
}

/**
 * 2b. ADMIN: Fetch pending debt payment requests
 */
export async function fetchPendingDebtPaymentsAdmin(): Promise<DebtPaymentRequest[]> {
  if (hasValidFirebaseConfig) {
    const q = query(
      collection(db, 'debt_payment_requests'),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as DebtPaymentRequest));
  }
  return getLocalDebtRequests().filter((r) => r.status === 'pending');
}

/**
 * 2c. ADMIN: Fetch all debt audit history
 */
export async function fetchDebtHistoryAdmin(): Promise<DebtHistoryRecord[]> {
  if (hasValidFirebaseConfig) {
    const q = query(collection(db, 'debt_history'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as DebtHistoryRecord));
  }
  return getLocalDebtHistory();
}

/**
 * 2d. ADMIN: Approve debt payment request (Server-side atomic transaction)
 * Contract: docs/T2E_SCHEMA.md Section 4.5
 */
export async function approveDebtPaymentRequest(
  requestId: string,
  adminUser: AuthUser
): Promise<{ phpEquivalent: number; remainingDebt: number; creditsDeducted: number }> {
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const reqRef = doc(db, 'debt_payment_requests', requestId);

    const result = await runTransaction(db, async (txn) => {
      const reqSnap = await txn.get(reqRef);
      if (!reqSnap.exists()) {
        throw new Error('Payment request document not found.');
      }
      const reqData = reqSnap.data();

      // Idempotency check
      if (reqData.status !== 'pending') {
        throw new Error(`Request has already been ${reqData.status}.`);
      }

      const targetUserId = String(reqData.userId);
      const creditsToUse = Number(reqData.creditsToUse);
      const userRef = doc(db, 'users', targetUserId);
      const debtRef = doc(db, 'debts', targetUserId);

      const [userSnap, debtSnap] = await Promise.all([
        txn.get(userRef),
        txn.get(debtRef),
      ]);

      if (!userSnap.exists()) {
        throw new Error('Target player account not found.');
      }
      const userData = userSnap.data();
      const currentCredits = Number(userData.credits ?? 0);

      if (currentCredits < creditsToUse) {
        throw new Error(`Player lacks sufficient credits (${currentCredits} available, ${creditsToUse} needed).`);
      }

      const currentDebtAmount = debtSnap.exists() ? Number(debtSnap.data().amount ?? 0) : 0;
      const { phpEquivalent, remainingDebt, newTier, isRestricted } = calculateRemainingDebt(
        currentDebtAmount,
        creditsToUse,
        Number(reqData.rateUsed || DEBT_CREDIT_RATE)
      );

      // 1. Deduct credits from user
      txn.update(userRef, {
        credits: currentCredits - creditsToUse,
        isRestricted,
      });

      // 2. Update debt record
      if (debtSnap.exists()) {
        txn.update(debtRef, {
          amount: remainingDebt,
          tier: newTier,
          isRestricted,
          updatedAt: nowIso,
        });
      } else {
        txn.set(debtRef, {
          userId: targetUserId,
          username: reqData.username,
          amount: remainingDebt,
          tier: newTier,
          daysOverdue: 0,
          isRestricted,
          updatedAt: nowIso,
        });
      }

      // 3. Mark payment request approved
      txn.update(reqRef, {
        status: 'approved',
        resolvedAt: nowIso,
      });

      // 4. Record debt history entry
      const histRef = doc(collection(db, 'debt_history'));
      txn.set(histRef, {
        userId: targetUserId,
        username: reqData.username,
        adminId: adminUser.uid,
        amount: phpEquivalent,
        action: 'payment',
        note: `Approved credit debt payment of ₱${phpEquivalent.toFixed(2)} using ${creditsToUse} credits`,
        createdAt: nowIso,
      });

      // 5. System audit log
      const logRef = doc(collection(db, 'logs'));
      txn.set(logRef, {
        action: 'debt_payment_approved',
        adminId: adminUser.uid,
        userId: targetUserId,
        amount: phpEquivalent,
        details: `Approved ₱${phpEquivalent.toFixed(2)} debt payment using ${creditsToUse} credits for ${reqData.username}`,
        createdAt: nowIso,
      });

      return { phpEquivalent, remainingDebt, creditsDeducted: creditsToUse };
    });

    return result;
  } else {
    // Offline / Mock Approval
    const requests = getLocalDebtRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Payment request not found.');
    if (req.status !== 'pending') throw new Error(`Request has already been ${req.status}.`);

    const debts = getLocalDebts();
    const debt = debts.find((d) => d.userId === req.userId);
    const currentDebtAmount = debt ? debt.amount : 0;

    const { phpEquivalent, remainingDebt, newTier, isRestricted } = calculateRemainingDebt(
      currentDebtAmount,
      req.creditsToUse,
      req.rateUsed
    );

    if (debt) {
      debt.amount = remainingDebt;
      debt.tier = newTier;
      debt.isRestricted = isRestricted;
      debt.updatedAt = nowIso;
      saveLocalDebts(debts);
    }

    req.status = 'approved';
    req.resolvedAt = nowIso;
    saveLocalDebtRequests(requests);

    const history = getLocalDebtHistory();
    history.unshift({
      id: `local-dh-${Date.now()}`,
      userId: req.userId,
      username: req.username,
      adminId: adminUser.uid,
      amount: phpEquivalent,
      action: 'payment',
      note: `Approved credit debt payment of ₱${phpEquivalent.toFixed(2)} using ${req.creditsToUse} credits`,
      createdAt: nowIso,
    });
    saveLocalDebtHistory(history);

    return { phpEquivalent, remainingDebt, creditsDeducted: req.creditsToUse };
  }
}

/**
 * 2e. ADMIN: Reject debt payment request
 */
export async function rejectDebtPaymentRequest(
  requestId: string,
  adminUser: AuthUser,
  reason = ''
): Promise<void> {
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const reqRef = doc(db, 'debt_payment_requests', requestId);
    await runTransaction(db, async (txn) => {
      const snap = await txn.get(reqRef);
      if (!snap.exists()) throw new Error('Payment request document not found.');
      const data = snap.data();
      if (data.status !== 'pending') throw new Error(`Request has already been ${data.status}.`);

      txn.update(reqRef, {
        status: 'rejected',
        resolvedAt: nowIso,
        rejectNote: reason.trim(),
      });

      const logRef = doc(collection(db, 'logs'));
      txn.set(logRef, {
        action: 'debt_payment_rejected',
        adminId: adminUser.uid,
        userId: data.userId,
        amount: 0,
        details: `Rejected debt payment for ${data.username}. Reason: ${reason.trim() || 'No reason specified'}`,
        createdAt: nowIso,
      });
    });
  } else {
    const requests = getLocalDebtRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found.');
    if (req.status !== 'pending') throw new Error(`Request has already been ${req.status}.`);

    req.status = 'rejected';
    req.resolvedAt = nowIso;
    req.rejectNote = reason.trim();
    saveLocalDebtRequests(requests);
  }
}

/**
 * 2f. ADMIN: Add debt to player account
 */
export async function addDebtAdmin(params: {
  adminUser: AuthUser;
  userId: string;
  username: string;
  amount: number;
  note: string;
}): Promise<void> {
  const { adminUser, userId, username, amount, note } = params;

  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }
  const phpAmount = Number(amount);
  if (isNaN(phpAmount) || phpAmount <= 0) {
    throw new Error('Debt amount must be a positive number greater than ₱0.00.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const debtRef = doc(db, 'debts', userId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (txn) => {
      const debtSnap = await txn.get(debtRef);
      const currentDebt = debtSnap.exists() ? Number(debtSnap.data().amount ?? 0) : 0;
      const newAmount = Number((currentDebt + phpAmount).toFixed(2));
      const { tier: newTier, isRestricted } = calculateDebtTier(newAmount);

      if (debtSnap.exists()) {
        txn.update(debtRef, {
          amount: newAmount,
          tier: newTier,
          isRestricted,
          updatedAt: nowIso,
        });
      } else {
        txn.set(debtRef, {
          userId,
          username,
          amount: newAmount,
          tier: newTier,
          daysOverdue: 0,
          isRestricted,
          updatedAt: nowIso,
        });
      }

      // Update restriction flag on user profile
      txn.update(userRef, { isRestricted });

      // Record debt history
      const histRef = doc(collection(db, 'debt_history'));
      txn.set(histRef, {
        userId,
        username,
        adminId: adminUser.uid,
        amount: phpAmount,
        action: 'add',
        note: note.trim() || `Admin added ₱${phpAmount.toFixed(2)} debt`,
        createdAt: nowIso,
      });

      // System audit log
      const logRef = doc(collection(db, 'logs'));
      txn.set(logRef, {
        action: 'debt_added',
        adminId: adminUser.uid,
        userId,
        amount: phpAmount,
        details: `₱${phpAmount.toFixed(2)} debt added to ${username}`,
        createdAt: nowIso,
      });
    });
  } else {
    const debts = getLocalDebts();
    let debt = debts.find((d) => d.userId === userId);
    const currentDebt = debt ? debt.amount : 0;
    const newAmount = Number((currentDebt + phpAmount).toFixed(2));
    const { tier: newTier, isRestricted } = calculateDebtTier(newAmount);

    if (debt) {
      debt.amount = newAmount;
      debt.tier = newTier;
      debt.isRestricted = isRestricted;
      debt.updatedAt = nowIso;
    } else {
      debt = {
        userId,
        username,
        amount: newAmount,
        tier: newTier,
        daysOverdue: 0,
        isRestricted,
        updatedAt: nowIso,
      };
      debts.push(debt);
    }
    saveLocalDebts(debts);

    const history = getLocalDebtHistory();
    history.unshift({
      id: `local-dh-${Date.now()}`,
      userId,
      username,
      adminId: adminUser.uid,
      amount: phpAmount,
      action: 'add',
      note: note.trim() || `Admin added ₱${phpAmount.toFixed(2)} debt`,
      createdAt: nowIso,
    });
    saveLocalDebtHistory(history);
  }
}

/**
 * 2g. ADMIN: Deduct debt from player account (e.g. cash payment at counter)
 */
export async function deductDebtAdmin(params: {
  adminUser: AuthUser;
  userId: string;
  username: string;
  amount: number;
  note: string;
}): Promise<void> {
  const { adminUser, userId, username, amount, note } = params;

  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }
  const phpAmount = Number(amount);
  if (isNaN(phpAmount) || phpAmount <= 0) {
    throw new Error('Deduction amount must be a positive number greater than ₱0.00.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const debtRef = doc(db, 'debts', userId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (txn) => {
      const debtSnap = await txn.get(debtRef);
      if (!debtSnap.exists()) throw new Error('Debt record does not exist for this player.');

      const currentDebt = Number(debtSnap.data().amount ?? 0);
      const newAmount = Math.max(0, Number((currentDebt - phpAmount).toFixed(2)));
      const { tier: newTier, isRestricted } = calculateDebtTier(newAmount);

      txn.update(debtRef, {
        amount: newAmount,
        tier: newTier,
        isRestricted,
        updatedAt: nowIso,
      });

      txn.update(userRef, { isRestricted });

      // Record debt history
      const histRef = doc(collection(db, 'debt_history'));
      txn.set(histRef, {
        userId,
        username,
        adminId: adminUser.uid,
        amount: phpAmount,
        action: 'deduct',
        note: note.trim() || `Admin deducted ₱${phpAmount.toFixed(2)} debt`,
        createdAt: nowIso,
      });

      // System audit log
      const logRef = doc(collection(db, 'logs'));
      txn.set(logRef, {
        action: 'debt_updated',
        adminId: adminUser.uid,
        userId,
        amount: phpAmount,
        details: `₱${phpAmount.toFixed(2)} debt deducted for ${username}`,
        createdAt: nowIso,
      });
    });
  } else {
    const debts = getLocalDebts();
    const debt = debts.find((d) => d.userId === userId);
    if (!debt) throw new Error('Debt record does not exist for this player.');

    const newAmount = Math.max(0, Number((debt.amount - phpAmount).toFixed(2)));
    const { tier: newTier, isRestricted } = calculateDebtTier(newAmount);

    debt.amount = newAmount;
    debt.tier = newTier;
    debt.isRestricted = isRestricted;
    debt.updatedAt = nowIso;
    saveLocalDebts(debts);

    const history = getLocalDebtHistory();
    history.unshift({
      id: `local-dh-${Date.now()}`,
      userId,
      username,
      adminId: adminUser.uid,
      amount: phpAmount,
      action: 'deduct',
      note: note.trim() || `Admin deducted ₱${phpAmount.toFixed(2)} debt`,
      createdAt: nowIso,
    });
    saveLocalDebtHistory(history);
  }
}
