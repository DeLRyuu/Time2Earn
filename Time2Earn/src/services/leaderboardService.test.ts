import {
  fetchPublicLeaderboard,
  calculateLeaderboardCycle,
  type LeaderboardEntry,
} from './leaderboardService';
import type { AuthUser } from '../types/auth';

export async function runLeaderboardTests(): Promise<boolean> {
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

  console.log('\n--- Running Phase 13: Leaderboard Tests ---');

  // 1. Reset cycle countdown calculation
  const now = new Date('2026-11-21T12:00:00Z');
  const cycle = calculateLeaderboardCycle(2, '2026-08-16 12:40:30.413471+00:00', now);
  assertEqual('Cycle reset days', cycle.resetDays, 2);
  assertTrue('Remaining seconds is within 2 days', cycle.remainingSeconds > 0 && cycle.remainingSeconds <= 2 * 86400);
  assertTrue('Countdown string format', cycle.formattedCountdown.includes('d') || cycle.formattedCountdown.includes('h'));

  // 2. Public leaderboard ranking (metric: lifetime EXP)
  const result = await fetchPublicLeaderboard(null, 20);
  assertEqual('Top entries limit is 20', result.entries.length, 20);

  // Top 4 from verified legacy backup
  const [first, second, third, fourth] = result.entries;
  assertEqual('1st place username', first.username, 'bano_123xx');
  assertEqual('1st place score', first.exp, 1621);
  assertEqual('1st place rank', first.rank, 'Gamer');
  assertEqual('1st place rank position', first.rankPosition, 1);

  assertEqual('2nd place username', second.username, 'NINI123');
  assertEqual('2nd place score', second.exp, 1468);

  assertEqual('3rd place username', third.username, 'khalil');
  assertEqual('3rd place score', third.exp, 1462);

  assertEqual('4th place username', fourth.username, 'lois_123xx');
  assertEqual('4th place score', fourth.exp, 1251);

  // Verify descending sort order across all 20 entries
  for (let i = 1; i < result.entries.length; i++) {
    const prev = result.entries[i - 1];
    const curr = result.entries[i];
    assertTrue(
      `Descending sort check: #${prev.rankPosition} (${prev.exp}) >= #${curr.rankPosition} (${curr.exp})`,
      prev.exp >= curr.exp
    );
  }

  // 3. Current user highlighting when inside Top 20
  const mockLois: AuthUser = {
    uid: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
    username: 'lois_123xx',
    role: 'user',
    credits: 332,
    exp: 1251,
    rank: 'Gamer',
    isBanned: false,
    isRestricted: false,
  };
  const loisResult = await fetchPublicLeaderboard(mockLois, 20);
  assertTrue('Current user identified in result', !!loisResult.userStanding);
  assertEqual('Lois rank position is 4', loisResult.userStanding?.rankPosition, 4);
  assertTrue('Lois entry has isCurrentUser flag', loisResult.entries[3].isCurrentUser === true);

  // 4. Current user outside Top 20 (e.g. new user Phay with 0 EXP)
  const mockPhay: AuthUser = {
    uid: 'M6JcK40OKuYGxFVH5pJaXsKwjBE3',
    username: 'Phay',
    role: 'user',
    credits: 0,
    exp: 0,
    rank: 'Newbie',
    isBanned: false,
    isRestricted: false,
  };
  const phayResult = await fetchPublicLeaderboard(mockPhay, 20);
  assertTrue('Phay user standing is tracked', !!phayResult.userStanding);
  assertTrue('Phay rank position is > 20', (phayResult.userStanding?.rankPosition ?? 0) > 20);

  // 5. Privacy Guard Audit: No sensitive fields exist
  result.entries.forEach((entry: LeaderboardEntry) => {
    const keys = Object.keys(entry);
    assertTrue(`No password in entry ${entry.username}`, !keys.includes('password'));
    assertTrue(`No credits balance in entry ${entry.username}`, !keys.includes('credits'));
    assertTrue(`No debts in entry ${entry.username}`, !keys.includes('debt'));
    assertTrue(`No phone/birthday in entry ${entry.username}`, !keys.includes('birthday') && !keys.includes('phone'));
  });

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nLeaderboard Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.\n`);
  return allPassed;
}
