import React from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <div className={cn('relative group inline-block', className)}>
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-popover text-popover-foreground text-xs rounded px-2.5 py-1 shadow-lg border border-border whitespace-nowrap">
          {content}
        </div>
      </div>
    </div>
  );
}

