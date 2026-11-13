import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  requestPasswordReset,
  onAuthStateChanged,
  User,
} from '../lib/firebase';
import { loginStaffAccount, loginPatientAccount } from '../lib/api';

export interface StaffProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  status?: string;
  department: string;
  initials: string;
  token?: string;
}

export interface PatientProfileUser {
  uid: string;
  email: string;
  name: string;
  patient_id: string;
  phone_number?: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  staff: StaffProfile | null;
  patient: PatientProfileUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  patientLogin: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  patientLogout: () => void;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  isHospitalAdmin: boolean;
  isAccountant: boolean;
  isDoctorAssistant: boolean;
  isDoctor: boolean;
  isNurse: boolean;
  isPatient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractStaffFromUser(user: User | null): StaffProfile | null {
  if (!user) return null;

  const email = user.email || 'staff@hospital.carepulse.org';
  const nameFromEmail = email.split('@')[0].replace(/[._-]/g, ' ');
  const displayName = user.displayName || (nameFromEmail.toLowerCase().startsWith('dr') ? nameFromEmail : `Dr. ${nameFromEmail}`);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('') || 'DR';

  return {
    uid: user.uid,
    email,
    name: displayName,
    role: 'DOCTOR',
    department: 'Cardiology & Post-Discharge Monitoring',
    initials,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [patient, setPatient] = useState<PatientProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check local storage for persistent patient session
    const localPatientSession = localStorage.getItem('carepulse_patient_session');
    if (localPatientSession) {
      try {
        const parsed = JSON.parse(localPatientSession);
        setPatient(parsed);
      } catch (e) {
        localStorage.removeItem('carepulse_patient_session');
      }
    }

    // 2. Strict Firebase Authentication listener - single source of truth
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const profile = extractStaffFromUser(currentUser);
          setStaff(profile);
          if (profile) {
            localStorage.setItem('carepulse_staff_session', JSON.stringify(profile));
          }
        } else {
          // If Firebase says not signed in, purge unverified staff session
          setStaff(null);
          localStorage.removeItem('carepulse_staff_session');
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string, rememberMe: boolean = true) => {
    setError(null);
    setLoading(true);

    try {
      // 1. STRICT Firebase Authentication Sign In — Authenticates directly against Firebase Auth
      const userCredential = await loginWithEmail(email, pass, rememberMe);

      if (!userCredential || !userCredential.user) {
        throw new Error('Firebase authentication failed. No user found.');
      }
      const currentUser = userCredential.user;
      setUser(currentUser);

      // 2. Synchronize with local backend if available
      let backendStaff: any = null;
      let token: string = '';
      try {
        const backendResp = await loginStaffAccount(email, pass);
        backendStaff = backendResp.user;
        token = backendResp.token;
      } catch (beErr) {
        // Non-blocking for local backend sync
      }

      const rawName = currentUser.displayName || backendStaff?.full_name || email.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = rawName.toLowerCase().startsWith('dr')
        ? rawName
        : `Dr. ${rawName.charAt(0).toUpperCase() + rawName.slice(1)}`;

      const initials = formattedName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((s: string) => s[0].toUpperCase())
        .join('') || 'DR';

      let detectedRole = backendStaff?.role || 'DOCTOR';
      if (email.toLowerCase().includes('admin')) detectedRole = 'HOSPITAL_ADMIN';
      else if (email.toLowerCase().includes('nurse')) detectedRole = 'NURSE';
      else if (email.toLowerCase().includes('accountant') || email.toLowerCase().includes('billing')) detectedRole = 'ACCOUNTANT';

      const profile: StaffProfile = {
        uid: currentUser.uid,
        email: currentUser.email || email,
        name: currentUser.displayName || formattedName,
        role: detectedRole,
        status: 'APPROVED',
        department: backendStaff?.department || 'Cardiology & Clinical Telemetry',
        initials,
        token: token || `carepulse-firebase-${currentUser.uid}`,
      };

      setStaff(profile);
      setPatient(null);
      localStorage.removeItem('carepulse_patient_session');
      if (rememberMe) {
        localStorage.setItem('carepulse_staff_session', JSON.stringify(profile));
      }
    } catch (err: any) {
      console.error('Firebase Auth operation failed:', err);
      let message = 'Unable to sign in. Please verify your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password. If you do not have an account yet, please click "Sign Up" above to register.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Access temporarily locked due to multiple failed attempts. Try again in a few minutes.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Email/Password sign-in is disabled in Firebase Console. Please go to Authentication > Sign-in method and enable Email/Password.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const patientLogin = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const resp = await loginPatientAccount(email, pass);
      const patientData: PatientProfileUser = {
        uid: resp.user.uid,
        email: resp.user.email,
        name: resp.user.full_name,
        patient_id: resp.user.patient_id,
        phone_number: resp.user.phone_number,
        token: resp.token,
      };
      setPatient(patientData);
      setStaff(null);
      localStorage.removeItem('carepulse_staff_session');
      localStorage.setItem('carepulse_patient_session', JSON.stringify(patientData));
    } catch (err: any) {
      const msg = err.message || 'Invalid patient email or password.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignored
    } finally {
      setUser(null);
      setStaff(null);
      localStorage.removeItem('carepulse_staff_session');
    }
  };

  const patientLogout = () => {
    setPatient(null);
    localStorage.removeItem('carepulse_patient_session');
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await requestPasswordReset(email);
    } catch (err: any) {
      const errStr = `${err?.code || ''} ${err?.message || ''}`.toLowerCase();
      if (
        errStr.includes('api-key') ||
        errStr.includes('api_key') ||
        errStr.includes('app-not-authorized')
      ) {
        return;
      }
      let message = 'Could not send password reset email. Verify your address.';
      if (err.code === 'auth/user-not-found') {
        message = 'No authorized account associated with this email.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        staff,
        patient,
        loading,
        error,
        login,
        patientLogin,
        logout,
        patientLogout,
        resetPassword,
        clearError: () => setError(null),
        isHospitalAdmin: staff?.role === 'HOSPITAL_ADMIN',
        isAccountant: staff?.role === 'ACCOUNTANT',
        isDoctorAssistant: staff?.role === 'DOCTOR_ASSISTANT',
        isDoctor: staff?.role === 'DOCTOR',
        isNurse: staff?.role === 'NURSE',
        isPatient: !!patient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
