import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  runTransaction,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import type { AuthUser } from '../types/auth';
import type { RewardItem } from '../types/rewards';
import type { SessionRequest } from '../types/session';
import type { RedemptionRequest } from '../types/redemption';
import { BACKUP_REWARDS } from './redemptionService';

export interface AdminOverviewStats {
  pendingSessionsCount: number;
  pendingRedemptionsCount: number;
  activePlayersCount: number;
  outstandingDebtsCount: number;
  alerts: string[];
  recentActivities: AdminActivitySummary[];
}

export interface AdminActivitySummary {
  id: string;
  type: 'session' | 'redemption' | 'credit_adjust';
  title: string;
  subtitle: string;
  timestamp: string;
  status?: string;
  badgeText: string;
  badgeVariant: 'primary' | 'success' | 'warning' | 'danger' | 'gold';
}

export interface PlayerOverviewRecord {
  id: string;
  username: string;
  role: 'user' | 'admin';
  rank: string;
  credits: number;
  exp: number;
  streak: number;
  totalSessions: number;
  totalRedemptions: number;
  isRestricted: boolean;
  isBanned: boolean;
  debtAmount: number;
  debtTier: string;
}

export interface PlayerDetailsRecord extends PlayerOverviewRecord {
  recentSessions: SessionRequest[];
  recentRedemptions: RedemptionRequest[];
}

export interface CreditAdjustmentParams {
  adminUser: AuthUser;
  targetUserId: string;
  targetUsername: string;
  amount: number;
  type: 'add' | 'deduct';
  reason: string;
}

const LOCAL_ADMIN_REWARDS_KEY = 't2e_local_admin_rewards';
const LOCAL_ADMIN_USERS_KEY = 't2e_local_admin_users';

// Fallback sample registered users from backup
const BACKUP_USERS: PlayerOverviewRecord[] = [
  { id: '1DrJrVqcwfULvzDyyLV5S8b8ST03', username: 'lois_123xx', role: 'user', rank: 'Gamer', credits: 332, exp: 1251, streak: 3, totalSessions: 21, totalRedemptions: 4, isRestricted: false, isBanned: false, debtAmount: 0, debtTier: 'none' },
  { id: '3KfpG3u9uXSNmuEfDI9bAndoqhb2', username: 'Daniel123', role: 'user', rank: 'Grinder', credits: 730, exp: 863, streak: 6, totalSessions: 27, totalRedemptions: 1, isRestricted: false, isBanned: false, debtAmount: 0, debtTier: 'none' },
  { id: 'lld3stbFQ7Y6Dsw6knpYGTuogEr2', username: 'sherwin', role: 'user', rank: 'Grinder', credits: 140, exp: 641, streak: 1, totalSessions: 12, totalRedemptions: 0, isRestricted: false, isBanned: false, debtAmount: 0, debtTier: 'none' },
  { id: 'YPggiam7YeRSXqEzsu9Te5fcejo2', username: 'NINI123', role: 'user', rank: 'Regular', credits: 45, exp: 320, streak: 2, totalSessions: 8, totalRedemptions: 0, isRestricted: false, isBanned: false, debtAmount: 15, debtTier: 'low' },
  { id: 'SPP7CNsr1SeKZHodgAMjV209aPA3', username: 'KACO123', role: 'user', rank: 'Visitor', credits: 110, exp: 190, streak: 1, totalSessions: 5, totalRedemptions: 0, isRestricted: false, isBanned: false, debtAmount: 5, debtTier: 'none' },
  { id: 'M6JcK40OKuYGxFVH5pJaXsKwjBE3', username: 'Phay', role: 'user', rank: 'Newbie', credits: 0, exp: 0, streak: 0, totalSessions: 0, totalRedemptions: 0, isRestricted: false, isBanned: false, debtAmount: 0, debtTier: 'none' },
];

function getLocalUsers(): PlayerOverviewRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_USERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(BACKUP_USERS));
      return BACKUP_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return BACKUP_USERS;
  }
}

