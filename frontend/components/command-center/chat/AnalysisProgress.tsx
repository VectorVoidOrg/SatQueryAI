"use client";

import React from "react";
import { Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AnalysisStep } from "@/lib/types/chat";

export const DEFAULT_PIPELINE_STEPS: AnalysisStep[] = [
  { id: "step_asset", label: "Asset Validated", status: "pending", detail: "Checking multi-band GeoTIFF headers & CRS" },
  { id: "step_aoi", label: "AOI Loaded", status: "pending", detail: "Delineating bounding coordinates & pyramid tiles" },
  { id: "step_optical", label: "Optical Processing", status: "pending", detail: "Calibrating RGB/NIR surface reflectance" },
  { id: "step_sar", label: "SAR Analysis", status: "pending", detail: "Computing dual-pol backscatter coherence" },
  { id: "step_change", label: "Change Detection", status: "pending", detail: "Isolating biophysical retreat & structural shifts" },
  { id: "step_evidence", label: "Evidence Generation", status: "pending", detail: "Synthesizing vector boundaries & audit metrics" },
];

interface AnalysisProgressProps {
  steps?: AnalysisStep[];
  title?: string;
  isCompact?: boolean;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  steps = DEFAULT_PIPELINE_STEPS,
  title = "Satellite Analysis Pipeline",
  isCompact = false,
}) => {
  const completedCount = steps.filter((s) => s.status === "complete").length;
  const runningIndex = steps.findIndex((s) => s.status === "running");
  const activeStep = runningIndex !== -1 ? steps[runningIndex] : steps.find((s) => s.status === "pending");
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Track already completed steps to ensure we do not repeatedly animate them
  const completedHistoryRef = React.useRef<Set<string>>(new Set());

  return (
    <div className="glass-card rounded-2xl p-3.5 sm:p-4 text-xs text-primary space-y-3 shadow-xs border border-white/70 dark:border-white/10 animate-fade-in-up w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" style={{ animationDuration: "4s" }} />
          <span className="font-serif text-sm font-medium tracking-wide text-primary">
            {title}
          </span>
        </div>
        <span className="font-mono text-[10px] text-accent font-semibold px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25">
          {completedCount} of {steps.length} ({progressPercent}%)
        </span>
      </div>

      {/* Progress Bar - Smooth fill */}
      <div className="w-full bg-stone-200/60 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="bg-gradient-to-r from-[#7F4B30] via-accent to-[#D97736] h-full rounded-full"
          initial={false}
          animate={{ width: `${Math.max(progressPercent, 6)}%` }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Current Task Readout */}
      {activeStep && (
        <div className="flex items-center justify-between text-[11px] text-secondary dark:text-[#B8AEA3] bg-white/40 dark:bg-[#1F1B17] px-2.5 py-1.5 rounded-xl border border-white/50 dark:border-white/10">
          <span className="truncate">
            <strong className="font-semibold text-primary">{activeStep.label}:</strong>{" "}
            {activeStep.detail || "Processing geospatial raster..."}
          </span>
        </div>
      )}

      {/* Step Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {steps.map((step, idx) => {
          const isComplete = step.status === "complete";
          const isRunning = step.status === "running";
          const isError = step.status === "error";

          const wasPreviouslyCompleted = completedHistoryRef.current.has(step.id);
          if (isComplete && !wasPreviouslyCompleted) {
            completedHistoryRef.current.add(step.id);
          }

          return (
            <div
              key={step.id || idx}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
                isComplete
                  ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border border-emerald-500/20"
                  : isRunning
                  ? "bg-accent/10 text-accent font-medium border border-accent/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] animate-[pulse_2.2s_ease-in-out_infinite]"
                  : isError
                  ? "bg-rose-500/10 text-rose-900 dark:text-rose-300 border border-rose-500/20"
                  : "text-secondary/60 dark:text-[#91877D] opacity-70"
              }`}
            >
              {isComplete ? (
                wasPreviouslyCompleted ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </motion.div>
                )
              ) : isRunning ? (
                <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
              ) : isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-700 shrink-0" />
              )}
              <span className="text-[11px] truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
