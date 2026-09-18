"use client";

import { useState } from "react";
import { Grid, Image as ImageIcon, Crosshair, BarChart3 } from "lucide-react";
import type { SavedImagePreview } from "@/lib/history";
import type { AnalyzeResponse, VisualEvidence } from "@/lib/types/analyze";
import { clsx } from "clsx";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImageWorkspaceProps {
  images: SavedImagePreview[];
  evidence?: VisualEvidence | null;
  data?: AnalyzeResponse;
}

type ViewMode = "grid" | "img0" | "img1" | "evidence";
type PreviewMode = "optical" | "sar" | "multispectral";

const PREVIEW_MODES: { value: PreviewMode; label: string; description: string }[] = [
  { value: "optical", label: "Optical", description: "Natural color" },
  { value: "sar", label: "SAR", description: "Density heatmap" },
  { value: "multispectral", label: "Multispectral", description: "Interference view" },
];

function WorkspaceTabButton({
  mode,
  label,
  icon: Icon,
  disabled = false,
  activeMode,
  onSelect,
}: {
  mode: ViewMode;
  label: string;
  icon: typeof Grid;
  disabled?: boolean;
  activeMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(mode)}
      className={clsx(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all duration-200",
        activeMode === mode
          ? "bg-[#1C1917] text-white shadow-sm dark:bg-white dark:text-black"
          : "text-secondary hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed",
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </button>
  );
}

function EvidenceDataSummary({ evidence, data }: { evidence?: VisualEvidence | null; data?: AnalyzeResponse }) {
  const regions = evidence?.regions ?? [];
  const changedPercent = Math.min(100, Math.max(0, (evidence?.changed_pixel_fraction ?? 0) * 100));

  return (
    <section className="mt-4 space-y-3 rounded-xl border border-stone-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-[#1C1917]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-semibold text-primary">{evidence ? "Evidence measurements" : "Image inputs"}</h2>
        </div>
        <span className="font-mono text-[10px] text-secondary">{evidence ? `${changedPercent.toFixed(2)}% changed` : `${data?.inputs.length ?? 0} source${data?.inputs.length === 1 ? "" : "s"}`}</span>
      </div>
      {evidence && regions.length > 0 ? (
        <>
          <div className="flex h-32 items-end gap-2 rounded-lg bg-stone-100/70 px-3 pb-3 pt-4 dark:bg-black/20">
            {regions.map((region, index) => {
              const share = Math.max(0, Math.min(100, region.share_of_all_change * 100));
              return (
                <div key={`${region.bbox_pixels.join("-")}-${index}`} className="flex min-w-6 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[9px] font-mono text-secondary">{share.toFixed(1)}%</span>
                  <div className="w-full rounded-t-md bg-accent/80 transition-all duration-300" style={{ height: `${Math.max(4, share)}%` }} title={`Region ${index + 1}: ${share.toFixed(1)}%`} />
                  <span className="text-[9px] font-mono text-secondary">R{index + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto rounded-lg border border-stone-200/70 dark:border-white/10">
            <table className="w-full min-w-[28rem] text-left text-[10px]">
              <thead className="bg-stone-100/80 font-mono text-secondary dark:bg-[#171512]"><tr><th className="px-2 py-1.5">Region</th><th className="px-2 py-1.5">Pixels</th><th className="px-2 py-1.5">Fill</th><th className="px-2 py-1.5">Share of change</th></tr></thead>
              <tbody className="divide-y divide-stone-200/70 dark:divide-white/10">
                {regions.map((region, index) => <tr key={`row-${region.bbox_pixels.join("-")}-${index}`}><th className="px-2 py-1.5 font-medium text-secondary">R{index + 1}</th><td className="px-2 py-1.5 text-primary">{region.area_pixels.toLocaleString()}</td><td className="px-2 py-1.5 text-primary">{(region.fill_fraction * 100).toFixed(1)}%</td><td className="px-2 py-1.5 text-primary">{(region.share_of_all_change * 100).toFixed(1)}%</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      ) : evidence ? <p className="rounded-lg border border-dashed border-stone-300/70 p-4 text-center text-xs text-secondary dark:border-white/10">No region measurements were returned for this analysis.</p> : (
        <div className="overflow-x-auto rounded-lg border border-stone-200/70 dark:border-white/10">
          <table className="w-full min-w-[28rem] text-left text-[10px]">
            <thead className="bg-stone-100/80 font-mono text-secondary dark:bg-[#171512]"><tr><th className="px-2 py-1.5">File</th><th className="px-2 py-1.5">Modality</th><th className="px-2 py-1.5">Capture date</th></tr></thead>
            <tbody className="divide-y divide-stone-200/70 dark:divide-white/10">{(data?.inputs ?? []).map((input) => <tr key={`${input.filename}-${input.timestamp}`}><td className="px-2 py-1.5 text-primary">{input.filename}</td><td className="px-2 py-1.5 font-mono uppercase text-accent">{input.modality}</td><td className="px-2 py-1.5 text-primary">{input.timestamp || "Not supplied"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ImageWorkspace({ images, evidence, data }: ImageWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeMode, setActiveMode] = useState<PreviewMode>("optical");

  const overlay = evidence?.overlay_png_base64
    ? `data:image/png;base64,${evidence.overlay_png_base64}`
    : null;
  const imageFilter = activeMode === "sar"
    ? "contrast(1.6) brightness(1.1) saturate(1.8) url(#sar-color-map)"
    : activeMode === "multispectral"
      ? "contrast(2.1) brightness(0.72) saturate(1.9) url(#multispectral-color-map)"
      : "contrast(1.15) saturate(1.25)";

  if (images.length === 0 && !overlay) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-stone-300/70 p-6 text-center text-sm text-secondary dark:border-white/10">
        No visual input was saved for this response.
      </div>
    );
  }

  return (
    <section className="relative flex h-auto min-h-0 w-full flex-col gap-3 rounded-2xl border border-stone-300/70 bg-white/45 p-3 shadow-subtle dark:border-white/10 dark:bg-[#171512]/70">
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="sar-color-map" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="1.8" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.16 0.98" />
              <feFuncG type="table" tableValues="0.01 1" />
              <feFuncB type="table" tableValues="0.04 0.08" />
            </feComponentTransfer>
          </filter>
          <filter id="multispectral-color-map" colorInterpolationFilters="sRGB">
            <feColorMatrix values="1.15 -0.55 1.35 0 0.04 1.35 -0.75 0.35 0 0.02 0.25 1.05 -0.35 0 0.04 0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-xl text-primary">Visual workspace</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-secondary">
              Geospatial Inspector
            </p>
          </div>
          {overlay && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-mono text-accent animate-pulse">
              Evidence Ready
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-stone-200/50 dark:bg-black/20 p-1 rounded-xl w-fit">
          <WorkspaceTabButton mode="grid" label="All" icon={Grid} activeMode={viewMode} onSelect={setViewMode} />
          {images.length > 0 && (
            <WorkspaceTabButton mode="img0" label="Image 1" icon={ImageIcon} activeMode={viewMode} onSelect={setViewMode} />
          )}
          {images.length > 1 && (
            <WorkspaceTabButton mode="img1" label="Image 2" icon={ImageIcon} activeMode={viewMode} onSelect={setViewMode} />
          )}
          <WorkspaceTabButton
            mode="evidence"
            label="Evidence"
            icon={Crosshair}
            disabled={!overlay}
            activeMode={viewMode}
            onSelect={setViewMode}
          />
        </div>
        <div className="relative w-fit">
          <Select items={PREVIEW_MODES.map((mode) => ({ label: mode.label, value: mode.value }))} value={activeMode} onValueChange={(value) => setActiveMode(value as PreviewMode)}>
            <SelectTrigger className="min-w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectLabel>Preview mode</SelectLabel>{PREVIEW_MODES.map((mode) => <SelectItem key={mode.value} value={mode.value}>{mode.label} - {mode.description}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </div>
      </div>

      <div className="pr-1">
        {/* Grid View */}
        {viewMode === "grid" && (
          <div className={clsx("grid gap-3", images.length + (overlay ? 1 : 0) > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {images.map((image, idx) => (
              <figure
                key={image.filename}
                className="group relative overflow-hidden rounded-xl border border-stone-200 bg-black/5 dark:border-white/10 dark:bg-black/20"
              >
                <div className="relative">
                  <img src={image.data_url} alt={image.filename} className="block max-h-56 w-full object-contain transition-all duration-300 ease-in-out group-hover:scale-[1.02] sm:max-h-64" style={{ filter: imageFilter }} />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md px-3 py-1.5 text-[10px] font-mono text-white flex justify-between items-center translate-y-full group-hover:translate-y-0 transition-transform">
                  <span className="truncate">{image.filename}</span>
                  <span className="text-white/60">IMG_{idx + 1}</span>
                </div>
              </figure>
            ))}
            {overlay && (
              <figure className="group relative overflow-hidden rounded-xl border-2 border-accent bg-black shadow-[0_0_15px_rgba(200,109,59,0.2)]">
                <img
                  src={overlay}
                  alt="Boundary evidence"
                  className="block max-h-56 w-full object-contain"
                />
                <div className="absolute inset-x-0 bottom-0 bg-accent/80 backdrop-blur-md px-3 py-1.5 text-[10px] font-mono text-white">
                  DIFFERENCE_OVERLAY
                </div>
              </figure>
            )}
          </div>
        )}

        {/* Individual Image Views */}
        {viewMode === "img0" && images[0] && (
          <figure className="relative h-full flex flex-col rounded-xl overflow-hidden border border-stone-200 dark:border-white/10 bg-black/5">
            <img
              src={images[0].data_url}
              className="h-64 w-full object-contain bg-black/20 transition-all duration-300 ease-in-out"
              style={{ filter: imageFilter }}
              alt={images[0].filename}
            />
            <div className="bg-white/90 dark:bg-[#1F1B17] px-4 py-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center">
              <span className="text-xs font-mono text-secondary">{images[0].filename}</span>
            </div>
          </figure>
        )}

        {viewMode === "img1" && images[1] && (
          <figure className="relative h-full flex flex-col rounded-xl overflow-hidden border border-stone-200 dark:border-white/10 bg-black/5">
            <img
              src={images[1].data_url}
              className="h-64 w-full object-contain bg-black/20 transition-all duration-300 ease-in-out"
              style={{ filter: imageFilter }}
              alt={images[1].filename}
            />
            <div className="bg-white/90 dark:bg-[#1F1B17] px-4 py-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center">
              <span className="text-xs font-mono text-secondary">{images[1].filename}</span>
            </div>
          </figure>
        )}

        {viewMode === "evidence" && overlay && (
          <figure className="relative h-full flex flex-col rounded-xl overflow-hidden border-2 border-accent bg-black">
            <img
              src={overlay}
              className="flex-1 w-full object-contain"
              alt="Visual evidence"
            />
            <div className="bg-accent px-4 py-3 flex justify-between items-center text-white">
              <span className="text-xs font-mono font-medium">RADIOMETRIC_DIFFERENCE_MAP</span>
            </div>
          </figure>
        )}

        <EvidenceDataSummary evidence={evidence} data={data} />
      </div>

    </section>
  );
}

