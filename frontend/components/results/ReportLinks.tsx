"use client";

import React from "react";
import { FileText, Download } from "lucide-react";
import type { ReportLinks as ReportLinksType } from "@/lib/types/analyze";
import { downloadReportPdf, type PdfConversationTurn } from "@/lib/conversationPdf";
import type { SavedImagePreview } from "@/lib/history";

interface ReportLinksProps {
  report: ReportLinksType;
  conversation?: PdfConversationTurn[];
  imagePreviews?: SavedImagePreview[];
}

export const ReportLinks: React.FC<ReportLinksProps> = ({ report, conversation, imagePreviews = [] }) => {
  const rememberReportImages = () => {
    if (imagePreviews.length === 0) return;
    try {
      localStorage.setItem(`satquery-report-images-${report.report_id}`, JSON.stringify(imagePreviews));
    } catch {
      // Large previews may exceed storage limits; the source page can still download them.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-100/80 p-3 dark:border-white/10 dark:bg-[#1C1917]">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs"><FileText className="h-4 w-4 shrink-0 text-accent" /><span className="truncate font-semibold text-primary">Export this analysis</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={`/analysis/${report.report_id}`} onClick={rememberReportImages} className="apple-interactive px-2.5 py-1.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-[11px] text-primary hover:bg-stone-300 dark:hover:bg-stone-700 font-medium flex items-center gap-1.5 transition-colors">
          <FileText className="w-3.5 h-3.5" />
          <span>View Report</span>
        </a>

        <button
          type="button"
          onClick={() => downloadReportPdf(conversation ?? [])}
          className="apple-interactive px-2.5 py-1.5 rounded-lg bg-accent text-[11px] text-white hover:bg-accent/90 font-medium flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Report PDF</span>
        </button>

      </div>
    </div>
  );
};
