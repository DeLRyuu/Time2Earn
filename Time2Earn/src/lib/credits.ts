/**
 * Credit & EXP Calculations for Play & Earn Sessions
 * Contract: docs/T2E_SCHEMA.md
 */

/**
 * Calculates raw credits preview (float, 2 decimals)
 * Formula: amountPaid * phpToCreditRate
 * Example: ₱10.00 @ 1.38 rate = 13.80 Credits
 */
export function calculateCreditPreview(amountPaid: number, phpToCreditRate: number): number {
  if (amountPaid <= 0 || phpToCreditRate <= 0) return 0;
  return Number((amountPaid * phpToCreditRate).toFixed(2));
}

/**
 * Calculates authoritative award integer credits
 * Formula: Math.floor(amountPaid * phpToCreditRate)
 * Example: ₱20.00 @ 1.38 rate = 27.60 -> 27 Credits
 */
export function calculateAwardedCredits(amountPaid: number, phpToCreditRate: number): number {
  if (amountPaid <= 0 || phpToCreditRate <= 0) return 0;
  return Math.floor(amountPaid * phpToCreditRate);
}

/**
 * Authoritative EXP awarded on session approval
 * 1:1 parity with awarded integer credits per verified schema and approval logs
 */
export function calculateAwardedExp(awardedCredits: number): number {
  return Math.max(0, awardedCredits);
}
