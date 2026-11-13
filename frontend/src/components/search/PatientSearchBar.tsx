import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, User, Heart, Activity, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { PatientProfile } from '../../types/patient';
import { TelemetryTick } from '../../types/telemetry';

interface PatientSearchBarProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  onSelectPatient: (patient: PatientProfile) => void;
  className?: string;
}

export function PatientSearchBar({
  patients,
  latestTicks,
  onSelectPatient,
  className = '',
}: PatientSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter patients by Name, ID (P001, P-001), or UHID
  const matchedPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const cleanQueryId = query.replace(/[^a-z0-9]/g, '');

    return patients.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const cleanPid = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const idMatch = p.id.toLowerCase().includes(query) || (cleanQueryId.length >= 2 && cleanPid.includes(cleanQueryId));
      
      const uhid = p.uhid || `UHID-${p.id.replace(/\D/g, '').padStart(6, '0') || '100234'}`;
      const uhidMatch = uhid.toLowerCase().includes(query) || uhid.replace(/[^a-z0-9]/g, '').toLowerCase().includes(cleanQueryId);

      return nameMatch || idMatch || uhidMatch;
    });
  }, [patients, searchTerm]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ── SEARCH INPUT BAR ── */}
      <div className="relative flex items-center w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-[#64748B]">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[#00A896]" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search Patient by Name, Patient ID (e.g. P001), or UHID..."
          className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 rounded-2xl bg-white border border-[#CBD5E1] text-sm text-[#131E3A] placeholder-[#94A3B8] shadow-xs focus:outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 transition-all font-medium"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#64748B]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── SEARCH RESULTS DROPDOWN / CARDS ── */}
      {isFocused && searchTerm.trim() && (
        <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden max-h-[460px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          {matchedPatients.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#64748B]">
              No patients found matching "<span className="font-semibold text-[#131E3A]">{searchTerm}</span>".
              <p className="text-xs text-[#94A3B8] mt-1">Try searching by ID (e.g. <span className="font-mono font-semibold">P001</span>), UHID, or Name (e.g. <span className="font-semibold">Anitha Sharma</span>).</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              <div className="bg-[#F8FAFC] px-4 py-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                <span>Found Patients ({matchedPatients.length})</span>
                <span className="text-[10px] text-[#00A896]">Live Clinical Telemetry</span>
              </div>
              {matchedPatients.map((patient) => {
                const tick = latestTicks[patient.id];
                const rawHr = tick?.vitals?.heart_rate ?? patient.baseline?.heart_rate ?? 78;
                const hr = typeof rawHr === 'number' ? rawHr : parseFloat(String(rawHr)) || 78;

                const rawSpo2 = tick?.vitals?.oxygen_saturation ?? patient.baseline?.oxygen_saturation ?? 98;
                const spo2 = typeof rawSpo2 === 'number' ? rawSpo2 : parseFloat(String(rawSpo2)) || 98;

                const riskLevel = tick?.news2?.risk_level || 'LOW';
                const hasCriticalAlert = riskLevel === 'HIGH' || tick?.news2?.has_red_score;
                const alertStatus = hasCriticalAlert
                  ? 'High-Risk Deterioration Active'
                  : riskLevel === 'MEDIUM'
                  ? 'Clinical Review Advisory'
                  : 'Normal Monitoring Active';
                const uhid = patient.uhid || `UHID-${patient.id.replace(/\D/g, '').padStart(6, '0') || '100234'}`;

                return (
                  <div
                    key={patient.id}
                    className="p-4 hover:bg-[#F4FBF9] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Patient Core Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm sm:text-base text-[#131E3A]">
                          {patient.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-[#E2E8F0] text-[#334155]">
                          {patient.id.replace('-', '')} ({patient.id})
                        </span>
                        <span className="text-[11px] font-mono text-[#94A3B8] hidden md:inline">
                          {uhid}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                        <span>Age: <strong className="text-[#334155]">{patient.age || 58}</strong></span>
                        <span>Gender: <strong className="text-[#334155] capitalize">{patient.gender}</strong></span>
                        <span>Condition: <strong className="text-[#334155]">{patient.condition}</strong></span>
                      </div>
                    </div>

                    {/* Vitals & Risk Badges */}
                    <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
                      {/* Heart Rate */}
                      <div className="text-right">
                        <span className="text-[10px] text-[#64748B] block font-medium">HR</span>
                        <span className={`text-sm font-bold font-mono ${hr > 120 ? 'text-red-600' : 'text-[#131E3A]'}`}>
                          {Math.round(hr)} <span className="text-[10px] font-normal text-[#64748B]">bpm</span>
                        </span>
                      </div>

                      {/* SpO2 */}
                      <div className="text-right">
                        <span className="text-[10px] text-[#64748B] block font-medium">SpO₂</span>
                        <span className={`text-sm font-bold font-mono ${spo2 < 92 ? 'text-red-600' : 'text-[#131E3A]'}`}>
                          {Math.round(spo2)}<span className="text-[10px] font-normal text-[#64748B]">%</span>
                        </span>
                      </div>

                      {/* Risk Badge */}
                      <div className="text-right">
                        <span className="text-[10px] text-[#64748B] block font-medium">Risk</span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
                            riskLevel === 'HIGH'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : riskLevel === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {riskLevel}
                        </span>
                      </div>

                      {/* View Patient Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPatient(patient);
                          setIsFocused(false);
                          setSearchTerm('');
                        }}
                        className="py-1.5 px-3.5 rounded-full bg-gradient-to-r from-[#00D2C4] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-all active:scale-95 cursor-pointer ml-1"
                      >
                        <span>View Patient</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
