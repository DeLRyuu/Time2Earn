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
import type { RewardItem } from '../types/rewards';
import type { RedemptionRequest, RewardCooldown } from '../types/redemption';
import type { AuthUser } from '../types/auth';
import type { AppConfig } from '../types/config';
import { evaluateRewardEligibility } from '../lib/rewards';
import { calculateRankProgress } from '../lib/ranks';
import { DEFAULT_CONFIG } from '../types/config';

const LOCAL_REDEMPTIONS_KEY = 't2e_local_redemptions';
const LOCAL_COOLDOWNS_KEY = 't2e_local_cooldowns';

// Verified default rewards from firestire_backup
export const BACKUP_REWARDS: RewardItem[] = [
  { id: '8BIQ5L5GgEMZtnHpfPxA', name: '25 Minute Session', category: 'PLAY-TIME', creditCost: 75, expReward: 15, cooldownMinutes: 50, minRank: 'Visitor', isActive: true, description: 'Dagdag na 25 minuto sa iyong laro' },
  { id: 'qZiMPvZ6PTfuuoitYBCl', name: '30 Minute Session', category: 'PLAY-TIME', creditCost: 90, expReward: 20, cooldownMinutes: 70, minRank: 'Regular', isActive: true, description: 'Dagdag na 30 minuto sa gaming console' },
  { id: 'BtjJqNpAK2QSy7Amspnu', name: '1 Hour Session', category: 'PLAY-TIME', creditCost: 180, expReward: 40, cooldownMinutes: 120, minRank: 'Grinder', isActive: true, description: 'Isa pang oras ng gaming, grind na!' },
  { id: 'K6iyY36wnBFkGWAYfLl3', name: 'Robux 80', category: 'GAME TOP-UP', creditCost: 840, expReward: 50, cooldownMinutes: 0, minRank: 'VIP', isActive: true, description: '80 Robux diretso sa iyong Roblox account' },
  { id: 'QgchrBMkRPhyTwag7NMc', name: 'Robux 400', category: 'GAME TOP-UP', creditCost: 4200, expReward: 200, cooldownMinutes: 0, minRank: 'VIP+', isActive: true, description: '400 Robux para sa iyong avatar upgrades' },
  { id: 'ls7BeZg6dYAfksZh8swO', name: 'Robux 800', category: 'GAME TOP-UP', creditCost: 8400, expReward: 400, cooldownMinutes: 0, minRank: 'MVP', isActive: true, description: '800 Robux top tier pack' },
  { id: '6dlPM8Cl2zDnQvOTqWf3', name: 'Robux 1700', category: 'GAME TOP-UP', creditCost: 17850, expReward: 800, cooldownMinutes: 0, minRank: 'MVP+', isActive: true, description: '1700 Robux para sa mga seryosong Roblox player' },
  // Inactive items (Respect isActive - never auto-activate)
  { id: 'JKhpap5KP8TFw1iTNCZV', name: '2 Hour Session', category: 'PLAY-TIME', creditCost: 360, expReward: 80, cooldownMinutes: 720, minRank: 'Gamer', isActive: false, description: '2 Hours continuous gaming' },
  { id: 'QPiJ9ME5zqPo0hrk4oa4', name: 'Sting Energy Drink', category: 'SNACK-PACK', creditCost: 375, expReward: 30, cooldownMinutes: 60, minRank: 'Grinder', isActive: false, description: 'Cold Sting energy boost' },
  { id: 'TCipAILUl8XSlGwoBTxN', name: '12 oz Soft Drink', category: 'SNACK-PACK', creditCost: 300, expReward: 20, cooldownMinutes: 30, minRank: 'Regular', isActive: false, description: 'Refreshing cold soda drink' },
  { id: 'pUZTZdpaBL4Spjed6Tju', name: 'Pancit Canton', category: 'SNACK-PACK', creditCost: 450, expReward: 40, cooldownMinutes: 30, minRank: 'Gamer', isActive: false, description: 'Hot pancit canton with calamansi' },
  { id: 'v0Q0iiCoTrkYVafGC42X', name: 'Junk Food', category: 'SNACK-PACK', creditCost: 150, expReward: 10, cooldownMinutes: 0, minRank: 'Visitor', isActive: false, description: 'Assorted chips & snacks' },
];

