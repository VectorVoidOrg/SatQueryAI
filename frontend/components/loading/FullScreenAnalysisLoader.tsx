"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";
import {
  SATELLITE_ANALYSIS_STEPS,
  DEFAULT_SATELLITE_PIPELINE_STEPS,
} from "@/lib/adapters/satelliteAnalysisAdapter";
import { LoaderCore } from "@/components/ui/multi-step-loader";

interface FullScreenAnalysisLoaderProps {
  isLoading: boolean;
  value?: number;
  progress?: number;
  subtext?: string;
  onHoldComplete?: () => void;
}

export const FullScreenAnalysisLoader: React.FC<FullScreenAnalysisLoaderProps> = ({
  isLoading,
  value,
  progress,
  subtext,
  onHoldComplete,
}) => {
  const [internalStep, setInternalStep] = useState(0);

  const isControlled = typeof value === "number";
  const activeStep = Math.max(
    0,
    Math.min(
      isControlled ? value : internalStep,
      SATELLITE_ANALYSIS_STEPS.length - 1
    )
  );

  // Auto-advance internal step every 400ms if not controlled externally
  useEffect(() => {
    if (isControlled || !isLoading) {
      if (!isControlled) setInternalStep(0);
      return;
    }

    const interval = setInterval(() => {
      setInternalStep((prev) => {
        if (prev < SATELLITE_ANALYSIS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading, isControlled]);

  // Compute percentage progress (e.g. 15% -> 30% -> 45% -> 60% -> 75% -> 90% -> 100%)
  const progressPercent =
    typeof progress === "number"
      ? Math.round(progress)
      : Math.min(
          100,
          Math.round(((activeStep + 1) / SATELLITE_ANALYSIS_STEPS.length) * 100)
        );

  const currentDetail =
    DEFAULT_SATELLITE_PIPELINE_STEPS[activeStep]?.detail ||
    "Synthesizing multispectral satellite parameters";

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="satquery-fullscreen-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="dark fixed inset-0 w-screen h-screen min-h-[100dvh] z-[99999] bg-[#0F0E0C] text-[#F3EEE7] flex flex-col items-center justify-center p-6 select-none"
          style={{
            width: "100vw",
            height: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#0F0E0C",
            color: "#F3EEE7",
          }}
          role="status"
          aria-live="polite"
          aria-label="Processing satellite intelligence"
        >
          {/* Subtle Ambient Radial Glow (Warm Charcoal + Terracotta Hint) */}
          <div
            className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,_rgba(200,109,59,0.06)_0%,_transparent_65%)]"
            aria-hidden="true"
          />

          {/* Centered Content Block */}
          <div className="relative z-10 w-full max-w-md flex flex-col items-center justify-center text-center">
            {/* 1. Logo / Brand */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 mb-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#1F1B17] border border-white/10 text-white flex items-center justify-center shadow-lg shadow-black/50">
                <Globe
                  className="w-5 h-5 text-accent animate-pulse"
                  style={{ animationDuration: "3s" }}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-serif text-3xl sm:text-4xl tracking-wider font-medium"
                  style={{ color: "#F3EEE7" }}
                >
                  SATQUERY
                </span>
                <em className="font-serif italic text-2xl sm:text-3xl text-accent">
                  AI
                </em>
              </div>
            </motion.div>

            {/* 2. Processing Title */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 sm:mb-10"
            >
              <h2
                className="text-xs sm:text-sm font-mono tracking-[0.25em] uppercase font-semibold"
                style={{ color: "#D8CEC3" }}
              >
                {subtext || "Processing Satellite Intelligence..."}
              </h2>
            </motion.div>

            {/* 3. Multi-Step Loader (Unclipped, Centered, Generous Spacing) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex justify-center my-2"
            >
              <LoaderCore
                value={activeStep}
                loadingStates={SATELLITE_ANALYSIS_STEPS}
              />
            </motion.div>

            {/* 4. Current Status & Progress % */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3 mt-8 sm:mt-10 w-full"
            >
              {/* Progress Percentage */}
              <div
                className="text-3xl sm:text-4xl font-serif italic text-accent font-medium tracking-wide"
                style={{ color: "#C86D3B" }}
              >
                {progressPercent}%
              </div>

              {/* Active status telemetry pill */}
              <div className="glass-pill px-4 py-1.5 rounded-full flex items-center gap-2.5 shadow-sm border border-white/10 bg-[#171512]/90 backdrop-blur-md max-w-sm sm:max-w-md">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping absolute" />
                  <span className="w-2 h-2 rounded-full bg-accent relative" />
                </div>
                <span
                  className="text-xs font-mono font-medium truncate"
                  style={{ color: "#C7BCB1" }}
                >
                  {currentDetail}
                </span>
              </div>

              <div
                className="text-[10px] font-mono uppercase tracking-wider font-medium"
                style={{ color: "#8F857B" }}
              >
                STAGE {activeStep + 1} OF {SATELLITE_ANALYSIS_STEPS.length} • SENTINEL-1 + SENTINEL-2 PIPELINE
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
