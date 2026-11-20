export type SessionStatus = 'pending' | 'approved' | 'rejected';

export interface SessionRequest {
  id: string;
  userId: string;
  username: string;
  unitId: string;
  amountPaid: number;
  creditsEarned: number;
  status: SessionStatus;
  requestedAt: string;
  resolvedAt: string | null;
  rejectNote: string;
}

export interface SessionSubmissionParams {
  userId: string;
  username: string;
  unitId: string;
  amountPaid: number;
  phpToCreditRate: number;
}
