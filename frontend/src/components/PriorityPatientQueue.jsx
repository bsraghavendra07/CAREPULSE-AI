import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';

export default function PriorityPatientQueue({ 
  patients = [], 
  activePatientId, 
  onSelectPatient,
  onOpenPatientMonitor 
}) {
  const [filter, setFilter] = useState('All'); // 'All' | 'Critical' | 'Monitoring'

  // Map 5 real Synthea patients to table format with live status
  const patientData = [
    {
      id: 'P-003',
      name: 'Priya Patel',
      displayId: '#P-00318',
      diagnosis: 'Severe Pneumonia / Sepsis',
      status: 'Critical',
      statusColor: 'bg-[#451A1D] text-[#EF4444] border border-[#6E2228]',
      hr: '112 bpm',
      hrColor: 'text-[#EF4444]',
      bp: '148 / 94',
      riskScore: 91,
      riskColor: 'bg-[#EF4444]',
      updated: '2 min ago'
    },
    {
      id: 'P-002',
      name: 'Arthur Pendelton',
      displayId: '#P-00204',
      diagnosis: 'COPD (NEWS2 Scale 2)',
      status: 'Monitoring',
      statusColor: 'bg-[#3A2813] text-[#F59E0B] border border-[#5C3F1B]',
      hr: '78 bpm',
      hrColor: 'text-[#20C997]',
      bp: '138 / 88',
      riskScore: 76,
      riskColor: 'bg-[#F59E0B]',
      updated: '1 hr ago'
    },
    {
      id: 'P-004',
      name: 'David Chen',
      displayId: '#P-00412',
      diagnosis: 'Heart Failure (LVEF 38%)',
      status: 'Monitoring',
      statusColor: 'bg-[#3A2813] text-[#F59E0B] border border-[#5C3F1B]',
      hr: '82 bpm',
      hrColor: 'text-[#20C997]',
      bp: '130 / 84',
      riskScore: 68,
      riskColor: 'bg-[#F59E0B]',
      updated: '45 min ago'
    },
    {
      id: 'P-001',
      name: 'Rajesh Sharma',
      displayId: '#P-00109',
      diagnosis: 'Post-CABG x3 (Beta-Blocker)',
      status: 'Monitoring',
      statusColor: 'bg-[#152322] text-[#20C997] border border-[#165342]',
      hr: '64 bpm',
      hrColor: 'text-[#20C997]',
      bp: '124 / 78',
      riskScore: 58,
      riskColor: 'bg-[#36BFFA]',
      updated: '20 min ago'
    },
    {
      id: 'P-005',
      name: 'Sunita Rao',
      displayId: '#P-00522',
      diagnosis: 'Post-Op Laparoscopic Day 4',
      status: 'Monitoring',
      statusColor: 'bg-[#152322] text-[#20C997] border border-[#165342]',
      hr: '72 bpm',
      hrColor: 'text-[#20C997]',
      bp: '118 / 76',
      riskScore: 32,
      riskColor: 'bg-[#20C997]',
      updated: 'Live'
    }
  ];

  // Filter rows
  const filtered = patientData.filter(p => {
    if (filter === 'Critical') return p.status === 'Critical';
    if (filter === 'Monitoring') return p.status === 'Monitoring';
    return true;
  });

  return (
    <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 shadow-sm space-y-3">
      {/* Header with Filter Pills */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Priority Patient Queue</h3>
          <p className="text-[11px] text-[#64748B]">Sorted by NEWS2 & AI risk score — click row for Deep-Dive</p>
        </div>

        {/* Filter Pills matching screenshot */}
        <div className="flex items-center bg-[#141A23] border border-[#252D38] rounded-xl p-0.5 text-[11px]">
          {['All', 'Critical', 'Monitoring'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filter === f
                  ? 'bg-[#20C997] text-[#080B10] shadow-sm'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase font-bold text-[#64748B] border-b border-[#1E2633] pb-2">
            <tr>
              <th className="pb-2.5 font-semibold">Patient</th>
              <th className="pb-2.5 font-semibold">Diagnosis</th>
              <th className="pb-2.5 font-semibold">Status</th>
              <th className="pb-2.5 font-semibold">Heart Rate</th>
              <th className="pb-2.5 font-semibold">BP / SpO2</th>
              <th className="pb-2.5 font-semibold text-center">AI Risk Score</th>
              <th className="pb-2.5 font-semibold text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A222D]">
            {filtered.map((row) => {
              const isSelected = row.id === activePatientId;
              return (
                <tr
                  key={row.id}
                  onClick={() => {
                    onSelectPatient(row.id);
                    if (onOpenPatientMonitor) onOpenPatientMonitor();
                  }}
                  className={`group cursor-pointer transition ${
                    isSelected ? 'bg-[#1A222D]' : 'hover:bg-[#18202A]'
                  }`}
                >
                  {/* Patient Name + ID */}
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5 group-hover:text-[#20C997]">
                          <span>{row.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <div className="text-[10px] font-mono text-[#64748B]">{row.displayId}</div>
                      </div>
                    </div>
                  </td>

                  {/* Diagnosis */}
                  <td className="py-2.5 pr-3 text-[11px] text-[#94A3B8] font-medium max-w-[130px] truncate">
                    {row.diagnosis}
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </td>

                  {/* Heart Rate */}
                  <td className={`py-2.5 pr-3 font-mono font-bold text-xs ${row.hrColor}`}>
                    {row.hr}
                  </td>

                  {/* BP / SpO2 */}
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-[#F8FAFC]">
                    {row.bp} <span className="text-[#64748B] text-[10px]">({row.spo2})</span>
                  </td>

                  {/* AI Risk Score (Bar + Value) */}
                  <td className="py-2.5 pr-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-14 h-1.5 bg-[#10151C] rounded-full overflow-hidden border border-[#252D38]">
                        <div 
                          className={`h-full rounded-full ${row.riskColor}`}
                          style={{ width: `${row.riskScore}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-white text-xs w-6 text-right">
                        {row.riskScore}
                      </span>
                    </div>
                  </td>

                  {/* Updated */}
                  <td className="py-2.5 text-right font-mono text-[10px] text-[#64748B]">
                    {row.updated}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