function saveLocalUsers(users: PlayerOverviewRecord[]) {
  localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(users));
}

function getLocalRewards(): RewardItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_REWARDS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ADMIN_REWARDS_KEY, JSON.stringify(BACKUP_REWARDS));
      return BACKUP_REWARDS;
    }
    return JSON.parse(raw);
  } catch {
    return BACKUP_REWARDS;
  }
}

function saveLocalRewards(rewards: RewardItem[]) {
  localStorage.setItem(LOCAL_ADMIN_REWARDS_KEY, JSON.stringify(rewards));
}

/**
 * 1. OVERVIEW: Fetch dashboard metric counts, alerts, and recent activities
 */
export async function fetchAdminOverviewStats(): Promise<AdminOverviewStats> {
  let pendingSessionsCount = 0;
  let pendingRedemptionsCount = 0;
  let activePlayersCount = 0;
  let outstandingDebtsCount = 0;
  const alerts: string[] = [];
  const recentActivities: AdminActivitySummary[] = [];

  if (hasValidFirebaseConfig) {
    try {
      // Pending sessions
      const qSess = query(collection(db, 'session_requests'), where('status', '==', 'pending'));
      const snapSess = await getDocs(qSess);
      pendingSessionsCount = snapSess.size;

      // Pending redemptions
      const qRed = query(collection(db, 'redemption_requests'), where('status', '==', 'pending'));
      const snapRed = await getDocs(qRed);
      pendingRedemptionsCount = snapRed.size;

      // Active players
      const qUsers = query(collection(db, 'users'), where('role', '==', 'user'), limit(100));
      const snapUsers = await getDocs(qUsers);
      activePlayersCount = snapUsers.size;

      // Outstanding debts
      const qDebts = query(collection(db, 'debts'), where('amount', '>', 0));
      const snapDebts = await getDocs(qDebts);
      outstandingDebtsCount = snapDebts.size;

      // Recent sessions
      const qRecentSess = query(collection(db, 'session_requests'), orderBy('requestedAt', 'desc'), limit(5));
      const snapRecentSess = await getDocs(qRecentSess);
      snapRecentSess.docs.forEach((d) => {
        const data = d.data();
        recentActivities.push({
          id: `sess-${d.id}`,
          type: 'session',
          title: `Session: ${data.username || 'Player'} (${data.unitId || 'PC'})`,
          subtitle: `₱${Number(data.amountPaid || 0).toFixed(2)} • +${data.creditsEarned} CR`,
          timestamp: data.requestedAt,
          status: data.status,
          badgeText: data.status === 'approved' ? 'Approved' : data.status === 'pending' ? 'Pending' : 'Rejected',
          badgeVariant: data.status === 'approved' ? 'success' : data.status === 'pending' ? 'warning' : 'danger',
        });
      });

      // Recent redemptions
      const qRecentRed = query(collection(db, 'redemption_requests'), orderBy('requestedAt', 'desc'), limit(5));
      const snapRecentRed = await getDocs(qRecentRed);
      snapRecentRed.docs.forEach((d) => {
        const data = d.data();
        recentActivities.push({
          id: `red-${d.id}`,
          type: 'redemption',
          title: `Reward: ${data.username || 'Player'}`,
          subtitle: `${data.rewardName} • -${data.creditCost} CR`,
          timestamp: data.requestedAt,
          status: data.status,
          badgeText: data.status === 'approved' ? 'Redeemed' : data.status === 'pending' ? 'Pending' : 'Rejected',
          badgeVariant: data.status === 'approved' ? 'gold' : data.status === 'pending' ? 'warning' : 'danger',
        });
      });
    } catch (e) {
      console.warn('Could not query all overview collections:', e);
    }
  } else {
    // Offline / Mock Overview
    const localUsers = getLocalUsers();
    activePlayersCount = localUsers.length;
    outstandingDebtsCount = localUsers.filter((u) => u.debtAmount > 0).length;

    // Use local storage values
    try {
      const rawSessions = localStorage.getItem('t2e_local_sessions');
      if (rawSessions) {
        const parsed: SessionRequest[] = JSON.parse(rawSessions);
        pendingSessionsCount = parsed.filter((s) => s.status === 'pending').length;
        parsed.slice(0, 4).forEach((s) => {
          recentActivities.push({
            id: `sess-${s.id}`,
            type: 'session',
            title: `Session: ${s.username} (${s.unitId})`,
            subtitle: `₱${s.amountPaid.toFixed(2)} • +${s.creditsEarned} CR`,
            timestamp: s.requestedAt,
            status: s.status,
            badgeText: s.status === 'approved' ? 'Approved' : s.status === 'pending' ? 'Pending' : 'Rejected',
            badgeVariant: s.status === 'approved' ? 'success' : s.status === 'pending' ? 'warning' : 'danger',
          });
        });
      }

      const rawRedemptions = localStorage.getItem('t2e_local_redemptions');
      if (rawRedemptions) {
        const parsed: RedemptionRequest[] = JSON.parse(rawRedemptions);
        pendingRedemptionsCount = parsed.filter((r) => r.status === 'pending').length;
        parsed.slice(0, 4).forEach((r) => {
          recentActivities.push({
            id: `red-${r.id}`,
            type: 'redemption',
            title: `Reward: ${r.username}`,
            subtitle: `${r.rewardName} • -${r.creditCost} CR`,
            timestamp: r.requestedAt,
            status: r.status,
            badgeText: r.status === 'approved' ? 'Redeemed' : r.status === 'pending' ? 'Pending' : 'Rejected',
            badgeVariant: r.status === 'approved' ? 'gold' : r.status === 'pending' ? 'warning' : 'danger',
          });
        });
      }
    } catch {
      // fallback
    }
  }

  // Generate alerts
  if (pendingSessionsCount > 0) {
    alerts.push(`${pendingSessionsCount} session ${pendingSessionsCount === 1 ? 'request' : 'requests'} waiting for approval.`);
  }
  if (pendingRedemptionsCount > 0) {
    alerts.push(`${pendingRedemptionsCount} reward redemption ${pendingRedemptionsCount === 1 ? 'claim' : 'claims'} require staff fulfillment.`);
  }
  if (outstandingDebtsCount > 0) {
    alerts.push(`${outstandingDebtsCount} player ${outstandingDebtsCount === 1 ? 'account has' : 'accounts have'} unpaid debt balances.`);
  }

  // Sort activities by timestamp descending
  recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    pendingSessionsCount,
    pendingRedemptionsCount,
    activePlayersCount,
    outstandingDebtsCount,
    alerts,
    recentActivities: recentActivities.slice(0, 8),
  };
}

