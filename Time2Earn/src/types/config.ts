export interface DebtTiers {
  low: number;
  mid: number;
  high: number;
}

export type RankName =
  | 'Newbie'
  | 'Visitor'
  | 'Regular'
  | 'Grinder'
  | 'Gamer'
  | 'Elite'
  | 'VIP'
  | 'VIP+'
  | 'MVP'
  | 'MVP+'
  | 'Legend'
  | 'OG Player';

export interface AppConfig {
  sessionRatePerHour: number;
  phpToCreditRate: number;
  creditToPhpRate: number;
  expPerMinute: number;
  leaderboardResetDays: number;
  debtTiers: DebtTiers;
  rankThresholds: Record<string, number>;
  updatedAt?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  sessionRatePerHour: 10,
  phpToCreditRate: 1.38,
  creditToPhpRate: 0.035,
  expPerMinute: 1,
  leaderboardResetDays: 2,
  debtTiers: {
    low: 10,
    mid: 20,
    high: 30,
  },
  rankThresholds: {
    'Newbie': 0,
    'Visitor': 100,
    'Regular': 300,
    'Grinder': 600,
    'Gamer': 1000,
    'Elite': 2000,
    'VIP': 3500,
    'VIP+': 5000,
    'MVP': 7500,
    'MVP+': 10000,
    'Legend': 15000,
    'OG Player': 25000,
  },
};
