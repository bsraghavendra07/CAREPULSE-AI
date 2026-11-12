import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const TabsContext = createContext<TabsContextType>({ activeTab: '', setActiveTab: () => { } });

export function Tabs({ defaultValue, value, onValueChange, children, className }: any) {
  const [tab, setTab] = useState(defaultValue || '');
  const active = value !== undefined ? value : tab;
  const set = onValueChange || setTab;

  return (
    <TabsContext.Provider value={{ activeTab: active, setActiveTab: set }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: any) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children }: any) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: any) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div className={cn('mt-2 ring-offset-background focus-visible:outline-none', className)}>{children}</div>;
}

