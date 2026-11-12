import React from 'react';
import { SuggestedSpecialty, TriageTier } from '../../types/telemetry';
import { Wind, HeartPulse, Stethoscope, Hospital, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SuggestedSpecialtyCardProps {
  specialty?: SuggestedSpecialty;
  triageTier?: TriageTier;
  sqiStatus?: string;
  className?: string;
}

export function SuggestedSpecialtyCard({
  specialty,
  triageTier = 'REVIEW',
  sqiStatus = 'HIGH',
  className,
}: SuggestedSpecialtyCardProps) {
  // If sensor is unreliable / probe removed, show technical advisory instead of clinical specialty
  if (sqiStatus === 'LOW' || specialty?.triggering_pattern === 'SENSOR_UNRELIABLE') {
    return (
      <div
        className={cn(
          'rounded-xl border border-[#252F40] bg-[#151C2B] p-4 text-[#F1F5F9] shadow-sm',
          className
        )}
      >
        <div className="flex items-center space-x-2 text-amber-400 mb-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Technical Advisory · Signal Quality Degraded
          </span>
        </div>
        <p className="text-xs text-[#94A3B8]">
          Sensor telemetry is unreliable or disconnected (probe removal / flatline). Technical verification required before specialist review.
        </p>
        <div className="mt-3 pt-2.5 border-t border-[#252F40] text-[11px] text-[#94A3B8]">
          <span className="font-semibold text-slate-300">Note: </span>
          Specialist referrals are never recommended based on sensor artifact or probe disconnection.
        </div>
      </div>
    );
  }

  // Normal / Routine State
  if (!specialty || (!specialty.is_applicable && !specialty.suggested_specialty)) {
    return (
      <div
        className={cn(
          'rounded-xl border border-[#252F40] bg-[#151C2B] p-4 text-[#F1F5F9] shadow-sm',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-[#252F40] pb-2.5 mb-2.5">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Suggested Specialty for Review
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ROUTINE STABLE
          </span>
        </div>
        <p className="text-xs text-[#94A3B8]">
          All monitored parameters are within expected recovery thresholds. No specialist review indicated.
        </p>
      </div>
    );
  }

  // Determine specialty details & medical icon
  const specialtyName = specialty.suggested_specialty || 'General Medicine';
  let SpecialtyIcon = Hospital;
  let specialtyEmoji = '🏥';

  if (specialtyName === 'Pulmonology') {
    SpecialtyIcon = Wind;
    specialtyEmoji = '🫁';
  } else if (specialtyName === 'Cardiology') {
    SpecialtyIcon = HeartPulse;
    specialtyEmoji = '🫀';
  } else if (specialtyName === 'Internal Medicine') {
    SpecialtyIcon = Stethoscope;
    specialtyEmoji = '🩺';
  } else {
    SpecialtyIcon = Hospital;
    specialtyEmoji = '🏥';
  }

  // Styling based on triage tier
  const isUrgent = triageTier === 'URGENT';
  const alertHeader = isUrgent ? '🔴 URGENT ALERT' : '🔶 REVIEW ALERT';
  const alertTextColor = isUrgent ? 'text-rose-400' : 'text-amber-400';
  const borderColor = isUrgent ? 'border-rose-500/30' : 'border-[#252F40]';

  // Pattern display text
  const patternText = specialty.triggering_pattern || 'SpO₂ showing a sustained downward trend';
  const whyReason =
    specialty.reason || 'The alert is primarily driven by a respiratory-related vital-sign pattern.';

  return (
    <div
      className={cn(
        'rounded-xl border bg-[#151C2B] p-4 sm:p-5 text-[#F1F5F9] shadow-md space-y-4',
        borderColor,
        className
      )}
    >
      {/* 1. Alert Banner Section */}
      <div className="space-y-1">
        <div className={cn('text-xs font-bold uppercase tracking-wider flex items-center space-x-2', alertTextColor)}>
          <span>{alertHeader}</span>
        </div>
        <div className="text-sm font-semibold text-[#F1F5F9] pl-0.5">
          {patternText}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#252F40]" />

      {/* 2. Suggested Specialty for Review Section */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Suggested Specialty for Review
        </div>

        <div className="flex items-center space-x-3 bg-[#0f1523] border border-[#252F40] rounded-xl p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#151C2B] border border-[#252F40] text-xl shadow-inner">
            <span>{specialtyEmoji}</span>
          </div>

          <div className="flex items-center space-x-2">
            <SpecialtyIcon className={cn('h-5 w-5', alertTextColor)} />
            <span className="text-base font-bold text-white tracking-tight">
              {specialtyName}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Why this specialty? */}
      <div className="space-y-1">
        <div className="text-xs font-bold text-[#F1F5F9]">
          Why?
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          {whyReason}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-[#252F40]" />

      {/* 4. Mandatory Decision Support Disclaimer */}
      <div className="text-[11px] text-[#94A3B8] leading-relaxed">
        <strong className="text-slate-300 font-semibold">Note: </strong>
        <span>This is a decision-support suggestion, not a diagnosis or treatment recommendation.</span>
      </div>
    </div>
  );
}

export default SuggestedSpecialtyCard;
