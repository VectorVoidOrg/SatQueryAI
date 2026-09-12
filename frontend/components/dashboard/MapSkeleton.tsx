import React from "react";
import { Compass, Layers } from "lucide-react";

export const MapSkeleton: React.FC = () => {
  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#EFE8DE] dark:bg-[#0F0E0C] overflow-hidden flex items-center justify-center">
      {/* Background simulated warm grid */}
      <div
        className="absolute inset-0 opacity-10 dark:opacity-20 bg-[radial-gradient(#1C1917_1px,transparent_1px)] dark:bg-[radial-gradient(#FAF6F0_1px,transparent_1px)] [background-size:32px_32px]"
      />
      
      {/* Subtle warm glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      {/* Floating center scientific indicator */}
      <div className="liquid-glass relative z-10 flex flex-col items-center gap-3 px-8 py-6 rounded-3xl text-primary shadow-glass animate-pulse max-w-sm text-center">
        <div className="flex items-center gap-2 text-primary">
          <Compass className="w-5 h-5 animate-spin text-accent" style={{ animationDuration: "8s" }} />
          <span className="font-serif italic text-lg tracking-wide text-primary">
            Initializing Geospatial Canvas
          </span>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          Calibrating multi-band optical & dual-polarization SAR telemetry...
        </p>
      </div>

      {/* Simulated top-right layer control placeholder */}
      <div className="liquid-glass absolute top-4 right-4 z-10 w-48 h-28 rounded-2xl p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-secondary text-xs">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span>Layer Control</span>
        </div>
        <div className="w-full h-2.5 bg-black/5 dark:bg-white/10 rounded-full" />
        <div className="w-3/4 h-2.5 bg-black/5 dark:bg-white/10 rounded-full" />
        <div className="w-1/2 h-2.5 bg-black/5 dark:bg-white/10 rounded-full" />
      </div>

      {/* Coordinate bar */}
      <div className="liquid-glass absolute bottom-4 left-4 z-10 font-mono text-[10px] text-secondary px-3 py-1 rounded-full border border-white/60 dark:border-white/10 shadow-xs">
        EPSG:4326 • SCIENTIFIC CANVAS READY
      </div>
    </div>
  );
};
