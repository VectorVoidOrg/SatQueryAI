"use client";

import type { AnalyzeResponse } from "@/lib/types/analyze";

interface ReportVisualsProps {
  data: AnalyzeResponse;
}

export function ReportVisuals({ data }: ReportVisualsProps) {
  const evidence = data.visual_evidence;
  const changedPercent = Math.min(100, Math.max(0, (evidence?.changed_pixel_fraction ?? 0) * 100));
  const regionCount = evidence?.region_count ?? 0;
  const regions = evidence?.regions ?? [];
  const modalityLabel = data.inputs?.length
    ? data.inputs.length > 1 && data.task_intent === "cross_modal"
      ? "Cross-modal"
      : data.inputs.length > 1
        ? "Bi-temporal"
        : "Single"
    : "-";
  const modalities = data.inputs?.map((input) => input.modality.toUpperCase()).join(", ") || "-";
  const captureDates = data.inputs?.map((input) => input.timestamp).filter(Boolean).join(" -> ") || "-";
  const outputFields = [
    ["Target User Role", "-"],
    ["Data Source & Modality", `${modalityLabel} / ${modalities}`],
    ["Location & Capture Dates", captureDates],
    ["AI Confidence Score", `${Math.round(data.confidence * 100)}%`],
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-stone-300/70 bg-white/65 p-4 shadow-subtle dark:border-white/10 dark:bg-[#171512]/80 sm:p-5">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-secondary">Report visuals</p>
        <h2 className="font-serif text-xl text-primary">Quantitative summary</h2>
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]">
          <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-primary">Evidence region distribution</span><span className="font-mono text-xs text-accent">{changedPercent > 0 ? `${changedPercent.toFixed(2)}% changed` : "No percentage"}</span></div>
          {regions.length > 0 ? <div className="flex h-40 items-end gap-2 overflow-x-auto rounded-lg bg-stone-100/70 px-3 pb-3 pt-5 dark:bg-black/20">{regions.map((region, index) => { const value = region.share_of_all_change * 100; return <div key={index} className="flex min-w-8 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] font-mono text-secondary">{value.toFixed(1)}%</span><div className="w-full rounded-t-md bg-accent/80" style={{ height: `${Math.max(4, Math.min(100, value))}%` }} title={`Region ${index + 1}: ${value.toFixed(1)}% of change`} /></div>; })}</div> : <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-stone-300/70 bg-stone-100/50 px-4 text-center text-xs text-secondary dark:border-white/10 dark:bg-black/20">Not enough region data to create a chart.</div>}
          <div className="mt-2 flex justify-between text-[10px] font-mono text-secondary"><span>Region share of detected change</span><span>{regionCount} region{regionCount === 1 ? "" : "s"}</span></div>
        </div>
        <div className="min-w-0 rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]">
          <div className="mb-3 text-xs font-semibold text-primary">Output parameters</div>
          <div className="overflow-x-auto rounded-lg border border-stone-200/70 dark:border-white/10">
            <table className="w-full min-w-[22rem] text-left text-xs">
              <thead className="bg-stone-100/80 font-mono text-secondary dark:bg-[#171512]"><tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Received answer</th></tr></thead>
              <tbody className="divide-y divide-stone-200/70 dark:divide-white/10">{outputFields.map(([field, value]) => <tr key={field}><th className="px-3 py-2 align-top font-medium text-secondary">{field}</th><td className="break-words px-3 py-2 align-top text-primary">{value || "-"}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
