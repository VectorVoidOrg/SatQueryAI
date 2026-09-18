"use client";

import React from "react";
import type { AnalyzeResponse } from "@/lib/types/analyze";
import type { SavedImagePreview } from "@/lib/history";
import { AnswerBlock } from "./AnswerBlock";
import { ConfidenceBar } from "./ConfidenceBar";
import { InputsTable } from "./InputsTable";
import { EvidencePanel } from "./EvidencePanel";
import { ExecutionTrace } from "./ExecutionTrace";
import { ReportLinks } from "./ReportLinks";
import type { PdfConversationTurn } from "@/lib/conversationPdf";

interface ResultsPanelProps {
  data: AnalyzeResponse;
  imagePreviews?: SavedImagePreview[];
  showImages?: boolean;
  dense?: boolean;
  conversation?: PdfConversationTurn[];
  showReportActions?: boolean;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ data, imagePreviews = [], showImages = true, dense = false, conversation, showReportActions = true }) => {
  return (
    <div className={`${dense ? "space-y-2" : "space-y-4"} w-full mx-auto animate-fade-in-up`}>
      {showImages && imagePreviews.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{imagePreviews.map((image) => <figure key={image.filename} className="overflow-hidden rounded-xl border border-stone-200 bg-white/60 dark:border-white/10 dark:bg-[#171512]"><img src={image.data_url} alt={image.filename} className="max-h-64 w-full object-contain" /><figcaption className="truncate px-3 py-2 text-xs text-secondary">{image.filename}</figcaption></figure>)}</div>}
      {/* 1. Plain-English answer */}
      <AnswerBlock
        answer={data.answer}
        taskIntent={data.task_intent}
        durationSeconds={data.duration_seconds}
        structuredOutput={data.structured_debug_output}
        debugFixture={data.debug_fixture}
        compact={dense}
      />

      {/* 2. Received data tables */}
      {data.inputs && data.inputs.length > 0 && (
        <InputsTable inputs={data.inputs} />
      )}

      {/* 3. Minimal confidence */}
      <ConfidenceBar confidence={data.confidence} confidenceSource={data.confidence_source} />

      {/* 4. Primary exports */}
      {showReportActions && data.report && <ReportLinks report={data.report} imagePreviews={imagePreviews} conversation={conversation ?? [{ query: data.query, response: data, imagePreviews }]} />}

      {/* 5. Supporting evidence */}
      {data.visual_evidence && (
        <EvidencePanel evidence={data.visual_evidence} />
      )}

      {/* 6. Execution audit */}
      {data.auditable_execution_trace && (
        <ExecutionTrace trace={data.auditable_execution_trace} />
      )}
    </div>
  );
};
