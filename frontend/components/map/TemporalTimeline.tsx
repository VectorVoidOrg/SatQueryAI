"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssetStore } from "@/store/useAssetStore";
import { toast } from "@/store/useToastStore";
import { Calendar, Play, Pause, ChevronUp, ChevronDown, Sparkles, Cloud, Eye } from "lucide-react";

export const TemporalTimeline: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { timeline, selectedTimelineId, selectTimelineDate } = useAssetStore();

  const selectedItem = timeline.find((t) => t.id === selectedTimelineId) || timeline[timeline.length - 1];
  const activeTooltipItem = timeline.find((t) => t.id === hoveredId) || selectedItem;

  // Auto-cycle through timeline steps when user clicks Play
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const currentIndex = timeline.findIndex((t) => t.id === selectedTimelineId);
      const nextIndex = (currentIndex + 1) % timeline.length;
      selectTimelineDate(timeline[nextIndex].id);
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying, timeline, selectedTimelineId, selectTimelineDate]);

  if (!isOpen) {
    return (
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[400]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="apple-interactive glass-pill rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-medium text-primary hover:bg-white/80 transition-all shadow-xs"
        >
          <Calendar className="w-3.5 h-3.5 text-accent" />
          <span>Timeline:</span>
          <span className="font-mono text-accent font-semibold">{selectedItem?.label || selectedItem?.date}</span>
          <ChevronUp className="w-3.5 h-3.5 text-secondary" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-11 left-1/2 -translate-x-1/2 z-[400] w-full max-w-lg px-4 select-none">
      <div className="glass-card rounded-2xl p-2.5 sm:p-3 text-xs text-primary shadow-[0_16px_36px_rgba(78,59,42,0.14)] border border-white/80 dark:border-white/10 animate-fade-in-up space-y-2">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span className="font-serif text-sm font-medium tracking-wide text-primary">
              Temporal Imagery
            </span>
            <span className="font-mono text-[10px] text-secondary/80 dark:text-[#B8AEA3] bg-white/50 dark:bg-[#1F1B17] px-2 py-0.5 rounded-full border border-stone-200 dark:border-white/10">
              {timeline.length} epochs
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Play/Pause Scrub Button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="apple-interactive flex items-center gap-1 text-[11px] font-medium text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-[#1F1B17] hover:bg-white dark:hover:bg-[#2A241F] border border-stone-200 dark:border-white/10 shadow-xs"
              title={isPlaying ? "Pause timeline scrubbing" : "Play auto temporal cycle"}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3 text-accent" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-accent fill-accent" />
                  <span>Cycle</span>
                </>
              )}
            </button>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-secondary/60 hover:text-primary dark:text-[#91877D] dark:hover:text-[#F3EEE7] p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Minimize timeline"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline Slider Track */}
        <div className="relative pt-2 pb-0.5 px-3">
          {/* Horizontal Background Line */}
          <div className="absolute top-[17px] left-5 right-5 h-0.5 bg-stone-300/70 dark:bg-white/20 -translate-y-1/2" />

          {/* Points Grid */}
          <div className="relative flex items-center justify-between">
            {timeline.map((item, index) => {
              const isSelected = item.id === selectedTimelineId;
              const year = item.date.split("-")[0];

              return (
                <div
                  key={item.id}
                  className="flex flex-col items-center cursor-pointer group"
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    selectTimelineDate(item.id);
                    toast.info(`Imagery set to ${item.label || item.date}`);
                  }}
                >
                  {/* Point Circle */}
                  <div className="relative w-4 h-4 rounded-full flex items-center justify-center">
                    <div
                      className={`w-4 h-4 rounded-full transition-all duration-200 flex items-center justify-center ${
                        isSelected
                          ? "opacity-0"
                          : "bg-white dark:bg-[#171512] border-2 border-stone-300 dark:border-white/30 group-hover:border-accent group-hover:scale-105"
                      }`}
                    />
                    {isSelected && (
                      <motion.div
                        layoutId="active-timeline-indicator"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-[#7F4B30] ring-4 ring-[#C86D3B]/25 scale-110 shadow-sm flex items-center justify-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Year Label */}
                  <span
                    className={`text-[11px] font-mono mt-1 transition-colors ${
                      isSelected
                        ? "text-[#7F4B30] dark:text-accent font-bold"
                        : "text-secondary dark:text-[#B8AEA3] group-hover:text-primary dark:group-hover:text-[#F3EEE7]"
                    }`}
                  >
                    {year}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Metadata HUD */}
        <AnimatePresence mode="wait">
          {activeTooltipItem && (
            <motion.div
              key={activeTooltipItem.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between text-[11px] bg-white/50 dark:bg-[#1F1B17] backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/60 dark:border-white/10"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-primary">{activeTooltipItem.label || activeTooltipItem.date}</span>
                <span className="text-stone-300 dark:text-white/20">|</span>
                <span className="text-secondary dark:text-[#B8AEA3] flex items-center gap-1 truncate max-w-[140px]">
                  <Eye className="w-3 h-3 text-accent" /> {activeTooltipItem.sensor || "Multispectral"}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-secondary dark:text-[#91877D] font-mono text-[10px]">
                {activeTooltipItem.cloudCover !== undefined && (
                  <span className="flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-sky-600 dark:text-sky-400" /> {activeTooltipItem.cloudCover}%
                  </span>
                )}
                {activeTooltipItem.resolution && (
                  <span>{activeTooltipItem.resolution}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
