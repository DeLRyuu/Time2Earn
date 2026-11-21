import {
  validateConfigSettings,
  computeConfigDiff,
  formatConfigDiffSummary,
  ORDERED_RANKS,
} from './settingsValidation';
import { DEFAULT_CONFIG, type AppConfig } from '../types/config';

export function runSettingsValidationTests(): boolean {
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

  console.log('\n--- Running Phase 11: Settings Validation Tests ---');

  // 1. Default config is completely valid
  const defaultValidation = validateConfigSettings(DEFAULT_CONFIG);
  assertTrue('DEFAULT_CONFIG passes validation', defaultValidation.isValid && defaultValidation.errors.length === 0);

  // 2. Reject zero or negative rates
  const invalidRatesConfig: AppConfig = {
    ...DEFAULT_CONFIG,
    sessionRatePerHour: 0,
    phpToCreditRate: -1.5,
    creditToPhpRate: 0,
    expPerMinute: -1,
    leaderboardResetDays: 0,
  };
  const invalidRatesVal = validateConfigSettings(invalidRatesConfig);
  assertTrue('Zero or negative rates rejected', !invalidRatesVal.isValid);
  assertTrue('Errors include sessionRatePerHour', invalidRatesVal.errors.some((e) => e.includes('Shop Session Rate')));
  assertTrue('Errors include phpToCreditRate', invalidRatesVal.errors.some((e) => e.includes('PHP to Credit Rate')));
  assertTrue('Errors include creditToPhpRate', invalidRatesVal.errors.some((e) => e.includes('Credit to PHP Rate')));
  assertTrue('Errors include expPerMinute', invalidRatesVal.errors.some((e) => e.includes('EXP Per Minute')));
  assertTrue('Errors include leaderboardResetDays', invalidRatesVal.errors.some((e) => e.includes('Leaderboard Reset Days')));

  // 3. Reject non-integer leaderboard reset days
  const floatResetDays: AppConfig = {
    ...DEFAULT_CONFIG,
    leaderboardResetDays: 2.5,
  };
  const floatResetVal = validateConfigSettings(floatResetDays);
  assertTrue('Float leaderboard days rejected', !floatResetVal.isValid && floatResetVal.errors.some((e) => e.includes('integer')));

  // 4. Debt tiers strictly ascending: low < mid < high
  const invalidDebtTiers: AppConfig = {
    ...DEFAULT_CONFIG,
    debtTiers: { low: 20, mid: 15, high: 25 },
  };
  const invalidDebtVal = validateConfigSettings(invalidDebtTiers);
  assertTrue('Non-ascending debt tiers rejected (mid <= low)', !invalidDebtVal.isValid && invalidDebtVal.errors.some((e) => e.includes('Mid')));

  const invalidDebtHigh: AppConfig = {
    ...DEFAULT_CONFIG,
    debtTiers: { low: 10, mid: 20, high: 20 },
  };
  const invalidDebtHighVal = validateConfigSettings(invalidDebtHigh);
  assertTrue('Equal debt tiers rejected (high <= mid)', !invalidDebtHighVal.isValid && invalidDebtHighVal.errors.some((e) => e.includes('High')));

  // 5. Rank Thresholds: Newbie must be exactly 0
  const invalidNewbie: AppConfig = {
    ...DEFAULT_CONFIG,
    rankThresholds: { ...DEFAULT_CONFIG.rankThresholds, Newbie: 50 },
  };
  const invalidNewbieVal = validateConfigSettings(invalidNewbie);
  assertTrue('Newbie !== 0 rejected', !invalidNewbieVal.isValid && invalidNewbieVal.errors.some((e) => e.includes('Newbie')));

  // 6. Rank Thresholds: Strictly ascending
  const invalidRankAscending: AppConfig = {
    ...DEFAULT_CONFIG,
    rankThresholds: {
      ...DEFAULT_CONFIG.rankThresholds,
      Grinder: 300, // Regular is 300, Grinder cannot be <= 300
    },
  };
  const invalidRankVal = validateConfigSettings(invalidRankAscending);
  assertTrue('Equal or decreasing rank threshold rejected', !invalidRankVal.isValid && invalidRankVal.errors.some((e) => e.includes('Grinder')));

  // 7. Verify all 12 ordered ranks are covered
  assertEqual('ORDERED_RANKS has 12 tiers', ORDERED_RANKS.length, 12);
  ORDERED_RANKS.forEach((rank) => {
    assertTrue(`DEFAULT_CONFIG contains rank: ${rank}`, DEFAULT_CONFIG.rankThresholds[rank] !== undefined);
  });

  // 8. Diff computation
  const modifiedConfig: AppConfig = {
    ...DEFAULT_CONFIG,
    sessionRatePerHour: 15,
    phpToCreditRate: 1.5,
    debtTiers: { ...DEFAULT_CONFIG.debtTiers, high: 35 },
    rankThresholds: { ...DEFAULT_CONFIG.rankThresholds, Grinder: 650 },
  };
  const diffs = computeConfigDiff(DEFAULT_CONFIG, modifiedConfig);
  assertEqual('Diff items count', diffs.length, 4);

  const summary = formatConfigDiffSummary(diffs);
  assertTrue('Summary includes session rate', summary.includes('Shop Session Rate: ₱10/hr -> ₱15/hr'));
  assertTrue('Summary includes phpToCreditRate', summary.includes('PHP to Credit Rate: 1.38x -> 1.5x'));
  assertTrue('Summary includes debt high tier', summary.includes('Debt Tier (HIGH): ₱30 -> ₱35'));
  assertTrue('Summary includes Grinder rank', summary.includes('Rank EXP (Grinder): 600 EXP -> 650 EXP'));

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nSettings Validation Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.\n`);
  return allPassed;
}
