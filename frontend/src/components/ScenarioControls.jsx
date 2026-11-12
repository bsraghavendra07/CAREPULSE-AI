import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Radio, 
  Database, 
  SlidersHorizontal,
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  ChevronDown,
  RotateCcw,
  Zap
} from 'lucide-react';

export default function ScenarioControls({
  dataSource,
  onSelectDataSource,
  isPlaying,
  onTogglePlay,
  onStepNext,
  activeScenario,
  onSelectScenario,
  onInjectEvent,
  activeEvent
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-3 border border-slate-800 shadow-md space-y-3">
      {/* Primary Action Row: Scenario Switcher & Playback */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* The 3 Core Scenarios (Innovation 5: What-If Recovery Simulator) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
          {/* Scenario A */}
          <button
            onClick={() => onSelectScenario('SCENARIO_A')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeScenario === 'SCENARIO_A' && !activeEvent
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>A: Stable Recovery</span>
          </button>

          {/* Scenario B */}
          <button
            onClick={() => onSelectScenario('SCENARIO_B')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeScenario === 'SCENARIO_B' || activeEvent === 'GRADUAL_DRIFT'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>B: Slow Deterioration</span>
          </button>

          {/* Scenario C */}
          <button
            onClick={() => onSelectScenario('SCENARIO_C')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeScenario === 'SCENARIO_C' || activeEvent === 'PROBE_REMOVAL'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>C: Sensor Artifact</span>
          </button>
        </div>

        {/* Right: Data Source Selector & Playback Controls */}
        <div className="flex items-center gap-2">
          
          {/* Data Source Switch (Virtual Wearable vs PhysioNet BIDMC) */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onSelectDataSource('SIMULATOR')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                dataSource === 'SIMULATOR'
                  ? 'bg-slate-800 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Virtual Wearable Simulator"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Wearable</span>
            </button>
            <button
              onClick={() => onSelectDataSource('BIDMC')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                dataSource === 'BIDMC'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="PhysioNet BIDMC Dataset Replay"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">BIDMC Replay</span>
            </button>
          </div>

          {/* Live Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Stream'}</span>
          </button>

          {/* Single Step Tick */}
          <button
            onClick={onStepNext}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Step next reading"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Advanced Injections Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-1.5 rounded-xl border transition ${
              showAdvanced || activeEvent
                ? 'bg-slate-800 text-sky-400 border-sky-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Scripted Event Injections"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Scripted Injections (Expandable to keep main view clean) */}
      {showAdvanced && (
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <Zap className="w-3 h-3 text-amber-400" />
              Inject:
            </span>
            {[
              { id: 'SUDDEN_SPIKE', label: 'Tachycardia Spike' },
              { id: 'MOTION_NOISE', label: 'Motion Noise' },
              { id: 'MISSING_DATA', label: 'Packet Dropout' },
              { id: 'PROBE_REMOVAL', label: 'Probe Removal (0)' }
            ].map((evt) => (
              <button
                key={evt.id}
                onClick={() => onInjectEvent(evt.id)}
                className={`px-2.5 py-1 rounded-lg border font-medium transition text-[11px] ${
                  activeEvent === evt.id
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {evt.label}
              </button>
            ))}
          </div>

          {activeEvent && (
            <button
              onClick={() => onInjectEvent(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
