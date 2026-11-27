import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'time2earn-mock.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'time2earn-mock',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'time2earn-mock.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Check if valid environment variables exist (bypassed in test mode for mock verification)
export const hasValidFirebaseConfig = Boolean(
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'PASTE_FROM_FIREBASE_CONSOLE' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let functions: Functions;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app);
} catch (err) {
  console.warn('Firebase initialization warning:', err);
  // Fallback app if duplicate or invalid
  app = getApps()[0] || initializeApp(firebaseConfig, 'time2earn-fallback');
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app);
}

export { app, db, auth, functions };
