"use client";

import React, { useState } from "react";
import { Eye, CheckCircle2, AlertTriangle, Layers, Maximize2, X } from "lucide-react";
import type { VisualEvidence } from "@/lib/types/analyze";

interface EvidencePanelProps {
  evidence: VisualEvidence;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (evidence.status === "not_applicable" || evidence.status === "refused" || evidence.status === "failed") {
    return (
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1 text-xs text-amber-700 dark:text-amber-300">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Visual Evidence: {evidence.status.toUpperCase()}</span>
        </div>
        {evidence.reason && (
          <p className="font-mono text-[11px] leading-relaxed pl-6 opacity-90">
            {evidence.reason}
          </p>
        )}
      </div>
    );
  }

  const hasOverlay = Boolean(evidence.overlay_png_base64);
  const modelAgreement = evidence.model_agreement;

  return (
    <div className="p-4 rounded-xl bg-white/70 dark:bg-[#171512] border border-stone-200 dark:border-white/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Eye className="w-4 h-4 text-accent" />
          <span>Visual Evidence & Model-Pixel Agreement</span>
        </div>

        {modelAgreement && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
              modelAgreement.agree
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {modelAgreement.agree ? "Model & Pixels Agree" : "Disagreement Detected"}
            </span>
          </div>
        )}
      </div>

      {/* Grid: Image preview + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Image overlay */}
        {hasOverlay ? (
          <div className="relative group rounded-lg overflow-hidden border border-stone-300 dark:border-white/10 bg-black">
            <img
              src={`data:image/png;base64,${evidence.overlay_png_base64}`}
              alt="Visual Change Evidence Overlay"
              className="w-full h-auto object-contain max-h-[300px]"
            />
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
              title="Expand image"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-stone-100 dark:bg-stone-900 border border-dashed border-stone-300 dark:border-white/10 flex items-center justify-center text-xs text-secondary font-mono">
            No overlay image generated
          </div>
        )}

        {/* Stats & Region Summary */}
        <div className="space-y-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-stone-100/70 dark:bg-[#1C1917] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-secondary">Source Method:</span>
              <span className="text-primary font-medium">{evidence.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Detected Region Count:</span>
              <span className="text-primary font-medium">{evidence.region_count ?? 0}</span>
            </div>
            {evidence.changed_pixel_fraction !== undefined && (
              <div className="flex justify-between">
                <span className="text-secondary">Changed Pixel Fraction:</span>
                <span className="text-primary font-medium">
                  {(evidence.changed_pixel_fraction * 100).toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-secondary">Georeferenced:</span>
              <span className="text-primary font-medium">
                {evidence.georeferenced ? "Yes (GeoTIFF)" : "No (Pixel Coordinates)"}
              </span>
            </div>
          </div>

          {/* Model Agreement Details */}
          {modelAgreement && (
            <div className="p-3 rounded-lg bg-stone-100/70 dark:bg-[#1C1917] space-y-1">
              <span className="text-secondary block font-sans font-medium text-[11px]">
                Cross-Check Note:
              </span>
              <p className="text-primary text-[11px] leading-relaxed">
                {modelAgreement.note}
              </p>
            </div>
          )}

          {/* Caveats */}
          {evidence.caveats && evidence.caveats.length > 0 && (
            <div className="space-y-1">
              <span className="text-amber-600 dark:text-amber-400 font-sans font-medium text-[11px]">
                Caveats:
              </span>
              <ul className="list-disc list-inside text-[11px] text-secondary space-y-0.5">
                {evidence.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bounding box regions table */}
      {evidence.regions && evidence.regions.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold text-primary block">
            Top Bounding Box Regions ({evidence.regions.length})
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-200/50 dark:bg-[#1F1B17] text-secondary font-mono">
                <tr>
                  <th className="p-1.5 rounded-l">Region #</th>
                  <th className="p-1.5">BBox [x1, y1, x2, y2]</th>
                  <th className="p-1.5">Area (px)</th>
                  <th className="p-1.5 rounded-r">Share of Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/50 dark:divide-white/5 font-mono">
                {evidence.regions.map((reg, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 text-primary">#{idx + 1}</td>
                    <td className="p-1.5 text-secondary">
                      [{reg.bbox_pixels.join(", ")}]
                    </td>
                    <td className="p-1.5 text-secondary">{reg.area_pixels}</td>
                    <td className="p-1.5 text-secondary">
                      {(reg.share_of_all_change * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && hasOverlay && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={`data:image/png;base64,${evidence.overlay_png_base64}`}
            alt="Visual Change Evidence Overlay (Fullscreen)"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};
