import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  id,
  "aria-label": ariaLabel,
}) => {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={twMerge(
        clsx(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-slate-300/60 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-40",
          checked ? "bg-slate-900 shadow-sm" : "bg-slate-200/90",
          className
        )
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "pointer-events-none inline-block h-3.5 w-3.5 mt-[2px] ml-[2px] transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
};
