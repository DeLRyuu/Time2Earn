import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../../lib/firebase';

export interface RegisteredUser {
  uid?: string;
  username: string;
  password: string;
  birthday: string;
  gender: 'male' | 'female' | 'other';
  role?: 'user';
  credits?: number;
  exp?: number;
  rank?: string;
  streak?: number;
  createdAt?: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  birthday: string;
  gender: 'male' | 'female' | 'other';
}

const STORAGE_KEY = 't2e_registered_users';
const PREFILL_KEY = 't2e_prefill_login';

export function getRegisteredUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RegisteredUser[]) : [];
  } catch {
    return [];
  }
}

export async function saveRegisteredUser(
  payload: RegisterPayload
): Promise<{ success: boolean; error?: string; user?: RegisteredUser }> {
  const cleanUsername = payload.username.trim();

  // Basic validation rules
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return { success: false, error: 'Username may only contain letters, numbers, and underscores.' };
  }
  if (!payload.password || payload.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  if (!payload.birthday) {
    return { success: false, error: 'Please enter your birthday.' };
  }

  // Prevent collision with system usernames
  const reservedNames = ['admin', 'staff', 'system', 'root', 'support'];
  if (reservedNames.includes(cleanUsername.toLowerCase())) {
    return { success: false, error: 'This username is reserved. Please pick another one.' };
  }

  const existingLocal = getRegisteredUsers();
  if (existingLocal.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
    return { success: false, error: 'Username is already taken in registered roster.' };
  }

  let generatedUid = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // If Firebase is configured, check and persist to Firestore
  if (hasValidFirebaseConfig) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { success: false, error: 'Username is already taken.' };
      }

      const nowIso = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'users'), {
        username: cleanUsername,
        password: payload.password,
        birthday: payload.birthday,
        gender: payload.gender,
        role: 'user',
        credits: 0,
        exp: 0,
        rank: 'Newbie',
        streak: 0,
        streakRecoveryCharges: 1,
        isBanned: false,
        isRestricted: false,
        mustChangePassword: false,
        totalSessions: 0,
        totalCreditsEarned: 0,
        createdAt: nowIso,
        lastLoginAt: nowIso,
      });
      generatedUid = docRef.id;
    } catch (err) {
      console.warn('Firebase registration failed, falling back to local storage:', err);
    }
  }

  const newUser: RegisteredUser = {
    uid: generatedUid,
    username: cleanUsername,
    password: payload.password,
    birthday: payload.birthday,
    gender: payload.gender,
    role: 'user',
    credits: 0,
    exp: 0,
    rank: 'Newbie',
    streak: 0,
    createdAt: new Date().toISOString(),
  };

  // Always update local roster for instant demo & offline switching
  const nextUsers = [...existingLocal.filter((u) => u.username.toLowerCase() !== cleanUsername.toLowerCase()), newUser];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUsers));
    localStorage.setItem(
      PREFILL_KEY,
      JSON.stringify({ username: cleanUsername, password: payload.password })
    );
  } catch (err) {
    console.error('Failed to save user to localStorage:', err);
  }

  return { success: true, user: newUser };
}

export function consumePrefillLogin(): { username: string; password: string } | null {
  try {
    const raw = localStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    localStorage.removeItem(PREFILL_KEY);
    return JSON.parse(raw) as { username: string; password: string };
  } catch {
    return null;
  }
}

export function removeRegisteredUser(username: string): void {
  try {
    const existing = getRegisteredUsers();
    const filtered = existing.filter((u) => u.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Could not remove registered user:', err);
  }
}