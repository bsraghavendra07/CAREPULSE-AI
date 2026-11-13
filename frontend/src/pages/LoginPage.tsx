import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  KeyRound,
  UserCheck,
} from 'lucide-react';

export function LoginPage() {
  const { login, resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check state from any redirect
  const registeredMsg = (location.state as any)?.message;

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formValidationMsg, setFormValidationMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormValidationMsg('Please enter your work email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormValidationMsg('Please enter a valid work email format.');
      return;
    }
    if (!password) {
      setFormValidationMsg('Please enter your password.');
      return;
    }

    // Role isolation: verify patient accounts cannot log into hospital staff dashboard
    if (trimmedEmail.toLowerCase().includes('patient@') || trimmedEmail.toLowerCase().startsWith('patient.')) {
      setFormValidationMsg('Patient accounts are not permitted in the Hospital Staff Portal.');
      return;
    }

    try {
      await login(trimmedEmail, password, rememberMe);
      // Route based on verified hospital role
      if (trimmedEmail.toLowerCase().includes('accountant') || trimmedEmail.toLowerCase().includes('billing')) {
        navigate('/billing', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // Error message handled by AuthContext error state
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationMsg(null);

    const trimmed = resetEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormValidationMsg('Please enter a valid work email to receive password reset instructions.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(trimmed);
      setResetSuccess(true);
    } catch {
      // Handled by AuthContext
    } finally {
      setResetLoading(false);
    }
  };

  const handleQuickFill = (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    clearError();
    setFormValidationMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#00A896] selection:text-white">
      {/* 2-COLUMN MAIN CARD CONTAINER */}
      <div className="w-full max-w-4xl lg:max-w-5xl bg-white rounded-3xl sm:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] border border-[#E2E8F0] overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[580px] lg:min-h-[620px] transition-all">
        
        {/* ──────── LEFT SIDE – BRANDING ──────── */}
        <div className="relative hidden md:flex flex-col justify-between p-8 lg:p-12 overflow-hidden bg-slate-900 select-none">
          {/* Professional Doctor Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: "url('/doctor-clean.jpg')" }}
          />

          {/* Subtle Light-Blue / Medical-Steel Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#102A45]/95 via-[#183E66]/50 to-[#2A6296]/20 backdrop-blur-[0.5px]" />

          {/* Top Pill / Badge */}
          <div className="relative z-10 flex items-center space-x-2 text-white/95 text-xs font-semibold bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 w-fit shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#00D2C4] animate-pulse" />
            <span>CarePulse Telemetry Network</span>
          </div>

          {/* Bottom Branding Content: Official Logo + Tagline */}
          <div className="relative z-10 space-y-3 pt-32">
            {/* Circular CarePulse Logo Icon */}
            <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 shadow-lg flex items-center justify-center">
              <img
                src="/carepulse-icon-trimmed.png"
                alt="CarePulse"
                className="h-full w-full object-contain drop-shadow"
              />
            </div>

            {/* Official Brand Name */}
            <div>
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-wider drop-shadow-md">
                CAREPULSE
              </h2>
              {/* Tagline */}
              <p className="text-sm font-semibold text-white/95 tracking-wide drop-shadow mt-1">
                Always Watching. Always Caring.
              </p>
            </div>
          </div>
        </div>

        {/* ──────── RIGHT SIDE – LOGIN FORM ──────── */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
          
          <div>
            {/* CarePulse Logo at Top of Form */}
            <div className="flex items-center space-x-2.5">
              <img
                src="/carepulse-icon-trimmed.png"
                alt="CarePulse"
                className="h-8 w-8 object-contain"
              />
              <span className="text-base font-black tracking-tight text-[#131E3A]">
                CAREPULSE
              </span>
            </div>

            {/* Heading & Subtitle */}
            <div className="mt-6 mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-[#131E3A] tracking-tight">
                {isForgotMode ? 'Reset Password' : 'Hospital Staff Login'}
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1.5">
                {isForgotMode
                  ? 'Enter your work email to receive password reset instructions.'
                  : 'Secure access for authorized hospital staff.'}
              </p>
            </div>

            {/* Success Banner (e.g. from registration or reset) */}
            {registeredMsg && !error && (
              <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs flex items-start space-x-2 text-amber-900 shadow-xs animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed font-medium">{registeredMsg}</span>
              </div>
            )}

            {/* Error Banner */}
            {(error || formValidationMsg) && (
              <div
                className={`mb-4 rounded-2xl border p-3.5 text-xs flex items-start space-x-2.5 animate-in fade-in ${
                  (error || '').toLowerCase().includes('approval') ||
                  (error || '').toLowerCase().includes('submitted')
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <AlertCircle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    (error || '').toLowerCase().includes('approval') ||
                    (error || '').toLowerCase().includes('submitted')
                      ? 'text-amber-600'
                      : 'text-red-500'
                  }`}
                />
                <span className="leading-snug">{error || formValidationMsg}</span>
              </div>
            )}

            {!isForgotMode ? (
              /* ── MAIN LOGIN FORM ── */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Work Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#131E3A] mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formValidationMsg) setFormValidationMsg(null);
                    }}
                    placeholder="Enter your work email"
                    required
                    autoComplete="email"
                    className="w-full rounded-full border border-[#D9E2EC] bg-white px-4 py-2.5 sm:py-3 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-2 focus:ring-[#00A896]/20 transition-all shadow-2xs"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#131E3A] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formValidationMsg) setFormValidationMsg(null);
                      }}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-full border border-[#D9E2EC] bg-white pl-4 pr-11 py-2.5 sm:py-3 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-2 focus:ring-[#00A896]/20 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#131E3A] transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-[#64748B] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#D9E2EC] text-[#00A896] focus:ring-[#00A896]"
                    />
                    <span>Remember Me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setFormValidationMsg(null);
                      setResetEmail(email);
                      setIsForgotMode(true);
                    }}
                    className="font-semibold text-[#00A896] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Sign In Button with CarePulse Teal Gradient */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 sm:py-3.5 px-6 rounded-full bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-[0_4px_16px_rgba(0,168,150,0.35)] transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── FORGOT PASSWORD FLOW ── */
              <div className="space-y-4">
                {resetSuccess ? (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Password reset instructions have been dispatched to your email.</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsForgotMode(false);
                        setResetSuccess(false);
                      }}
                      className="w-full py-2.5 rounded-full bg-[#131E3A] text-white font-bold text-xs hover:bg-[#1a294d] transition-colors"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#131E3A] mb-1.5">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="doctor@hospital.carepulse.org"
                        required
                        className="w-full rounded-full border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-2 focus:ring-[#00A896]/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-sm shadow-[0_4px_16px_rgba(0,168,150,0.35)] flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending Instructions...</span>
                        </>
                      ) : (
                        <span>Send Password Reset Link</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(false);
                        clearError();
                        setFormValidationMsg(null);
                      }}
                      className="w-full py-2 text-xs font-semibold text-[#64748B] hover:text-[#131E3A] transition-colors text-center block"
                    >
                      Cancel and Return to Sign In
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ──────── FOOTER SECTION: SECURITY MESSAGE & DEMO ROLES ──────── */}
          <div className="pt-6 mt-6 border-t border-[#F0F4F8] space-y-3">
            {/* Authorized Hospital Staff Only */}
            <div className="flex items-center justify-center space-x-1.5 text-xs font-medium text-[#64748B]">
              <ShieldCheck className="h-4 w-4 text-[#00A896]" />
              <span>Authorized Hospital Staff Only</span>
            </div>

            {/* Pre-configured Demo Staff Roles */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block text-center">
                Demo Staff Accounts
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickFill('dr.rivera@hospital.carepulse.org', 'DoctorPassword123!')}
                  className="py-1.5 px-2 rounded-xl bg-[#F0F7FF] hover:bg-[#E1EFFF] border border-[#D0E2FF] text-[#1E40AF] font-semibold text-center transition-colors truncate"
                  title="Dr. Rivera (Cardiology)"
                >
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@hospital.carepulse.org', 'AdminPassword123!')}
                  className="py-1.5 px-2 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] font-semibold text-center transition-colors truncate"
                  title="Hospital Admin"
                >
                  Hospital Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('nurse.chen@hospital.carepulse.org', 'NursePassword123!')}
                  className="py-1.5 px-2 rounded-xl bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#E9D5FF] text-[#6B21A8] font-semibold text-center transition-colors truncate"
                  title="Elena Chen, RN (Ward Nurse)"
                >
                  Nurse
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default LoginPage;
