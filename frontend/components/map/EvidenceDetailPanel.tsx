"use client";

import React from "react";
import { useAssetStore } from "@/store/useAssetStore";
import { toast } from "@/store/useToastStore";
import {
  MapPin,
  ShieldCheck,
  Activity,
  Maximize2,
  Columns,
  FilePlus,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const EvidenceDetailPanel: React.FC = () => {
  const {
    selectedFeature,
    setSelectedFeature,
    setMapFlyToBounds,
    setCompareMode,
    addEvidenceToReport,
  } = useAssetStore();

  if (!selectedFeature) return null;

  const props = selectedFeature.properties || {};
  const className = props.class || props.name || "Identified Spatial Feature";
  const confidence =
    props.confidence !== undefined
      ? `${(Number(props.confidence) <= 1 ? Number(props.confidence) * 100 : Number(props.confidence)).toFixed(1)}%`
      : null;
  const areaM2 = props.area_m2 ? `${Number(props.area_m2).toLocaleString()} m²` : null;
  const retreatRate = props.retreat_rate_m_yr ? `${props.retreat_rate_m_yr} m/yr` : null;
  const detectionDate = props.detection_date || props.date || "2026-Q1 Analysis Turn";
  const status = props.status || "Verified by SAR Coherence";

  // Calculate coordinates bounds for Zoom action
  const getFeatureBounds = (): [number, number, number, number] | null => {
    try {
      let minLon = Infinity,
        minLat = Infinity,
        maxLon = -Infinity,
        maxLat = -Infinity;

      const scanCoords = (coords: any) => {
        if (typeof coords[0] === "number" && typeof coords[1] === "number") {
          const [lon, lat] = coords;
          if (lon < minLon) minLon = lon;
          if (lat < minLat) minLat = lat;
          if (lon > maxLon) maxLon = lon;
          if (lat > maxLat) maxLat = lat;
        } else if (Array.isArray(coords)) {
          coords.forEach(scanCoords);
        }
      };

      if (selectedFeature.geometry && (selectedFeature.geometry as any).coordinates) {
        scanCoords((selectedFeature.geometry as any).coordinates);
      }

      if (minLon !== Infinity) {
        return [minLon, minLat, maxLon, maxLat];
      }
    } catch (e) {
      console.warn("Could not calculate bounds for selected feature", e);
    }
    return null;
  };

  const handleZoom = () => {
    const bounds = getFeatureBounds();
    if (bounds && setMapFlyToBounds) {
      setMapFlyToBounds(bounds);
      toast.info("Zoomed to evidence feature");
    }
  };

  const handleCompare = () => {
    setCompareMode(true);
    const bounds = getFeatureBounds();
    if (bounds && setMapFlyToBounds) {
      setMapFlyToBounds(bounds);
    }
    toast.info("Comparison mode activated for this evidence zone");
  };

  const handleAddToReport = () => {
    addEvidenceToReport(selectedFeature);
    toast.success("Feature added to report", `${className} saved to active export draft`);
  };

  return (
    <div className="absolute top-20 left-4 z-[400] w-80 max-w-[calc(100vw-32px)]">
      <div className="glass-card rounded-2xl p-4 text-xs text-primary shadow-[0_20px_45px_rgba(78,59,42,0.15)] border border-accent/40 animate-fade-in-up space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200/60 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-accent">
              <MapPin className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold block">
                ACTIVE EVIDENCE
              </span>
              <span className="font-serif text-sm font-medium text-primary leading-tight block">
                {className}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFeature(null)}
            className="text-secondary/60 hover:text-primary dark:text-[#91877D] dark:hover:text-[#F3EEE7] p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -mr-1 -mt-1"
            title="Deselect feature"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Attributes Grid */}
        <div className="space-y-2 text-[11px]">
          {confidence && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> AI Confidence:
              </span>
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 text-[10px]">
                {confidence}
              </span>
            </div>
          )}

          {areaM2 && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-accent" /> Area:
              </span>
              <span className="font-mono font-semibold text-primary">{areaM2}</span>
            </div>
          )}

          {retreatRate && (
            <div className="flex items-center justify-between">
              <span className="text-secondary">Retreat Rate:</span>
              <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">{retreatRate}</span>
            </div>
          )}

          {detectionDate && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-secondary/70 dark:text-[#91877D]" /> Detection Date:
              </span>
              <span className="font-mono text-secondary dark:text-[#B8AEA3]">{detectionDate}</span>
            </div>
          )}

          {status && (
            <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-white/10">
              <span className="text-secondary flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-accent" /> Status:
              </span>
              <span className="font-mono text-[10px] text-accent font-medium">{status}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-200/50 dark:border-white/10">
          <button
            type="button"
            onClick={handleZoom}
            className="apple-interactive flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-primary dark:text-[#F3EEE7] bg-white/70 dark:bg-[#1F1B17] hover:bg-white dark:hover:bg-[#2A241F] border border-stone-200 dark:border-white/10 shadow-xs transition-all duration-200"
            title="Zoom to feature"
          >
            <Maximize2 className="w-3 h-3 text-secondary dark:text-[#B8AEA3]" />
            <span>Zoom</span>
          </button>

          <button
            type="button"
            onClick={handleCompare}
            className="apple-interactive flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-[#7F4B30] dark:text-[#F3EEE7] bg-[#C86D3B]/10 hover:bg-[#C86D3B]/20 dark:bg-[#C86D3B]/20 dark:hover:bg-[#C86D3B]/30 border border-[#C86D3B]/30 dark:border-[#C86D3B]/40 transition-all duration-200"
            title="Compare Before & After"
          >
            <Columns className="w-3 h-3 text-accent" />
            <span>Compare</span>
          </button>

          <button
            type="button"
            onClick={handleAddToReport}
            className="apple-interactive flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-white bg-[#7F4B30] hover:bg-[#965A3B] transition-all duration-200 shadow-xs"
            title="Add feature to PDF report"
          >
            <FilePlus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
