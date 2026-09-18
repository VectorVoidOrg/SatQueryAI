"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

interface ConfidenceBarProps {
  confidence: number; // float 0..1
  confidenceSource: string;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  confidence,
  confidenceSource,
}) => {
  const percent = Math.round(confidence * 100);
  const colorClass =
    percent >= 80
      ? "bg-emerald-500"
      : percent >= 50
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-100/80 p-3 dark:border-white/10 dark:bg-[#1C1917]">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-secondary"><ShieldCheck className="h-3.5 w-3.5 text-accent" />Confidence</span>
        <span className="font-mono font-bold text-primary">{percent}%</span>
      </div>

      {/* Bar */}
      <div className="w-full h-2 rounded-full bg-stone-300 dark:bg-stone-800 overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <span className="sr-only">Source: {confidenceSource}</span>
    </div>
  );
};
