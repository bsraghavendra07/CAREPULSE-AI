import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export function LoginPage() {
  const { login, resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      setFormValidationMsg('Please enter your work email.');
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

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-3 sm:p-6 lg:p-8 selection:bg-[#00A896] selection:text-white">
      {/* 2-COLUMN MAIN CARD CONTAINER */}
      <div className="w-full max-w-4xl lg:max-w-5xl bg-white rounded-2xl sm:rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] border border-[#E2E8F0] overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[580px] lg:min-h-[620px]">
        
        {/* ──────── LEFT SIDE – BRANDING ──────── */}
        <div className="relative hidden md:block overflow-hidden bg-[#0c2a47] select-none">
          <img
            src="/doctor-login-panel.jpg"
            alt="CarePulse - Always Watching. Always Caring."
            className="w-full h-full object-cover object-bottom"
          />
        </div>

        {/* ──────── RIGHT SIDE – LOGIN FORM ──────── */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* CarePulse Logo Header */}
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00D2C4] to-[#00A896] p-1.5 shadow-sm flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white stroke-[2.2]" />
              </div>
              <span className="text-lg font-black tracking-wider text-[#1e293b]">
                CAREPULSE
              </span>
            </div>

            {/* Page Title & Subtitle */}
            <div className="mt-7 mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1e293b] tracking-tight">
                {isForgotMode ? 'Reset Password' : 'Login'}
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
                {isForgotMode
                  ? 'Enter your work email to receive password reset instructions.'
                  : 'Log in to care account'}
              </p>
            </div>

            {/* Success Banner */}
            {registeredMsg && !error && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs flex items-start space-x-2 text-amber-900 shadow-2xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed font-medium">{registeredMsg}</span>
              </div>
            )}

            {/* Error Banner */}
            {(error || formValidationMsg) && (
              <div
                className={`mb-4 rounded-xl border p-3 text-xs flex items-start space-x-2 shadow-2xs ${
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
                <span className="leading-snug font-medium">{error || formValidationMsg}</span>
              </div>
            )}

            {!isForgotMode ? (
              /* ── MAIN LOGIN FORM ── */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formValidationMsg) setFormValidationMsg(null);
                    }}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    className="w-full rounded-full border border-[#CBD5E1] bg-white px-5 py-2.5 sm:py-3 text-sm text-[#1e293b] placeholder-[#94A3B8] focus:border-[#2C698D] focus:outline-none focus:ring-2 focus:ring-[#2C698D]/20 transition-all shadow-2xs"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">
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
                      className="w-full rounded-full border border-[#CBD5E1] bg-white pl-5 pr-12 py-2.5 sm:py-3 text-sm text-[#1e293b] placeholder-[#94A3B8] focus:border-[#2C698D] focus:outline-none focus:ring-2 focus:ring-[#2C698D]/20 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#94A3B8] hover:text-[#475569] transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center space-x-2 text-[#64748B] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#CBD5E1] text-[#2C698D] focus:ring-[#2C698D]"
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
                    className="font-medium text-[#2C698D] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Log In Button (Matches reference slate-blue button) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-full bg-[#3B7A9E] hover:bg-[#326989] text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-[0_4px_14px_rgba(59,122,158,0.35)] transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Logging in...</span>
                      </>
                    ) : (
                      <span>Log In</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── FORGOT PASSWORD FLOW ── */
              <div className="space-y-4">
                {resetSuccess ? (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Password reset instructions have been dispatched to your email.</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsForgotMode(false);
                        setResetSuccess(false);
                      }}
                      className="w-full py-2.5 rounded-full bg-[#1e293b] text-white font-bold text-xs hover:bg-[#334155] transition-colors"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="doctor@hospital.carepulse.org"
                        required
                        className="w-full rounded-full border border-[#CBD5E1] bg-white px-5 py-3 text-sm text-[#1e293b] placeholder-[#94A3B8] focus:border-[#2C698D] focus:outline-none focus:ring-2 focus:ring-[#2C698D]/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 px-6 rounded-full bg-[#3B7A9E] hover:bg-[#326989] text-white font-semibold text-sm shadow-[0_4px_14px_rgba(59,122,158,0.35)] flex items-center justify-center space-x-2 disabled:opacity-50"
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
                      className="w-full py-2 text-xs font-semibold text-[#64748B] hover:text-[#1e293b] transition-colors text-center block"
                    >
                      Cancel and Return to Sign In
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ──────── FOOTER: SECURITY BADGE ONLY ──────── */}
          <div className="pt-6 mt-6 border-t border-[#F1F5F9]">
            <div className="flex items-center justify-center space-x-1.5 text-xs font-medium text-[#64748B]">
              <ShieldCheck className="h-4 w-4 text-[#00A896]" />
              <span>Authorized Hospital Staff Only</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default LoginPage;