/**
 * 2. PLAYERS: Fetch registered player list
 */
export async function fetchAdminPlayers(): Promise<PlayerOverviewRecord[]> {
  if (hasValidFirebaseConfig) {
    const q = query(collection(db, 'users'), where('role', '==', 'user'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        username: String(data.username || ''),
        role: data.role === 'admin' ? 'admin' : 'user',
        rank: String(data.rank || 'Newbie'),
        credits: Number(data.credits ?? 0),
        exp: Number(data.exp ?? 0),
        streak: Number(data.streak ?? 0),
        totalSessions: Number(data.totalSessions ?? 0),
        totalRedemptions: Number(data.totalRedemptions ?? 0),
        isRestricted: Boolean(data.isRestricted),
        isBanned: Boolean(data.isBanned),
        debtAmount: 0, // Debts collection queried in detail view
        debtTier: 'none',
      };
    });
  }
  return getLocalUsers();
}

/**
 * 2b. PLAYERS: Fetch single player details with debt & activity history
 */
export async function fetchPlayerDetails(userId: string): Promise<PlayerDetailsRecord> {
  const users = await fetchAdminPlayers();
  const player = users.find((u) => u.id === userId) || {
    id: userId,
    username: 'Unknown Player',
    role: 'user' as const,
    rank: 'Newbie',
    credits: 0,
    exp: 0,
    streak: 0,
    totalSessions: 0,
    totalRedemptions: 0,
    isRestricted: false,
    isBanned: false,
    debtAmount: 0,
    debtTier: 'none',
  };

  let debtAmount = player.debtAmount;
  let debtTier = player.debtTier;
  let recentSessions: SessionRequest[] = [];
  let recentRedemptions: RedemptionRequest[] = [];

  if (hasValidFirebaseConfig) {
    try {
      // Check debts collection
      const debtSnap = await getDoc(doc(db, 'debts', userId));
      if (debtSnap.exists()) {
        const dData = debtSnap.data();
        debtAmount = Number(dData.amount ?? 0);
        debtTier = String(dData.tier || 'none');
      }

      // Recent sessions
      const qSess = query(
        collection(db, 'session_requests'),
        where('userId', '==', userId),
        orderBy('requestedAt', 'desc'),
        limit(10)
      );
      const snapSess = await getDocs(qSess);
      recentSessions = snapSess.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as SessionRequest));

      // Recent redemptions
      const qRed = query(
        collection(db, 'redemption_requests'),
        where('userId', '==', userId),
        orderBy('requestedAt', 'desc'),
        limit(10)
      );
      const snapRed = await getDocs(qRed);
      recentRedemptions = snapRed.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as RedemptionRequest));
    } catch (e) {
      console.warn('Could not fetch player details from Firestore:', e);
    }
  }

  return {
    ...player,
    debtAmount,
    debtTier,
    recentSessions,
    recentRedemptions,
  };
}

