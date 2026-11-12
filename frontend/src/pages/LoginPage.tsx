import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Hospital,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  LogIn,
} from 'lucide-react';

export function LoginPage() {
  const { login, resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

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
      setFormValidationMsg('Please enter your hospital email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormValidationMsg('Please enter a valid email format.');
      return;
    }
    if (!password) {
      setFormValidationMsg('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setFormValidationMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      await login(trimmedEmail, password, rememberMe);
      navigate('/', { replace: true });
    } catch {
      // Handled by AuthContext
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationMsg(null);

    const trimmed = resetEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormValidationMsg('Please enter a valid hospital email address.');
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-8 bg-[#061019] text-slate-100 overflow-hidden selection:bg-emerald-500/30 font-sans">
      {/* ── Background Subtle Glows ── */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#0f3d38]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#0b3839]/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#0d2836]/15 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Glowing ECG Pulse Wave Across the Background ── */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-80 z-0">
        <svg
          viewBox="0 0 1600 300"
          className="w-full h-48 sm:h-64"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="ecgGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Left waveform */}
          <path
            d="M 0 150 L 150 150 L 180 150 L 195 138 L 210 150 L 235 150 L 245 160 L 260 70 L 280 230 L 295 135 L 310 150 L 335 150 L 350 135 L 375 150 L 520 150"
            fill="none"
            stroke="#2DD4BF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ecgGlow)"
          />
          {/* Right waveform */}
          <path
            d="M 1080 150 L 1225 150 L 1240 135 L 1265 150 L 1290 150 L 1300 160 L 1315 70 L 1335 230 L 1350 135 L 1365 150 L 1390 150 L 1405 135 L 1430 150 L 1600 150"
            fill="none"
            stroke="#2DD4BF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ecgGlow)"
          />
        </svg>
      </div>

      {/* ── Top Spacer (for vertical balance) ── */}
      <div className="w-full h-2 sm:h-4" />

      {/* ── Main Centered Stack ── */}
      <div className="relative w-full max-w-sm sm:max-w-md z-10 flex flex-col items-center space-y-6 my-auto">
        
        {/* 1. BRAND LOGO & TAGLINE */}
        <div className="text-center flex flex-col items-center space-y-2.5">
          {/* Heart with Pulse Icon */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-16 h-16 text-[#2DD4BF] drop-shadow-[0_0_16px_rgba(45,212,191,0.6)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
              <path d="M7 12.5h2.5l1.5 -3l2 6l1.5 -3h2.5" />
            </svg>
          </div>

          {/* Title */}
          <div className="flex items-center justify-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              CarePulse
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xs sm:text-sm font-medium text-[#2DD4BF] tracking-wide">
            Smarter Monitoring. Earlier Awareness. Safer Recovery.
          </p>
        </div>

        {/* 2. SIMPLE, CLEAN LOGIN CARD */}
        <div className="w-full rounded-[24px] border border-[#1b2f42] bg-[#0c1825]/95 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {!isForgotMode ? (
            <div className="space-y-5">
              {/* Card Title */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-2">
                  <Hospital className="h-5 w-5 text-[#2DD4BF]" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Hospital Staff Login
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Secure access to the patient monitoring platform
                </p>
              </div>

              {/* Error Banner */}
              {(error || formValidationMsg) && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start space-x-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-snug">{error || formValidationMsg}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* Hospital Email */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formValidationMsg) setFormValidationMsg(null);
                    }}
                    placeholder="Hospital Email"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#1d2f42] bg-[#08101a] pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF] transition-colors"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formValidationMsg) setFormValidationMsg(null);
                    }}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-[#1d2f42] bg-[#08101a] pl-10 pr-10 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#1d2f42] bg-[#08101a] text-[#00C48C] focus:ring-0 cursor-pointer accent-[#00C48C]"
                    />
                    <span className="font-medium">Remember Me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setFormValidationMsg(null);
                      setResetEmail(email);
                      setIsForgotMode(true);
                    }}
                    className="text-[#2DD4BF] hover:text-[#5eead4] font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00D69A] text-slate-950 font-bold text-sm shadow-lg shadow-[#00C48C]/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>

              {/* Authorized Hospital Staff Only */}
              <div className="pt-2 text-center">
                <div className="inline-flex items-center space-x-1.5 text-xs text-slate-300 font-medium">
                  <ShieldCheck className="h-4 w-4 text-[#2DD4BF]" />
                  <span>Authorized Hospital Staff Only</span>
                </div>
              </div>
            </div>
          ) : (
            /* Forgot Password Form */
            <div className="space-y-4 text-left">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setFormValidationMsg(null);
                  setResetSuccess(false);
                  setIsForgotMode(false);
                }}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>

              <div className="text-center space-y-1">
                <h2 className="text-base font-bold text-white">Reset Hospital Password</h2>
                <p className="text-xs text-slate-400">
                  Enter your hospital email to receive a password reset link.
                </p>
              </div>

              {(error || formValidationMsg) && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start space-x-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-snug">{error || formValidationMsg}</span>
                </div>
              )}

              {resetSuccess ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 space-y-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Reset Email Sent</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    A password reset instructions link has been sent to <strong>{resetEmail}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="mt-2 w-full py-2.5 rounded-xl bg-[#00C48C] hover:bg-[#00D69A] text-slate-950 font-bold text-xs"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (formValidationMsg) setFormValidationMsg(null);
                      }}
                      placeholder="Hospital Email"
                      required
                      className="w-full rounded-xl border border-[#1d2f42] bg-[#08101a] pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00D69A] text-slate-950 font-bold text-xs shadow-lg disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <span>Send Password Reset Link</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── Sub-card Spacer ── */}
        <div />
      </div>

      {/* 3. FOOTER */}
      <footer className="w-full py-4 text-center z-10">
        <p className="text-xs text-slate-400 font-medium">
          © 2026 CarePulse. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default LoginPage;