function getLocalRedemptions(): RedemptionRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_REDEMPTIONS_KEY);
    if (!raw) {
      // Seed default demo redemptions from backup for lois_123xx
      const seeded: RedemptionRequest[] = [
        {
          id: 'HpVkcqiDwBGcpCfSQjsd',
          userId: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
          username: 'lois_123xx',
          rewardId: 'qZiMPvZ6PTfuuoitYBCl',
          rewardName: '30 Minute Session',
          creditCost: 90,
          cooldownMinutes: 0,
          status: 'approved',
          requestedAt: '2026-06-19 06:51:36.302759+00:00',
          resolvedAt: '2026-06-19 22:36:24.143794+00:00',
          rejectNote: '',
        },
        {
          id: 'ZHFLwGlDY1zIQk2E9wAI',
          userId: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
          username: 'lois_123xx',
          rewardId: '8BIQ5L5GgEMZtnHpfPxA',
          rewardName: '25 Minute Session',
          creditCost: 75,
          cooldownMinutes: 0,
          status: 'approved',
          requestedAt: '2026-06-19 06:51:33.786957+00:00',
          resolvedAt: '2026-06-19 22:36:26.072476+00:00',
          rejectNote: '',
        },
        {
          id: 'w81xQtOQtpE74un3pZTe',
          userId: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
          username: 'lois_123xx',
          rewardId: 'TCipAILUl8XSlGwoBTxN',
          rewardName: '12 oz Soft Drink',
          creditCost: 300,
          cooldownMinutes: 30,
          status: 'approved',
          requestedAt: '2026-06-07 21:55:27.732072+00:00',
          resolvedAt: '2026-06-09 06:09:37.282666+00:00',
          rejectNote: '',
        },
        {
          id: 'Ryw2ojBYVNtCfWDGrZUS',
          userId: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
          username: 'lois_123xx',
          rewardId: '8BIQ5L5GgEMZtnHpfPxA',
          rewardName: '25 Minute Session',
          creditCost: 75,
          cooldownMinutes: 0,
          status: 'approved',
          requestedAt: '2026-06-07 21:55:18.530161+00:00',
          resolvedAt: '2026-06-09 12:07:44.704155+00:00',
          rejectNote: '',
        },
      ];
      localStorage.setItem(LOCAL_REDEMPTIONS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalRedemptions(items: RedemptionRequest[]) {
  localStorage.setItem(LOCAL_REDEMPTIONS_KEY, JSON.stringify(items));
}

function getLocalCooldowns(): RewardCooldown[] {
  try {
    const raw = localStorage.getItem(LOCAL_COOLDOWNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCooldowns(items: RewardCooldown[]) {
  localStorage.setItem(LOCAL_COOLDOWNS_KEY, JSON.stringify(items));
}

/**
 * Fetches all rewards (players only receive isActive: true)
 */
export async function fetchShopRewards(isAdminView = false): Promise<RewardItem[]> {
  if (hasValidFirebaseConfig) {
    const q = isAdminView
      ? collection(db, 'rewards')
      : query(collection(db, 'rewards'), where('isActive', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          description: String(data.description || ''),
          category: String(data.category || 'PLAY-TIME'),
          creditCost: Number(data.creditCost ?? 0),
          expReward: Number(data.expReward ?? 0),
          cooldownMinutes: Number(data.cooldownMinutes ?? 0),
          minRank: String(data.minRank || 'Newbie'),
          isActive: Boolean(data.isActive),
          totalRedemptions: data.totalRedemptions ? Number(data.totalRedemptions) : undefined,
        };
      });
    }
  }
  return isAdminView ? BACKUP_REWARDS : BACKUP_REWARDS.filter((r) => r.isActive);
}

/**
 * Fetches player's active cooldown locks
 */
export async function fetchPlayerCooldowns(userId: string): Promise<RewardCooldown[]> {
  if (hasValidFirebaseConfig) {
    const q = query(collection(db, 'reward_cooldowns'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId),
        rewardId: String(data.rewardId),
        cooldownMinutes: Number(data.cooldownMinutes ?? 0),
        claimedAt: String(data.claimedAt || ''),
        expiresAt: String(data.expiresAt || ''),
      };
    });
  }
  return getLocalCooldowns().filter((c) => c.userId === userId);
}

/**
 * Fetches player's personal redemption requests
 */
export async function fetchPlayerRedemptions(userId: string, maxLimit = 25): Promise<RedemptionRequest[]> {
  if (hasValidFirebaseConfig) {
    const q = query(
      collection(db, 'redemption_requests'),
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc'),
      limit(maxLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId),
        username: String(data.username),
        rewardId: String(data.rewardId),
        rewardName: String(data.rewardName),
        creditCost: Number(data.creditCost ?? 0),
        cooldownMinutes: Number(data.cooldownMinutes ?? 0),
        status: data.status,
        requestedAt: data.requestedAt,
        resolvedAt: data.resolvedAt || null,
        rejectNote: String(data.rejectNote || ''),
      };
    });
  }
  return getLocalRedemptions()
    .filter((r) => r.userId === userId || (userId === '1DrJrVqcwfULvzDyyLV5S8b8ST03' && r.userId === 'player_test_uid') || (userId === 'player_test_uid' && r.userId === '1DrJrVqcwfULvzDyyLV5S8b8ST03'))
    .slice(0, maxLimit);
}

