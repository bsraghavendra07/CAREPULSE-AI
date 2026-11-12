import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Hospital,
  Mail,
  BadgeCheck,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import { registerStaffAccount } from '../lib/api';
import { registerWithEmail } from '../lib/firebase';
import { CarePulseLogo } from '../components/brand/CarePulseLogo';

export function RegisterPage() {
  const navigate = useNavigate();

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validation: Required fields
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }
    if (!hospitalName.trim()) {
      setErrorMsg('Please enter your hospital or medical institution name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please provide a valid hospital corporate email address.');
      return;
    }
    if (!employeeId.trim()) {
      setErrorMsg('Please enter your hospital employee badge ID.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter your contact phone number.');
      return;
    }

    // 2. Strong password enforcement (min 8 chars, letters and digits)
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setErrorMsg('Password must contain both letters and at least one number.');
      return;
    }

    // 3. Password confirmation
    if (password !== confirmPassword) {
      setErrorMsg('Password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      // 1. Register with CarePulse Backend (enforces PENDING_APPROVAL and role safety)
      const res = await registerStaffAccount({
        full_name: fullName.trim(),
        hospital_name: hospitalName.trim(),
        email: email.trim(),
        employee_id: employeeId.trim(),
        phone_number: phoneNumber.trim(),
        password,
        confirm_password: confirmPassword,
      });

      // 2. Attempt optional Firebase user mirroring
      try {
        await registerWithEmail(email.trim(), password);
      } catch (fbErr) {
        // Safe to ignore if mock or offline
      }

      setSuccessMsg(
        'Your registration has been submitted successfully. Please wait for hospital administrator approval.'
      );

      // Redirect back to login after short delay with message
      setTimeout(() => {
        navigate('/login/staff', {
          state: {
            message:
              'Your registration has been submitted successfully. Please wait for hospital administrator approval.',
          },
        });
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FBF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#00A896] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/login/staff')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#64748B] hover:text-[#00A896] mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Staff Sign In</span>
        </button>

        {/* Branding Header with official logo */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <CarePulseLogo size="lg" showText={true} showTagline={true} />
          <p className="text-xs sm:text-sm text-[#64748B] font-medium pt-1">
            Apply for clinical telemetry and post-discharge monitoring access
          </p>
        </div>

        {/* Registration Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-[0_4px_24px_0_rgba(0,168,150,0.08)] rounded-3xl border border-[#CCFBF1] sm:px-10">
          
          {/* Notifications */}
          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Form */}
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
                  placeholder="e.g. Dr. Johnathan Smith, MD"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
              </div>
            </div>

            {/* Hospital Name */}
            <div>
              <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                Hospital Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Building2 className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. CarePulse Central Memorial Hospital"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                Hospital Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff.name@hospital.carepulse.org"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee ID */}
              <div>
                <label className="block text-xs font-semibold text-[#131E3A] mb-1">
                  Employee ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="EMP-DOC-802"
                    required
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                  />
                </div>
              </div>

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
                    placeholder="+1 (555) 019-2831"
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
                  placeholder="Min 8 characters (letters & numbers)"
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-10 py-2.5 text-sm text-[#131E3A] placeholder-[#94A3B8] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#131E3A]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Admin Approval Gating Notice */}
            <div className="rounded-2xl bg-[#E6F7F5] border border-[#B2EBE4] p-3 text-[11px] text-[#067A6E] flex items-start space-x-2">
              <ShieldCheck className="h-4 w-4 text-[#00A896] shrink-0 mt-0.5" />
              <span>
                To protect patient privacy, all newly registered accounts require approval by a hospital administrator before accessing clinical telemetry.
              </span>
            </div>

            {/* Register Button with CarePulse cyan-teal gradient */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-[0_4px_14px_0_rgba(0,168,150,0.35)] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Registration</span>
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
                onClick={() => navigate('/login/staff')}
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
