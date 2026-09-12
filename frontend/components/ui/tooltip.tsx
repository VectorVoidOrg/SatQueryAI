import * as React from "react";
import { clsx } from "clsx";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  disabled?: boolean;
  side?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  disabled = false,
  side = "top",
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  if (disabled) {
    return <>{children}</>;
  }

  const getPositionClasses = () => {
    switch (side) {
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2.5";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2.5";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2.5";
      case "top":
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-2.5";
    }
  };

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
            "liquid-glass-subtle absolute z-[600] whitespace-nowrap",
            getPositionClasses(),
            "rounded-full px-2.5 py-1 text-[11px] text-[#F3EEE7] shadow-[0_6px_20px_rgba(0,0,0,0.45)] pointer-events-none border border-white/20 bg-[#171512]/95 backdrop-blur-md font-medium tracking-wide",
            "animate-fade-in-up"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