/**
 * Fetches pending redemption requests for Admin queue
 */
export async function fetchPendingRedemptions(): Promise<RedemptionRequest[]> {
  if (hasValidFirebaseConfig) {
    const q = query(
      collection(db, 'redemption_requests'),
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
        rewardId: String(data.rewardId),
        rewardName: String(data.rewardName),
        creditCost: Number(data.creditCost ?? 0),
        cooldownMinutes: Number(data.cooldownMinutes ?? 0),
        status: data.status,
        requestedAt: data.requestedAt,
        resolvedAt: data.resolvedAt || null,
        rejectNote: String(data.rejectNote || ''),
      };
    });
  }
  return getLocalRedemptions().filter((r) => r.status === 'pending');
}

/**
 * Submits a redemption claim with authoritative eligibility check
 */
export async function submitRedemptionRequest(
  reward: RewardItem,
  user: AuthUser,
  config: AppConfig,
  activeCooldowns: RewardCooldown[],
  hasPending: boolean
): Promise<RedemptionRequest> {
  // Authoritative re-validation before request creation
  const eligibility = evaluateRewardEligibility(reward, user, config, activeCooldowns, hasPending);
  if (!eligibility.canRedeem) {
    throw new Error(eligibility.statusMessage || 'You are not eligible to claim this reward.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    // 1. Create redemption_request
    const docRef = await addDoc(collection(db, 'redemption_requests'), {
      userId: user.uid,
      username: user.username,
      rewardId: reward.id,
      rewardName: reward.name,
      creditCost: reward.creditCost,
      cooldownMinutes: reward.cooldownMinutes,
      status: 'pending',
      requestedAt: nowIso,
      resolvedAt: null,
      rejectNote: '',
    });

    // 2. Audit log
    await addDoc(collection(db, 'logs'), {
      action: 'reward_requested',
      userId: user.uid,
      adminId: '',
      amount: 0.0,
      details: `${user.username} requested reward: ${reward.name}`,
      createdAt: nowIso,
    });

    return {
      id: docRef.id,
      userId: user.uid,
      username: user.username,
      rewardId: reward.id,
      rewardName: reward.name,
      creditCost: reward.creditCost,
      cooldownMinutes: reward.cooldownMinutes,
      status: 'pending',
      requestedAt: nowIso,
      resolvedAt: null,
      rejectNote: '',
    };
  } else {
    const list = getLocalRedemptions();
    const newReq: RedemptionRequest = {
      id: `local-red-${Date.now()}`,
      userId: user.uid,
      username: user.username,
      rewardId: reward.id,
      rewardName: reward.name,
      creditCost: reward.creditCost,
      cooldownMinutes: reward.cooldownMinutes,
      status: 'pending',
      requestedAt: nowIso,
      resolvedAt: null,
      rejectNote: '',
    };
    list.unshift(newReq);
    saveLocalRedemptions(list);
    return newReq;
  }
}

/**
 * Approves a redemption request via server-authoritative, idempotent transaction
 */
export async function approveRedemptionRequest(
  requestId: string,
  adminUser: AuthUser
): Promise<{ creditsDeducted: number; expAwarded: number }> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can approve redemptions.');
  }

  const nowIso = new Date().toISOString();
  const todayDate = nowIso.split('T')[0];

  if (hasValidFirebaseConfig) {
    return await runTransaction(db, async (t) => {
      const redempRef = doc(db, 'redemption_requests', requestId);
      const redempSnap = await t.get(redempRef);

      if (!redempSnap.exists()) {
        throw new Error('Redemption request document not found.');
      }

      const reqData = redempSnap.data();

      // Idempotency: Abort if already resolved
      if (reqData.status !== 'pending') {
        throw new Error(`Request has already been ${reqData.status}.`);
      }

      // Read reward document
      const rewardRef = doc(db, 'rewards', reqData.rewardId);
      const rewardSnap = await t.get(rewardRef);
      if (!rewardSnap.exists()) {
        throw new Error('Reward item no longer exists.');
      }
      const rewardData = rewardSnap.data();

      // Server re-validation: isActive
      if (!rewardData.isActive) {
        throw new Error('Cannot approve: Reward is currently marked inactive.');
      }

      // Read user document
      const userRef = doc(db, 'users', reqData.userId);
      const userSnap = await t.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('Target user account not found.');
      }
      const userData = userSnap.data();

      // Server re-validation: sufficient credits
      const currentCredits = Number(userData.credits ?? 0);
      const creditCost = Number(reqData.creditCost ?? rewardData.creditCost);
      if (currentCredits < creditCost) {
        throw new Error(`Insufficient credits: User has ${currentCredits} CR, requires ${creditCost} CR.`);
      }

      // Server re-validation: active cooldown check
      const cooldownDocId = `${reqData.userId}_${reqData.rewardId}`;
      const cooldownRef = doc(db, 'reward_cooldowns', cooldownDocId);
      const cooldownSnap = await t.get(cooldownRef);
      if (cooldownSnap.exists()) {
        const cdData = cooldownSnap.data();
        if (new Date(cdData.expiresAt).getTime() > new Date(nowIso).getTime()) {
          throw new Error('Cannot approve: Reward is currently on active cooldown for this user.');
        }
      }

      // Read config for rank check
      const configRef = doc(db, 'config', 'settings');
      const configSnap = await t.get(configRef);
      const configData = configSnap.exists() ? configSnap.data() : DEFAULT_CONFIG;
      const rankThresholds = configData.rankThresholds ?? DEFAULT_CONFIG.rankThresholds;

      const expReward = Number(rewardData.expReward ?? 0);
      const newCredits = currentCredits - creditCost;
      const newExp = Number(userData.exp ?? 0) + expReward;
      const newRedeemStreak = Number(userData.redeemStreak ?? 0) + 1;
      const rankResult = calculateRankProgress(newExp, rankThresholds);

      // 1. Update redemption request
      t.update(redempRef, {
        status: 'approved',
        resolvedAt: nowIso,
      });

      // 2. Update user document
      t.update(userRef, {
        credits: newCredits,
        exp: newExp,
        redeemStreak: newRedeemStreak,
        lastRedeemDate: todayDate,
        rank: rankResult.currentRank,
      });

      // 3. Set/Update cooldown if applicable
      const cooldownMins = Number(rewardData.cooldownMinutes ?? 0);
      if (cooldownMins > 0) {
        const expiresAtIso = new Date(Date.now() + cooldownMins * 60 * 1000).toISOString();
        t.set(cooldownRef, {
          userId: reqData.userId,
          rewardId: reqData.rewardId,
          cooldownMinutes: cooldownMins,
          claimedAt: nowIso,
          expiresAt: expiresAtIso,
        });
      }

      // 4. Increment reward totalRedemptions
      t.update(rewardRef, {
        totalRedemptions: Number(rewardData.totalRedemptions ?? 0) + 1,
      });

      // 5. System log record (matching schema contract)
      const logRef = doc(collection(db, 'logs'));
      t.set(logRef, {
        action: 'redemption_approved',
        userId: reqData.userId,
        adminId: adminUser.uid,
        amount: 0.0,
        details: `${reqData.username} redeemed ${reqData.rewardName} — -${creditCost} credits, +${expReward} EXP | redeemStreak=${newRedeemStreak}`,
        createdAt: nowIso,
      });

      return { creditsDeducted: creditCost, expAwarded: expReward };
    });
  } else {
    // Offline local simulation
    const redemps = getLocalRedemptions();
    const idx = redemps.findIndex((r) => r.id === requestId);
    if (idx === -1) throw new Error('Redemption request not found.');

    const req = redemps[idx];
    if (req.status !== 'pending') {
      throw new Error(`Request has already been ${req.status}.`);
    }

    req.status = 'approved';
    req.resolvedAt = nowIso;
    saveLocalRedemptions(redemps);

    // Save cooldown
    if (req.cooldownMinutes > 0) {
      const cooldowns = getLocalCooldowns();
      const expiresAtIso = new Date(Date.now() + req.cooldownMinutes * 60 * 1000).toISOString();
      cooldowns.push({
        id: `${req.userId}_${req.rewardId}`,
        userId: req.userId,
        rewardId: req.rewardId,
        cooldownMinutes: req.cooldownMinutes,
        claimedAt: nowIso,
        expiresAt: expiresAtIso,
      });
      saveLocalCooldowns(cooldowns);
    }

    return { creditsDeducted: req.creditCost, expAwarded: 20 };
  }
}

