import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword as updateFirebasePassword,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { db, auth, hasValidFirebaseConfig } from '../lib/firebase';
import type { AuthUser } from '../types/auth';
import { AuthContext } from './authContextDef';
import { assertRateLimit, RATE_LIMITS } from '../lib/rateLimit';
import { usernameToAuthEmail } from '../lib/authEmail';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(hasValidFirebaseConfig && auth));
  const [error, setError] = useState<string | null>(null);

  const sanitizeUserData = useCallback((docId: string, data: Record<string, unknown>): AuthUser => {
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
  }, []);

  // Real Firebase Auth state listener
  useEffect(() => {
    let active = true;

    if (!hasValidFirebaseConfig || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      try {
        if (fbUser) {
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);
          if (!active) return;
          if (snap.exists()) {
            const authUser = sanitizeUserData(snap.id, snap.data());
            if (authUser.isBanned) {
              await signOut(auth);
              if (active) setUser(null);
            } else {
              if (active) setUser(authUser);
            }
          } else {
            if (active) setUser(null);
          }
        } else {
          if (active) setUser(null);
        }
      } catch (err) {
        console.error('Error fetching Firestore user profile:', err);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [sanitizeUserData]);

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    setError(null);
    const cleanUsername = usernameInput.trim();

    if (!cleanUsername || !passwordInput) {
      const msg = 'Please provide both username and password.';
      setError(msg);
      return { success: false, error: msg };
    }

    // Rate limiting to prevent brute-force attacks
    try {
      assertRateLimit(cleanUsername.toLowerCase(), RATE_LIMITS.AUTH_LOGIN, 'login attempts');
    } catch (rateErr) {
      const msg = rateErr instanceof Error ? rateErr.message : 'Too many login attempts. Please wait.';
      setError(msg);
      return { success: false, error: msg };
    }

    if (hasValidFirebaseConfig) {
      const genericAuthError = 'Invalid username or password.';
      try {
        const authEmail = usernameToAuthEmail(cleanUsername);
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, passwordInput);
        const fbUser = userCredential.user;

        // Load user doc from Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await signOut(auth);
          setError(genericAuthError);
          return { success: false, error: genericAuthError };
        }

        const data = snap.data();
        if (data.isBanned) {
          await signOut(auth);
          const msg = 'This account has been banned. Please inquire at shop counter.';
          setError(msg);
          return { success: false, error: msg };
        }

        const authUser = sanitizeUserData(snap.id, data);
        const nowIso = new Date().toISOString();
        authUser.lastLoginAt = nowIso;

        // Update last login in Firestore
        try {
          await updateDoc(userRef, { lastLoginAt: nowIso });
        } catch (e) {
          console.warn('Could not update lastLoginAt in Firestore:', e);
        }

        setUser(authUser);
        return { success: true, user: authUser };
      } catch (err: unknown) {
        console.error('Firebase Auth login failed:', err);
        const authErr = err as { code?: string; message?: string };
        if (
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/wrong-password' ||
          authErr.code === 'auth/invalid-credential'
        ) {
          setError(genericAuthError);
          return { success: false, error: genericAuthError };
        }
        const msg = authErr.message || 'An error occurred during authentication.';
        setError(msg);
        return { success: false, error: msg };
      }
    } else {
      const msg = 'Firebase configuration missing or unavailable. Please configure Firebase to sign in.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      if (hasValidFirebaseConfig && auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setUser(null);
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not signed in.' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      if (hasValidFirebaseConfig) {
        if (auth.currentUser) {
          await updateFirebasePassword(auth.currentUser, newPassword);
        }
        // Update mustChangePassword: false in Firestore (and sync password field until scrubbed)
        await updateDoc(doc(db, 'users', user.uid), {
          password: newPassword,
          mustChangePassword: false,
        });
      }
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      return { success: true };
    } catch (err: unknown) {
      console.error('Password update failed:', err);
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === 'auth/requires-recent-login') {
        return {
          success: false,
          error: 'Security timeout: please sign out and sign back in to update your password.',
        };
      }
      return { success: false, error: authErr.message || 'Failed to update password.' };
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
