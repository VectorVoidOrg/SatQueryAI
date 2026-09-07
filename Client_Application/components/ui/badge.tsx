import * as React from "react";
import { clsx } from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "error" | "liquid";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "liquid",
  children,
  ...props
}) => {
  const variants = {
    liquid: "liquid-glass text-primary px-3 py-0.5 rounded-full text-xs font-medium shadow-xs border border-white/60",
    default: "bg-sand-100 text-primary border border-stone-200 rounded-full",
    secondary: "bg-white/50 text-secondary border border-stone-200 rounded-full",
    outline: "border border-stone-300 text-primary rounded-full",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full",
    warning: "bg-amber-50 text-amber-800 border border-amber-200 rounded-full",
    error: "bg-rose-50 text-rose-800 border border-rose-200 rounded-full",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
