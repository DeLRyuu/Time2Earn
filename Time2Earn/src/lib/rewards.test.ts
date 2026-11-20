import { evaluateRewardEligibility } from './rewards';
import type { RewardItem } from '../types/rewards';
import type { AuthUser } from '../types/auth';
import { DEFAULT_CONFIG } from '../types/config';
import type { RewardCooldown } from '../types/redemption';

export function runRewardEligibilityTests() {
  const assertions: Array<{ name: string; pass: boolean; expected: unknown; actual: unknown }> = [];

  function assertEqual(name: string, actual: unknown, expected: unknown) {
    const pass = actual === expected;
    assertions.push({ name, pass, expected, actual });
    if (!pass) {
      console.error(`FAIL: ${name} -> expected ${expected}, got ${actual}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  const mockConfig = {
    ...DEFAULT_CONFIG,
    rankThresholds: {
      Newbie: 0,
      Grinder: 500,
      Gamer: 1000,
      Pro: 2500,
      Master: 5000,
      Champion: 7500,
      'MVP+': 10000,
      'OG Player': 15000,
    },
  };

  const baseReward: RewardItem = {
    id: 'reward_1hr_pc',
    name: '1 Hour PC Time',
    description: '1 Hour of PC gaming time',
    category: 'PLAY-TIME',
    creditCost: 150,
    expReward: 15,
    minRank: 'Gamer',
    cooldownMinutes: 60,
    isActive: true,
  };

  const baseUser: AuthUser = {
    uid: 'user_123',
    username: 'test_player',
    role: 'user',
    credits: 300,
    exp: 1200,
    rank: 'Gamer',
    streak: 3,
    isBanned: false,
    isRestricted: false,
  };

  const now = new Date('2026-11-20T12:00:00Z');

  // 1. Available state
  const availResult = evaluateRewardEligibility(baseReward, baseUser, mockConfig, [], false, now);
  assertEqual('Eligible: Should be available when all criteria are met', availResult.state, 'available');
  assertEqual('Eligible: canRedeem should be true', availResult.canRedeem, true);

  // 2. Inactive state (Strict: shop rules do not allow inactive redemptions)
  const inactiveReward: RewardItem = { ...baseReward, isActive: false };
  const inactiveResult = evaluateRewardEligibility(inactiveReward, baseUser, mockConfig, [], false, now);
  assertEqual('Inactive: Should return inactive state', inactiveResult.state, 'inactive');
  assertEqual('Inactive: canRedeem should be false', inactiveResult.canRedeem, false);

  // 3. Pending request state
  const pendingResult = evaluateRewardEligibility(baseReward, baseUser, mockConfig, [], true, now);
  assertEqual('Pending: Should return pending state when user has pending request', pendingResult.state, 'pending');
  assertEqual('Pending: canRedeem should be false', pendingResult.canRedeem, false);

  // 4. Cooldown state
  const activeCooldown: RewardCooldown = {
    id: 'user_123_reward_1hr_pc',
    userId: 'user_123',
    rewardId: 'reward_1hr_pc',
    cooldownMinutes: 60,
    claimedAt: '2026-11-20T11:45:00Z',
    expiresAt: '2026-11-20T12:45:00Z', // 45 mins in future
  };
  const cooldownResult = evaluateRewardEligibility(baseReward, baseUser, mockConfig, [activeCooldown], false, now);
  assertEqual('Cooldown: Should return on_cooldown state', cooldownResult.state, 'on_cooldown');
  assertEqual('Cooldown: canRedeem should be false', cooldownResult.canRedeem, false);
  assertEqual('Cooldown: should report 45m remaining', cooldownResult.cooldownRemainingMinutes, 45);

  // Expired cooldown should be ignored
  const expiredCooldown: RewardCooldown = {
    id: 'user_123_reward_1hr_pc',
    userId: 'user_123',
    rewardId: 'reward_1hr_pc',
    cooldownMinutes: 60,
    claimedAt: '2026-11-20T10:00:00Z',
    expiresAt: '2026-11-20T11:00:00Z', // In past
  };
  const expiredCooldownResult = evaluateRewardEligibility(baseReward, baseUser, mockConfig, [expiredCooldown], false, now);
  assertEqual('Expired Cooldown: Should be available if cooldown has expired', expiredCooldownResult.state, 'available');

  // 5. Locked by rank state
  const lowRankUser: AuthUser = { ...baseUser, exp: 400, rank: 'Newbie' };
  const rankLockedResult = evaluateRewardEligibility(baseReward, lowRankUser, mockConfig, [], false, now);
  assertEqual('Locked Rank: Should return locked_rank state', rankLockedResult.state, 'locked_rank');
  assertEqual('Locked Rank: canRedeem should be false', rankLockedResult.canRedeem, false);
  assertEqual('Locked Rank: Status message mentions missing EXP (600 more)', rankLockedResult.statusMessage, 'Requires GAMER (600 more EXP)');

  // 6. Insufficient credits state
  const poorUser: AuthUser = { ...baseUser, credits: 50 };
  const creditLockedResult = evaluateRewardEligibility(baseReward, poorUser, mockConfig, [], false, now);
  assertEqual('Insufficient Credits: Should return insufficient_credits state', creditLockedResult.state, 'insufficient_credits');
  assertEqual('Insufficient Credits: canRedeem should be false', creditLockedResult.canRedeem, false);
  assertEqual('Insufficient Credits: Status message mentions missing credits (100 more)', creditLockedResult.statusMessage, 'Need 100 more Credits');

  // 7. Restricted user state
  const restrictedUser: AuthUser = { ...baseUser, isRestricted: true };
  const restrictedResult = evaluateRewardEligibility(baseReward, restrictedUser, mockConfig, [], false, now);
  assertEqual('Restricted User: Should block redemption', restrictedResult.state, 'inactive');
  assertEqual('Restricted User: canRedeem should be false', restrictedResult.canRedeem, false);

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nReward Eligibility Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.`);
  return allPassed;
}
