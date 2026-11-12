import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  KeyRound,
  Stethoscope,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { CarePulseLogo } from '../components/brand/CarePulseLogo';

export function LoginPage() {
  const { login, resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check state from registration redirect
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

    try {
      await login(trimmedEmail, password, rememberMe);
      // Route based on role
      if (trimmedEmail.toLowerCase().includes('accountant')) {
        navigate('/billing', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
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
      setFormValidationMsg('Enter a valid hospital email to receive reset instructions.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(trimmed);
      setResetSuccess(true);
    } catch {
      // AuthContext handles error
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
    <div className="min-h-screen bg-[#F4FBF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#00A896] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        
        {/* Back Link to Landing */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#64748B] hover:text-[#00A896] mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Portal Selection</span>
        </button>

        {/* 1. BRANDING HEADER WITH OFFICIAL LOGO */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <CarePulseLogo size="lg" showText={true} showTagline={true} />
        </div>

        {/* 2. LOGIN CARD */}
        <div className="mt-8 bg-white py-8 px-6 shadow-[0_4px_24px_0_rgba(0,168,150,0.08)] rounded-3xl border border-[#CCFBF1] sm:px-10">
          
          {!isForgotMode ? (
            <div className="space-y-5">
              {/* Card Header */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#E6F7F5] text-[#067A6E]">
                    <Hospital className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[#131E3A] tracking-tight">
                    Hospital Staff Login
                  </h2>
                </div>
                <p className="text-xs text-[#64748B]">
                  Secure access for doctors and authorized hospital staff
                </p>
              </div>

              {/* Success / Pending Approval Banner from Registration */}
              {registeredMsg && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs flex items-start space-x-2.5 text-amber-900 shadow-sm animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span className="leading-relaxed font-medium">{registeredMsg}</span>
                </div>
              )}

              {/* Error Banner */}
              {(error || formValidationMsg) && (
                <div
                  className={`rounded-2xl border p-3.5 text-xs flex items-start space-x-2.5 animate-in fade-in ${
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

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Hospital Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#131E3A] mb-1.5">
                    Hospital Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formValidationMsg) setFormValidationMsg(null);
                      }}
                      placeholder="doctor@hospital.carepulse.org"
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896] transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#131E3A] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formValidationMsg) setFormValidationMsg(null);
                      }}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-10 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#131E3A]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-[#64748B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#E2E8F0] text-[#00A896] focus:ring-[#00A896]"
                    />
                    <span>Remember Me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setIsForgotMode(true);
                      setResetEmail(email);
                    }}
                    className="font-semibold text-[#00A896] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Sign In Button with CarePulse cyan-teal gradient */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-[0_4px_14px_0_rgba(0,168,150,0.35)] transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <span>&rarr;</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Visible option below Sign In button: Create Account */}
              <div className="text-center pt-2">
                <p className="text-xs text-[#64748B]">
                  New to CarePulse?{' '}
                  <button
                    onClick={() => navigate('/register/staff')}
                    className="font-bold text-[#00A896] underline hover:opacity-80"
                  >
                    Create an Account
                  </button>
                </p>
              </div>

              {/* Demo Credentials Picker */}
              <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block text-center">
                  Quick Demo Accounts
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('dr.rivera@hospital.carepulse.org', 'DoctorPassword123!')}
                    className="p-2.5 rounded-2xl bg-[#E6F7F5] hover:bg-[#D4F3EE] border border-[#B2EBE4] text-left transition-colors"
                  >
                    <span className="font-bold text-[#131E3A] block">Doctor (Cardiology)</span>
                    <span className="text-[#067A6E]">Dr. Rivera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@hospital.carepulse.org', 'AdminPassword123!')}
                    className="p-2.5 rounded-2xl bg-[#E6F7F5] hover:bg-[#D4F3EE] border border-[#B2EBE4] text-left transition-colors"
                  >
                    <span className="font-bold text-[#131E3A] block">Hospital Admin</span>
                    <span className="text-[#067A6E]">Approvals & Roles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('assistant.sloan@hospital.carepulse.org', 'AssistantPassword123!')}
                    className="p-2.5 rounded-2xl bg-[#E6F7F5] hover:bg-[#D4F3EE] border border-[#B2EBE4] text-left transition-colors"
                  >
                    <span className="font-bold text-[#131E3A] block">Doctor Assistant</span>
                    <span className="text-[#067A6E]">Samantha Sloan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('accountant.morales@hospital.carepulse.org', 'AccountantPassword123!')}
                    className="p-2.5 rounded-2xl bg-[#E6F7F5] hover:bg-[#D4F3EE] border border-[#B2EBE4] text-left transition-colors"
                  >
                    <span className="font-bold text-[#131E3A] block">Accountant</span>
                    <span className="text-[#067A6E]">Billing & Finance</span>
                  </button>
                </div>
              </div>

              {/* Security Seal */}
              <div className="flex items-center justify-center space-x-1.5 text-[11px] text-[#64748B] pt-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[#00A896]" />
                <span>Authorized Hospital Staff Only</span>
              </div>
            </div>
          ) : (
            /* Forgot Password Flow */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#E6F7F5] text-[#067A6E]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[#131E3A] tracking-tight">
                    Reset Password
                  </h2>
                </div>
                <p className="text-xs text-[#64748B]">
                  Enter your hospital email to receive reset instructions
                </p>
              </div>

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
                    className="w-full py-2.5 rounded-full bg-[#131E3A] text-white font-bold text-xs"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#131E3A] mb-1.5">
                      Hospital Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="doctor@hospital.carepulse.org"
                        required
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-sm shadow-[0_4px_14px_0_rgba(0,168,150,0.35)] flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Instructions...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      clearError();
                    }}
                    className="w-full py-2 text-xs font-semibold text-[#64748B] hover:text-[#131E3A]"
                  >
                    Cancel and Return
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
