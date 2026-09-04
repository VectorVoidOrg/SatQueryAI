import * as React from "react";
import { clsx } from "clsx";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, disabled = false }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={clsx(
            "liquid-glass absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 whitespace-nowrap",
            "rounded-full px-3 py-1 text-[11px] text-slate-800 shadow-glass pointer-events-none border border-slate-200/80 bg-white/95 font-medium",
            "animate-fade-in-up"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
