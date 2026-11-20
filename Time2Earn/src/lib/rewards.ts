import type { RewardItem } from '../types/rewards';
import type { AuthUser } from '../types/auth';
import type { AppConfig } from '../types/config';
import type { RewardCooldown, RewardEligibilityResult } from '../types/redemption';

/**
 * Validates reward eligibility for a player
 * Contract: docs/T2E_SCHEMA.md Section 3.3
 */
export function evaluateRewardEligibility(
  reward: RewardItem,
  user: AuthUser,
  config: AppConfig,
  activeCooldowns: RewardCooldown[],
  hasPendingRequest: boolean,
  currentTime: Date = new Date()
): RewardEligibilityResult {
  // 1. Inactive check (Strict: Never auto-activate or allow inactive claims)
  if (!reward.isActive) {
    return {
      state: 'inactive',
      canRedeem: false,
      statusMessage: 'Currently unavailable in shop',
    };
  }

  // 2. Pending request check
  if (hasPendingRequest) {
    return {
      state: 'pending',
      canRedeem: false,
      statusMessage: 'Request pending approval',
    };
  }

  // 3. Cooldown check
  const cooldown = activeCooldowns.find((c) => c.rewardId === reward.id);
  if (cooldown) {
    const expiry = new Date(cooldown.expiresAt);
    if (expiry.getTime() > currentTime.getTime()) {
      const remainingMs = expiry.getTime() - currentTime.getTime();
      const remainingMins = Math.ceil(remainingMs / (1000 * 60));
      return {
        state: 'on_cooldown',
        canRedeem: false,
        cooldownExpiresAt: cooldown.expiresAt,
        cooldownRemainingMinutes: remainingMins,
        statusMessage: `Cooldown: ${remainingMins}m remaining`,
      };
    }
  }

  // 4. Rank requirement check
  const userRankThreshold = config.rankThresholds[user.rank] ?? 0;
  const minRankThreshold = config.rankThresholds[reward.minRank] ?? 0;

  if (user.exp < minRankThreshold || userRankThreshold < minRankThreshold) {
    const expNeeded = Math.max(0, minRankThreshold - user.exp);
    return {
      state: 'locked_rank',
      canRedeem: false,
      statusMessage: `Requires ${reward.minRank.toUpperCase()} (${expNeeded.toLocaleString()} more EXP)`,
    };
  }

  // 5. Credits requirement check
  if (user.credits < reward.creditCost) {
    const creditsNeeded = reward.creditCost - user.credits;
    return {
      state: 'insufficient_credits',
      canRedeem: false,
      statusMessage: `Need ${creditsNeeded.toLocaleString()} more Credits`,
    };
  }

  // 6. User restriction check (e.g. debt freeze)
  if (user.isRestricted) {
    return {
      state: 'inactive',
      canRedeem: false,
      statusMessage: 'Account restricted due to outstanding debt',
    };
  }

  return {
    state: 'available',
    canRedeem: true,
    statusMessage: 'Ready to claim',
  };
}
