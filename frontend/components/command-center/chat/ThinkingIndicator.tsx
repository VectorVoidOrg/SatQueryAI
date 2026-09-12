"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AnalysisStep } from "@/lib/types/chat";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { SATELLITE_ANALYSIS_STEPS, resolveAnalysisStep } from "@/lib/adapters/satelliteAnalysisAdapter";

interface ThinkingIndicatorProps {
  steps?: AnalysisStep[];
  activeStepIndex?: number;
  backendStatus?: string;
}

export const OrbitIndicator: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex items-center justify-center w-3.5 h-3.5 shrink-0 ${className}`} aria-hidden="true">
    {/* Orbit track */}
    <div className="absolute inset-0 rounded-full border border-accent/35" />
    {/* Orbiting satellite particle */}
    <div
      className="absolute inset-0 animate-spin"
      style={{ animationDuration: "2.8s", animationTimingFunction: "linear" }}
    >
      <span className="absolute -top-[1.5px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(200,109,59,0.8)]" />
    </div>
    {/* Center pulsing core */}
    <span className="w-1.5 h-1.5 rounded-full bg-accent/90 animate-pulse" />
  </div>
);

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  steps,
  activeStepIndex,
  backendStatus,
}) => {
  const [showFullPipeline, setShowFullPipeline] = useState(true);

  const stepIndex = resolveAnalysisStep({
    backendStatus,
    activeStepIndex,
    steps,
  });

  const currentDetail = steps?.[stepIndex]?.detail;

  if (!showFullPipeline) {
    return (
      <div className="flex items-center gap-2 animate-fade-in-up">
        <button
          type="button"
          onClick={() => setShowFullPipeline(true)}
          className="liquid-glass apple-interactive flex items-center gap-2.5 px-4 py-2 rounded-full text-primary text-xs w-fit shadow-xs hover:bg-white/80 dark:hover:bg-[#1F1B17] transition-all duration-200"
        >
          <OrbitIndicator />
          <span className="font-serif italic text-sm text-primary tracking-wide font-medium">
            Satellite Analysis in Progress
          </span>
          <span className="font-mono text-[10px] text-accent font-semibold px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25">
            Step {stepIndex + 1} of {SATELLITE_ANALYSIS_STEPS.length}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-secondary ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-5 text-xs text-primary space-y-3.5 shadow-xs border border-white/70 dark:border-white/10 animate-fade-in-up w-full max-w-md overflow-hidden bg-white/60 dark:bg-[#171512]/90 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <OrbitIndicator />
          <span className="font-serif text-sm font-medium tracking-wide text-primary">
            Satellite Analysis Pipeline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-accent font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25">
            Step {stepIndex + 1} of {SATELLITE_ANALYSIS_STEPS.length}
          </span>
          <button
            type="button"
            onClick={() => setShowFullPipeline(false)}
            className="text-[10px] text-secondary hover:text-primary dark:hover:text-[#F3EEE7] flex items-center gap-0.5 transition-colors p-1 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/10"
            title="Minimize loader"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aceternity Multi-Step Loader Scroller */}
      <div className="rounded-2xl border border-stone-200/60 dark:border-white/10 bg-white/40 dark:bg-[#13110E]/60 overflow-hidden shadow-inner">
        <MultiStepLoader
          loadingStates={SATELLITE_ANALYSIS_STEPS}
          loading={true}
          value={stepIndex}
        />
      </div>

      {/* Active Step Telemetry Detail */}
      {currentDetail && (
        <div className="flex items-center justify-between text-[11px] text-secondary dark:text-[#B8AEA3] bg-white/50 dark:bg-[#1F1B17] px-3 py-2 rounded-xl border border-white/60 dark:border-white/10">
          <span className="truncate">
            <strong className="font-semibold text-primary font-mono text-[10px] uppercase tracking-wider text-accent mr-1.5">
              TELEMETRY:
            </strong>
            {currentDetail}
          </span>
        </div>
      )}
    </div>
  );
};
