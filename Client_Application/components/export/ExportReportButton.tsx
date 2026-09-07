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
      className="apple-interactive text-xs h-8 px-3.5 sm:px-4 font-semibold text-white bg-[#7F4B30] hover:bg-[#B27D57] transition-all duration-200 ease-apple shadow-xs border border-[#7F4B30]/30 hover:-translate-y-0.5 active:scale-[0.98] shrink-0 whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
    >
      {exportState === "generating" ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          <span>Generating PDF...</span>
        </>
      ) : exportState === "downloaded" ? (
        <>
          <Check className="w-3.5 h-3.5 text-white" />
          <span className="text-white font-semibold">Downloaded ✓</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 text-white/90" />
          <span className="hidden sm:inline">Export Audit Report</span>
          <span className="sm:hidden">Export</span>
        </>
      )}
    </Button>
  );

  if (!hasHistory) {
    return (
      <Tooltip content="Submit at least one analytical query to export a calibrated PDF report">
        <div>{buttonContent}</div>
      </Tooltip>
    );
  }

  return buttonContent;
};
