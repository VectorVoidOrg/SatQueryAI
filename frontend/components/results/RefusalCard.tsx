"use client";

import React from "react";
import { ShieldAlert, Lightbulb, RefreshCw } from "lucide-react";

interface RefusalCardProps {
  detail: string;
  onReset?: () => void;
  onSelectSuggestion?: (patch: { modality?: string; timestamp?: string }) => void;
}

const ACTION_SUGGESTIONS = [
  {
    title: "Bi-Temporal Change Pair",
    desc: "Set distinct timestamps (e.g., 2019-01-01 and 2023-01-01) for two optical images.",
  },
  {
    title: "Cross-Modal Fusion",
    desc: "Select optical for image #1 and sar for image #2.",
  },
  {
    title: "Single-Image Analysis",
    desc: "Upload 1 image for scene description or visual question answering.",
  },
];

export const RefusalCard: React.FC<RefusalCardProps> = ({ detail, onReset }) => {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30 text-primary space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>Backend Guardrail Refusal (HTTP 400)</span>
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="apple-interactive px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        )}
      </div>

      {/* Verbatim Backend Message */}
      <div className="p-4 rounded-xl bg-white/60 dark:bg-[#171512] border border-rose-500/20 font-mono text-xs text-rose-800 dark:text-rose-200 leading-relaxed whitespace-pre-wrap">
        {detail}
      </div>

      {/* Recommended Fixes */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>How to fix this request:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {ACTION_SUGGESTIONS.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white/40 dark:bg-[#1C1917] border border-stone-200 dark:border-white/10 space-y-1 text-xs"
            >
              <span className="font-semibold text-primary block">{item.title}</span>
              <p className="text-secondary text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
