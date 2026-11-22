import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import type { AuthUser, UserSession } from '../types/auth';
import { AuthContext } from './authContextDef';
import { assertRateLimit, RATE_LIMITS } from '../lib/rateLimit';
import { getRegisteredUsers } from '../pages/auth/authRegistration';

const SESSION_STORAGE_KEY = 't2e_auth_session';

// Built-in test accounts for offline/demo & emulator testing
const MOCK_TEST_USERS: Record<string, { uid: string; password: string; role: 'user' | 'admin'; credits: number; exp: number; rank: string; streak?: number }> = {
  'lois_123xx': { uid: '1DrJrVqcwfULvzDyyLV5S8b8ST03', password: 'password123', role: 'user', credits: 332, exp: 1251, rank: 'Gamer', streak: 3 },
  'sherwin': { uid: 'sherwin_uid', password: 'password123', role: 'user', credits: 140, exp: 641, rank: 'Grinder', streak: 1 },
  'Phay': { uid: 'M6JcK40OKuYGxFVH5pJaXsKwjBE3', password: 'password123', role: 'user', credits: 0, exp: 0, rank: 'Newbie', streak: 0 },
  'admin': { uid: 'admin_test_uid', password: 'adminpassword123', role: 'admin', credits: 9999, exp: 25000, rank: 'OG Player', streak: 10 },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const sanitizeUserData = (docId: string, data: Record<string, unknown>): AuthUser => {
    return {
      uid: docId,
      username: String(data.username || ''),
      role: data.role === 'admin' ? 'admin' : 'user',
      credits: Number(data.credits ?? 0),
      exp: Number(data.exp ?? 0),
      rank: String(data.rank || 'Newbie'),
      isBanned: Boolean(data.isBanned),
      isRestricted: Boolean(data.isRestricted),
      mustChangePassword: Boolean(data.mustChangePassword),
      birthday: data.birthday ? String(data.birthday) : undefined,
      totalSessions: data.totalSessions ? Number(data.totalSessions) : undefined,
      totalCreditsEarned: data.totalCreditsEarned ? Number(data.totalCreditsEarned) : undefined,
      streak: data.streak ? Number(data.streak) : undefined,
      streakRecoveryCharges: data.streakRecoveryCharges ? Number(data.streakRecoveryCharges) : undefined,
      lastLoginAt: data.lastLoginAt ? String(data.lastLoginAt) : undefined,
    };
  };

  const rehydrateSession = useCallback(async () => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        setLoading(false);
        return;
      }

      const session: UserSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setLoading(false);
        return;
      }

      if (hasValidFirebaseConfig) {
        const userRef = doc(db, 'users', session.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const authUser = sanitizeUserData(snap.id, snap.data());
          if (authUser.isBanned) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setUser(null);
          } else {
            setUser(authUser);
          }
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } else {
        // Fallback rehydration using test data or locally registered accounts
        const mock = MOCK_TEST_USERS[session.username];
        if (mock) {
          setUser({
            uid: mock.uid || session.uid,
            username: session.username,
            role: mock.role,
            credits: mock.credits,
            exp: mock.exp,
            rank: mock.rank,
            streak: mock.streak,
            isBanned: false,
            isRestricted: false,
            mustChangePassword: false,
          });
        } else {
          const registered = getRegisteredUsers().find(
            (u) => u.username.toLowerCase() === session.username.toLowerCase()
          );
          if (registered) {
            setUser({
              uid: registered.uid || session.uid,
              username: registered.username,
              role: 'user',
              credits: registered.credits ?? 0,
              exp: registered.exp ?? 0,
              rank: registered.rank ?? 'Newbie',
              streak: registered.streak ?? 0,
              birthday: registered.birthday,
              isBanned: false,
              isRestricted: false,
              mustChangePassword: false,
            });
          } else {
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to rehydrate session:', err);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const runRehydration = async () => {
      await rehydrateSession();
      if (!active) return;
    };
    runRehydration();
    return () => {
      active = false;
    };
  }, [rehydrateSession]);

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const cleanUsername = usernameInput.trim();

    if (!cleanUsername || !passwordInput) {
      const msg = 'Please provide both username and password.';
      setError(msg);
      return { success: false, error: msg };
    }

    // Rate limiting to prevent brute-force credential stuffing
    try {
      assertRateLimit(cleanUsername.toLowerCase(), RATE_LIMITS.AUTH_LOGIN, 'login attempts');
    } catch (rateErr) {
      const msg = rateErr instanceof Error ? rateErr.message : 'Too many login attempts. Please wait.';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      if (hasValidFirebaseConfig) {
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const querySnapshot = await getDocs(q);

        const genericAuthError = 'Invalid username or password.';

        if (querySnapshot.empty) {
          setError(genericAuthError);
          return { success: false, error: genericAuthError };
        }

        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();

        // Safe credential check (constant-time equivalent / anti-enumeration)
        if (data.password !== passwordInput) {
          setError(genericAuthError);
          return { success: false, error: genericAuthError };
        }

        if (data.isBanned) {
          const msg = 'This account has been banned. Please inquire at shop counter.';
          setError(msg);
          return { success: false, error: msg };
        }

        const authUser = sanitizeUserData(userDoc.id, data);
        const nowIso = new Date().toISOString();
        authUser.lastLoginAt = nowIso;

        // Persist session (7 days)
        const session: UserSession = {
          uid: authUser.uid,
          username: authUser.username,
          role: authUser.role,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

        // Update last login timestamp in Firestore
        try {
          await updateDoc(doc(db, 'users', authUser.uid), { lastLoginAt: nowIso });
        } catch (e) {
          console.warn('Could not update lastLoginAt in Firestore:', e);
        }

        setUser(authUser);
        return { success: true };
      } else {
        // Offline / Test mock authentication or registered local accounts
        const mock = MOCK_TEST_USERS[cleanUsername];
        if (mock) {
          if (mock.password !== passwordInput) {
            const msg = 'Incorrect password for test account.';
            setError(msg);
            return { success: false, error: msg };
          }

          const authUser: AuthUser = {
            uid: mock.uid || (cleanUsername === 'admin' ? 'admin_test_uid' : 'player_test_uid'),
            username: cleanUsername,
            role: mock.role,
            credits: mock.credits,
            exp: mock.exp,
            rank: mock.rank,
            streak: mock.streak,
            isBanned: false,
            isRestricted: false,
            mustChangePassword: false,
            lastLoginAt: new Date().toISOString(),
          };

          const session: UserSession = {
            uid: authUser.uid,
            username: authUser.username,
            role: authUser.role,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          };
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
          setUser(authUser);
          return { success: true };
        }

        // Check if user is in registered roster
        const registered = getRegisteredUsers().find(
          (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
        );
        if (registered) {
          if (registered.password !== passwordInput) {
            const msg = 'Incorrect password for registered account.';
            setError(msg);
            return { success: false, error: msg };
          }

          const authUser: AuthUser = {
            uid: registered.uid || `local_${registered.username}`,
            username: registered.username,
            role: 'user',
            credits: registered.credits ?? 0,
            exp: registered.exp ?? 0,
            rank: registered.rank ?? 'Newbie',
            streak: registered.streak ?? 0,
            birthday: registered.birthday,
            isBanned: false,
            isRestricted: false,
            mustChangePassword: false,
            lastLoginAt: new Date().toISOString(),
          };

          const session: UserSession = {
            uid: authUser.uid,
            username: authUser.username,
            role: authUser.role,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          };
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
          setUser(authUser);
          return { success: true };
        }

        const msg = `Account "${cleanUsername}" not found. (Test accounts: lois_123xx, sherwin, admin or register a new account)`;
        setError(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not signed in.' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      if (hasValidFirebaseConfig) {
        await updateDoc(doc(db, 'users', user.uid), {
          password: newPassword,
          mustChangePassword: false,
        });
      }
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      return { success: true };
    } catch (err) {
      console.error('Password update failed:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update password.' };
    }
  };

  const refreshUser = async () => {
    if (!user || !hasValidFirebaseConfig) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUser(sanitizeUserData(snap.id, snap.data()));
      }
    } catch (err) {
      console.warn('Could not refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isPlayer: user?.role === 'user',
        loading,
        error,
        login,
        logout,
        updatePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
