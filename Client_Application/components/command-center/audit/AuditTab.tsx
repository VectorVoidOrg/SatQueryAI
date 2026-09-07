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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-secondary space-y-4">
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-secondary shadow-xs">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div className="max-w-xs space-y-1.5">
          <p className="font-serif text-lg text-primary font-medium">Audit Log Idle</p>
          <p className="text-[11px] text-secondary leading-relaxed">
            Execute a query in the Chat panel to inspect autonomous model orchestration, pipeline latency, and IoU validation metrics.
          </p>
        </div>
      </div>
    );
  }

  const { query, audit } = auditData;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-transparent">
      {/* Query Context Pill */}
      <div className="glass-card rounded-2xl p-4 text-xs text-primary space-y-2">
        <div className="flex items-center gap-2 text-secondary font-mono text-[10px] uppercase tracking-widest font-semibold">
          <MessageSquareText className="w-3.5 h-3.5 text-accent" />
          <span>Audited Query Context</span>
        </div>
        <p className="font-serif italic text-base text-primary">"{query}"</p>
      </div>

      {/* Models Invoked */}
      {audit.models && audit.models.length > 0 && (
        <AuditModelList models={audit.models} />
      )}

      {/* Metrics Table */}
      {audit.metrics && Object.keys(audit.metrics).length > 0 && (
        <AuditMetricsTable metrics={audit.metrics} />
      )}

      {/* Security provenance statement */}
      <div className="flex items-start gap-2 p-3.5 rounded-xl bg-sand-100/60 border border-stone-200/60 text-[11px] text-secondary">
        <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Confidence threshold: &gt; 80%. All bounding coordinates conform to EPSG:4326 geospatial projection calibration.
        </p>
      </div>
    </div>
  );
};
