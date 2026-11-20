export type RedemptionStatus = 'pending' | 'approved' | 'rejected';

export interface RedemptionRequest {
  id: string;
  userId: string;
  username: string;
  rewardId: string;
  rewardName: string;
  creditCost: number;
  cooldownMinutes: number;
  status: RedemptionStatus;
  requestedAt: string;
  resolvedAt: string | null;
  rejectNote: string;
}

export interface RewardCooldown {
  id: string;
  userId: string;
  rewardId: string;
  cooldownMinutes: number;
  claimedAt: string;
  expiresAt: string;
}

export type RewardCardState =
  | 'available'
  | 'locked_rank'
  | 'insufficient_credits'
  | 'on_cooldown'
  | 'pending'
  | 'inactive';

export interface RewardEligibilityResult {
  state: RewardCardState;
  canRedeem: boolean;
  statusMessage?: string;
  cooldownExpiresAt?: string;
  cooldownRemainingMinutes?: number;
}
