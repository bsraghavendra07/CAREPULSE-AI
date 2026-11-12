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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1f2c] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <Users className="h-5 w-5 text-emerald-400" />
            <span>Post-Discharge Patient Cohort</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Active ward population under continuous physiological surveillance and NEWS2 evaluation
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-64 rounded-xl border border-[#1e2433] bg-[#11151f] pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-[#11151f] border border-[#1e2433] p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterCondition('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filterCondition === 'all'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All (5)
            </button>
            <button
              onClick={() => setFilterCondition('scale2')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filterCondition === 'scale2'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scale 2 (COPD)
            </button>
            <button
              onClick={() => setFilterCondition('cardiac')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filterCondition === 'cardiac'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
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

          let tierBadge = (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#122b1f] text-[#4ade80] border border-[#1f4a35]">
              ROUTINE
            </span>
          );
          if (tier === 'URGENT' || news2?.has_red_score) {
            tierBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#331414] text-[#f87171] border border-[#521b1b] animate-pulse">
                URGENT (RED)
              </span>
            );
          } else if (tier === 'REVIEW') {
            tierBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#332412] text-[#fbbf24] border border-[#543b18]">
                REVIEW
              </span>
            );
          } else if (tier === 'WATCH') {
            tierBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#292212] text-[#eab308] border border-[#4d3e18]">
                WATCH
              </span>
            );
          }

          return (
            <div
              key={p.id}
              onClick={() => onSelectPatient(p)}
              className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 hover:border-emerald-500/50 hover:bg-[#131825] cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
            >
              <div className="space-y-4">
                {/* Top card row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-[#151c2a] border border-[#232f47] flex items-center justify-center font-bold text-white text-sm group-hover:border-emerald-500/40">
                      {p.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                        <span>#{p.id}</span>
                        <span>•</span>
                        <span>{p.gender.toUpperCase()}</span>
                        <span>•</span>
                        <span>{age} yrs</span>
                      </div>
                    </div>
                  </div>
                  <div>{tierBadge}</div>
                </div>

                {/* Condition & Scale 2 note */}
                <div className="rounded-xl bg-[#0c1017] border border-[#1a1f2c] p-2.5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-200">{p.condition}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                    {p.riskSummary}
                  </div>
                  {p.scale2_prescribed && (
                    <div className="pt-1 flex items-center space-x-1.5 text-[10px] font-bold text-pink-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                      <span>NEWS2 Scale 2 Prescribed (88–92% target)</span>
                    </div>
                  )}
                </div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-[#141924] p-1.5 border border-[#1f2638]">
                    <div className="text-[9px] uppercase text-slate-400">Heart Rate</div>
                    <div className="font-mono font-bold text-xs text-emerald-400 mt-0.5">{hr}</div>
                    <div className="text-[9px] text-slate-500">bpm</div>
                  </div>
                  <div className="rounded-lg bg-[#141924] p-1.5 border border-[#1f2638]">
                    <div className="text-[9px] uppercase text-slate-400">SpO₂</div>
                    <div className="font-mono font-bold text-xs text-teal-400 mt-0.5">{spo2}</div>
                    <div className="text-[9px] text-slate-500">%</div>
                  </div>
                  <div className="rounded-lg bg-[#141924] p-1.5 border border-[#1f2638]">
                    <div className="text-[9px] uppercase text-slate-400">Resp Rate</div>
                    <div className="font-mono font-bold text-xs text-sky-400 mt-0.5">{rr}</div>
                    <div className="text-[9px] text-slate-500">/min</div>
                  </div>
                  <div className="rounded-lg bg-[#141924] p-1.5 border border-[#1f2638]">
                    <div className="text-[9px] uppercase text-slate-400">NEWS2</div>
                    <div className="font-mono font-bold text-xs text-white mt-0.5">{score}</div>
                    <div className="text-[9px] text-slate-500">pts</div>
                  </div>
                </div>

                {/* Medications List */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-slate-400">
                    <Pill className="h-3 w-3 text-emerald-400" />
                    <span>Prescribed Discharge Regimen</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {meds.map((m, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-2 py-0.5 rounded-md bg-[#161c28] text-slate-300 border border-[#21293a]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-[#1a1f2c] flex items-center justify-between text-xs text-emerald-400 font-semibold">
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

