"use client";

import React, { useSyncExternalStore } from "react";
import { APP_CONFIG } from "@/lib/config";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/store/useToastStore";

let globalIsLive = Boolean(APP_CONFIG.middlewareUrl);
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return globalIsLive;
}

function getServerSnapshot() {
  return Boolean(APP_CONFIG.middlewareUrl);
}

export const EnvironmentStatusBadge: React.FC = () => {
  const isLiveMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleMode = () => {
    const next = !globalIsLive;
    globalIsLive = next;
    listeners.forEach((l) => l());
    if (next) {
      toast.info("Switched to LIVE ANALYSIS mode", "Inference requests will route to configured backend services");
    } else {
      toast.info("Switched to DEMO MODE", "Simulating multi-band remote-sensing responses");
    }
  };

  return (
    <Tooltip
      content={
        isLiveMode
          ? "LIVE ANALYSIS: Connected to inference backend. Click to switch to Demo mode."
          : "DEMO MODE: Synthetic multi-spectral telemetry active. Click to switch to Live mode."
      }
    >
      <button
        type="button"
        onClick={toggleMode}
        className={`apple-interactive flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase font-semibold transition-all duration-200 shrink-0 ${
          isLiveMode
            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20"
            : "bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/20"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isLiveMode ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`}
        />
        <span>{isLiveMode ? "LIVE ANALYSIS" : "DEMO MODE"}</span>
      </button>
    </Tooltip>
  );
};
