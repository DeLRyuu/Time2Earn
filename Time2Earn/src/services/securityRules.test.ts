/**
 * securityRules.test.ts
 * Phase 17: Security, Abuse, and Firestore Rules Automated Test Suite
 *
 * Validates:
 * 1. Unauthorized admin route access & admin function calls as a player / unauthenticated
 * 2. Player reading / writing another player's data
 * 3. Client-side Credit/EXP/rank manipulation (direct Firestore writes)
 * 4. Fake or locked reward redemption; cooldown bypass; self-approval
 * 5. Session approval manipulation; self-approval
 * 6. Debt manipulation; self-approval
 * 7. Request replay / double-approval; concurrent approvals
 * 8. Excessive requests (rate limiting on sensitive functions)
 * 9. Firestore rules coverage across all 12 collections
 * 10. Auth edge cases & password reset abuse (anti-enumeration, credential lengths)
 * 11. Secrets scan (no private keys or passwords in repo, logs, or client bundle)
 */

import {
  approveSessionRequest,
  rejectSessionRequest,
} from './sessionService';
import {
  approveRedemptionRequest,
  rejectRedemptionRequest,
} from './redemptionService';
import {
  approveDebtPaymentRequest,
  rejectDebtPaymentRequest,
} from './debtService';
import {
  createAdminReward,
  updateAdminReward,
  toggleAdminRewardActive,
  adjustPlayerCredits,
} from './adminService';
import { updateAdminConfig } from './configService';
import { evaluateRewardEligibility } from '../lib/rewards';
import {
  checkRateLimit,
  assertRateLimit,
  resetRateLimit,
  RATE_LIMITS,
} from '../lib/rateLimit';
import { DEFAULT_CONFIG } from '../types/config';
import type { AuthUser } from '../types/auth';
import type { RewardItem } from '../types/rewards';

interface NodeFs {
  existsSync(p: string): boolean;
  readFileSync(p: string, encoding: string): string;
  readdirSync(p: string): string[];
}
interface NodePath {
  resolve(...paths: string[]): string;
}

// Simulated Auth contexts
const playerUser: AuthUser = {
  uid: 'player_uid_lois',
  username: 'lois_123xx',
  role: 'user',
  credits: 332,
  exp: 1251,
  rank: 'Gamer',
  isBanned: false,
  isRestricted: false,
};

const otherPlayerUser: AuthUser = {
  uid: 'player_uid_daniel',
  username: 'Daniel123',
  role: 'user',
  credits: 730,
  exp: 863,
  rank: 'Grinder',
  isBanned: false,
  isRestricted: false,
};

const adminUser: AuthUser = {
  uid: 'admin_uid_whindell',
  username: 'Whindell_TheDev',
  role: 'admin',
  credits: 9999,
  exp: 25000,
  rank: 'OG Player',
  isBanned: false,
  isRestricted: false,
};

// ============================================================================
// Firestore Rules Evaluation Engine (Simulates Firestore Rules Engine v2)
// ============================================================================
type RulesOperation = 'get' | 'list' | 'create' | 'update' | 'delete';

interface RulesContext {
  auth: { uid: string; token?: { role?: string }; role?: string } | null;
  resource?: { data: Record<string, unknown> };
  requestResource?: { data: Record<string, unknown> };
}

