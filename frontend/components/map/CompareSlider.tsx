"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useAssetStore } from "@/store/useAssetStore";
import { X, ChevronsLeftRight, SlidersHorizontal, SplitSquareVertical } from "lucide-react";

export const CompareSlider: React.FC = () => {
  const {
    isCompareMode,
    setCompareMode,
    compareMode,
    setCompareModeType,
    compareSliderPosition,
    setCompareSliderPosition,
    beforeDate,
    afterDate,
  } = useAssetStore();

  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const mapEl = document.getElementById("satquery-map-container");
      if (!mapEl) return;
      const rect = mapEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setCompareSliderPosition(percentage);
    },
    [setCompareSliderPosition]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [handlePointerMove]);

  if (!isCompareMode) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[350] pointer-events-none select-none overflow-hidden"
    >
      {/* Top Floating Control Bar for Compare Mode */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 liquid-glass px-3.5 py-1.5 rounded-full border border-white/80 dark:border-white/10 shadow-md">
        <span className="font-serif text-xs font-semibold text-primary">Compare Mode:</span>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-0.5 rounded-full text-[11px]">
          <button
            type="button"
            onClick={() => setCompareModeType("slider")}
            className={`px-2.5 py-0.5 rounded-full transition-all ${
              compareMode === "slider"
                ? "bg-[#7F4B30] text-white font-medium shadow-xs"
                : "text-secondary dark:text-[#B8AEA3] hover:text-primary dark:hover:text-[#F3EEE7]"
            }`}
          >
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Slider
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCompareModeType("side-by-side")}
            className={`px-2.5 py-0.5 rounded-full transition-all ${
              compareMode === "side-by-side"
                ? "bg-[#7F4B30] text-white font-medium shadow-xs"
                : "text-secondary dark:text-[#B8AEA3] hover:text-primary dark:hover:text-[#F3EEE7]"
            }`}
          >
            <span className="flex items-center gap-1">
              <SplitSquareVertical className="w-3 h-3" /> Side-by-Side
            </span>
          </button>
        </div>

        <div className="h-3 w-px bg-stone-300 dark:bg-white/10 mx-0.5" />

        {/* Exit Compare */}
        <button
          type="button"
          onClick={() => setCompareMode(false)}
          className="text-secondary/70 hover:text-primary dark:text-[#91877D] dark:hover:text-[#F3EEE7] p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Exit comparison"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Pill Labels: "Before" and "After" */}
      <div className="absolute top-14 left-6 pointer-events-auto">
        <div className="liquid-glass-subtle px-3 py-1 rounded-full text-[11px] font-medium text-secondary dark:text-[#B8AEA3] shadow-xs border border-white/70 dark:border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Before</span>
          <span className="font-mono text-primary font-semibold">({beforeDate})</span>
        </div>
      </div>

      <div className="absolute top-14 right-6 pointer-events-auto">
        <div className="liquid-glass-subtle px-3 py-1 rounded-full text-[11px] font-medium text-accent shadow-xs border border-accent/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>After</span>
          <span className="font-mono text-primary font-semibold">({afterDate})</span>
        </div>
      </div>

      {/* Draggable Vertical Slider Divider */}
      {compareMode === "slider" && (
        <div
          className="absolute inset-y-0 pointer-events-auto will-change-[left]"
          style={{ left: `${compareSliderPosition}%`, transform: "translateX(-50%)" }}
        >
          {/* Vertical divider line */}
          <div className="w-[2.5px] h-full bg-white/90 shadow-[0_0_8px_rgba(200,109,59,0.5)] mx-auto relative">
            {/* Draggable Handle Badge */}
            <motion.div
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="apple-interactive absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-9 h-9 rounded-full bg-white/95 dark:bg-[#1F1B17] text-primary flex items-center justify-center cursor-ew-resize shadow-[0_4px_16px_rgba(78,59,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-accent/40"
              title="Drag to compare before and after imagery"
            >
              <ChevronsLeftRight className="w-4 h-4 text-[#7F4B30] dark:text-accent" />
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};
