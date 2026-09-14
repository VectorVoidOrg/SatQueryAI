"use client";

import React, { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import type { TraceStep } from "@/lib/types/analyze";

interface ExecutionTraceProps {
  trace: TraceStep[];
}

export const ExecutionTrace: React.FC<ExecutionTraceProps> = ({ trace }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl bg-stone-900 text-stone-200 border border-stone-800 overflow-hidden font-mono text-xs">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-stone-100">
            Auditable Execution Trace ({trace.length} steps)
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-stone-800 space-y-3 bg-black/40 max-h-[350px] overflow-y-auto">
          {trace.map((step, idx) => {
            const { tool, ...rest } = step;
            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-stone-900/90 border border-stone-800 space-y-1"
              >
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>
                    #{idx + 1} {tool}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-[11px] text-stone-400 space-y-0.5">
                  {Object.entries(rest).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-stone-500 shrink-0">{k}:</span>
                      <span className="text-stone-300 break-all">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