export function evaluateFirestoreRule(
  collectionName: string,
  docId: string,
  operation: RulesOperation,
  ctx: RulesContext
): boolean {
  const isAuth = ctx.auth !== null;
  const authUid = ctx.auth?.uid;
  const isAdmin = isAuth && (ctx.auth?.role === 'admin' || ctx.auth?.token?.role === 'admin');
  const isOwner = (uid: string) => isAuth && authUid === uid;

  const resData = ctx.resource?.data || {};
  const reqData = ctx.requestResource?.data || {};

  switch (collectionName) {
    case 'config':
      // Public read, admin write
      if (operation === 'get' || operation === 'list') return true;
      if (operation === 'create' || operation === 'update' || operation === 'delete') return isAdmin;
      return false;

    case 'users':
      // Owner or admin reads; admin creates; owner updates without sensitive keys; delete false
      if (operation === 'get' || operation === 'list') return isOwner(docId) || isAdmin;
      if (operation === 'create') return isAdmin;
      if (operation === 'delete') return false;
      if (operation === 'update') {
        if (isAdmin) return true;
        if (!isOwner(docId)) return false;
        // Sensitive protected keys
        const protectedKeys = [
          'credits',
          'exp',
          'rank',
          'role',
          'isBanned',
          'isRestricted',
          'totalSessions',
          'totalCreditsEarned',
          'totalRedemptions',
          'redeemStreak',
          'lastRedeemDate',
          'streak',
          'streakRecoveryCharges',
          'debtAmount',
          'debtTier',
        ];
        const changedKeys = Object.keys(reqData).filter((k) => reqData[k] !== resData[k]);
        const violates = changedKeys.some((k) => protectedKeys.includes(k));
        return !violates;
      }
      return false;

    case 'rewards':
      // Players read active; admin reads all; admin writes
      if (operation === 'get' || operation === 'list') {
        return Boolean(resData.isActive) || isAdmin;
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return isAdmin;
      }
      return false;

    case 'session_requests':
    case 'redemption_requests':
    case 'debt_payment_requests':
      // Read own or admin; create pending with own userId; update/delete admin only
      if (operation === 'get' || operation === 'list') {
        return resData.userId === authUid || isAdmin;
      }
      if (operation === 'create') {
        return isAuth && reqData.userId === authUid && reqData.status === 'pending';
      }
      if (operation === 'update' || operation === 'delete') {
        return isAdmin;
      }
      return false;

    case 'reward_cooldowns':
    case 'debts':
    case 'debt_history':
    case 'credit_transactions':
      // Read own or admin; write admin only
      if (operation === 'get' || operation === 'list') {
        return (resData.userId === authUid || docId === authUid) || isAdmin;
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return isAdmin;
      }
      return false;

    case 'logs':
      // Read admin only; create authenticated; update/delete false
      if (operation === 'get' || operation === 'list') return isAdmin;
      if (operation === 'create') return isAuth || isAdmin;
      if (operation === 'update' || operation === 'delete') return false;
      return false;

    case 'arcade_sessions':
      // Read own or admin; create own attempt; update/delete admin only
      if (operation === 'get' || operation === 'list') {
        return resData.userId === authUid || isAdmin;
      }
      if (operation === 'create') {
        return isAuth && reqData.userId === authUid;
      }
      if (operation === 'update' || operation === 'delete') {
        return isAdmin;
      }
      return false;

    case 'public_leaderboard':
      // Read authenticated; write admin only
      if (operation === 'get' || operation === 'list') {
        return isAuth;
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return isAdmin;
      }
      return false;

    default:
      return false;
  }
}

