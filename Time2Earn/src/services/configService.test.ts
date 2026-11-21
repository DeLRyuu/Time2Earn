import { updateAdminConfig } from './configService';
import { DEFAULT_CONFIG, type AppConfig } from '../types/config';
import type { AuthUser } from '../types/auth';
import { calculateRankProgress } from '../lib/ranks';

export async function runConfigServiceTests(): Promise<boolean> {
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

  console.log('\n--- Running Phase 11: Config Service Tests ---');

  const mockAdminUser: AuthUser = {
    uid: 'admin_test_uid',
    username: 'admin',
    role: 'admin',
    credits: 9999,
    exp: 25000,
    rank: 'OG Player',
    isBanned: false,
    isRestricted: false,
  };

  const mockPlayerUser: AuthUser = {
    uid: 'player_test_uid',
    username: 'lois_123xx',
    role: 'user',
    credits: 332,
    exp: 1251,
    rank: 'Gamer',
    isBanned: false,
    isRestricted: false,
  };

  // 1. Security Guard: Non-admin is strictly blocked
  let nonAdminBlocked = false;
  try {
    await updateAdminConfig(mockPlayerUser, DEFAULT_CONFIG, DEFAULT_CONFIG);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Administrator privileges are strictly required')) {
      nonAdminBlocked = true;
    }
  }
  assertTrue('Security Guard: Non-admin cannot write configuration', nonAdminBlocked);

  // 2. Validation Guard: Invalid config is rejected
  let invalidConfigBlocked = false;
  try {
    const brokenConfig: AppConfig = {
      ...DEFAULT_CONFIG,
      phpToCreditRate: -5,
    };
    await updateAdminConfig(mockAdminUser, brokenConfig, DEFAULT_CONFIG);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Invalid Configuration')) {
      invalidConfigBlocked = true;
    }
  }
  assertTrue('Validation Guard: Invalid configuration is rejected before write', invalidConfigBlocked);

  // 3. Admin Update: Successful update with diffs
  const updatedProposal: AppConfig = {
    ...DEFAULT_CONFIG,
    sessionRatePerHour: 12,
    phpToCreditRate: 1.45,
  };
  const result = await updateAdminConfig(mockAdminUser, updatedProposal, DEFAULT_CONFIG);
  assertEqual('Result updated sessionRatePerHour', result.config.sessionRatePerHour, 12);
  assertEqual('Result updated phpToCreditRate', result.config.phpToCreditRate, 1.45);
  assertEqual('Diff count', result.diffs.length, 2);
  assertTrue('Audit details format', result.diffSummary.includes('Shop Session Rate: ₱10/hr -> ₱12/hr'));
  assertTrue('No secrets in diff summary', !result.diffSummary.toLowerCase().includes('password'));

  // 4. Dynamic Reactivity Verification:
  // Confirm app calculates rank progress dynamically from thresholds without code changes
  const testExp = 863; // Daniel123's EXP

  // Under default thresholds (Grinder = 600, Gamer = 1000)
  const defaultProgress = calculateRankProgress(testExp, DEFAULT_CONFIG.rankThresholds);
  assertEqual('Default rank for 863 EXP', defaultProgress.currentRank, 'Grinder');
  assertEqual('Default next rank for 863 EXP', defaultProgress.nextRank, 'Gamer');
  assertEqual('Default EXP remaining', defaultProgress.expRemaining, 137); // 1000 - 863 = 137

  // If admin adjusts Gamer threshold to 1200 dynamically in config:
  const adjustedThresholds = {
    ...DEFAULT_CONFIG.rankThresholds,
    Gamer: 1200,
  };
  const dynamicProgress = calculateRankProgress(testExp, adjustedThresholds);
  assertEqual('Dynamic rank remains Grinder', dynamicProgress.currentRank, 'Grinder');
  assertEqual('Dynamic next threshold is 1200', dynamicProgress.nextThreshold, 1200);
  assertEqual('Dynamic EXP remaining updated without code changes', dynamicProgress.expRemaining, 337); // 1200 - 863 = 337

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nConfig Service Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.\n`);
  return allPassed;
}
