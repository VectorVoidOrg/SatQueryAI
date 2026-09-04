import React from "react";
import { AuditModelRecord } from "@/lib/types/chat";
import { Cpu, Clock, CheckCircle2 } from "lucide-react";

interface AuditModelListProps {
  models: AuditModelRecord[];
}

export const AuditModelList: React.FC<AuditModelListProps> = ({ models }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-500 font-semibold">
        <Cpu className="w-3.5 h-3.5 text-accent" />
        <span>Models Invoked in Orchestration Turn</span>
      </div>

      <div className="liquid-glass rounded-2xl divide-y divide-slate-200/70 overflow-hidden shadow-glass border border-slate-200/80 bg-white/80">
        {models.map((model, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3.5 text-xs hover:bg-slate-50/50 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-900">{model.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200">
                  {model.version}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{model.duration_ms} ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
