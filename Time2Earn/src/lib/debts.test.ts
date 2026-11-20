import {
  calculateDebtTier,
  calculateDebtPaymentPhp,
  calculateRemainingDebt,
  DEBT_CREDIT_RATE,
} from './debts';

export function runDebtCalculationTests() {
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

  // 1. Acceptance Test: 38 credits @ rate 0.4 equals exactly 15.20 PHP
  assertEqual(
    'Payment Rate: 38 Credits at 0.4 rate should yield ₱15.20 PHP equivalent',
    calculateDebtPaymentPhp(38, DEBT_CREDIT_RATE),
    15.20
  );

  // 2. Acceptance Test: 100 credits @ 0.4 rate equals ₱40.00 PHP
  assertEqual(
    'Payment Rate: 100 Credits at 0.4 rate should yield ₱40.00 PHP',
    calculateDebtPaymentPhp(100, DEBT_CREDIT_RATE),
    40.00
  );

  // 3. Edge cases for rate
  assertEqual('Edge Case: 0 credits should yield ₱0.00', calculateDebtPaymentPhp(0), 0);
  assertEqual('Edge Case: negative credits should yield ₱0.00', calculateDebtPaymentPhp(-10), 0);

  // 4. Debt Tier Calculations
  // Tier: None (< 10)
  const tierNone = calculateDebtTier(5.0);
  assertEqual('Tier None: ₱5.00 debt tier', tierNone.tier, 'none');
  assertEqual('Tier None: isRestricted should be false', tierNone.isRestricted, false);

  // Tier: Low (10 - 19.99)
  const tierLow = calculateDebtTier(15.0);
  assertEqual('Tier Low: ₱15.00 debt tier', tierLow.tier, 'low');
  assertEqual('Tier Low: isRestricted should be false', tierLow.isRestricted, false);

  // Tier: Mid (20 - 29.99)
  const tierMid = calculateDebtTier(25.0);
  assertEqual('Tier Mid: ₱25.00 debt tier', tierMid.tier, 'mid');
  assertEqual('Tier Mid: isRestricted should be false', tierMid.isRestricted, false);

  // Tier: High (>= 30) - Must restrict player
  const tierHigh = calculateDebtTier(30.0);
  assertEqual('Tier High: ₱30.00 boundary tier', tierHigh.tier, 'high');
  assertEqual('Tier High: isRestricted should be true', tierHigh.isRestricted, true);

  const tierHighAbove = calculateDebtTier(50.0);
  assertEqual('Tier High Above: ₱50.00 debt tier', tierHighAbove.tier, 'high');
  assertEqual('Tier High Above: isRestricted should be true', tierHighAbove.isRestricted, true);

  // 5. Debt Remaining & State Transitions
  // Exact historical case: NINI123 (₱15 debt paying with 38 credits @ 0.4 -> ₱15.20)
  const niniOutcome = calculateRemainingDebt(15.0, 38);
  assertEqual('NINI123 Payment: phpEquivalent is 15.20', niniOutcome.phpEquivalent, 15.20);
  assertEqual('NINI123 Payment: remainingDebt floors at 0.00', niniOutcome.remainingDebt, 0.00);
  assertEqual('NINI123 Payment: newTier becomes none', niniOutcome.newTier, 'none');
  assertEqual('NINI123 Payment: isRestricted is false', niniOutcome.isRestricted, false);

  // Partial payment unlocking restriction (₱35 debt -> pays 25 credits = ₱10 -> remaining ₱25 -> mid tier, unblocks)
  const unblockOutcome = calculateRemainingDebt(35.0, 25);
  assertEqual('Unblock Payment: remainingDebt is 25.00', unblockOutcome.remainingDebt, 25.00);
  assertEqual('Unblock Payment: newTier drops to mid', unblockOutcome.newTier, 'mid');
  assertEqual('Unblock Payment: isRestricted automatically unlocks to false', unblockOutcome.isRestricted, false);

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nDebt Calculation Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.`);
  return allPassed;
}
