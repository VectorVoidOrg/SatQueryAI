"use client";

import React from "react";
import { useChatStore } from "@/store/useChatStore";
import { AuditModelList } from "@/components/command-center/audit/AuditModelList";
import { AuditMetricsTable } from "@/components/command-center/audit/AuditMetricsTable";
import { ShieldAlert, HelpCircle, MessageSquareText } from "lucide-react";

export const AuditTab: React.FC = () => {
  const { latestAudit, messages } = useChatStore();

  const auditData =
    latestAudit ||
    (() => {
      const msg = [...messages].reverse().find((m) => m.metrics);
      if (msg && msg.metrics) {
        return {
          query: msg.text?.slice(0, 60) + "..." || "Latest Turn",
          audit: msg.metrics,
        };
      }
      return null;
    })();

  if (!auditData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div className="max-w-xs space-y-1.5">
          <p className="font-serif text-lg text-slate-900 font-medium">Audit Log Idle</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Execute a query in the Chat panel to inspect autonomous model orchestration, pipeline latency, and IoU validation metrics.
          </p>
        </div>
      </div>
    );
  }

  const { query, audit } = auditData;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/50">
      {/* Query Context Pill */}
      <div className="liquid-glass rounded-2xl p-4 text-xs text-slate-800 space-y-2 shadow-glass border border-slate-200/80 bg-white/80">
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase tracking-widest font-semibold">
          <MessageSquareText className="w-3.5 h-3.5 text-accent" />
          <span>Audited Query Context</span>
        </div>
        <p className="font-serif italic text-base text-slate-900">"{query}"</p>
      </div>

      {/* Models Invoked */}
      {audit.models && audit.models.length > 0 && (
        <AuditModelList models={audit.models} />
      )}

      {/* Metrics Table */}
      {audit.metrics && Object.keys(audit.metrics).length > 0 && (
        <AuditMetricsTable metrics={audit.metrics} />
      )}

      {/* Trust & Scientific Verification Notice */}
      <div className="liquid-glass rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-950 border border-amber-300 bg-amber-50/70 shadow-sm">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px] text-amber-900">
          <strong className="text-amber-950 font-semibold">Defense & Scientific Grade Audit:</strong> SatQuery AI guarantees verifiable model provenance.
          IoU and confidence scores are calculated against multi-temporal Sentinel-1 SAR and optical sensor fusion.
        </p>
      </div>
    </div>
  );
};
