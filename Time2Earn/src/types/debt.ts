export type DebtTier = 'none' | 'low' | 'mid' | 'high';

export interface DebtRecord {
  userId: string;
  username: string;
  amount: number;
  tier: DebtTier;
  daysOverdue: number;
  isRestricted: boolean;
  updatedAt: string;
}

export type DebtPaymentStatus = 'pending' | 'approved' | 'rejected';

export interface DebtPaymentRequest {
  id: string;
  userId: string;
  username: string;
  currentDebt: number;
  creditsToUse: number;
  rateUsed: number; // Strictly 0.4
  phpEquivalent: number;
  note: string;
  requestedAt: string;
  status: DebtPaymentStatus;
  resolvedAt?: string | null;
  rejectNote?: string;
}

export interface DebtHistoryRecord {
  id: string;
  userId: string;
  username?: string;
  adminId: string;
  amount: number;
  action: 'add' | 'deduct' | 'payment';
  note: string;
  createdAt: string;
}
