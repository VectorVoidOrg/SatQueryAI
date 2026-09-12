"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import { ChatMessage } from "@/lib/types/chat";
import { useAssetStore } from "@/store/useAssetStore";
import { useChatStore } from "@/store/useChatStore";
import { exportReportToPdf } from "@/components/export/exportPdf";
import { toast } from "@/store/useToastStore";
import { MapPin, BarChart3, Download, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const metricContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
};

const metricItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
};

interface ResultSummaryCardProps {
  message: ChatMessage;
}

export const ResultSummaryCard: React.FC<ResultSummaryCardProps> = ({ message }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { setActiveTab, messages, latestAudit, sessionId } = useChatStore();
  const { assetName, assetId, bbox, setMapFlyToBounds, toggleLayer, activeLayers } = useAssetStore();

  const evidence = message.evidenceData;
  const metrics = message.metrics?.metrics;

  const features = evidence?.features || [];
  const featureCount = features.length;

  // Extract non-invented metrics from response data
  const affectedArea = metrics?.area_affected_m2
    ? typeof metrics.area_affected_m2 === "number"
      ? `${metrics.area_affected_m2.toLocaleString()} m²`
      : `${metrics.area_affected_m2}`
    : features[0]?.properties?.area_m2
    ? `${Number(features[0].properties.area_m2).toLocaleString()} m²`
    : null;

  const confidence = metrics?.confidence
    ? typeof metrics.confidence === "number"
      ? `${(metrics.confidence <= 1 ? metrics.confidence * 100 : metrics.confidence).toFixed(0)}%`
      : `${metrics.confidence}`
    : features[0]?.properties?.confidence
    ? `${(Number(features[0].properties.confidence) * 100).toFixed(0)}%`
    : null;

  const changeRate = metrics?.retreat_rate_m_yr
    ? `${metrics.retreat_rate_m_yr} m/yr`
    : features[0]?.properties?.retreat_rate_m_yr
    ? `${features[0].properties.retreat_rate_m_yr} m/yr`
    : null;

  const iou = metrics?.iou !== undefined ? `${metrics.iou}` : null;

  // Derive primary result headline (strongest visual element)
  const resultHeadline = featureCount > 0
    ? `${featureCount} distinct segment${featureCount === 1 ? "" : "s"} detected`
    : metrics
    ? "Analysis evaluation completed"
    : "Spatial pattern detected";

  // If no evidence and no metrics, do not render summary
  if (!evidence && !metrics) return null;

  const handleViewEvidence = () => {
    // Ensure AI change mask layer is visible
    if (!activeLayers.aiChangeMask) {
      toggleLayer("aiChangeMask");
    }

    // Calculate bounds from GeoJSON if features exist
    if (features.length > 0) {
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

      features.forEach((f) => {
        if (f.geometry && "coordinates" in f.geometry) {
          scanCoords((f.geometry as any).coordinates);
        }
      });

      if (minLon !== Infinity && setMapFlyToBounds) {
        setMapFlyToBounds([minLon, minLat, maxLon, maxLat]);
        toast.info("Map centered on detected evidence zones");
        return;
      }
    }

    if (bbox && setMapFlyToBounds) {
      setMapFlyToBounds(bbox);
      toast.info("Map centered on active AOI");
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportReportToPdf({
        aoiName: assetName,
        assetId,
        sessionId,
        messages,
        latestAudit: message.metrics ? { query: message.text || "Turn Analysis", audit: message.metrics } : latestAudit,
        bbox,
        selectedEvidence: useAssetStore.getState().selectedEvidenceForReport,
      });
      toast.success("Report exported successfully", "PDF downloaded to your device");
    } catch (err: any) {
      console.error(err);
      toast.error("Export failed", err?.message || "Could not generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="liquid-glass-subtle rounded-2xl p-3.5 mt-2.5 border border-accent/25 shadow-xs space-y-3"
    >
      {/* Eyebrow & IoU Badge */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold block">
          ANALYSIS RESULT
        </span>
        {iou && (
          <span className="text-[10px] font-mono text-secondary dark:text-[#B8AEA3] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-[#1F1B17] border border-stone-200 dark:border-white/10">
            IoU: <strong className="text-primary dark:text-[#F3EEE7] font-semibold">{iou}</strong>
          </span>
        )}
      </div>

      {/* Main Result Headline (Strongest Visual Element) */}
      <div className="border-b border-stone-200/50 dark:border-white/10 pb-2">
        <h3 className="font-serif text-base sm:text-lg font-semibold text-primary tracking-tight leading-snug">
          {resultHeadline}
        </h3>
      </div>

      {/* Metrics Row (Only display fields that exist) with subtle stagger */}
      <motion.div
        variants={metricContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs"
      >
        {affectedArea && (
          <motion.div variants={metricItemVariants} className="bg-white/50 dark:bg-[#1F1B17] px-2.5 py-1.5 rounded-xl border border-white/60 dark:border-white/10">
            <span className="text-[10px] text-secondary/80 dark:text-[#91877D] block">Affected Area</span>
            <span className="font-mono font-semibold text-primary dark:text-[#F3EEE7] text-[11px]">{affectedArea}</span>
          </motion.div>
        )}
        {confidence && (
          <motion.div variants={metricItemVariants} className="bg-white/50 dark:bg-[#1F1B17] px-2.5 py-1.5 rounded-xl border border-white/60 dark:border-white/10">
            <span className="text-[10px] text-secondary/80 dark:text-[#91877D] block">Confidence</span>
            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 text-[11px]">{confidence}</span>
          </motion.div>
        )}
        {changeRate && (
          <motion.div variants={metricItemVariants} className="bg-white/50 dark:bg-[#1F1B17] px-2.5 py-1.5 rounded-xl border border-white/60 dark:border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-secondary/80 dark:text-[#91877D] block">Change Rate</span>
            <span className="font-mono font-semibold text-amber-700 dark:text-amber-400 text-[11px]">{changeRate}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-200/40 dark:border-white/10">
        {evidence && (
          <button
            type="button"
            onClick={handleViewEvidence}
            className="apple-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-[#7F4B30] dark:text-[#F3EEE7] bg-[#C86D3B]/10 hover:bg-[#C86D3B]/20 dark:bg-[#C86D3B]/20 dark:hover:bg-[#C86D3B]/30 border border-[#C86D3B]/25 dark:border-[#C86D3B]/40 transition-all duration-200"
          >
            <MapPin className="w-3 h-3 text-accent" />
            <span>View Evidence</span>
          </button>
        )}

        {message.metrics && (
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className="apple-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] bg-stone-100 dark:bg-[#1F1B17] hover:bg-stone-200/70 dark:hover:bg-[#2A241F] border border-stone-200 dark:border-white/10 transition-all duration-200"
          >
            <BarChart3 className="w-3 h-3 text-secondary dark:text-[#B8AEA3]" />
            <span>Open Audit</span>
          </button>
        )}

        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="apple-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-white bg-[#7F4B30] hover:bg-[#965A3B] transition-all duration-200 ml-auto disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              <span>Export Report</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