/**
 * Rejects a redemption request
 */
export async function rejectRedemptionRequest(
  requestId: string,
  adminUser: AuthUser,
  rejectNote: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can reject redemptions.');
  }

  const nowIso = new Date().toISOString();

  if (hasValidFirebaseConfig) {
    const redempRef = doc(db, 'redemption_requests', requestId);
    const snap = await getDoc(redempRef);
    if (!snap.exists()) throw new Error('Redemption request not found.');

    const data = snap.data();
    if (data.status !== 'pending') {
      throw new Error(`Request has already been ${data.status}.`);
    }

    await runTransaction(db, async (t) => {
      t.update(redempRef, {
        status: 'rejected',
        resolvedAt: nowIso,
        rejectNote: rejectNote || 'Rejected by staff',
      });

      const logRef = doc(collection(db, 'logs'));
      t.set(logRef, {
        action: 'redemption_rejected',
        userId: data.userId,
        adminId: adminUser.uid,
        amount: 0.0,
        details: `Redemption rejected (dashboard) for ${data.username}. Reason: ${rejectNote || 'None provided'}`,
        createdAt: nowIso,
      });
    });
  } else {
    const redemps = getLocalRedemptions();
    const idx = redemps.findIndex((r) => r.id === requestId);
    if (idx === -1) throw new Error('Redemption request not found.');
    redemps[idx].status = 'rejected';
    redemps[idx].resolvedAt = nowIso;
    redemps[idx].rejectNote = rejectNote || 'Rejected by staff';
    saveLocalRedemptions(redemps);
  }
}
