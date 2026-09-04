import * as React from "react";
import { clsx } from "clsx";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={clsx("flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div
      role="tablist"
      className={clsx(
        "liquid-glass inline-flex h-9 items-center justify-start rounded-full p-1 text-slate-500",
        className
      )}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className,
  disabled = false,
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isSelected = context.value === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={clsx(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:pointer-events-none disabled:opacity-40",
        isSelected
          ? "bg-slate-900 text-white font-semibold shadow-sm"
          : "text-slate-600 hover:text-slate-900 hover:bg-black/5",
        className
      )}
    >
      {children}
    </button>
  );
};

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div role="tabpanel" className={clsx("mt-2 focus-visible:outline-none", className)}>
      {children}
    </div>
  );
};
