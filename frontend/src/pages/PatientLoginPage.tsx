import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Loader2,
  LogIn,
  CheckCircle2,
} from 'lucide-react';
import { CarePulseLogo } from '../components/brand/CarePulseLogo';

export function PatientLoginPage() {
  const { patientLogin, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formValidationMsg, setFormValidationMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormValidationMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setFormValidationMsg('Please enter your password.');
      return;
    }

    try {
      await patientLogin(trimmedEmail, password);
      navigate('/patient-dashboard', { replace: true });
    } catch {
      // Handled by AuthContext error state
    }
  };

  const handleFillDemo = () => {
    setEmail('patient@carepulse.org');
    setPassword('PatientPassword123!');
    setFormValidationMsg(null);
    clearError();
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

        {/* Branding Header with official logo */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <CarePulseLogo size="lg" showText={true} showTagline={true} />
          <p className="text-xs sm:text-sm text-[#64748B] font-medium pt-1">
            Access your health information and recovery progress
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-[0_4px_24px_0_rgba(0,168,150,0.08)] rounded-3xl border border-[#CCFBF1] sm:px-10">
          
          {/* Error Message */}
          {(error || formValidationMsg) && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error || formValidationMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-[#131E3A] mb-1.5">
                Email Address
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
                  placeholder="patient@carepulse.org"
                  required
                  autoComplete="email"
                  className="w-full rounded-full border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896] transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-[#131E3A] mb-1.5">
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
                  className="w-full rounded-full border border-[#E2E8F0] bg-white pl-10 pr-10 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#131E3A]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
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
                    <span>Patient Sign In</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Pre-Fill */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full py-2.5 px-3 rounded-full bg-[#E6F7F5] hover:bg-[#D4F3EE] text-[#067A6E] text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors border border-[#B2EBE4]"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#00A896]" />
              <span>Fill Demo Patient (P-001 Robert Thompson)</span>
            </button>
          </div>

          {/* Link to Registration */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#64748B]">
              New Patient?{' '}
              <button
                onClick={() => navigate('/register/patient')}
                className="font-bold text-[#00A896] hover:underline"
              >
                Create Account
              </button>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
