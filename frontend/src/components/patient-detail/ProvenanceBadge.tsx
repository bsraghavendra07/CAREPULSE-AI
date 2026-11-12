import React from 'react';
import { DataSource } from '../../types/telemetry';
import { cn } from '../../lib/utils';

interface ProvenanceBadgeProps {
  source: DataSource;
  className?: string;
}

export function ProvenanceBadge({ source, className }: ProvenanceBadgeProps) {
  const isBidmc = source === 'BIDMC';
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-tight border',
        isBidmc
          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
          : 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        className
      )}
      title={isBidmc ? 'Actual BIDMC PhysioNet recording' : 'Virtual wearable simulator measurement'}
    >
      {isBidmc ? '🔵 BIDMC' : '🟣 SIM'}
    </span>
  );
}

