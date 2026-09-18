import type { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

interface BubbleProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end";
  variant?: "default" | "muted";
  children: ReactNode;
}

export function Bubble({ align = "start", variant = "default", className, children, ...props }: BubbleProps) {
  return (
    <div
      className={clsx(
        "flex w-full",
        align === "end" ? "justify-end" : "justify-start",
        className,
      )}
      {...props}
    >
      <div
        className={clsx(
          "max-w-[92%] rounded-2xl px-4 py-3 shadow-sm",
          align === "end" ? "rounded-br-md" : "rounded-bl-md",
          variant === "muted"
            ? "border border-stone-200/80 bg-white/70 text-primary dark:border-white/10 dark:bg-[#171512]"
            : "bg-[#1C1917] text-white",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function BubbleContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("text-sm leading-relaxed", className)} {...props}>{children}</div>;
}

export function BubbleGroup({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("space-y-2", className)} {...props}>{children}</div>;
}

export function BubbleReactions({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("mt-2 flex gap-1 text-[10px] text-secondary", className)} {...props}>{children}</div>;
}