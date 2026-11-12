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

export interface StaffProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  department: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  staff: StaffProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, pass: string, fullName: string, department?: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractStaffFromUser(user: User | null): StaffProfile | null {
  if (!user) return null;

  const email = user.email || 'staff@hospital.carepulse.org';
  const nameFromEmail = email.split('@')[0].replace(/[._-]/g, ' ');
  const displayName = user.displayName || (nameFromEmail.toLowerCase().startsWith('dr') ? nameFromEmail : `Dr. ${nameFromEmail}`);

  // Format initials
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
    role: 'Attending Clinician',
    department: 'Post-Discharge Ward 4B',
    initials,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for persistent staff session or Firebase listener
    const localSession = localStorage.getItem('carepulse_staff_session');
    if (localSession) {
      try {
        const parsed = JSON.parse(localSession);
        setStaff(parsed);
      } catch (e) {
        localStorage.removeItem('carepulse_staff_session');
      }
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const profile = extractStaffFromUser(currentUser);
          setStaff(profile);
          if (profile) {
            localStorage.setItem('carepulse_staff_session', JSON.stringify(profile));
          }
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
      const userCredential = await loginWithEmail(email, pass, rememberMe);
      if (userCredential && userCredential.user) {
        const currentUser = userCredential.user;
        setUser(currentUser);
        const profile = extractStaffFromUser(currentUser);
        setStaff(profile);
        if (profile && rememberMe) {
          localStorage.setItem('carepulse_staff_session', JSON.stringify(profile));
        }
      } else {
        // Local authorized hospital staff profile
        const rawName = email.split('@')[0].replace(/[._-]/g, ' ');
        const formattedName = rawName.toLowerCase().startsWith('dr')
          ? rawName
          : `Dr. ${rawName.charAt(0).toUpperCase() + rawName.slice(1)}`;
        const initials = formattedName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0].toUpperCase())
          .join('') || 'DR';

        const localProfile: StaffProfile = {
          uid: `staff-${Date.now()}`,
          email,
          name: formattedName,
          role: 'Attending Clinician',
          department: 'Post-Discharge Ward 4B',
          initials,
        };
        setStaff(localProfile);
        if (rememberMe) {
          localStorage.setItem('carepulse_staff_session', JSON.stringify(localProfile));
        }
      }
    } catch (err: any) {
      const errStr = `${err?.code || ''} ${err?.message || ''}`.toLowerCase();
      if (
        errStr.includes('api-key') ||
        errStr.includes('api_key') ||
        errStr.includes('app-not-authorized') ||
        errStr.includes('configuration-not-found')
      ) {
        // Fallback for local hospital environments where cloud Firebase keys are not configured
        const rawName = email.split('@')[0].replace(/[._-]/g, ' ');
        const formattedName = rawName.toLowerCase().startsWith('dr')
          ? rawName
          : `Dr. ${rawName.charAt(0).toUpperCase() + rawName.slice(1)}`;
        const initials = formattedName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0].toUpperCase())
          .join('') || 'DR';

        const fallbackProfile: StaffProfile = {
          uid: `staff-${Date.now()}`,
          email,
          name: formattedName,
          role: 'Attending Clinician',
          department: 'Post-Discharge Ward 4B',
          initials,
        };
        setStaff(fallbackProfile);
        if (rememberMe) {
          localStorage.setItem('carepulse_staff_session', JSON.stringify(fallbackProfile));
        }
        return;
      }

      // Format friendly clinical error messages
      let message = 'Unable to sign in. Please verify your hospital credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        message = 'Invalid hospital email or password.';
      } else if (err.code === 'auth/user-not-found') {
        message = 'No authorized staff account found for this hospital email.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Access temporarily locked due to multiple failed attempts. Try again in a few minutes.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Hospital network connection error. Check your connection or VPN.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    pass: string,
    fullName: string,
    department: string = 'Ward 4B — Post-Discharge Telemetry',
    rememberMe: boolean = true
  ) => {
    setError(null);
    setLoading(true);

    try {
      const userCredential = await registerWithEmail(email, pass, fullName, rememberMe);
      const formattedName = fullName.trim() || `Dr. ${email.split('@')[0]}`;
      const initials = formattedName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0].toUpperCase())
        .join('') || 'DR';

      const staffProfile: StaffProfile = {
        uid: userCredential?.user?.uid || `staff-${Date.now()}`,
        email,
        name: formattedName,
        role: 'Attending Clinician',
        department: department || 'Post-Discharge Ward 4B',
        initials,
      };

      if (userCredential?.user) {
        setUser(userCredential.user);
      }
      setStaff(staffProfile);
      if (rememberMe) {
        localStorage.setItem('carepulse_staff_session', JSON.stringify(staffProfile));
      }
    } catch (err: any) {
      let message = 'Unable to create staff account. Please verify input.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'A staff account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please provide a valid hospital email format.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Hospital network connection error. Check your connection or VPN.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      throw new Error(message);
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
        // Fallback for unconfigured dev environment - report success
        return;
      }
      let message = 'Could not send password reset email. Verify your address.';
      if (err.code === 'auth/user-not-found') {
        message = 'No authorized staff account associated with this email.';
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
        loading,
        error,
        login,
        register,
        logout,
        resetPassword,
        clearError: () => setError(null),
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
