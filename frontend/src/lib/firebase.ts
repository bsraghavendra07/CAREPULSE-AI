/**
 * CarePulse — Firebase Client Configuration & Authentication Service.
 *
 * Configures Firebase Authentication and Cloud Firestore for clinical staff login,
 * account registration, persistent sessions, password reset, and cloud records.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';

export const isConfiguredFirebaseKey = true;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBe1KdKLBEHHAG_-91zRRztpmAZOpYU_VQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'carepulse-ai-9cb67.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'carepulse-ai-9cb67',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'carepulse-ai-9cb67.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '10995221107',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:10995221107:web:03f7dac15df3578ab3e006',
};

// Singleton initialization
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Authentication helper functions
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string,
  extraData?: Record<string, any>
) {
  // 1. Create User in Firebase Authentication
  const credential = await createUserWithEmailAndPassword(auth, email, pass);

  // 2. Set Firebase User Display Name
  if (displayName && credential.user) {
    try {
      await updateProfile(credential.user, { displayName });
    } catch (e) {
      console.warn('Could not set displayName on Firebase user:', e);
    }
  }

  // 3. Store User Profile Data in Cloud Firestore
  if (credential.user) {
    try {
      const userRef = doc(db, 'staff_users', credential.user.uid);
      await setDoc(
        userRef,
        {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: displayName || credential.user.displayName || email.split('@')[0],
          role: extraData?.role || 'DOCTOR',
          hospitalName: extraData?.hospital_name || 'CarePulse Medical Center',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...extraData,
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Cloud Firestore write note (if rules require auth):', fsErr);
    }
  }

  return credential;
}

export async function loginWithEmail(email: string, pass: string, rememberMe: boolean = true) {
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  } catch (pErr) {
    console.warn('Persistence setting note:', pErr);
  }
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
