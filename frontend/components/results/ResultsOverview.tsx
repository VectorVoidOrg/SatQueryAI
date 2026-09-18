"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, Crosshair, MapPin, ShieldCheck, UserRound } from "lucide-react";
import type { AnalyzeResponse } from "@/lib/types/analyze";

const ROLES = ["Local Official", "Patwari", "Disaster Management Responder"] as const;

type ResultsOverviewProps = {
  data: AnalyzeResponse;
};

function formatModality(value: string) {
  return value.replace("multispectral", "multispectral").toUpperCase();
}

export function ResultsOverview({ data }: ResultsOverviewProps) {
  const [role, setRole] = useState<(typeof ROLES)[number]>("Local Official");
  const inputs = data.inputs ?? [];
  const evidence = data.visual_evidence;
  const changedPercent = evidence?.changed_pixel_fraction === undefined
    ? null
    : evidence.changed_pixel_fraction * 100;
  const sourceSummary = useMemo(() => {
    const modalities = Array.from(new Set(inputs.map((input) => formatModality(input.modality))));
    const dates = inputs.map((input) => input.timestamp).filter(Boolean) as string[];
    return { modalities, dates };
  }, [inputs]);
  const metricItems = [
    { label: "AI confidence", value: `${Math.round(data.confidence * 100)}%`, detail: data.confidence_source.replaceAll("_", " "), tone: data.confidence >= 0.8 ? "emerald" : data.confidence >= 0.5 ? "amber" : "rose" },
    { label: "Changed area", value: changedPercent === null ? "N/A" : `${changedPercent.toFixed(2)}%`, detail: "of visible scene", tone: "accent" },
    { label: "Evidence regions", value: String(evidence?.region_count ?? 0), detail: "detected regions", tone: "accent" },
    { label: "Processing time", value: `${data.duration_seconds.toFixed(1)}s`, detail: "end-to-end run", tone: "slate" },
  ];

  return (
    <section className="space-y-3 rounded-2xl border border-stone-300/70 bg-white/65 p-4 shadow-subtle dark:border-white/10 dark:bg-[#171512]/80 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.42fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><BarChart3 className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-secondary">Decision output</p>
              <h2 className="truncate font-serif text-xl text-primary">Analysis brief</h2>
            </div>
          </div>
          <div className="rounded-xl border border-stone-200/80 bg-stone-100/65 p-3 dark:border-white/10 dark:bg-[#1C1917]">
            <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-secondary">Plain-English query</p>
            <p className="break-words text-sm leading-relaxed text-primary">{data.query}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-secondary">
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-300/70 bg-white/55 px-2 py-1 dark:border-white/10 dark:bg-white/5"><Crosshair className="h-3 w-3 text-accent" />{data.task_intent.replaceAll("_", " ")}</span>
            {sourceSummary.modalities.map((modality) => <span key={modality} className="inline-flex items-center gap-1 rounded-full border border-stone-300/70 bg-white/55 px-2 py-1 dark:border-white/10 dark:bg-white/5">{modality}</span>)}
            {sourceSummary.dates.length > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-stone-300/70 bg-white/55 px-2 py-1 dark:border-white/10 dark:bg-white/5"><CalendarDays className="h-3 w-3 text-accent" />{sourceSummary.dates.join(" -> ")}</span>}
            {inputs.length > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-stone-300/70 bg-white/55 px-2 py-1 dark:border-white/10 dark:bg-white/5"><MapPin className="h-3 w-3 text-accent" />{inputs.length} input{inputs.length === 1 ? "" : "s"}</span>}
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-stone-200/80 bg-stone-100/65 p-3 dark:border-white/10 dark:bg-[#1C1917]">
          <label htmlFor="results-role" className="mb-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-secondary"><UserRound className="h-3 w-3 text-accent" />Target user role</label>
          <select id="results-role" value={role} onChange={(event) => setRole(event.target.value as (typeof ROLES)[number])} className="w-full appearance-none rounded-lg border border-stone-300/70 bg-white/80 px-3 py-2 text-xs font-medium text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-[#171512]">
            {ROLES.map((option) => <option key={option}>{option}</option>)}
          </select>
          <p className="mt-2 text-[10px] leading-relaxed text-secondary">Output is framed for {role.toLowerCase()} review.</p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {metricItems.map((metric) => <div key={metric.label} className="min-w-0 rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]"><div className="flex items-center gap-1.5 text-[10px] text-secondary"><ShieldCheck className={`h-3.5 w-3.5 ${metric.tone === "emerald" ? "text-emerald-500" : metric.tone === "amber" ? "text-amber-500" : metric.tone === "rose" ? "text-rose-500" : "text-accent"}`} /><span className="truncate">{metric.label}</span></div><p className="mt-1 truncate text-lg font-semibold text-primary">{metric.value}</p><p className="truncate text-[10px] font-mono text-secondary">{metric.detail}</p></div>)}
      </div>

      {changedPercent !== null && <div className="rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]"><div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-mono text-secondary"><span>Quantitative change footprint</span><span className="shrink-0 text-primary">{changedPercent.toFixed(2)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, changedPercent))}%` }} /></div></div>}
    </section>
  );
}
