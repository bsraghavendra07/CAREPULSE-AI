import React from 'react';
import { SuggestedSpecialty, TriageTier } from '../../types/telemetry';
import { Wind, HeartPulse, Stethoscope, Hospital, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SuggestedSpecialtyCardProps {
  specialty?: SuggestedSpecialty;
  triageTier?: TriageTier;
  sqiStatus?: string;
  className?: string;
}

export function SuggestedSpecialtyCard({
  specialty,
  triageTier = 'ROUTINE',
  sqiStatus = 'HIGH',
  className,
}: SuggestedSpecialtyCardProps) {
  // If sensor is unreliable / probe removed, show technical advisory instead of clinical specialty
  if (sqiStatus === 'LOW' || specialty?.triggering_pattern === 'SENSOR_UNRELIABLE') {
    return (
      <div
        className={cn(
          'rounded-xl border border-[#252F40] bg-[#151C2B] p-4 text-[#F1F5F9] shadow-md transition-all duration-200',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-[#252F40] pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Technical Verification Required
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            SQI DEGRADED
          </span>
        </div>

        <p className="text-xs text-[#94A3B8]">
          Sensor telemetry is unreliable or disconnected (probe removal / flatline). Technical inspection required before any clinical specialty review can be recommended.
        </p>

        <div className="mt-3 pt-2.5 border-t border-[#252F40]/60 flex items-center space-x-2 text-[10px] text-[#94A3B8]/75">
          <Info className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span>Clinical Safety Rule: Specialist referrals are never triggered from artifact readings.</span>
        </div>
      </div>
    );
  }

  // Normal / Routine State
  if (!specialty || !specialty.is_applicable || !specialty.suggested_specialty) {
    return (
      <div
        className={cn(
          'rounded-xl border border-[#252F40] bg-[#151C2B] p-4 text-[#F1F5F9] shadow-md transition-all duration-200',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-[#252F40] pb-2.5 mb-2.5">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Suggested Specialty for Review
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ROUTINE STABLE
          </span>
        </div>
        <p className="text-xs text-[#94A3B8]">
          All vital signs remain within expected baseline thresholds. No specialist escalation currently indicated.
        </p>
      </div>
    );
  }

  // Determine specialty icon, badge and emoji
  let SpecialtyIcon = Hospital;
  let specialtyEmoji = '🏥';

  switch (specialty.suggested_specialty) {
    case 'Pulmonology':
      SpecialtyIcon = Wind;
      specialtyEmoji = '🫁';
      break;
    case 'Cardiology':
      SpecialtyIcon = HeartPulse;
      specialtyEmoji = '🫀';
      break;
    case 'Internal Medicine':
      SpecialtyIcon = Stethoscope;
      specialtyEmoji = '🩺';
      break;
    case 'General Medicine':
      SpecialtyIcon = Hospital;
      specialtyEmoji = '🏥';
      break;
  }

  // Accent styling per tier
  const isUrgent = triageTier === 'URGENT';
  const accentBorder = isUrgent ? 'border-rose-500/40' : 'border-amber-500/40';
  const accentBadge = isUrgent
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  const iconColor = isUrgent ? 'text-rose-400' : 'text-amber-400';

  return (
    <div
      className={cn(
        'rounded-xl border border-[#252F40] bg-[#151C2B] p-4 text-[#F1F5F9] shadow-md transition-all duration-200',
        accentBorder,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252F40] pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <SpecialtyIcon className={cn('h-4 w-4', iconColor)} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Suggested Specialty for Review
          </span>
        </div>
        <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded border', accentBadge)}>
          {triageTier} ESCALATION
        </span>
      </div>

      {/* Main Specialty Callout */}
      <div className="flex items-center space-x-3 mb-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0e1420] border border-[#252F40] text-xl shadow-inner">
          <span>{specialtyEmoji}</span>
        </div>
        <div>
          <div className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{specialty.suggested_specialty}</span>
          </div>
          <div className="text-[11px] font-mono text-[#94A3B8]">
            Pattern: <span className="text-amber-300 font-semibold">{specialty.triggering_pattern}</span>
          </div>
        </div>
      </div>

      {/* Rationale Section */}
      <div className="bg-[#0e1420] rounded-lg p-3 border border-[#252F40]/80 space-y-1 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Why this specialty?
        </div>
        <p className="text-xs text-[#F1F5F9] leading-relaxed">
          {specialty.reason}
        </p>
      </div>

      {/* Mandatory Clinical Decision Support Disclaimer */}
      <div className="pt-2 border-t border-[#252F40]/60 flex items-start space-x-2 text-[10px] text-[#94A3B8]">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#94A3B8]" />
        <div>
          <span className="font-semibold text-[#F1F5F9]">Clinical Decision Support: </span>
          <span>This is a clinical decision-support suggestion, not a diagnosis or treatment recommendation.</span>
        </div>
      </div>
    </div>
  );
}
