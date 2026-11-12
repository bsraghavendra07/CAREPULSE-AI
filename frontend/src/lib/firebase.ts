/**
 * CAREPULSE 1.0 — Firebase Client Configuration & Authentication Service.
 *
 * Configures Firebase Authentication for Email/Password clinical login,
 * persistent sessions, password reset, and ID token retrieval for backend verification.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User,
  Auth,
} from 'firebase/auth';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyD-carepulse-demo-clinical-key-99',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'carepulse-hospital.firebaseapp.com',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || 'carepulse-hospital',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'carepulse-hospital.appspot.com',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '918273645019',
  appId: metaEnv.VITE_FIREBASE_APP_ID || '1:918273645019:web:abcdef1234567890',
};

// Singleton initialization
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

// Authentication helper functions
export async function loginWithEmail(email: string, pass: string, rememberMe: boolean = true) {
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, pass);
}

export async function logoutUser() {
  return signOut(auth);
}

export async function requestPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export { onAuthStateChanged };
export type { User };
