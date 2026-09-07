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
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-stone-300/40 transition-all duration-200 ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40",
          checked ? "bg-accent shadow-xs" : "bg-stone-200",
          className
        )
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "pointer-events-none inline-block h-3.5 w-3.5 mt-[2px] ml-[2px] transform rounded-full bg-white shadow-sm transition duration-200 ease-apple",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
};
