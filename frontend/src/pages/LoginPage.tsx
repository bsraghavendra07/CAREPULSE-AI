import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LogIn,
  Building2,
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
      setFormValidationMsg('Please enter a valid hospital email (e.g., staff@carepulse.health).');
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
      // Error handled by AuthContext
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationMsg(null);

    const trimmed = resetEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormValidationMsg('Please enter a valid hospital email to receive reset instructions.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(trimmed);
      setResetSuccess(true);
    } catch {
      // Error handled by AuthContext
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#070d17] selection:bg-emerald-500/30 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(7, 13, 23, 0.45), rgba(7, 13, 23, 0.7)), url('/auth-bg.jpg')`,
      }}
    >
      {/* Container to center content */}
      <div className="relative w-full max-w-[440px] z-10 flex flex-col items-center space-y-6">
        
        {/* ──────── TOP BRANDING & LOGO ──────── */}
        <div className="text-center space-y-2">
          {/* Medical Heart Pulse Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#14b8a6]/20 to-[#10b981]/10 border border-[#2dd4bf]/40 shadow-lg shadow-teal-950/50 backdrop-blur-sm">
            <svg
              className="h-8 w-8 text-[#2dd4bf]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="M3.22 12H9.5l1.5-3 2 6 1.5-3h6.28" />
            </svg>
          </div>

          {/* CAREPULSE 1.0 */}
          <div className="flex items-center justify-center space-x-2 pt-1">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
              CAREPULSE
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#34d399] font-mono font-bold border border-[#10b981]/40 shadow-sm">
              1.0
            </span>
          </div>

          {/* Tagline */}
          <p className="text-xs sm:text-sm font-semibold text-[#2dd4bf] tracking-wide drop-shadow">
            Smarter Monitoring. Earlier Awareness. Safer Recovery.
          </p>
        </div>

        {/* ──────── CENTERED CARD ──────── */}
        <div className="w-full rounded-2xl border border-[#1e2d44] bg-[#0c1524]/95 p-6 sm:p-8 shadow-2xl shadow-black/90 backdrop-blur-xl transition-all">
          {!isForgotMode ? (
            /* ──────── LOGIN FORM ──────── */
            <div className="space-y-5">
              {/* Header inside card */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-2 text-white font-bold text-base sm:text-lg">
                  <Building2 className="h-5 w-5 text-[#2dd4bf]" />
                  <span>Hospital Staff Login</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Secure access to the patient monitoring platform
                </p>
              </div>

              {/* Error / Validation Banner */}
              {(error || formValidationMsg) && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start space-x-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-snug">{error || formValidationMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* 1. Hospital Email */}
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
                    className="w-full rounded-xl border border-[#1e2d44] bg-[#080e18]/90 pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-colors"
                  />
                </div>

                {/* 2. Password */}
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
                    className="w-full rounded-xl border border-[#1e2d44] bg-[#080e18]/90 pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-colors"
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

                {/* 3. Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#1e2d44] bg-[#080e18] text-[#10b981] focus:ring-0 cursor-pointer accent-[#10b981]"
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
                    className="text-[#2dd4bf] hover:text-[#5eead4] font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* 4. Large Sign In Button with Login Icon */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-lg shadow-emerald-950/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
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
                <div className="inline-flex items-center space-x-1.5 text-xs text-[#2dd4bf] font-medium">
                  <ShieldCheck className="h-4 w-4 text-[#2dd4bf]" />
                  <span>Authorized Hospital Staff Only</span>
                </div>
              </div>
            </div>
          ) : (
            /* ──────── FORGOT PASSWORD FORM ──────── */
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
                  Enter your hospital email to receive a secure password reset link.
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
                    <span>Password Reset Link Dispatched</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    A reset instructions email has been sent to <strong>{resetEmail}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="mt-2 w-full py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-xs"
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
                      placeholder="Enter your hospital email"
                      required
                      className="w-full rounded-xl border border-[#1e2d44] bg-[#080e18]/90 pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-lg disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
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

        {/* ──────── FOOTER COPYRIGHT ──────── */}
        <div className="text-center text-xs text-slate-400 drop-shadow">
          © 2026 CAREPULSE. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