/**
 * 2c. PLAYERS: Server-authoritative manual credit adjustment
 * Contract: docs/T2E_RULES.md & T2E_SCHEMA.md
 * - Protected function (requires admin authorization)
 * - Required reason
 * - Writes credit_transactions entry
 * - Writes audit log
 */
export async function adjustPlayerCredits(params: CreditAdjustmentParams): Promise<{ newCredits: number }> {
  const { adminUser, targetUserId, targetUsername, amount, type, reason } = params;

  // 1. Authorization Guard
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }

  // 2. Validation
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('A valid adjustment reason is strictly required for administrative credit changes.');
  }

  const intAmount = Math.floor(Number(amount));
  if (isNaN(intAmount) || intAmount <= 0) {
    throw new Error('Adjustment amount must be a positive number greater than 0.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const userRef = doc(db, 'users', targetUserId);

    const result = await runTransaction(db, async (txn) => {
      const userSnap = await txn.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('Player document not found in Firestore.');
      }

      const userData = userSnap.data();
      const currentCredits = Number(userData.credits ?? 0);

      let newCredits: number;
      if (type === 'add') {
        newCredits = currentCredits + intAmount;
        txn.update(userRef, {
          credits: newCredits,
          totalCreditsEarned: (Number(userData.totalCreditsEarned) || 0) + intAmount,
        });
      } else {
        if (currentCredits < intAmount) {
          throw new Error(`Cannot deduct ${intAmount} Credits. Player balance is only ${currentCredits} Credits.`);
        }
        newCredits = currentCredits - intAmount;
        txn.update(userRef, {
          credits: newCredits,
        });
      }

      // Record credit_transactions entry
      const txRef = doc(collection(db, 'credit_transactions'));
      txn.set(txRef, {
        userId: targetUserId,
        adminId: adminUser.uid,
        amount: intAmount,
        type,
        reason: trimmedReason,
        source: 'manual_admin',
        createdAt: nowIso,
      });

      // Record system audit log
      const logRef = doc(collection(db, 'logs'));
      txn.set(logRef, {
        action: type === 'add' ? 'credits_added' : 'credits_deducted',
        adminId: adminUser.uid,
        userId: targetUserId,
        amount: intAmount,
        details: `Manual ${type}: ${trimmedReason} (by ${adminUser.username})`,
        createdAt: nowIso,
      });

      return { newCredits };
    });

    return result;
  } else {
    // Offline / Mock Transaction
    const localUsers = getLocalUsers();
    const userIdx = localUsers.findIndex((u) => u.id === targetUserId);
    if (userIdx === -1) {
      throw new Error(`Player ${targetUsername} not found in local records.`);
    }

    const currentCredits = localUsers[userIdx].credits;
    let newCredits: number;
    if (type === 'add') {
      newCredits = currentCredits + intAmount;
    } else {
      if (currentCredits < intAmount) {
        throw new Error(`Cannot deduct ${intAmount} Credits. Player balance is only ${currentCredits} Credits.`);
      }
      newCredits = currentCredits - intAmount;
    }

    localUsers[userIdx].credits = newCredits;
    saveLocalUsers(localUsers);

    return { newCredits };
  }
}

