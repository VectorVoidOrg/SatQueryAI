"use client";

import React, { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useAssetStore } from "@/store/useAssetStore";
import { exportReportToPdf } from "@/components/export/exportPdf";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export const ExportReportButton: React.FC = () => {
  const [exportState, setExportState] = useState<"idle" | "generating" | "downloaded">("idle");

  const { messages, latestAudit, sessionId } = useChatStore();
  const { assetName, assetId, bbox } = useAssetStore();

  const hasHistory = messages.length > 0;

  const handleExport = async () => {
    if (!hasHistory || exportState === "generating") return;

    setExportState("generating");

    try {
      await exportReportToPdf({
        aoiName: assetName,
        assetId,
        sessionId,
        messages,
        latestAudit,
        bbox,
      });

      setExportState("downloaded");
      setTimeout(() => {
        setExportState("idle");
      }, 2000);
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
      setExportState("idle");
    }
  };

  const buttonContent = (
    <Button
      variant="liquid"
      size="sm"
      disabled={!hasHistory || exportState === "generating"}
      onClick={handleExport}
      className="text-xs h-8 px-4 font-semibold text-slate-800 hover:text-black transition-all shadow-sm border border-slate-300/80"
    >
      {exportState === "generating" ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          <span>Generating PDF...</span>
        </>
      ) : exportState === "downloaded" ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-700 font-semibold">Downloaded ✓</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Export Report</span>
        </>
      )}
    </Button>
  );

  if (!hasHistory) {
    return (
      <Tooltip content="Chat history required before generating report" disabled={hasHistory}>
        <div>{buttonContent}</div>
      </Tooltip>
    );
  }

  return buttonContent;
};
