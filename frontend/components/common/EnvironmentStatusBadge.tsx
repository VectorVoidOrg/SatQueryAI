"use client";

import React, { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";

export const EnvironmentStatusBadge: React.FC = () => {
  const [isReady, setIsReady] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok && active) {
          setIsReady(true);
        } else if (active) {
          setIsReady(false);
        }
      } catch {
        if (active) setIsReady(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const isLive = isReady === true;

  return (
    <Tooltip
      side="bottom"
      content={
        isReady === null
          ? "Checking backend health…"
          : isLive
          ? "Connected to SatQuery AI backend"
          : "Backend server unreachable (run python dev_stub_server.py)"
      }
    >
      <div
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase font-semibold transition-all duration-200 shrink-0 ${
          isReady === null
            ? "bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20"
            : isLive
            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25"
            : "bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/25"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isReady === null
              ? "bg-stone-400 animate-pulse"
              : isLive
              ? "bg-emerald-500 animate-pulse"
              : "bg-amber-500"
          }`}
        />
        <span>
          {isReady === null
            ? "CHECKING…"
            : isLive
            ? "BACKEND ONLINE"
            : "BACKEND DISCONNECTED"}
        </span>
      </div>
    </Tooltip>
  );
};
