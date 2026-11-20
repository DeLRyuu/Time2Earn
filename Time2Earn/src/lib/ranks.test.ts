import { calculateRankProgress, getRankLadder } from './ranks';
import { DEFAULT_CONFIG } from '../types/config';

export function runRankTests() {
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

  const thresholds = DEFAULT_CONFIG.rankThresholds;

  // 1. Test mid-tier progression: 1,251 EXP should be Gamer (threshold 1000) with next rank Elite (threshold 2000)
  const gamerProgress = calculateRankProgress(1251, thresholds);
  assertEqual('Gamer rank determination', gamerProgress.currentRank, 'Gamer');
  assertEqual('Gamer next rank determination', gamerProgress.nextRank, 'Elite');
  assertEqual('Gamer expRemaining (2000 - 1251 = 749)', gamerProgress.expRemaining, 749);
  assertEqual('Gamer progressPercent (251 / 1000 * 100 = 25%)', gamerProgress.progressPercent, 25);
  assertEqual('Gamer is not max rank', gamerProgress.isMaxRank, false);

  // 2. Test max rank: 25,000 EXP (OG Player)
  const ogProgress = calculateRankProgress(25000, thresholds);
  assertEqual('OG Player rank determination', ogProgress.currentRank, 'OG Player');
  assertEqual('OG Player next rank is null', ogProgress.nextRank, null);
  assertEqual('OG Player isMaxRank is true', ogProgress.isMaxRank, true);
  assertEqual('OG Player expRemaining is 0', ogProgress.expRemaining, 0);

  // 3. Test new player: 0 EXP (Newbie)
  const newbieProgress = calculateRankProgress(0, thresholds);
  assertEqual('Newbie rank determination', newbieProgress.currentRank, 'Newbie');
  assertEqual('Newbie next rank is Visitor', newbieProgress.nextRank, 'Visitor');

  // 4. Test rank ladder generation for Gamer (1,251 EXP)
  const ladder = getRankLadder(1251, thresholds);
  assertEqual('Ladder returns all 12 config tiers', ladder.length, 12);

  const newbieTier = ladder.find((t) => t.name === 'Newbie');
  assertEqual('Newbie tier is reached', newbieTier?.status, 'reached');

  const regularTier = ladder.find((t) => t.name === 'Regular');
  assertEqual('Regular tier is reached', regularTier?.status, 'reached');

  const grinderTier = ladder.find((t) => t.name === 'Grinder');
  assertEqual('Grinder tier is reached', grinderTier?.status, 'reached');

  const gamerTier = ladder.find((t) => t.name === 'Gamer');
  assertEqual('Gamer tier is current', gamerTier?.status, 'current');

  const eliteTier = ladder.find((t) => t.name === 'Elite');
  assertEqual('Elite tier is locked', eliteTier?.status, 'locked');
  assertEqual('Elite tier expNeeded is 749', eliteTier?.expNeeded, 749);

  const ogTier = ladder.find((t) => t.name === 'OG Player');
  assertEqual('OG Player tier is locked', ogTier?.status, 'locked');
  assertEqual('OG Player tier expNeeded is 23749', ogTier?.expNeeded, 25000 - 1251);

  // 5. Test rank ladder for brand new account (0 EXP)
  const newLadder = getRankLadder(0, thresholds);
  assertEqual('0 EXP Newbie tier is current', newLadder[0].status, 'current');
  assertEqual('0 EXP Visitor tier is locked', newLadder[1].status, 'locked');
  assertEqual('0 EXP Visitor expNeeded is 100', newLadder[1].expNeeded, 100);

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nRank Progression Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.`);
  return allPassed;
}
