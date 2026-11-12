import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatientAccount } from '../lib/api';
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { CarePulseLogo } from '../components/brand/CarePulseLogo';

export function PatientRegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [patientId, setPatientId] = useState('P-001');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('A valid email address is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMsg('Phone Number is required.');
      return;
    }
    if (!patientId.trim()) {
      setErrorMsg('Patient ID is required.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerPatientAccount({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        patient_id: patientId.trim().toUpperCase(),
        password,
        confirm_password: confirmPassword,
      });

      setSuccessMsg('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login/patient');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FBF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#00A896] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">

        {/* Back Link */}
        <button
          onClick={() => navigate('/login/patient')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#64748B] hover:text-[#00A896] mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Patient Login</span>
        </button>

        {/* Branding */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <CarePulseLogo size="lg" showText={true} showTagline={true} />
          <p className="text-xs sm:text-sm text-[#64748B] font-medium pt-1">
            Register to access your personal post-discharge recovery data
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-[0_4px_24px_0_rgba(0,168,150,0.08)] rounded-3xl border border-[#CCFBF1] sm:px-10">

          {/* Notifications */}
          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Robert Thompson"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="robert@example.com"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    required
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                  />
                </div>
              </div>

              {/* Patient ID */}
              <div>
                <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                  Assigned Patient ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <Shield className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="P-001"
                    required
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-10 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-10 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-[0_4px_14px_0_rgba(0,168,150,0.35)] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Patient Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Patient Account</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Already have an account */}
          <div className="mt-6 text-center pt-4 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#64748B]">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login/patient')}
                className="font-bold text-[#00A896] underline hover:opacity-80"
              >
                Sign In
              </button>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