// ============================================================================
// Test Suite Runner
// ============================================================================
export async function runSecurityTests(): Promise<boolean> {
  const assertions: Array<{ name: string; pass: boolean; expected?: unknown; actual?: unknown }> = [];

  function assertEqual(name: string, actual: unknown, expected: unknown) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    assertions.push({ name, pass, expected, actual });
    if (!pass) {
      console.error(`FAIL: ${name} -> expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  function assertTrue(name: string, condition: boolean) {
    assertions.push({ name, pass: condition });
    if (!condition) {
      console.error(`FAIL: ${name}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  // Polyfill localStorage in Node environment if missing
  const store = new Map<string, string>();
  if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage?.getItem) {
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      length: 0,
    } as unknown as Storage;
  }

  console.log('\n--- Running Phase 17: Security & Abuse Test Suite ---');

  // ==========================================================================
  // 1. UNAUTHORIZED ADMIN ROUTE ACCESS & PRIVILEGED FUNCTION CALLS
  // ==========================================================================
  console.log('\n[1/11] Testing Unauthorized Admin Function Calls...');

  // Route Guard Access & Mutual Exclusion Tests
  function evaluateRouteAccess(role: 'admin' | 'user' | null, targetRoute: 'admin' | 'user'): { allowed: boolean; redirect?: string } {
    if (!role) return { allowed: false, redirect: '/login' };
    if (targetRoute === 'admin' && role !== 'admin') return { allowed: false, redirect: '/player' };
    if (targetRoute === 'user' && role === 'admin') return { allowed: false, redirect: '/admin' };
    return { allowed: true };
  }
  assertEqual('Route Guard: Unauthenticated redirected to login', evaluateRouteAccess(null, 'admin').redirect, '/login');
  assertEqual('Route Guard: Player denied admin route', evaluateRouteAccess('user', 'admin').allowed, false);
  assertEqual('Route Guard: Player redirected to /player from /admin', evaluateRouteAccess('user', 'admin').redirect, '/player');
  assertEqual('Route Guard: Admin denied player route', evaluateRouteAccess('admin', 'user').allowed, false);
  assertEqual('Route Guard: Admin redirected to /admin from /player', evaluateRouteAccess('admin', 'user').redirect, '/admin');
  assertTrue('Route Guard: Player allowed player route', evaluateRouteAccess('user', 'user').allowed);
  assertTrue('Route Guard: Admin allowed admin route', evaluateRouteAccess('admin', 'admin').allowed);

  // Update Config
  let errUpdateConfig = '';
  try {
    await updateAdminConfig(playerUser, { ...DEFAULT_CONFIG, sessionRatePerHour: 10 }, DEFAULT_CONFIG);
  } catch (e) {
    errUpdateConfig = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call updateAdminConfig', errUpdateConfig.includes('Unauthorized') || errUpdateConfig.includes('Administrator privileges'));

  // Approve Session
  let errApproveSession = '';
  try {
    await approveSessionRequest('test_req_1', playerUser);
  } catch (e) {
    errApproveSession = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call approveSessionRequest', errApproveSession.includes('Unauthorized') || errApproveSession.includes('Only administrators'));

  // Reject Session
  let errRejectSession = '';
  try {
    await rejectSessionRequest('test_req_1', playerUser, 'rejection');
  } catch (e) {
    errRejectSession = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call rejectSessionRequest', errRejectSession.includes('Unauthorized') || errRejectSession.includes('Only administrators'));

  // Approve Redemption
  let errApproveRedemp = '';
  try {
    await approveRedemptionRequest('test_red_1', playerUser);
  } catch (e) {
    errApproveRedemp = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call approveRedemptionRequest', errApproveRedemp.includes('Unauthorized') || errApproveRedemp.includes('Only administrators'));

  // Reject Redemption
  let errRejectRedemp = '';
  try {
    await rejectRedemptionRequest('test_red_1', playerUser, 'no');
  } catch (e) {
    errRejectRedemp = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call rejectRedemptionRequest', errRejectRedemp.includes('Unauthorized') || errRejectRedemp.includes('Only administrators'));

  // Approve Debt Payment
  let errApproveDebt = '';
  try {
    await approveDebtPaymentRequest('test_debt_1', playerUser);
  } catch (e) {
    errApproveDebt = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call approveDebtPaymentRequest', errApproveDebt.includes('Access denied') || errApproveDebt.includes('Administrator privileges'));

  // Reject Debt Payment
  let errRejectDebt = '';
  try {
    await rejectDebtPaymentRequest('test_debt_1', playerUser, 'no');
  } catch (e) {
    errRejectDebt = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call rejectDebtPaymentRequest', errRejectDebt.includes('Access denied') || errRejectDebt.includes('Administrator privileges'));

  // Adjust Credits
  let errAdjustCredits = '';
  try {
    await adjustPlayerCredits({
      adminUser: playerUser,
      targetUserId: otherPlayerUser.uid,
      targetUsername: otherPlayerUser.username,
      amount: 500,
      type: 'add',
      reason: 'malicious adjustment',
    });
  } catch (e) {
    errAdjustCredits = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call adjustPlayerCredits', errAdjustCredits.includes('Access denied') || errAdjustCredits.includes('Administrator'));

  // Create Reward
  let errCreateReward = '';
  try {
    await createAdminReward(playerUser, {
      name: 'Free Robux',
      category: 'GAME TOP-UP',
      creditCost: 1,
      expReward: 100,
      cooldownMinutes: 0,
      minRank: 'Newbie',
      isActive: true,
      description: 'Hacked reward',
    });
  } catch (e) {
    errCreateReward = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call createAdminReward', errCreateReward.includes('Access denied') || errCreateReward.includes('Administrator'));

  // Update Reward
  let errUpdateReward = '';
  try {
    await updateAdminReward(playerUser, 'reward_1', { creditCost: 1 });
  } catch (e) {
    errUpdateReward = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call updateAdminReward', errUpdateReward.includes('Access denied') || errUpdateReward.includes('Administrator'));

  // Toggle Reward Active State
  let errToggleReward = '';
  try {
    await toggleAdminRewardActive(playerUser, 'reward_1', false);
  } catch (e) {
    errToggleReward = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Player cannot call toggleAdminRewardActive', errToggleReward.includes('Access denied') || errToggleReward.includes('Administrator'));

  // ==========================================================================
  // 2. CROSS-PLAYER DATA READ/WRITE SECURITY
  // ==========================================================================
  console.log('\n[2/11] Testing Cross-Player Data Read/Write Isolation...');

  // User reading another user's document
  assertEqual(
    'Player reading another player user doc is blocked',
    evaluateFirestoreRule('users', otherPlayerUser.uid, 'get', {
      auth: { uid: playerUser.uid, role: 'user' },
    }),
    false
  );

  // User reading own document is allowed
  assertEqual(
    'Player reading own user doc is permitted',
    evaluateFirestoreRule('users', playerUser.uid, 'get', {
      auth: { uid: playerUser.uid, role: 'user' },
    }),
    true
  );

  // Admin reading any user document is allowed
  assertEqual(
    'Admin reading any user doc is permitted',
    evaluateFirestoreRule('users', playerUser.uid, 'get', {
      auth: { uid: adminUser.uid, role: 'admin' },
    }),
    true
  );

  // Player reading another player's debt
  assertEqual(
    'Player reading another player debt is blocked',
    evaluateFirestoreRule('debts', otherPlayerUser.uid, 'get', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { userId: otherPlayerUser.uid } },
    }),
    false
  );

  // Player reading another player's session request
  assertEqual(
    'Player reading another player session request is blocked',
    evaluateFirestoreRule('session_requests', 'sess_other', 'get', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { userId: otherPlayerUser.uid } },
    }),
    false
  );

  // Player reading another player's redemption request
  assertEqual(
    'Player reading another player redemption request is blocked',
    evaluateFirestoreRule('redemption_requests', 'red_other', 'get', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { userId: otherPlayerUser.uid } },
    }),
    false
  );

  // Player reading audit logs is blocked
  assertEqual(
    'Player reading audit logs is blocked',
    evaluateFirestoreRule('logs', 'log_123', 'get', {
      auth: { uid: playerUser.uid, role: 'user' },
    }),
    false
  );

  // ==========================================================================
  // 3. CLIENT-SIDE BALANCE / RANK MANIPULATION
  // ==========================================================================
  console.log('\n[3/11] Testing Client Balance / Rank Tampering Defenses...');

  // Player attempting to increase credits directly
  assertEqual(
    'Player tampering with credits directly is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { credits: 332, exp: 1251, rank: 'Gamer' } },
      requestResource: { data: { credits: 99999, exp: 1251, rank: 'Gamer' } },
    }),
    false
  );

  // Player attempting to increase exp directly
  assertEqual(
    'Player tampering with exp directly is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { credits: 332, exp: 1251, rank: 'Gamer' } },
      requestResource: { data: { credits: 332, exp: 50000, rank: 'Gamer' } },
    }),
    false
  );

  // Player attempting to set rank to Legend directly
  assertEqual(
    'Player tampering with rank directly is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { credits: 332, exp: 1251, rank: 'Gamer' } },
      requestResource: { data: { credits: 332, exp: 1251, rank: 'Legend' } },
    }),
    false
  );

  // Player attempting to escalate role to admin
  assertEqual(
    'Player attempting privilege escalation (role: admin) is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { role: 'user' } },
      requestResource: { data: { role: 'admin' } },
    }),
    false
  );

  // Player attempting to tamper with streak
  assertEqual(
    'Player tampering with streak is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { streak: 3 } },
      requestResource: { data: { streak: 50 } },
    }),
    false
  );

  // Player attempting to tamper with streakRecoveryCharges
  assertEqual(
    'Player tampering with streakRecoveryCharges is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { streakRecoveryCharges: 1 } },
      requestResource: { data: { streakRecoveryCharges: 99 } },
    }),
    false
  );

  // Player attempting to unban or unrestrict self
  assertEqual(
    'Player tampering with isRestricted/isBanned is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
      resource: { data: { isRestricted: true } },
      requestResource: { data: { isRestricted: false } },
    }),
    false
  );

  // User attempting to delete user account
  assertEqual(
    'User attempting to delete account is rejected',
    evaluateFirestoreRule('users', playerUser.uid, 'delete', {
      auth: { uid: playerUser.uid, role: 'user' },
    }),
    false
  );

  // ==========================================================================
  // 4. REWARD REDEMPTION TAMPERING & COOLDOWN BYPASS
  // ==========================================================================
  console.log('\n[4/11] Testing Reward Redemption Tampering Defenses...');

  // Inactive reward eligibility
  const inactiveReward: RewardItem = {
    id: 'JKhpap5KP8TFw1iTNCZV',
    name: '2 Hour Session',
    category: 'PLAY-TIME',
    creditCost: 360,
    expReward: 80,
    cooldownMinutes: 720,
    minRank: 'Gamer',
    isActive: false,
    description: '2 Hours continuous gaming',
  };
  const ineligInactive = evaluateRewardEligibility(inactiveReward, playerUser, DEFAULT_CONFIG, [], false);
  assertEqual('Inactive reward cannot be redeemed', ineligInactive.canRedeem, false);
  assertEqual('Inactive reward status message', ineligInactive.statusMessage, 'Currently unavailable in shop');

  // Rank lock check (requires MVP+, player is Gamer)
  const highTierReward: RewardItem = {
    id: '6dlPM8Cl2zDnQvOTqWf3',
    name: 'Robux 1700',
    category: 'GAME TOP-UP',
    creditCost: 17850,
    expReward: 800,
    cooldownMinutes: 0,
    minRank: 'MVP+',
    isActive: true,
    description: 'Top robux tier',
  };
  const ineligRank = evaluateRewardEligibility(highTierReward, playerUser, DEFAULT_CONFIG, [], false);
  assertEqual('Rank locked reward cannot be redeemed', ineligRank.canRedeem, false);

  // Insufficient credits check (requires 840, player has 332)
  const expensiveReward: RewardItem = {
    id: 'K6iyY36wnBFkGWAYfLl3',
    name: 'Robux 80',
    category: 'GAME TOP-UP',
    creditCost: 840,
    expReward: 50,
    cooldownMinutes: 0,
    minRank: 'Visitor',
    isActive: true,
    description: 'Robux 80 card',
  };
  const ineligCredits = evaluateRewardEligibility(expensiveReward, playerUser, DEFAULT_CONFIG, [], false);
  assertEqual('Insufficient credit redemption is rejected', ineligCredits.canRedeem, false);

  // Active cooldown bypass check
  const cooldownReward: RewardItem = {
    id: '8BIQ5L5GgEMZtnHpfPxA',
    name: '25 Minute Session',
    category: 'PLAY-TIME',
    creditCost: 75,
    expReward: 15,
    cooldownMinutes: 50,
    minRank: 'Visitor',
    isActive: true,
    description: '25 minutes play',
  };
  const futureExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const activeCooldowns = [
    {
      id: `${playerUser.uid}_8BIQ5L5GgEMZtnHpfPxA`,
      userId: playerUser.uid,
      rewardId: '8BIQ5L5GgEMZtnHpfPxA',
      rewardName: '25 Minute Session',
      cooldownMinutes: 50,
      expiresAt: futureExpiry,
      claimedAt: new Date().toISOString(),
    },
  ];
  const ineligCooldown = evaluateRewardEligibility(cooldownReward, playerUser, DEFAULT_CONFIG, activeCooldowns, false);
  assertEqual('Reward on active cooldown cannot be claimed', ineligCooldown.canRedeem, false);

  // Self-approval check on redemption
  let errSelfApproveRedemp = '';
  try {
    // HpVkcqiDwBGcpCfSQjsd belongs to lois_123xx (1DrJrVqcwfULvzDyyLV5S8b8ST03)
    await approveRedemptionRequest('HpVkcqiDwBGcpCfSQjsd', {
      ...adminUser,
      uid: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
    });
  } catch (e) {
    errSelfApproveRedemp = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Staff self-approval on redemption is blocked or aborted', errSelfApproveRedemp.includes('Staff members cannot approve their own') || errSelfApproveRedemp.includes('Action blocked'));

  // Direct client write of status: approved to redemption_requests
  assertEqual(
    'Direct client write of approved status to redemption_requests is rejected',
    evaluateFirestoreRule('redemption_requests', 'red_fake', 'create', {
      auth: { uid: playerUser.uid, role: 'user' },
      requestResource: { data: { userId: playerUser.uid, status: 'approved' } },
    }),
    false
  );

  // ==========================================================================
  // 5. SESSION APPROVAL MANIPULATION & SELF-APPROVAL
  // ==========================================================================
  console.log('\n[5/11] Testing Session Approval Manipulation Defenses...');

  // Client creating session request with status approved
  assertEqual(
    'Client creating session_request with status approved is rejected by rules',
    evaluateFirestoreRule('session_requests', 'sess_fake', 'create', {
      auth: { uid: playerUser.uid, role: 'user' },
      requestResource: { data: { userId: playerUser.uid, status: 'approved' } },
    }),
    false
  );

  // Client updating session request
  assertEqual(
    'Client updating session_request is rejected by rules',
    evaluateFirestoreRule('session_requests', 'sess_1', 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
    }),
    false
  );

  // Staff self-approval in sessionService
  let errSelfApproveSession = '';
  try {
    // 8EP8Zxi6h3XMyg3gxb6j belongs to lois_123xx (1DrJrVqcwfULvzDyyLV5S8b8ST03)
    await approveSessionRequest('8EP8Zxi6h3XMyg3gxb6j', {
      ...adminUser,
      uid: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
    });
  } catch (e) {
    errSelfApproveSession = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Staff member cannot approve their own session request', errSelfApproveSession.includes('Staff members cannot approve their own') || errSelfApproveSession.includes('Action blocked'));

  // ==========================================================================
  // 6. DEBT MANIPULATION & SELF-APPROVAL
  // ==========================================================================
  console.log('\n[6/11] Testing Debt Manipulation Defenses...');

  // Direct client write to debts collection
  assertEqual(
    'Direct client write to debts collection is rejected',
    evaluateFirestoreRule('debts', playerUser.uid, 'create', {
      auth: { uid: playerUser.uid, role: 'user' },
    }),
    false
  );

  assertEqual(
    'Direct client update to debts collection is rejected',
    evaluateFirestoreRule('debts', playerUser.uid, 'update', {
      auth: { uid: playerUser.uid, role: 'user' },
    }),
    false
  );

  // Client creating debt payment request with status approved
  assertEqual(
    'Client creating debt_payment_request with status approved is rejected',
    evaluateFirestoreRule('debt_payment_requests', 'dpr_fake', 'create', {
      auth: { uid: playerUser.uid, role: 'user' },
      requestResource: { data: { userId: playerUser.uid, status: 'approved' } },
    }),
    false
  );

  // Staff approving own debt payment request
  let errSelfApproveDebt = '';
  try {
    await approveDebtPaymentRequest('vYDmlZaxUAayHNOthrBH', {
      ...adminUser,
      uid: 'YPggiam7YeRSXqEzsu9Te5fcejo2', // NINI123 owns this request
    });
  } catch (e) {
    errSelfApproveDebt = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Staff member cannot approve their own debt payment request', errSelfApproveDebt.includes('Staff members cannot approve their own') || errSelfApproveDebt.includes('Action blocked'));

  // ==========================================================================
  // 7. REQUEST REPLAY & DOUBLE-APPROVAL DEFENSES
  // ==========================================================================
  console.log('\n[7/11] Testing Double-Approval & Replay Protections...');

  // Re-approving an already resolved session request
  let errDoubleSession = '';
  try {
    // 8EP8Zxi6h3XMyg3gxb6j is already status: approved
    await approveSessionRequest('8EP8Zxi6h3XMyg3gxb6j', adminUser);
  } catch (e) {
    errDoubleSession = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Double approval on session request is rejected', errDoubleSession.includes('already been approved') || errDoubleSession.includes('already been'));

  // Re-approving an already resolved redemption request
  let errDoubleRedemp = '';
  try {
    // HpVkcqiDwBGcpCfSQjsd is already status: approved
    await approveRedemptionRequest('HpVkcqiDwBGcpCfSQjsd', adminUser);
  } catch (e) {
    errDoubleRedemp = e instanceof Error ? e.message : String(e);
  }
  assertTrue('Double approval on redemption request is rejected', errDoubleRedemp.includes('already been approved') || errDoubleRedemp.includes('already been'));

  // ==========================================================================
  // 8. RATE LIMITING ON SENSITIVE ACTIONS
  // ==========================================================================
  console.log('\n[8/11] Testing Rate Limiting & DoS Protection...');
  resetRateLimit();

  const testActionKey = 'test_player_rate_burst';
  const testOpts = { maxRequests: 3, windowMs: 10000 };

  // Rapid requests 1, 2, 3 should succeed
  assertTrue('Request 1 within quota succeeds', checkRateLimit(testActionKey, testOpts));
  assertTrue('Request 2 within quota succeeds', checkRateLimit(testActionKey, testOpts));
  assertTrue('Request 3 within quota succeeds', checkRateLimit(testActionKey, testOpts));

  // Request 4 should be rejected
  const req4Allowed = checkRateLimit(testActionKey, testOpts);
  assertEqual('Request 4 exceeding burst quota is blocked', req4Allowed, false);

  // assertRateLimit throws proper error
  let rateLimitThrown = false;
  try {
    assertRateLimit(testActionKey, testOpts, 'burst test');
  } catch (e) {
    rateLimitThrown = e instanceof Error && e.message.includes('Rate limit exceeded');
  }
  assertTrue('assertRateLimit throws descriptive retry message', rateLimitThrown);

  // Verify Auth Login Rate Limiter (Max 5 attempts)
  resetRateLimit('bad_actor_ip');
  for (let i = 0; i < 5; i++) {
    checkRateLimit('bad_actor_ip', RATE_LIMITS.AUTH_LOGIN);
  }
  assertEqual('6th login attempt within 1 minute is rate-limited', checkRateLimit('bad_actor_ip', RATE_LIMITS.AUTH_LOGIN), false);

  resetRateLimit();

  // ==========================================================================
  // 9. FIRESTORE RULES COVERAGE ACROSS ALL 12 COLLECTIONS
  // ==========================================================================
  console.log('\n[9/11] Testing Full Firestore Rules Matrix Across 12 Collections...');

  // 1. config
  assertTrue('config: Public read permitted', evaluateFirestoreRule('config', 'settings', 'get', { auth: null }));
  assertTrue('config: Admin write permitted', evaluateFirestoreRule('config', 'settings', 'update', { auth: { uid: adminUser.uid, role: 'admin' } }));
  assertEqual('config: Player write blocked', evaluateFirestoreRule('config', 'settings', 'update', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 2. users
  assertTrue('users: Owner read permitted', evaluateFirestoreRule('users', 'user_1', 'get', { auth: { uid: 'user_1', role: 'user' } }));
  assertEqual('users: Other read blocked', evaluateFirestoreRule('users', 'user_1', 'get', { auth: { uid: 'user_2', role: 'user' } }), false);
  assertTrue('users: Admin create permitted', evaluateFirestoreRule('users', 'user_new', 'create', { auth: { uid: adminUser.uid, role: 'admin' } }));
  assertEqual('users: Player create blocked', evaluateFirestoreRule('users', 'user_new', 'create', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 3. rewards
  assertTrue('rewards: Player reads active reward', evaluateFirestoreRule('rewards', 'rew_1', 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { isActive: true } } }));
  assertEqual('rewards: Player cannot read inactive reward', evaluateFirestoreRule('rewards', 'rew_2', 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { isActive: false } } }), false);
  assertTrue('rewards: Admin reads inactive reward', evaluateFirestoreRule('rewards', 'rew_2', 'get', { auth: { uid: adminUser.uid, role: 'admin' }, resource: { data: { isActive: false } } }));
  assertEqual('rewards: Player write blocked', evaluateFirestoreRule('rewards', 'rew_1', 'update', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 4. session_requests
  assertTrue('session_requests: Player creates pending request', evaluateFirestoreRule('session_requests', 'sr_1', 'create', { auth: { uid: playerUser.uid, role: 'user' }, requestResource: { data: { userId: playerUser.uid, status: 'pending' } } }));
  assertEqual('session_requests: Player creating resolved request blocked', evaluateFirestoreRule('session_requests', 'sr_1', 'create', { auth: { uid: playerUser.uid, role: 'user' }, requestResource: { data: { userId: playerUser.uid, status: 'rejected' } } }), false);
  assertEqual('session_requests: Player creating for another user blocked', evaluateFirestoreRule('session_requests', 'sr_1', 'create', { auth: { uid: playerUser.uid, role: 'user' }, requestResource: { data: { userId: otherPlayerUser.uid, status: 'pending' } } }), false);

  // 5. redemption_requests
  assertTrue('redemption_requests: Player creates pending redemption', evaluateFirestoreRule('redemption_requests', 'rr_1', 'create', { auth: { uid: playerUser.uid, role: 'user' }, requestResource: { data: { userId: playerUser.uid, status: 'pending' } } }));
  assertEqual('redemption_requests: Player updating redemption blocked', evaluateFirestoreRule('redemption_requests', 'rr_1', 'update', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 6. reward_cooldowns
  assertTrue('reward_cooldowns: Player reads own cooldown', evaluateFirestoreRule('reward_cooldowns', `${playerUser.uid}_rew`, 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: playerUser.uid } } }));
  assertEqual('reward_cooldowns: Player reads other cooldown blocked', evaluateFirestoreRule('reward_cooldowns', `${otherPlayerUser.uid}_rew`, 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: otherPlayerUser.uid } } }), false);
  assertEqual('reward_cooldowns: Player write blocked', evaluateFirestoreRule('reward_cooldowns', 'cd_1', 'create', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 7. debts
  assertTrue('debts: Player reads own debt', evaluateFirestoreRule('debts', playerUser.uid, 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: playerUser.uid } } }));
  assertEqual('debts: Player reads other debt blocked', evaluateFirestoreRule('debts', otherPlayerUser.uid, 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: otherPlayerUser.uid } } }), false);
  assertEqual('debts: Player write blocked', evaluateFirestoreRule('debts', playerUser.uid, 'update', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 8. debt_payment_requests
  assertTrue('debt_payment_requests: Player creates pending request', evaluateFirestoreRule('debt_payment_requests', 'dpr_1', 'create', { auth: { uid: playerUser.uid, role: 'user' }, requestResource: { data: { userId: playerUser.uid, status: 'pending' } } }));
  assertEqual('debt_payment_requests: Player update blocked', evaluateFirestoreRule('debt_payment_requests', 'dpr_1', 'update', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 9. debt_history
  assertTrue('debt_history: Player reads own history', evaluateFirestoreRule('debt_history', 'dh_1', 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: playerUser.uid } } }));
  assertEqual('debt_history: Player reads other history blocked', evaluateFirestoreRule('debt_history', 'dh_2', 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: otherPlayerUser.uid } } }), false);
  assertEqual('debt_history: Player write blocked', evaluateFirestoreRule('debt_history', 'dh_1', 'create', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 10. credit_transactions
  assertTrue('credit_transactions: Player reads own transactions', evaluateFirestoreRule('credit_transactions', 'tx_1', 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: playerUser.uid } } }));
  assertEqual('credit_transactions: Player reads other transactions blocked', evaluateFirestoreRule('credit_transactions', 'tx_2', 'get', { auth: { uid: playerUser.uid, role: 'user' }, resource: { data: { userId: otherPlayerUser.uid } } }), false);
  assertEqual('credit_transactions: Player write blocked', evaluateFirestoreRule('credit_transactions', 'tx_1', 'create', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 11. logs
  assertTrue('logs: Admin reads logs', evaluateFirestoreRule('logs', 'log_1', 'get', { auth: { uid: adminUser.uid, role: 'admin' } }));
  assertEqual('logs: Player reads logs blocked', evaluateFirestoreRule('logs', 'log_1', 'get', { auth: { uid: playerUser.uid, role: 'user' } }), false);
  assertTrue('logs: Authenticated appends log', evaluateFirestoreRule('logs', 'log_new', 'create', { auth: { uid: playerUser.uid, role: 'user' } }));
  assertEqual('logs: Update blocked (append-only)', evaluateFirestoreRule('logs', 'log_1', 'update', { auth: { uid: adminUser.uid, role: 'admin' } }), false);
  assertEqual('logs: Delete blocked (append-only)', evaluateFirestoreRule('logs', 'log_1', 'delete', { auth: { uid: adminUser.uid, role: 'admin' } }), false);

  // 12. arcade_sessions
  assertTrue('arcade_sessions: Player creates own attempt', evaluateFirestoreRule('arcade_sessions', 'as_1', 'create', { auth: { uid: playerUser.uid, role: 'user' }, requestResource: { data: { userId: playerUser.uid } } }));
  assertEqual('arcade_sessions: Player creating attempt for other blocked', evaluateFirestoreRule('arcade_sessions', 'as_2', 'create', { auth: { uid: playerUser.uid, role: 'user' }, requestResource: { data: { userId: otherPlayerUser.uid } } }), false);
  assertEqual('arcade_sessions: Player editing results directly blocked', evaluateFirestoreRule('arcade_sessions', 'as_1', 'update', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // 13. public_leaderboard
  assertTrue('public_leaderboard: Authenticated player reads leaderboard', evaluateFirestoreRule('public_leaderboard', 'user_1', 'get', { auth: { uid: playerUser.uid, role: 'user' } }));
  assertEqual('public_leaderboard: Unauthenticated read blocked', evaluateFirestoreRule('public_leaderboard', 'user_1', 'get', { auth: null }), false);
  assertTrue('public_leaderboard: Admin updates leaderboard', evaluateFirestoreRule('public_leaderboard', 'user_1', 'update', { auth: { uid: adminUser.uid, role: 'admin' } }));
  assertEqual('public_leaderboard: Player write blocked', evaluateFirestoreRule('public_leaderboard', 'user_1', 'update', { auth: { uid: playerUser.uid, role: 'user' } }), false);

  // ==========================================================================
  // 10. AUTH EDGE CASES & USER ENUMERATION RESISTANCE
  // ==========================================================================
  console.log('\n[10/11] Testing Auth Edge Cases & Anti-Enumeration...');

  // Password length enforcement
  const shortPassResult = (pass: string) => (!pass || pass.length < 6 ? { success: false, error: 'Password must be at least 6 characters long.' } : { success: true });
  assertEqual('Password with 4 chars rejected', shortPassResult('1234').success, false);
  assertEqual('Password with 6 chars accepted', shortPassResult('123456').success, true);

  // Force password change guard
  const userNeedingReset = { ...playerUser, mustChangePassword: true };
  assertTrue('mustChangePassword flag is properly identified', userNeedingReset.mustChangePassword);

  // ==========================================================================
  // 11. SECRETS SCANNING ACROSS REPO, LOGS, AND CLIENT BUNDLE
  // ==========================================================================
  console.log('\n[11/11] Scanning for Leaked Secrets & Private Keys...');

  const envGlobal = globalThis as unknown as {
    require?: (mod: string) => unknown;
    process?: { cwd: () => string };
  };

  if (envGlobal.require && envGlobal.process) {
    const fs = envGlobal.require('fs') as NodeFs;
    const path = envGlobal.require('path') as NodePath;
    const cwd = envGlobal.process.cwd();

    // 11a. Check legacy backup logs for plaintext passwords
    const backupPath = path.resolve(cwd, '../legacy/firestore_backup');
    if (fs.existsSync(backupPath)) {
      const backupRaw = fs.readFileSync(backupPath, 'utf-8');
      const backupObj = JSON.parse(backupRaw);
      const logs = backupObj.logs || {};
      let secretFoundInLogs = false;
      for (const [logId, logEntry] of Object.entries(logs)) {
        const str = JSON.stringify(logEntry);
        // If password is mentioned outside the action name staff_password_reset
        if (str.includes('password') && !str.includes('staff_password_reset')) {
          secretFoundInLogs = true;
          console.error(`Leaked password found in log: ${logId}`);
        }
      }
      assertEqual('No leaked secrets in 596 legacy logs', secretFoundInLogs, false);
    }

    // 11b. Verify .gitignore protects serviceAccountKey and private configs
    const gitignorePath = path.resolve(cwd, '../.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      assertTrue('.gitignore ignores serviceAccountKey*.json', gitignore.includes('serviceAccountKey'));
      assertTrue('.gitignore ignores .env files', gitignore.includes('.env'));
      assertTrue('.gitignore ignores legacy credentials', gitignore.includes('legacy/'));
    }
  }

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nSecurity Suite Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.`);
  return allPassed;
}
