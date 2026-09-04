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
      "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer";

    const variants = {
      liquid:
        "liquid-glass text-slate-800 text-sm hover:bg-white hover:shadow-sm active:scale-[0.98]",
      default:
        "bg-slate-900 text-white hover:bg-black active:scale-[0.98] shadow-sm font-semibold",
      outline:
        "liquid-glass text-slate-700 hover:text-slate-900 hover:bg-white active:scale-[0.98]",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.98]",
      secondary:
        "bg-slate-100 text-slate-850 hover:bg-slate-200 active:scale-[0.98] border border-slate-200/80",
      danger:
        "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-[0.98]",
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
