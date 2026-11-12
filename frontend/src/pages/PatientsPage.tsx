import React, { useState, useMemo } from 'react';
import { PatientProfile } from '../types/patient';
import { TelemetryTick } from '../types/telemetry';
import {
  Users,
  Search,
  Filter,
  Activity,
  Heart,
  Pill,
  ShieldAlert,
  ChevronRight,
  Info,
  Calendar,
  Wind,
  Stethoscope,
  Brain,
  Droplets,
  Building2,
  UserCheck,
} from 'lucide-react';

interface PatientsPageProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  onSelectPatient: (patient: PatientProfile) => void;
}

const PATIENT_MEDICATIONS: Record<string, string[]> = {
  'P-001': ['Aspirin 81mg daily', 'Metoprolol Succinate 50mg', 'Lisinopril 10mg', 'Furosemide 40mg'],
  'P-002': ['Tiotropium Respimat 2.5mcg', 'Albuterol / Ipratropium inhaler', 'Prednisone 20mg taper'],
  'P-003': ['Ceftriaxone 1g IV', 'Metronidazole 500mg IV', 'Acetaminophen 1g Q6H', 'Enoxaparin 40mg'],
  'P-004': ['Apixaban 5mg BID', 'Bisoprolol 2.5mg daily', 'Primidone 50mg daily', 'Atorvastatin 20mg'],
  'P-005': ['Enoxaparin 40mg SC daily', 'Celecoxib 200mg daily', 'Acetaminophen 1g PRN'],
};

export const getSpecialistInfo = (p: PatientProfile) => {
  if (p.department && p.specialist_name) {
    return {
      department: p.department,
      specialistName: p.specialist_name,
      specialistTitle: p.specialist_title || 'Attending Specialist',
    };
  }
  const cond = (p.condition || '').toLowerCase();
  if (cond.includes('heart') || cond.includes('infarction') || cond.includes('fibrillation') || cond.includes('cardiac')) {
    return {
      department: 'Cardiology',
      specialistName: 'Dr. Robert Rivera, MD',
      specialistTitle: 'Senior Cardiologist & Electrophysiology Lead',
    };
  }
  if (cond.includes('copd') || cond.includes('pneumonia') || cond.includes('respiratory')) {
    return {
      department: 'Pulmonology',
      specialistName: 'Dr. Elena Rostova, MD',
      specialistTitle: 'Consultant Pulmonologist & Respiratory Lead',
    };
  }
  if (cond.includes('sepsis') || cond.includes('infection') || cond.includes('abdominal')) {
    return {
      department: 'General Medicine / Critical Care',
      specialistName: 'Dr. Marcus Vance, MD',
      specialistTitle: 'Critical Care & Infectious Disease Specialist',
    };
  }
  if (cond.includes('post-op') || cond.includes('arthroplasty') || cond.includes('ortho')) {
    return {
      department: 'Surgical Care / Orthopedics',
      specialistName: 'Dr. Julian Hayes, MD, FRCS',
      specialistTitle: 'Attending Orthopedic Surgeon',
    };
  }
  return {
    department: 'General Inpatient Care',
    specialistName: 'Dr. Sarah Jenkins, MD',
    specialistTitle: 'Hospitalist & Primary Post-Discharge Physician',
  };
};

