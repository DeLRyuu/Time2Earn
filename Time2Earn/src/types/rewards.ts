export interface RewardItem {
  id: string;
  name: string;
  description: string;
  category: 'PLAY-TIME' | 'SNACK-PACK' | 'GAME TOP-UP' | string;
  creditCost: number;
  expReward: number;
  cooldownMinutes: number;
  minRank: string;
  isActive: boolean;
  totalRedemptions?: number;
}
