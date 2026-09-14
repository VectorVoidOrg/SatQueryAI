"use client";

import { useState } from "react";
import { Maximize2, X, Grid, Image as ImageIcon, Crosshair } from "lucide-react";
import type { SavedImagePreview } from "@/lib/history";
import type { VisualEvidence } from "@/lib/types/analyze";
import { clsx } from "clsx";

interface ImageWorkspaceProps {
  images: SavedImagePreview[];
  evidence?: VisualEvidence | null;
}

type ViewMode = "grid" | "img0" | "img1" | "evidence";

export function ImageWorkspace({ images, evidence }: ImageWorkspaceProps) {
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const overlay = evidence?.overlay_png_base64
    ? `data:image/png;base64,${evidence.overlay_png_base64}`
    : null;

  if (images.length === 0 && !overlay) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-stone-300/70 p-6 text-center text-sm text-secondary dark:border-white/10">
        No visual input was saved for this response.
      </div>
    );
  }

  const TabButton = ({
    mode,
    label,
    icon: Icon,
    disabled = false,
  }: {
    mode: ViewMode;
    label: string;
    icon: any;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setViewMode(mode)}
      className={clsx(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200",
        viewMode === mode
          ? "bg-[#1C1917] text-white shadow-sm dark:bg-white dark:text-black"
          : "text-secondary hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </button>
  );

  return (
    <section className="flex min-h-0 h-full flex-col gap-3 rounded-2xl border border-stone-300/70 bg-white/45 p-3 shadow-subtle dark:border-white/10 dark:bg-[#171512]/70">
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
          <TabButton mode="grid" label="All" icon={Grid} />
          {images.length > 0 && (
            <TabButton mode="img0" label="Image 1" icon={ImageIcon} />
          )}
          {images.length > 1 && (
            <TabButton mode="img1" label="Image 2" icon={ImageIcon} />
          )}
          <TabButton
            mode="evidence"
            label="Evidence"
            icon={Crosshair}
            disabled={!overlay}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {/* Grid View */}
        {viewMode === "grid" && (
          <div className={clsx("grid gap-3", images.length + (overlay ? 1 : 0) > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {images.map((image, idx) => (
              <figure
                key={image.filename}
                className="group relative overflow-hidden rounded-xl border border-stone-200 bg-black/5 dark:border-white/10 dark:bg-black/20"
              >
                <img
                  src={image.data_url}
                  alt={image.filename}
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => setFullscreen(image.data_url)}
                  className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100 backdrop-blur-md"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
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
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFullscreen(overlay)}
                  className="absolute right-2 top-2 rounded-md bg-accent/80 p-1.5 text-white backdrop-blur-md"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
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
              className="flex-1 w-full object-contain bg-black/20"
              alt={images[0].filename}
            />
            <div className="bg-white/90 dark:bg-[#1F1B17] px-4 py-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center">
              <span className="text-xs font-mono text-secondary">{images[0].filename}</span>
              <button onClick={() => setFullscreen(images[0].data_url)} className="text-accent hover:text-accent/80 transition-colors"><Maximize2 className="w-4 h-4"/></button>
            </div>
          </figure>
        )}

        {viewMode === "img1" && images[1] && (
          <figure className="relative h-full flex flex-col rounded-xl overflow-hidden border border-stone-200 dark:border-white/10 bg-black/5">
            <img
              src={images[1].data_url}
              className="flex-1 w-full object-contain bg-black/20"
              alt={images[1].filename}
            />
            <div className="bg-white/90 dark:bg-[#1F1B17] px-4 py-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center">
              <span className="text-xs font-mono text-secondary">{images[1].filename}</span>
              <button onClick={() => setFullscreen(images[1].data_url)} className="text-accent hover:text-accent/80 transition-colors"><Maximize2 className="w-4 h-4"/></button>
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
              <button onClick={() => setFullscreen(overlay)} className="hover:scale-110 transition-transform"><Maximize2 className="w-4 h-4"/></button>
            </div>
          </figure>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-10 transition-all duration-300 animate-in fade-in"
          onClick={() => setFullscreen(null)}
        >
          <button
            type="button"
            className="absolute right-6 top-6 z-[1001] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors border border-white/10"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(null);
            }}
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative h-full w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreen}
              alt="Fullscreen view"
              className="max-h-full max-w-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300"
            />
          </div>
        </div>
      )}
    </section>
  );
}

