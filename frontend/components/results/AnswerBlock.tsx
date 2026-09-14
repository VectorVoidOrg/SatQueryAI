"use client";

import React from "react";
import { Sparkles, Clock, CheckCircle2 } from "lucide-react";

interface AnswerBlockProps {
  answer: string;
  taskIntent: string;
  durationSeconds: number;
  structuredOutput?: Record<string, unknown>;
  debugFixture?: boolean;
  compact?: boolean;
}

function renderFormattedAnswer(answer: string) {
  const lines = String(answer ?? "").split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|") && index + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[index + 1].trim())) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      const rows = tableLines
        .filter((tableLine) => !/^\|?\s*:?-{3,}/.test(tableLine))
        .map((tableLine) => tableLine.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
      const [header, ...body] = rows;
      const hasNumericValue = rows.some((row) => row.some((cell) => /(?:^|\s)(?:[-+]?\d+(?:\.\d+)?%?|\d{1,3}(?:,\d{3})+)(?:\s|$)/.test(cell)));
      const hasStatisticalField = header?.some((cell) => /count|number|area|fraction|percentage|percent|share|score|confidence|value|total|mean|median|date/i.test(cell)) ?? false;
      if (!hasNumericValue && !hasStatisticalField) {
        blocks.push(<p key={`table-text-${index}`} className="text-primary leading-relaxed">{rows.map((row) => row.join(" - ")).join(". ")}</p>);
        continue;
      }
      blocks.push(
        <div key={`table-${index}`} className="overflow-x-auto rounded-lg border border-stone-200 dark:border-white/10">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead className="bg-stone-100/80 dark:bg-[#1F1B17]
              text-secondary font-mono">
              <tr>{header?.map((cell, cellIndex) => <th key={cellIndex} className="px-3 py-2 font-semibold">{cell}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 dark:divide-white/10">
              {body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 text-primary align-top">{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`} className="list-disc space-y-1 pl-5 text-primary">{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>);
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(<ol key={`ordered-${index}`} className="list-decimal space-y-1 pl-5 text-primary">{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>);
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      blocks.push(<h4 key={`heading-${index}`} className="pt-1 text-sm font-semibold text-primary">{line.replace(/^#{1,3}\s+/, "")}</h4>);
      index += 1;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^[-*]\s+|^\d+[.)]\s+|^#{1,3}\s+|^\|/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`} className="text-primary leading-relaxed">{paragraph.join(" ")}</p>);
  }

  return blocks.length > 0 ? blocks : <p className="text-primary">No answer was returned.</p>;
}

export const AnswerBlock: React.FC<AnswerBlockProps> = ({
  answer,
  taskIntent,
  durationSeconds,
  structuredOutput,
  debugFixture = false,
  compact = false,
}) => {
  return (
    <div className={`${compact ? "p-3 space-y-2" : "p-5 space-y-3"} rounded-2xl bg-white/70 dark:bg-[#171512] border border-stone-300/80 dark:border-white/10 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-primary">Model Answer</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium uppercase">
            {taskIntent}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-secondary font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{durationSeconds}s</span>
        </div>
      </div>

      {debugFixture && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-mono text-amber-700 dark:text-amber-300">
          Explicit debug fixture: model inference and image interpretation were bypassed.
        </div>
      )}
      <div className={`${compact ? "text-sm" : "text-base sm:text-lg"} space-y-3 pl-1`}>
        {structuredOutput ? (
          <pre className="overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs leading-relaxed text-primary dark:border-white/10 dark:bg-black/20">
            {JSON.stringify(structuredOutput, null, 2)}
          </pre>
        ) : renderFormattedAnswer(answer)}
      </div>
    </div>
  );
};
