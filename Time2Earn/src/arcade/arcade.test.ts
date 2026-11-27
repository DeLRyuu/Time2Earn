import { runRegistryTests } from './registry.test';
import { runArcadeRewardTests } from './rewards.test';
import { runRunnerTests } from './engine/runner/runner.test';
import { runReactionRushTests } from './games/reaction-rush/logic.test';
import { runKeyboardNinjaTests } from './games/keyboard-ninja/logic.test';
import { runTargetHunterTests } from './games/target-hunter/logic.test';
import { runColorClashTests } from './games/color-clash/logic.test';
import { runTime2RushTests } from './games/time2rush/logic.test';
import { runEndlessRunTests } from './games/endless-run/logic.test';
import { runZombieRunTests } from './games/zombie-run/chaser.test';
import { runBallBounceTests } from './games/ball-bounce/physics.test';

/**
 * Runs the comprehensive test suite for all Cyber Arcade subsystems and cabinets.
 */
export function runAllArcadeTests(): boolean {
  console.log('\n========================================');
  console.log('   TIME2EARN CYBER ARCADE TEST SUITE    ');
  console.log('========================================\n');

  try {
    console.log('[1/11] Registry Tests...');
    runRegistryTests();

    console.log('\n[2/11] Authoritative Rewards Tests...');
    runArcadeRewardTests();

    console.log('\n[3/11] Deterministic Runner Engine Tests...');
    runRunnerTests();

    console.log('\n[4/11] Reaction Rush Cabinet Tests...');
    runReactionRushTests();

    console.log('\n[5/11] Keyboard Ninja Cabinet Tests...');
    runKeyboardNinjaTests();

    console.log('\n[6/11] Target Hunter Cabinet Tests...');
    runTargetHunterTests();

    console.log('\n[7/11] Color Clash Cabinet Tests...');
    runColorClashTests();

    console.log('\n[8/11] Time2Rush Cabinet Tests...');
    runTime2RushTests();

    console.log('\n[9/11] Endless Run Cabinet Tests...');
    runEndlessRunTests();

    console.log('\n[10/11] Zombie Run Cabinet Tests...');
    runZombieRunTests();

    console.log('\n[11/11] Ball Bounce Cabinet Tests...');
    runBallBounceTests();

    console.log('\n========================================');
    console.log('  ALL 11 ARCADE TEST SUITES PASSED!     ');
    console.log('========================================\n');
    return true;
  } catch (err) {
    console.error('\n❌ ARCADE TEST SUITE FAILED:', err);
    return false;
  }
}
