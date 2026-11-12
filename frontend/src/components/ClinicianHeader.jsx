import React from 'react';
import { Search, Heart, UserCheck, Sparkles } from 'lucide-react';

export default function ClinicianHeader({
  isConnected,
  lang,
  setLang,
  onOpenCheckin,
  searchQuery,
  setSearchQuery,
  urgentAlerts = 0
}) {
  return (
    <header className="h-16 border-b border-[#1E2633] px-6 flex items-center justify-between gap-4 bg-[#080B10]">
      {/* Left: Greeting, Ward, and Live Monitoring Pill */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              Good afternoon, Dr. Rivera
              <span className="text-[#20C997] text-sm">❇️</span>
            </h1>
            
            {/* Live Monitoring Badge Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0F2922] border border-[#165342] text-[11px] font-semibold text-[#20C997]">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#20C997] animate-ping' : 'bg-rose-500'}`} />
              <span>Live Monitoring (WS Active)</span>
            </div>
          </div>
          
          <div className="text-[11px] text-[#64748B] font-medium">
            Thursday, 12 November 2026 · Ward 4B — Post-Discharge Continuous Telemetry
          </div>
        </div>
      </div>

      {/* Right: Search, Check-In, Multilingual & Favorite */}
      <div className="flex items-center gap-3">
        {/* Search Input Field */}
        <div className="relative w-64 hidden sm:block">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder="Search patients, reports..."
            className="w-full bg-[#141A23] border border-[#252D38] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#20C997] transition"
          />
        </div>

        {/* Multilingual Selector */}
        <div className="flex items-center bg-[#141A23] border border-[#252D38] rounded-xl p-0.5 text-[11px]">
          {['en', 'kn', 'hi'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-0.5 rounded-lg font-bold uppercase transition ${
                lang === l
                  ? 'bg-[#20C997] text-[#080B10] shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Daily Patient Check-In Quick Button */}
        <button
          onClick={onOpenCheckin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141A23] hover:bg-[#1A222D] text-[#94A3B8] hover:text-white border border-[#252D38] text-xs font-medium transition"
          title="Daily Patient Symptom Check-In"
        >
          <UserCheck className="w-3.5 h-3.5 text-[#20C997]" />
          <span className="hidden md:inline">Check-in</span>
        </button>

        {/* Heart Favorite / Status Button */}
        <button className="p-2 rounded-xl bg-[#141A23] border border-[#252D38] text-[#94A3B8] hover:text-[#EF4444] transition">
          <Heart className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