/**
 * 3. REWARDS: Fetch all rewards (active & inactive)
 */
export async function fetchAdminRewards(): Promise<RewardItem[]> {
  if (hasValidFirebaseConfig) {
    const q = query(collection(db, 'rewards'), orderBy('creditCost', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as RewardItem));
  }
  return getLocalRewards();
}

/**
 * 3b. REWARDS: Create new shop reward
 */
export async function createAdminReward(adminUser: AuthUser, reward: Omit<RewardItem, 'id'>): Promise<RewardItem> {
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }

  if (!reward.name.trim()) throw new Error('Reward name is required.');
  if (reward.creditCost <= 0) throw new Error('Credit cost must be greater than 0.');

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const docRef = await addDoc(collection(db, 'rewards'), {
      ...reward,
      totalRedemptions: 0,
      createdAt: nowIso,
    });

    // Write audit log
    await addDoc(collection(db, 'logs'), {
      action: 'reward_created',
      adminId: adminUser.uid,
      rewardId: docRef.id,
      details: `Created reward ${reward.name} (${reward.creditCost} CR, min: ${reward.minRank})`,
      createdAt: nowIso,
    });

    return {
      id: docRef.id,
      ...reward,
      totalRedemptions: 0,
    };
  } else {
    const rewards = getLocalRewards();
    const newReward: RewardItem = {
      id: `local-rew-${Date.now()}`,
      ...reward,
      totalRedemptions: 0,
    };
    rewards.push(newReward);
    saveLocalRewards(rewards);
    return newReward;
  }
}

/**
 * 3c. REWARDS: Update reward attributes
 */
export async function updateAdminReward(
  adminUser: AuthUser,
  rewardId: string,
  updates: Partial<RewardItem>
): Promise<void> {
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    await updateDoc(doc(db, 'rewards', rewardId), {
      ...updates,
      updatedAt: nowIso,
    });

    // Audit log
    await addDoc(collection(db, 'logs'), {
      action: 'reward_updated',
      adminId: adminUser.uid,
      rewardId,
      details: `Updated reward: ${JSON.stringify(updates)}`,
      createdAt: nowIso,
    });
  } else {
    const rewards = getLocalRewards();
    const idx = rewards.findIndex((r) => r.id === rewardId);
    if (idx !== -1) {
      rewards[idx] = { ...rewards[idx], ...updates };
      saveLocalRewards(rewards);
    }
  }
}

/**
 * 3d. REWARDS: Toggle active / inactive state
 */
export async function toggleAdminRewardActive(
  adminUser: AuthUser,
  rewardId: string,
  newIsActive: boolean
): Promise<void> {
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Access denied. Administrator privileges required.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    await updateDoc(doc(db, 'rewards', rewardId), {
      isActive: newIsActive,
      updatedAt: nowIso,
    });

    // Audit log
    await addDoc(collection(db, 'logs'), {
      action: 'reward_toggled',
      adminId: adminUser.uid,
      rewardId,
      details: `Toggled reward ${rewardId} to ${newIsActive ? 'ACTIVE' : 'INACTIVE'}`,
      createdAt: nowIso,
    });
  } else {
    const rewards = getLocalRewards();
    const idx = rewards.findIndex((r) => r.id === rewardId);
    if (idx !== -1) {
      rewards[idx].isActive = newIsActive;
      saveLocalRewards(rewards);
    }
  }
}
