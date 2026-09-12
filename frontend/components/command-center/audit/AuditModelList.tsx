import React from "react";
import { AuditModelRecord } from "@/lib/types/chat";
import { Cpu, Clock, CheckCircle2 } from "lucide-react";

interface AuditModelListProps {
  models: AuditModelRecord[];
}

export const AuditModelList: React.FC<AuditModelListProps> = ({ models }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-secondary/70 font-semibold">
        <Cpu className="w-3.5 h-3.5 text-accent" />
        <span>Models Invoked in Orchestration Turn</span>
      </div>

      <div className="glass-card rounded-2xl divide-y divide-stone-200/50 dark:divide-white/5 overflow-hidden">
        {models.map((model, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3.5 text-xs hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-primary">{model.name}</span>
                <span className="rounded-full bg-sand-100 dark:bg-[#1F1B17] px-2 py-0.5 text-[10px] font-mono text-secondary dark:text-[#91877D] border border-stone-200 dark:border-white/10">
                  {model.version}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-secondary dark:text-[#B8AEA3] bg-white/60 dark:bg-[#1F1B17] px-2.5 py-1 rounded-full border border-stone-200 dark:border-white/10">
              <Clock className="w-3 h-3 text-accent" />
              <span>{model.duration_ms} ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
