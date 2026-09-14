"use client";

import React from "react";
import type { AnalyzeResponse } from "@/lib/types/analyze";
import { AnswerBlock } from "./AnswerBlock";
import { ConfidenceBar } from "./ConfidenceBar";
import { InputsTable } from "./InputsTable";
import { EvidencePanel } from "./EvidencePanel";
import { ExecutionTrace } from "./ExecutionTrace";
import { ReportLinks } from "./ReportLinks";

interface ResultsPanelProps {
  data: AnalyzeResponse;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ data }) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-fade-in-up">
      {/* 1. Answer */}
      <AnswerBlock
        answer={data.answer}
        taskIntent={data.task_intent}
        durationSeconds={data.duration_seconds}
      />

      {/* 2. Confidence Bar + Caveat */}
      <ConfidenceBar
        confidence={data.confidence}
        confidenceSource={data.confidence_source}
      />

      {/* 3. Inputs Table */}
      {data.inputs && data.inputs.length > 0 && (
        <InputsTable inputs={data.inputs} />
      )}

      {/* 4. Visual Evidence Panel */}
      {data.visual_evidence && (
        <EvidencePanel evidence={data.visual_evidence} />
      )}

      {/* 5. Report Links */}
      {data.report && <ReportLinks report={data.report} />}

      {/* 6. Execution Trace */}
      {data.auditable_execution_trace && (
        <ExecutionTrace trace={data.auditable_execution_trace} />
      )}
    </div>
  );
};
