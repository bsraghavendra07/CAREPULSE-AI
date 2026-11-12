import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { PatientProfile } from '../../types/patient';
import { TelemetryTick } from '../../types/telemetry';
import { useAuth } from '../../context/AuthContext';
import { CarePulseLogo } from '../brand/CarePulseLogo';
import { ChevronDown, Menu, X, LogOut, ShieldCheck, User } from 'lucide-react';

interface TopNavBarProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  connected: boolean;
  speedFactor?: number;
  onSpeedChange?: (speed: number) => void;
  pendingStaffCount?: number;
  onOpenStaffModal?: () => void;
}

export function TopNavBar({
  patients,
  latestTicks,
  connected,
  pendingStaffCount = 0,
  onOpenStaffModal,
}: TopNavBarProps) {
  const { staff, logout, isHospitalAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const moreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live critical alerts count for the Alerts badge
  const criticalCount = Object.values(latestTicks).filter(
    (t) => t.news2?.risk_level === 'HIGH' || t.news2?.has_red_score
  ).length;

  // Check if any of the "More" dropdown pages is currently active
  const isMoreActive =
    location.pathname.startsWith('/fhir') ||
    location.pathname.startsWith('/scenarios') ||
    location.pathname.startsWith('/tests') ||
    location.pathname.startsWith('/simulation-events') ||
    location.pathname.startsWith('/events');

  // Hover handlers for the "More" dropdown with subtle debounce
  const handleMoreMouseEnter = () => {
    if (moreTimeoutRef.current) {
      clearTimeout(moreTimeoutRef.current);
      moreTimeoutRef.current = null;
    }
    setMoreOpen(true);
  };

  const handleMoreMouseLeave = () => {
    moreTimeoutRef.current = setTimeout(() => {
      setMoreOpen(false);
    }, 150);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E2E8F0] shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 whitespace-nowrap">
          
          {/* ── LEFT: CarePulse logo & name ── */}
          <div
            className="flex items-center cursor-pointer shrink-0"
            onClick={() => navigate('/dashboard')}
          >
            <CarePulseLogo size="sm" showText={true} showTagline={false} />
          </div>

          {/* ── CENTER: Main Clean Navigation ── */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {/* 1. Dashboard */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold shadow-xs'
                    : 'text-[#475569] hover:text-[#00A896] hover:bg-[#E6F7F5]/50'
                }`
              }
            >
              Dashboard
            </NavLink>

            {/* 2. Patients */}
            <NavLink
              to="/patients"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold shadow-xs'
                    : 'text-[#475569] hover:text-[#00A896] hover:bg-[#E6F7F5]/50'
                }`
              }
            >
              Patients
            </NavLink>

            {/* 3. Monitoring */}
            <NavLink
              to="/vitals"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold shadow-xs'
                    : 'text-[#475569] hover:text-[#00A896] hover:bg-[#E6F7F5]/50'
                }`
              }
            >
              Monitoring
            </NavLink>

            {/* 4. Alerts */}
            <NavLink
              to="/alerts"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors duration-150 inline-flex items-center ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold shadow-xs'
                    : 'text-[#475569] hover:text-[#00A896] hover:bg-[#E6F7F5]/50'
                }`
              }
            >
              <span>Alerts</span>
              {criticalCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                  {criticalCount}
                </span>
              )}
            </NavLink>

            {/* 5. Reports */}
            <NavLink
              to="/report"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors duration-150 ${
                  isActive || location.pathname.startsWith('/reports')
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold shadow-xs'
                    : 'text-[#475569] hover:text-[#00A896] hover:bg-[#E6F7F5]/50'
                }`
              }
            >
              Reports
            </NavLink>

            {/* 6. More ▼ Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleMoreMouseEnter}
              onMouseLeave={handleMoreMouseLeave}
            >
              <button
                type="button"
                onClick={() => setMoreOpen(!moreOpen)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors duration-150 inline-flex items-center space-x-1 ${
                  isMoreActive || moreOpen
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                    : 'text-[#475569] hover:text-[#00A896] hover:bg-[#E6F7F5]/50'
                }`}
              >
                <span>More</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-150 ${
                    moreOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Clean Minimalist Dropdown Panel */}
              {moreOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-2xl bg-white border border-[#CCFBF1] shadow-[0_10px_25px_-5px_rgba(0,168,150,0.12),0_8px_10px_-6px_rgba(0,168,150,0.06)] py-1.5 z-50 animate-in fade-in duration-100">
                  <NavLink
                    to="/fhir"
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                          : 'text-[#131E3A] hover:bg-[#F4FBF9] hover:text-[#00A896]'
                      }`
                    }
                  >
                    Medical Data (FHIR R4)
                  </NavLink>

                  <NavLink
                    to="/scenarios"
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 text-xs font-semibold transition-colors ${
                        isActive || location.pathname.startsWith('/tests')
                          ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                          : 'text-[#131E3A] hover:bg-[#F4FBF9] hover:text-[#00A896]'
                      }`
                    }
                  >
                    Deterioration Tests
                  </NavLink>

                  <NavLink
                    to="/simulation-events"
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 text-xs font-semibold transition-colors ${
                        isActive || location.pathname.startsWith('/events')
                          ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                          : 'text-[#131E3A] hover:bg-[#F4FBF9] hover:text-[#00A896]'
                      }`
                    }
                  >
                    Simulation Events
                  </NavLink>
                </div>
              )}
            </div>
          </nav>

          {/* ── RIGHT: Live status indicator & User profile icon ── */}
          <div className="flex items-center space-x-3 shrink-0">
            
            {/* Small live monitoring status indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#E6F7F5] border border-[#B2EBE4] text-xs font-semibold text-[#067A6E]">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? 'bg-[#00D2C4] animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{connected ? 'Live' : 'Connecting'}</span>
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 p-1 pl-2 pr-1.5 rounded-full border border-[#E2E8F0] hover:border-[#00D2C4] hover:bg-[#F4FBF9] transition-all"
                title="User Profile & Settings"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#00D2C4] to-[#00A896] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {staff?.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden lg:inline text-xs font-semibold text-[#131E3A] max-w-[120px] truncate">
                  {staff?.name || 'Dr. Rivera'}
                </span>
                <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-[#CCFBF1] shadow-[0_10px_25px_-5px_rgba(0,168,150,0.15)] py-2 z-50 animate-in fade-in duration-150">
                  <div className="px-4 py-2.5 border-b border-[#E2E8F0]">
                    <p className="text-xs font-bold text-[#131E3A] truncate">
                      {staff?.name || 'Hospital Staff'}
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate">
                      {staff?.email || 'staff@carepulse.org'}
                    </p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4]">
                      {staff?.role || 'DOCTOR'}
                    </span>
                  </div>

                  {isHospitalAdmin && onOpenStaffModal && (
                    <div className="px-2 py-1 border-b border-[#E2E8F0]">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenStaffModal();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#131E3A] hover:bg-[#E6F7F5] hover:text-[#067A6E] flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center space-x-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#00A896]" />
                          <span>Staff Approvals</span>
                        </span>
                        {pendingStaffCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                            {pendingStaffCount}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="px-2 pt-1">
                    <button
                      onClick={async () => {
                        setProfileOpen(false);
                        await logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#475569] hover:text-[#131E3A] hover:bg-[#F4FBF9] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

          </div>

        </div>
      </div>

      {/* ── MOBILE ACCORDION / DRAWER MENU ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-xl text-sm font-semibold ${
                isActive
                  ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                  : 'text-[#131E3A] hover:bg-[#F4FBF9]'
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/patients"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-xl text-sm font-semibold ${
                isActive
                  ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                  : 'text-[#131E3A] hover:bg-[#F4FBF9]'
              }`
            }
          >
            Patients
          </NavLink>

          <NavLink
            to="/vitals"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-xl text-sm font-semibold ${
                isActive
                  ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                  : 'text-[#131E3A] hover:bg-[#F4FBF9]'
              }`
            }
          >
            Monitoring
          </NavLink>

          <NavLink
            to="/alerts"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${
                isActive
                  ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                  : 'text-[#131E3A] hover:bg-[#F4FBF9]'
              }`
            }
          >
            <span>Alerts</span>
            {criticalCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {criticalCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/report"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-xl text-sm font-semibold ${
                isActive
                  ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                  : 'text-[#131E3A] hover:bg-[#F4FBF9]'
              }`
            }
          >
            Reports
          </NavLink>

          <div className="pt-2 pb-1 border-t border-[#E2E8F0]">
            <p className="px-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
              Advanced Clinical Tools
            </p>

            <NavLink
              to="/fhir"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                    : 'text-[#131E3A] hover:bg-[#F4FBF9]'
                }`
              }
            >
              Medical Data (FHIR R4)
            </NavLink>

            <NavLink
              to="/scenarios"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                    : 'text-[#131E3A] hover:bg-[#F4FBF9]'
                }`
              }
            >
              Deterioration Tests
            </NavLink>

            <NavLink
              to="/simulation-events"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#067A6E] font-bold'
                    : 'text-[#131E3A] hover:bg-[#F4FBF9]'
                }`
              }
            >
              Simulation Events
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
}
