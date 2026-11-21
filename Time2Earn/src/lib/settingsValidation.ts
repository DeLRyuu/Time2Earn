/**
 * settingsValidation.ts
 * Validation and diff calculation for Time2Earn system config/settings (Phase 11)
 */

import { type AppConfig, type DebtTiers, type RankName } from '../types/config';

export const ORDERED_RANKS: RankName[] = [
  'Newbie',
  'Visitor',
  'Regular',
  'Grinder',
  'Gamer',
  'Elite',
  'VIP',
  'VIP+',
  'MVP',
  'MVP+',
  'Legend',
  'OG Player',
];

export interface ConfigDiffItem {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates system configuration parameters:
 * - Numbers and positive (> 0, or Newbie = 0)
 * - Rank thresholds strictly ascending
 * - Newbie must be exactly 0
 * - Debt tiers strictly ascending (low < mid < high)
 * - Leaderboard reset days >= 1 integer
 */
export function validateConfigSettings(cfg: AppConfig): ConfigValidationResult {
  const errors: string[] = [];

  // 1. Hourly session rate
  if (typeof cfg.sessionRatePerHour !== 'number' || isNaN(cfg.sessionRatePerHour) || cfg.sessionRatePerHour <= 0) {
    errors.push('Shop Session Rate must be a positive number greater than 0');
  }

  // 2. PHP to Credit rate
  if (typeof cfg.phpToCreditRate !== 'number' || isNaN(cfg.phpToCreditRate) || cfg.phpToCreditRate <= 0) {
    errors.push('PHP to Credit Rate must be a positive number greater than 0');
  }

  // 3. Credit to PHP rate
  if (typeof cfg.creditToPhpRate !== 'number' || isNaN(cfg.creditToPhpRate) || cfg.creditToPhpRate <= 0) {
    errors.push('Credit to PHP Rate must be a positive number greater than 0');
  }

  // 4. EXP per minute
  if (typeof cfg.expPerMinute !== 'number' || isNaN(cfg.expPerMinute) || cfg.expPerMinute <= 0) {
    errors.push('EXP Per Minute must be a positive number greater than 0');
  }

  // 5. Leaderboard reset days
  if (
    typeof cfg.leaderboardResetDays !== 'number' ||
    isNaN(cfg.leaderboardResetDays) ||
    cfg.leaderboardResetDays < 1 ||
    !Number.isInteger(cfg.leaderboardResetDays)
  ) {
    errors.push('Leaderboard Reset Days must be an integer of at least 1 day');
  }

  // 6. Debt Tiers
  const { low, mid, high } = cfg.debtTiers || {};
  if (typeof low !== 'number' || isNaN(low) || low <= 0) {
    errors.push('Debt Tier (Low) must be a positive number greater than 0');
  }
  if (typeof mid !== 'number' || isNaN(mid) || mid <= low) {
    errors.push(`Debt Tier (Mid: ₱${mid}) must be strictly greater than Low Tier (₱${low})`);
  }
  if (typeof high !== 'number' || isNaN(high) || high <= mid) {
    errors.push(`Debt Tier (High: ₱${high}) must be strictly greater than Mid Tier (₱${mid})`);
  }

  // 7. Rank Thresholds
  if (!cfg.rankThresholds || typeof cfg.rankThresholds !== 'object') {
    errors.push('Rank thresholds object is missing or invalid');
  } else {
    // Newbie must be exactly 0
    if (cfg.rankThresholds['Newbie'] !== 0) {
      errors.push(`Newbie rank threshold must be exactly 0 EXP (currently: ${cfg.rankThresholds['Newbie']})`);
    }

    // Check all 12 ranks are present and strictly ascending
    let previousThreshold = 0;
    for (let i = 0; i < ORDERED_RANKS.length; i++) {
      const rank = ORDERED_RANKS[i];
      const val = cfg.rankThresholds[rank];

      if (val === undefined || val === null || typeof val !== 'number' || isNaN(val)) {
        errors.push(`Rank threshold for "${rank}" is missing or not a valid number`);
        continue;
      }

      if (val < 0) {
        errors.push(`Rank threshold for "${rank}" cannot be negative (${val})`);
      }

      if (i > 0) {
        const prevRank = ORDERED_RANKS[i - 1];
        if (val <= previousThreshold) {
          errors.push(
            `Rank "${rank}" (${val.toLocaleString()} EXP) must be strictly greater than "${prevRank}" (${previousThreshold.toLocaleString()} EXP)`
          );
        }
      }
      previousThreshold = val;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Computes an itemized diff between old and new configuration.
 */
export function computeConfigDiff(oldCfg: AppConfig, newCfg: AppConfig): ConfigDiffItem[] {
  const diffs: ConfigDiffItem[] = [];

  if (oldCfg.sessionRatePerHour !== newCfg.sessionRatePerHour) {
    diffs.push({
      field: 'sessionRatePerHour',
      label: 'Shop Session Rate',
      oldValue: `₱${oldCfg.sessionRatePerHour}/hr`,
      newValue: `₱${newCfg.sessionRatePerHour}/hr`,
    });
  }

  if (oldCfg.phpToCreditRate !== newCfg.phpToCreditRate) {
    diffs.push({
      field: 'phpToCreditRate',
      label: 'PHP to Credit Rate',
      oldValue: `${oldCfg.phpToCreditRate}x`,
      newValue: `${newCfg.phpToCreditRate}x`,
    });
  }

  if (oldCfg.creditToPhpRate !== newCfg.creditToPhpRate) {
    diffs.push({
      field: 'creditToPhpRate',
      label: 'Credit to PHP Rate',
      oldValue: `₱${oldCfg.creditToPhpRate}`,
      newValue: `₱${newCfg.creditToPhpRate}`,
    });
  }

  if (oldCfg.expPerMinute !== newCfg.expPerMinute) {
    diffs.push({
      field: 'expPerMinute',
      label: 'EXP Per Minute',
      oldValue: `${oldCfg.expPerMinute} EXP/min`,
      newValue: `${newCfg.expPerMinute} EXP/min`,
    });
  }

  if (oldCfg.leaderboardResetDays !== newCfg.leaderboardResetDays) {
    diffs.push({
      field: 'leaderboardResetDays',
      label: 'Leaderboard Reset Interval',
      oldValue: `${oldCfg.leaderboardResetDays} day(s)`,
      newValue: `${newCfg.leaderboardResetDays} day(s)`,
    });
  }

  // Debt tiers diff
  const oldTiers = oldCfg.debtTiers || ({} as DebtTiers);
  const newTiers = newCfg.debtTiers || ({} as DebtTiers);
  (['low', 'mid', 'high'] as const).forEach((tierKey) => {
    if (oldTiers[tierKey] !== newTiers[tierKey]) {
      diffs.push({
        field: `debtTiers.${tierKey}`,
        label: `Debt Tier (${tierKey.toUpperCase()})`,
        oldValue: `₱${oldTiers[tierKey]}`,
        newValue: `₱${newTiers[tierKey]}`,
      });
    }
  });

  // Rank thresholds diff
  const oldRanks = oldCfg.rankThresholds || {};
  const newRanks = newCfg.rankThresholds || {};
  ORDERED_RANKS.forEach((rank) => {
    if (oldRanks[rank] !== newRanks[rank]) {
      diffs.push({
        field: `rankThresholds.${rank}`,
        label: `Rank EXP (${rank})`,
        oldValue: `${(oldRanks[rank] ?? 0).toLocaleString()} EXP`,
        newValue: `${(newRanks[rank] ?? 0).toLocaleString()} EXP`,
      });
    }
  });

  return diffs;
}

/**
 * Formats diffs into a concise summary string for audit logging.
 */
export function formatConfigDiffSummary(diffs: ConfigDiffItem[]): string {
  if (diffs.length === 0) return 'No configuration changes';
  return diffs.map((d) => `${d.label}: ${d.oldValue} -> ${d.newValue}`).join('; ');
}
