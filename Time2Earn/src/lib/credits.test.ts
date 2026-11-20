import {
  calculateCreditPreview,
  calculateAwardedCredits,
  calculateAwardedExp,
} from './credits';

// Self-contained test suite executable via Node.js
export function runFormulaTests() {
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

  // 1. Acceptance test: 10 PHP -> 13.80 Credits preview at rate 1.38
  assertEqual(
    'Preview: 10 PHP at rate 1.38 should equal 13.80 Credits',
    calculateCreditPreview(10, 1.38),
    13.80
  );

  // 2. Acceptance test: 10 PHP awarded credits floor rule -> 13 Credits
  assertEqual(
    'Awarded: 10 PHP at rate 1.38 should floor to 13 Credits',
    calculateAwardedCredits(10, 1.38),
    13
  );

  // 3. Historical backup match: 20 PHP at rate 1.38 -> 27.60 preview -> 27 Credits
  assertEqual(
    'Awarded: 20 PHP at rate 1.38 should floor to 27 Credits',
    calculateAwardedCredits(20, 1.38),
    27
  );

  // 4. Historical backup match: 50 PHP at rate 1.49 -> 74.50 preview -> 74 Credits
  assertEqual(
    'Awarded: 50 PHP at rate 1.49 should floor to 74 Credits',
    calculateAwardedCredits(50, 1.49),
    74
  );

  // 5. 1:1 EXP Parity rule: Awarded EXP equals awarded integer credits
  assertEqual(
    'EXP Parity: 27 Credits should award exactly 27 EXP',
    calculateAwardedExp(27),
    27
  );

  assertEqual(
    'Edge Case: 0 PHP should yield 0 credits',
    calculateCreditPreview(0, 1.38),
    0
  );

  assertEqual(
    'Edge Case: Negative PHP should yield 0 credits',
    calculateCreditPreview(-15, 1.38),
    0
  );

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nFormula Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.`);
  return allPassed;
}
