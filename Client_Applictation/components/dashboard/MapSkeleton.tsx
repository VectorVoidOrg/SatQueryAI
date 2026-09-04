import React from "react";
import { Compass, Layers } from "lucide-react";

export const MapSkeleton: React.FC = () => {
  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-100 overflow-hidden flex items-center justify-center">
      {/* Background simulated light grid */}
      <div
        className="absolute inset-0 opacity-15 bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:32px_32px]"
      />
      
      {/* Subtle warm glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* Floating center scientific indicator */}
      <div className="liquid-glass relative z-10 flex flex-col items-center gap-3 px-8 py-6 rounded-3xl text-slate-800 shadow-glass animate-pulse max-w-sm text-center border border-white/60">
        <div className="flex items-center gap-2 text-slate-900">
          <Compass className="w-5 h-5 animate-spin text-accent" style={{ animationDuration: "8s" }} />
          <span className="font-serif italic text-lg tracking-wide text-slate-900">
            Initializing Geospatial Canvas
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Calibrating multi-band optical & dual-polarization SAR telemetry...
        </p>
      </div>

      {/* Simulated top-right layer control placeholder */}
      <div className="liquid-glass absolute top-4 right-4 z-10 w-48 h-28 rounded-2xl p-3 flex flex-col gap-2 border border-white/60">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Layers className="w-3.5 h-3.5" />
          <span>Layer Control</span>
        </div>
        <div className="w-full h-2.5 bg-slate-200/80 rounded-full" />
        <div className="w-3/4 h-2.5 bg-slate-200/80 rounded-full" />
        <div className="w-1/2 h-2.5 bg-slate-200/80 rounded-full" />
      </div>

      {/* Coordinate bar */}
      <div className="liquid-glass absolute bottom-4 left-4 z-10 font-mono text-[10px] text-slate-500 px-3 py-1 rounded-full border border-slate-200/60 shadow-sm">
        EPSG:4326 • SCIENTIFIC CANVAS READY
      </div>
    </div>
  );
};
