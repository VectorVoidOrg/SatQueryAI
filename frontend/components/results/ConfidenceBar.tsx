"use client";

import React from "react";
import { Info, ShieldAlert } from "lucide-react";

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
    <div className="p-4 rounded-xl bg-stone-100/80 dark:bg-[#1C1917] border border-stone-200 dark:border-white/10 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-secondary">Sequence Confidence</span>
        <span className="font-mono font-bold text-primary">{percent}%</span>
      </div>

      {/* Bar */}
      <div className="w-full h-2 rounded-full bg-stone-300 dark:bg-stone-800 overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Meta + Mandatory Caveat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-secondary font-mono pt-1">
        <span>Source: {confidenceSource}</span>
        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <Info className="w-3 h-3 shrink-0" />
          <span>Model output token probability distribution, not absolute ground truth.</span>
        </div>
      </div>
    </div>
  );
};
