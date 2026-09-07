import * as React from "react";
import { clsx } from "clsx";

export interface SliderProps {
  value: number; // 0 to 1
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
  className,
  id,
  "aria-label": ariaLabel,
}) => {
  return (
    <input
      type="range"
      id={id}
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={clsx(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
    />
  );
};
