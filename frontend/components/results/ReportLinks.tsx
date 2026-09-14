"use client";

import React from "react";
import { FileText, Download, Code } from "lucide-react";
import type { ReportLinks as ReportLinksType } from "@/lib/types/analyze";
import { downloadConversationPdf, type PdfConversationTurn } from "@/lib/conversationPdf";

interface ReportLinksProps {
  report: ReportLinksType;
  conversation?: PdfConversationTurn[];
}

export const ReportLinks: React.FC<ReportLinksProps> = ({ report, conversation }) => {
  return (
    <div className="p-4 rounded-xl bg-stone-100/80 dark:bg-[#1C1917] border border-stone-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-accent" />
        <span className="font-semibold text-primary">Downloadable Report Record</span>
        <span className="font-mono text-[10px] text-secondary">
          (ID: {report.report_id})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={report.view_url}
          target="_blank"
          rel="noopener noreferrer"
          className="apple-interactive px-3 py-1.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-primary hover:bg-stone-300 dark:hover:bg-stone-700 font-medium flex items-center gap-1.5 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View Report</span>
        </a>

        <button
          type="button"
          onClick={() => downloadConversationPdf(conversation ?? [])}
          className="apple-interactive px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 font-medium flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>

        <a
          href={report.json_url}
          target="_blank"
          rel="noopener noreferrer"
          className="apple-interactive px-3 py-1.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-secondary hover:text-primary font-mono text-[11px] flex items-center gap-1 transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
          <span>JSON</span>
        </a>
      </div>
    </div>
  );
};
