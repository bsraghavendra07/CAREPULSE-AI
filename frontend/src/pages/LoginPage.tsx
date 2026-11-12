import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export function LoginPage() {
  const { login, resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password Mode
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formValidationMsg, setFormValidationMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationMsg(null);

    // Form validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormValidationMsg('Please enter your hospital email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormValidationMsg('Please enter a valid email format (e.g., clinician@hospital.carepulse.org).');
      return;
    }
    if (!password) {
      setFormValidationMsg('Please enter your account password.');
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
      // Error is caught and surfaced via AuthContext error state
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationMsg(null);

    const trimmed = resetEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormValidationMsg('Please enter a valid hospital email to receive your password reset link.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(trimmed);
      setResetSuccess(true);
    } catch {
      // Error caught by AuthContext
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#080D16] p-4 sm:p-6 overflow-hidden selection:bg-emerald-500/30">
      {/* Background Subtle Emerald Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Subtle Medical Pulse Background Graphic */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
        <svg
          viewBox="0 0 1200 400"
          className="w-full h-auto text-emerald-400 stroke-current fill-none stroke-[2]"
          preserveAspectRatio="none"
        >
          <path d="M 0 200 L 300 200 L 340 120 L 380 280 L 420 80 L 470 320 L 510 180 L 540 210 L 570 200 L 1200 200" />
        </svg>
      </div>

      {/* Main Centered Login Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-[#253247] bg-[#111827] p-7 sm:p-9 shadow-2xl shadow-black/80 backdrop-blur-sm z-10">
        {/* Top Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 shadow-inner">
            <Activity className="h-7 w-7 text-emerald-400 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-white">
                CAREPULSE
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                1.0
              </span>
            </div>
            <div className="text-xs font-semibold text-emerald-400/90 tracking-wide mt-1">
              "Smarter Monitoring. Earlier Awareness. Safer Recovery."
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1 max-w-xs mx-auto">
              Secure access to intelligent post-discharge patient monitoring.
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-[#1e293b]" />

        {!isForgotMode ? (
          /* ──────── LOGIN FORM ──────── */
          <div>
            <div className="mb-5 text-left">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Welcome Back</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Sign in to access your hospital monitoring dashboard.
              </p>
            </div>

            {/* Error & Validation Banner */}
            {(error || formValidationMsg) && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start space-x-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-snug">{error || formValidationMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* 1. Hospital Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F8FAFC]">
                  Hospital Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-[#94A3B8]" />
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
                    className="w-full rounded-xl border border-[#253247] bg-[#080D16] pl-10 pr-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* 2. Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F8FAFC]">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#94A3B8]" />
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
                    className="w-full rounded-xl border border-[#253247] bg-[#080D16] pl-10 pr-10 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer select-none text-[#94A3B8] hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#253247] bg-[#080D16] text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#10B981]"
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

              {/* 4. Large Emerald Green Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
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

              <div className="text-center pt-2">
                <span className="text-[11px] text-[#64748B]">
                  Authorized hospital staff only.
                </span>
              </div>
            </form>
          </div>
        ) : (
          /* ──────── FORGOT PASSWORD FORM ──────── */
          <div className="text-left space-y-4">
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

            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">Reset Hospital Password</h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                Enter your hospital email address and we will dispatch a secure password reset link to your inbox.
              </p>
            </div>

            {/* Error Message */}
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
                  <span>Password Reset Email Sent</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  A reset instructions link has been sent to <strong>{resetEmail}</strong>. Please check your hospital email or spam folder.
                </p>
                <button
                  type="button"
                  onClick={() => setIsForgotMode(false)}
                  className="mt-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#F8FAFC]">
                    Hospital Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-[#94A3B8]" />
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
                      className="w-full rounded-xl border border-[#253247] bg-[#080D16] pl-10 pr-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-lg disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
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

        {/* Bottom Section */}
        <div className="mt-8 pt-5 border-t border-[#1e293b] text-center space-y-2 text-[11px]">
          <div className="flex items-center justify-center space-x-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure Hospital Staff Access</span>
          </div>
          <div className="text-[#94A3B8]">
            Authorized healthcare professionals only.
          </div>
          <div className="text-[#64748B]">
            © 2026 CAREPULSE. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;
