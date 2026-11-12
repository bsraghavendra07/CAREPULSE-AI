import React, { useEffect, useState } from 'react';
import { Activity, Clock, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../ui/badge';

interface HeaderProps {
  connected: boolean;
  speedFactor?: number;
}

export function Header({ connected, speedFactor = 1 }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-6 backdrop-blur-md shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              CarePulse
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 border-emerald-500/30">
              CLINICAL CDS
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Smarter Monitoring. Earlier Awareness. Safer Recovery.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Simulation Speed indicator */}
        {speedFactor > 1 && (
          <Badge variant="secondary" className="font-mono text-xs text-amber-400 border border-amber-500/30">
            Speed: {speedFactor}x
          </Badge>
        )}

        {/* Live Clock */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-1.5 rounded-md border border-border">
          <Clock className="h-3.5 w-3.5" />
          <span>{time || '--:--:--'}</span>
        </div>

        {/* FHIR R4 Ready Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>FHIR R4 / HAPI</span>
        </div>

        {/* Live WebSocket Status */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${
            connected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              <span>LIVE TELEMETRY</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              <span>CONNECTING...</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

