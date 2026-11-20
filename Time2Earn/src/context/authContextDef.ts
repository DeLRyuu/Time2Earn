import { createContext } from 'react';
import type { AuthUser } from '../types/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPlayer: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isPlayer: false,
  loading: true,
  error: null,
  login: async () => ({ success: false, error: 'Not initialized' }),
  logout: () => {},
  updatePassword: async () => ({ success: false, error: 'Not initialized' }),
  refreshUser: async () => {},
});
