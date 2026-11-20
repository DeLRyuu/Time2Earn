export type UserRole = 'user' | 'admin';

export interface AuthUser {
  uid: string;
  username: string;
  role: UserRole;
  credits: number;
  exp: number;
  rank: string;
  isBanned: boolean;
  isRestricted: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  birthday?: string;
  totalSessions?: number;
  totalCreditsEarned?: number;
  streak?: number;
  streakRecoveryCharges?: number;
}

export interface UserSession {
  uid: string;
  username: string;
  role: UserRole;
  expiresAt: number;
}
