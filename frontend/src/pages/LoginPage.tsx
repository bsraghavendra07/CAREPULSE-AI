import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse,
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#080D18] text-slate-100 overflow-hidden selection:bg-emerald-500/30 font-sans">
      {/* ── Background Subtle Glows ── */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Background ECG Pulse Wave (Clean SVG, No Text) ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <svg
          viewBox="0 0 1400 300"
          className="w-full h-auto text-emerald-400 stroke-current fill-none stroke-[2]"
          preserveAspectRatio="none"
        >
          <path d="M 0 150 L 350 150 L 370 125 L 390 175 L 410 80 L 440 220 L 465 130 L 485 155 L 510 150 L 890 150 L 910 125 L 930 175 L 950 80 L 980 220 L 1005 130 L 1025 155 L 1050 150 L 1400 150" />
        </svg>
      </div>

      {/* ── Main Centered Stack ── */}
      <div className="relative w-full max-w-sm sm:max-w-md z-10 flex flex-col items-center space-y-6">
        
        {/* 1. BRAND LOGO & TAGLINE */}
        <div className="text-center space-y-2">
          {/* Pulse Icon */}
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-950/40 p-3">
            <HeartPulse className="h-7 w-7 text-emerald-400 animate-pulse" />
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                CAREPULSE
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                1.0
              </span>
            </div>
            {/* Tagline */}
            <p className="text-xs sm:text-sm font-medium text-emerald-400/90 tracking-wide mt-1">
              Smarter Monitoring. Earlier Awareness. Safer Recovery.
            </p>
          </div>
        </div>

        {/* 2. SIMPLE, CLEAN LOGIN CARD */}
        <div className="w-full rounded-2xl border border-[#1e293b] bg-[#0f172a]/95 p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {!isForgotMode ? (
            <div className="space-y-5">
              {/* Card Title */}
              <div className="text-center">
                <h2 className="text-base font-bold text-white">Hospital Staff Login</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in to access your monitoring dashboard
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Hospital Email
                  </label>
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
                      placeholder="Enter your hospital email"
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-[#26334d] bg-[#090e17] pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
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
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-[#26334d] bg-[#090e17] pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
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
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-400 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#26334d] bg-[#090e17] text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
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
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
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
              <div className="pt-2 text-center border-t border-[#1e293b]">
                <div className="inline-flex items-center space-x-1.5 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
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
                    className="mt-2 w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Hospital Email
                    </label>
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
                        className="w-full rounded-xl border border-[#26334d] bg-[#090e17] pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
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

        {/* 3. SIMPLE FOOTER */}
        <div className="text-center text-xs text-slate-500">
          © 2026 CAREPULSE. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
