import React from 'react';
import {
  LayoutDashboard,
  User,
  FlaskConical,
  BarChart3,
  FileJson,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type ActiveView = 'ward' | 'patient-detail' | 'scenarios' | 'report' | 'fhir';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedPatientId: string;
}

export function Sidebar({ activeView, setActiveView, selectedPatientId }: SidebarProps) {
  const navItems = [
    {
      id: 'ward' as ActiveView,
      label: 'Ward Census',
      icon: LayoutDashboard,
      description: 'Multi-patient grid',
    },
    {
      id: 'patient-detail' as ActiveView,
      label: 'Patient Detail',
      icon: User,
      description: `Deep dive (${selectedPatientId || 'Select'})`,
    },
    {
      id: 'scenarios' as ActiveView,
      label: 'Scenario Controller',
      icon: FlaskConical,
      description: 'Deterioration tests',
    },
    {
      id: 'report' as ActiveView,
      label: 'Performance Report',
      icon: BarChart3,
      description: 'Live-computed metrics',
    },
    {
      id: 'fhir' as ActiveView,
      label: 'FHIR Inspector',
      icon: FileJson,
      description: 'R4 JSON observation explorer',
    },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card/60 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
      <div className="space-y-4">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                <div>
                  <div className="leading-tight">{item.label}</div>
                  <div className={cn('text-[11px] opacity-70', isActive ? 'text-primary-foreground' : 'text-muted-foreground')}>
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Clinical Notice Footer */}
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground flex items-center space-x-1.5 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>RCP NEWS2 Standard</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Official Royal College of Physicians scoring matrix with dedicated Scale 2 hypercapnic evaluation.
        </p>
      </div>
    </aside>
  );
}