export const getDepartmentConfig = (dept: string) => {
  const d = dept.toLowerCase();
  if (d.includes('cardio')) {
    return {
      icon: Heart,
      color: 'text-[#EF4444] bg-red-50 border-red-200',
      badgeColor: 'bg-red-50 text-red-700 border-red-200',
    };
  }
  if (d.includes('pulmon') || d.includes('resp')) {
    return {
      icon: Wind,
      color: 'text-[#4A90E2] bg-blue-50 border-blue-200',
      badgeColor: 'bg-[#D9F0FF] text-[#4A90E2] border-[#4A90E2]/30',
    };
  }
  if (d.includes('critical') || d.includes('infectious') || d.includes('general med')) {
    return {
      icon: ShieldAlert,
      color: 'text-[#F59E0B] bg-amber-50 border-amber-200',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  if (d.includes('surg') || d.includes('ortho')) {
    return {
      icon: Droplets,
      color: 'text-[#4A90E2] bg-[#F0F7FF] border-[#E5E7EB]',
      badgeColor: 'bg-[#F0F7FF] text-[#4A90E2] border-[#E5E7EB]',
    };
  }
  return {
    icon: Stethoscope,
    color: 'text-[#10B981] bg-emerald-50 border-emerald-200',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
};

export function PatientsPage({
  patients,
  latestTicks,
  onSelectPatient,
}: PatientsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('all');

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.condition.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterCondition === 'scale2') return p.scale2_prescribed;
      if (filterCondition === 'cardiac') return p.id === 'P-001' || p.id === 'P-004';
      if (filterCondition === 'sepsis') return p.id === 'P-003';
      if (filterCondition === 'postop') return p.id === 'P-005';

      return true;
    });
  }, [patients, searchTerm, filterCondition]);

  const calculateAge = (birthDate: string) => {
    try {
      const birth = new Date(birthDate);
      const diff = Date.now() - birth.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch {
      return 65;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-4">
        <div>
          <h2 className="text-xl font-black text-[#111827] tracking-tight flex items-center space-x-2.5">
            <Users className="h-5 w-5 text-[#111111]" />
            <span>Post-Discharge Patient Cohort</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Active ward population under continuous physiological surveillance and NEWS2 evaluation
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by name, ID or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-64 rounded-full border border-[#E8E4DA] bg-white pl-9 pr-3 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#111111] shadow-sm"
            />
          </div>

          <div className="flex items-center space-x-1 bg-[#EFECE4] border border-[#E8E4DA] p-1 rounded-full text-xs shadow-sm">
            <button
              onClick={() => setFilterCondition('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filterCondition === 'all'
                  ? 'bg-[#111111] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              All (5)
            </button>
            <button
              onClick={() => setFilterCondition('scale2')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filterCondition === 'scale2'
                  ? 'bg-[#111111] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Scale 2 (COPD)
            </button>
            <button
              onClick={() => setFilterCondition('cardiac')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filterCondition === 'cardiac'
                  ? 'bg-[#111111] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Cardiac
            </button>
          </div>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPatients.map((p) => {
          const tick = latestTicks[p.id];
          const news2 = tick?.news2;
          const vitals = tick?.vitals;
          const age = calculateAge(p.birthDate);
          const meds = PATIENT_MEDICATIONS[p.id] || ['Standard discharge medications'];

          const hr = vitals?.heart_rate?.value ?? p.baseline.heart_rate;
          const spo2 = vitals?.oxygen_saturation?.value ?? p.baseline.oxygen_saturation;
          const rr = vitals?.respiratory_rate?.value ?? p.baseline.respiratory_rate;
          const bp = vitals?.systolic_bp?.value ?? p.baseline.systolic_bp;
          const score = news2?.total_score ?? 0;
          const tier = news2?.triage_tier ?? 'ROUTINE';

          const specInfo = getSpecialistInfo(p);
          const deptCfg = getDepartmentConfig(specInfo.department);
          const DeptIcon = deptCfg.icon;

          let tierBadge = (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ROUTINE
            </span>
          );
          if (tier === 'URGENT' || news2?.has_red_score) {
            tierBadge = (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse">
                URGENT (RED)
              </span>
            );
          } else if (tier === 'REVIEW') {
            tierBadge = (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                REVIEW
              </span>
            );
          } else if (tier === 'WATCH') {
            tierBadge = (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-200">
                WATCH
              </span>
            );
          }

          return (
            <div
              key={p.id}
              onClick={() => onSelectPatient(p)}
              className="rounded-3xl border border-[#E8E4DA] bg-white p-6 hover:border-[#111111]/40 cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
            >
              <div className="space-y-4">
                {/* Top card row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-2xl bg-[#EFECE4] text-[#111111] flex items-center justify-center font-bold text-sm">
                      {p.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#111827] text-sm group-hover:underline transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-[10px] text-[#6B7280] font-mono">
                        <span className="font-bold text-[#111827]">#{p.id}</span>
                        <span>&bull;</span>
                        <span>{p.gender.toUpperCase()}</span>
                        <span>&bull;</span>
                        <span>{age} yrs</span>
                      </div>
                    </div>
                  </div>
                  <div>{tierBadge}</div>
                </div>

                {/* Condition & Scale 2 note */}
                <div className="rounded-2xl bg-[#EFECE4] border border-[#E8E4DA] p-3 space-y-1">
                  <div className="text-xs font-bold text-[#111827]">{p.condition}</div>
                  <div className="text-[11px] text-[#6B7280] line-clamp-2 leading-relaxed">
                    {p.riskSummary}
                  </div>
                  {p.scale2_prescribed && (
                    <div className="pt-1 flex items-center space-x-1.5 text-[10px] font-bold text-[#111827]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                      <span>NEWS2 Scale 2 Prescribed (88–92% target)</span>
                    </div>
                  )}
                </div>

                {/* Assigned Department & Specialist */}
                <div className="rounded-2xl bg-white border border-[#E8E4DA] p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                    <div className={`p-1.5 rounded-xl border ${deptCfg.color} shrink-0`}>
                      <DeptIcon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#111827] truncate">
                        {specInfo.specialistName}
                      </div>
                      <div className="text-[10px] text-[#6B7280] truncate mt-0.5">
                        {specInfo.specialistTitle}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${deptCfg.badgeColor} shrink-0 whitespace-nowrap`}>
                    {specInfo.department}
                  </div>
                </div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-[#F0F7FF] p-2 border border-[#E5E7EB]">
                    <div className="text-[10px] uppercase font-semibold text-[#4B5563]">Heart Rate</div>
                    <div className="font-mono font-bold text-xs text-[#111827] mt-0.5">{hr}</div>
                    <div className="text-[9px] text-[#4B5563]">bpm</div>
                  </div>
                  <div className="rounded-xl bg-[#F0F7FF] p-2 border border-[#E5E7EB]">
                    <div className="text-[10px] uppercase font-semibold text-[#4B5563]">SpO₂</div>
                    <div className="font-mono font-bold text-xs text-[#4A90E2] mt-0.5">{spo2}</div>
                    <div className="text-[9px] text-[#4B5563]">%</div>
                  </div>
                  <div className="rounded-xl bg-[#F0F7FF] p-2 border border-[#E5E7EB]">
                    <div className="text-[10px] uppercase font-semibold text-[#4B5563]">Resp Rate</div>
                    <div className="font-mono font-bold text-xs text-[#111827] mt-0.5">{rr}</div>
                    <div className="text-[9px] text-[#4B5563]">/min</div>
                  </div>
                  <div className="rounded-xl bg-[#F0F7FF] p-2 border border-[#E5E7EB]">
                    <div className="text-[10px] uppercase font-semibold text-[#4B5563]">NEWS2</div>
                    <div className="font-mono font-bold text-xs text-[#111827] mt-0.5">{score}</div>
                    <div className="text-[9px] text-[#4B5563]">pts</div>
                  </div>
                </div>

                {/* Medications List */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#4B5563]">
                    <Pill className="h-3.5 w-3.5 text-[#4A90E2]" />
                    <span>Prescribed Discharge Regimen</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {meds.map((m, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#F0F7FF] text-[#4B5563] border border-[#E5E7EB]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#4A90E2] font-semibold">
                <span>View Clinical Deep-Dive</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
