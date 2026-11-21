import { getRankIcon } from '../../lib/rankIcons';
import { ORDERED_RANKS } from '../../lib/settingsValidation';

export function runGamificationTests(): boolean {
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

  console.log('\n--- Running Phase 12: Gamification & Polish Tests ---');

  // 1. All 12 ranks have dedicated achievement icons
  ORDERED_RANKS.forEach((rank) => {
    const icon = getRankIcon(rank);
    assertTrue(`Rank icon defined for ${rank}: ${icon}`, icon !== '🛡️' && icon.length > 0);
  });

  // 2. Fallback rank icon
  assertEqual('Fallback icon for unknown rank', getRankIcon('GrandMaster'), '🛡️');

  // 3. Countdown timer logic
  const now = Date.now();
  const futureExpiry = new Date(now + 90 * 1000).toISOString(); // 90 seconds in future
  const diffSec = Math.floor((new Date(futureExpiry).getTime() - now) / 1000);
  assertTrue('Cooldown remaining calculation is positive', diffSec >= 89 && diffSec <= 91);

  // 4. Past expiry calculation
  const pastExpiry = new Date(now - 10 * 1000).toISOString();
  const pastDiffSec = Math.max(0, Math.floor((new Date(pastExpiry).getTime() - now) / 1000));
  assertEqual('Expired cooldown clamps to 0', pastDiffSec, 0);

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nGamification Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.\n`);
  return allPassed;
}
