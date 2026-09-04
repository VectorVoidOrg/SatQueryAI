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
    liquid: "liquid-glass text-slate-800 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm",
    default: "bg-slate-100 text-slate-800 border border-slate-200 rounded-full",
    secondary: "bg-slate-50 text-slate-600 border border-slate-200/80 rounded-full",
    outline: "border border-slate-300 text-slate-700 rounded-full",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full",
    warning: "bg-amber-50 text-amber-900 border border-amber-300 rounded-full",
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
