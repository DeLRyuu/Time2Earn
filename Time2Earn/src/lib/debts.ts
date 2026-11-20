import type { DebtTier } from '../types/debt';
import type { DebtTiers } from '../types/config';

/**
 * Strict Rule: Debt payments with credits use rateUsed = 0.4
 * Contract: docs/T2E_SCHEMA.md Section 3.5
 * 1 Credit = ₱0.40 debt relief (Verified from firestire_backup record vYDmlZaxUAayHNOthrBH)
 */
export const DEBT_CREDIT_RATE = 0.4;

export const DEFAULT_DEBT_TIERS: DebtTiers = {
  low: 10,
  mid: 20,
  high: 30,
};

/**
 * Calculates debt tier and restriction status based on amount in PHP
 */
export function calculateDebtTier(
  amount: number,
  tiers: DebtTiers = DEFAULT_DEBT_TIERS
): { tier: DebtTier; isRestricted: boolean } {
  const safeAmount = Math.max(0, amount);

  if (safeAmount < tiers.low) {
    return { tier: 'none', isRestricted: false };
  }
  if (safeAmount < tiers.mid) {
    return { tier: 'low', isRestricted: false };
  }
  if (safeAmount < tiers.high) {
    return { tier: 'mid', isRestricted: false };
  }
  return { tier: 'high', isRestricted: true };
}

/**
 * Calculates the PHP debt relief from credits
 * Exact formula: creditsToUse * 0.4
 */
export function calculateDebtPaymentPhp(
  creditsToUse: number,
  rate: number = DEBT_CREDIT_RATE
): number {
  if (creditsToUse <= 0 || rate <= 0) return 0;
  return Number((creditsToUse * rate).toFixed(2));
}

/**
 * Calculates remaining debt balance, new tier, and restriction status after payment
 */
export function calculateRemainingDebt(
  currentDebt: number,
  creditsToUse: number,
  rate: number = DEBT_CREDIT_RATE,
  tiers: DebtTiers = DEFAULT_DEBT_TIERS
): {
  phpEquivalent: number;
  remainingDebt: number;
  newTier: DebtTier;
  isRestricted: boolean;
} {
  const phpEquivalent = calculateDebtPaymentPhp(creditsToUse, rate);
  const remainingDebt = Math.max(0, Number((currentDebt - phpEquivalent).toFixed(2)));
  const { tier: newTier, isRestricted } = calculateDebtTier(remainingDebt, tiers);

  return {
    phpEquivalent,
    remainingDebt,
    newTier,
    isRestricted,
  };
}
