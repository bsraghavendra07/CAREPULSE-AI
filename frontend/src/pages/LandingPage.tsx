import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Stethoscope,
  Activity,
  ArrowRight,
  ShieldCheck,
  HeartPulse,
  Sparkles,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { CarePulseLogo } from '../components/brand/CarePulseLogo';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4FBF9] flex flex-col justify-between selection:bg-[#00A896] selection:text-white">
      {/* ── TOP MODERN NAVBAR ── */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] sticky top-0 z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Brand with circular gradient icon */}
          <CarePulseLogo size="md" showText={true} showTagline={true} onClick={() => navigate('/')} />

          {/* Quick Nav & Pill Actions */}
          <div className="flex items-center space-x-5">
            <div className="hidden md:flex items-center space-x-6 text-sm font-semibold text-[#64748B]">
              <span className="hover:text-[#00A896] cursor-pointer transition-colors">Clinical Standards</span>
              <span className="hover:text-[#00A896] cursor-pointer transition-colors">NEWS2 Engine</span>
              <span className="hover:text-[#00A896] cursor-pointer transition-colors">HIPAA Secure</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login/patient')}
                className="text-xs font-bold px-4 py-2 rounded-full border border-[#B2EBE4] bg-[#E6F7F5] text-[#067A6E] hover:bg-[#D4F3EE] transition-all shadow-sm"
              >
                Patient Portal
              </button>
              <button
                onClick={() => navigate('/login/staff')}
                className="text-xs font-bold px-4 py-2 rounded-full bg-gradient-to-r from-[#00D2C4] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <span>Hospital Staff</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO & TWO AUTHENTICATION CARDS ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="w-full max-w-6xl mx-auto space-y-12">
          
          {/* Headline Section with Prominent Official Branding */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="flex justify-center mb-2">
              <CarePulseLogo size="xl" showText={true} showTagline={true} />
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-[#131E3A] tracking-tight leading-[1.1]">
              Always Watching.{' '}
              <span className="bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] text-white px-3 sm:px-4 py-0.5 rounded-2xl inline-block mt-1 sm:mt-0 font-black shadow-sm">
                Always Caring.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#64748B] font-normal leading-relaxed max-w-2xl mx-auto pt-2">
              Empowering healthcare professionals and patients with continuous vital sign telemetry, 
              personalized baseline intelligence, and automated NEWS2 early warning triage.
            </p>
          </div>

          {/* TWO BALANCED AUTHENTICATION CARDS SIDE BY SIDE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* CARD 1: PATIENT PORTAL */}
            <div className="bg-white rounded-3xl border border-[#CCFBF1] p-8 sm:p-10 shadow-[0_4px_20px_0_rgba(0,168,150,0.06)] hover:shadow-[0_8px_30px_0_rgba(0,168,150,0.12)] hover:border-[#00D2C4] transition-all duration-200 flex flex-col justify-between">
              <div className="space-y-6">
                
                {/* Header Mockup & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00D2C4]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00B4A0]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#067A6E]" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4]">
                    Patient Portal
                  </span>
                </div>

                {/* Heading & Description */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                      <User className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-[#131E3A] tracking-tight">
                      Patient Login
                    </h2>
                  </div>
                  <p className="text-sm text-[#64748B] leading-relaxed pt-1">
                    Access your health information and recovery progress, review real-time vitals, 
                    and stay connected with your hospital care team.
                  </p>
                </div>

                {/* Feature List */}
                <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center space-x-2.5 text-xs font-medium text-[#131E3A]">
                    <CheckCircle2 className="h-4 w-4 text-[#00A896] shrink-0" />
                    <span>Real-time vital sign telemetry & personalized baseline</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs font-medium text-[#131E3A]">
                    <CheckCircle2 className="h-4 w-4 text-[#00A896] shrink-0" />
                    <span>Post-discharge recovery milestone progress (88%)</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs font-medium text-[#131E3A]">
                    <CheckCircle2 className="h-4 w-4 text-[#00A896] shrink-0" />
                    <span>End-to-end encrypted clinical health record</span>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-8 mt-6 border-t border-[#E2E8F0]">
                <button
                  onClick={() => navigate('/login/patient')}
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#00D2C4] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-[0_4px_14px_0_rgba(0,168,150,0.35)]"
                >
                  <span>Patient Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="text-center">
                  <button
                    onClick={() => navigate('/register/patient')}
                    className="text-xs font-semibold text-[#64748B] hover:text-[#00A896]"
                  >
                    New Patient? <span className="font-bold text-[#00A896] underline">Create Account</span>
                  </button>
                </div>
              </div>

            </div>

            {/* CARD 2: HOSPITAL STAFF PORTAL */}
            <div className="bg-white rounded-3xl border border-[#CCFBF1] p-8 sm:p-10 shadow-[0_4px_20px_0_rgba(0,168,150,0.06)] hover:shadow-[0_8px_30px_0_rgba(0,168,150,0.12)] hover:border-[#00D2C4] transition-all duration-200 flex flex-col justify-between">
              <div className="space-y-6">
                
                {/* Header Mockup & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00D2C4]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00B4A0]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#067A6E]" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#131E3A] text-white">
                    Hospital Staff
                  </span>
                </div>

                {/* Heading & Description */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-[#131E3A] tracking-tight">
                      Hospital Staff Login
                    </h2>
                  </div>
                  <p className="text-sm text-[#64748B] leading-relaxed pt-1">
                    Secure access for doctors and authorized hospital staff to monitor patients, 
                    track NEWS2 deterioration, and manage clinical interventions.
                  </p>
                </div>

                {/* Feature List */}
                <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center space-x-2.5 text-xs font-medium text-[#131E3A]">
                    <CheckCircle2 className="h-4 w-4 text-[#00A896] shrink-0" />
                    <span>Multi-patient live telemetry monitoring grid</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs font-medium text-[#131E3A]">
                    <CheckCircle2 className="h-4 w-4 text-[#00A896] shrink-0" />
                    <span>Automated NEWS2 scoring & ML isolation forest flags</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs font-medium text-[#131E3A]">
                    <CheckCircle2 className="h-4 w-4 text-[#00A896] shrink-0" />
                    <span>Role-based clinical oversight & administrator approval</span>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-8 mt-6 border-t border-[#E2E8F0]">
                <button
                  onClick={() => navigate('/login/staff')}
                  className="w-full py-3.5 px-6 rounded-full bg-[#131E3A] hover:bg-[#1E293B] text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-[0_4px_14px_0_rgba(19,30,58,0.25)]"
                >
                  <span>Staff Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="text-center">
                  <button
                    onClick={() => navigate('/register/staff')}
                    className="text-xs font-semibold text-[#64748B] hover:text-[#00A896]"
                  >
                    New Staff? <span className="font-bold text-[#00A896] underline">Register</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Quick Demo Credentials in Clean Minimalist Box */}
          <div className="max-w-xl mx-auto rounded-3xl bg-white border border-[#CCFBF1] p-6 text-xs text-[#64748B] shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className="font-bold text-[#131E3A] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00A896]" />
                <span>Instant Demo Accounts</span>
              </span>
              <span className="text-[10px] font-mono bg-[#E6F7F5] border border-[#B2EBE4] px-2.5 py-0.5 rounded-full text-[#067A6E] font-bold">
                Pass: *Password123!
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-left">
              <div>
                <span className="font-bold text-[#131E3A] block">Patient Account:</span>
                <code className="text-[#00A896] font-mono text-[11px]">patient@carepulse.org</code>
              </div>
              <div>
                <span className="font-bold text-[#131E3A] block">Doctor (Cardiology):</span>
                <code className="text-[#00A896] font-mono text-[11px]">dr.rivera@hospital.carepulse.org</code>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full bg-white border-t border-[#E2E8F0] py-8 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <CarePulseLogo size="sm" showText={true} showTagline={true} />
          <div className="flex items-center space-x-6 font-medium">
            <span className="hover:text-[#00A896] cursor-pointer">Privacy Protocol</span>
            <span className="hover:text-[#00A896] cursor-pointer">Terms of Clinical Use</span>
            <span className="hover:text-[#00A896] cursor-pointer">HIPAA Conformance</span>
          </div>
          <span className="text-[#94A3B8]">&copy; {new Date().getFullYear()} CarePulse Healthcare</span>
        </div>
      </footer>
    </div>
  );
}
