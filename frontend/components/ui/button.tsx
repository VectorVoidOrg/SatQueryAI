import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "danger" | "liquid";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "liquid", size = "md", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 ease-apple hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer";

    const variants = {
      liquid:
        "glass-pill text-primary text-sm hover:bg-white/70 active:scale-[0.98] border border-white/60",
      default:
        "bg-[#7F4B30] hover:bg-[#683c25] text-white hover:brightness-105 active:scale-[0.98] shadow-[0_4px_16px_rgba(127,75,48,0.35)] font-semibold ring-2 ring-[#7F4B30]/25",
      outline:
        "glass-pill text-primary hover:bg-white/80 active:scale-[0.98] border border-white/60",
      ghost:
        "text-secondary hover:text-primary hover:bg-black/5 active:scale-[0.98]",
      secondary:
        "bg-sand-100/80 text-primary hover:bg-sand-200/80 active:scale-[0.98] border border-stone-300/60",
      danger:
        "bg-rose-500/10 text-rose-700 border border-rose-200 hover:bg-rose-500/20 active:scale-[0.98]",
    };

    const sizes = {
      sm: "h-8 px-3.5 text-xs gap-1.5",
      md: "h-9 px-5 text-sm gap-2",
      lg: "h-11 px-8 text-base gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
