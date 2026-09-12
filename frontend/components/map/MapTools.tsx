"use client";

import React from "react";
import { useAssetStore } from "@/store/useAssetStore";
import { toast } from "@/store/useToastStore";
import {
  Maximize,
  Ruler,
  SquarePen,
  Columns,
  Crosshair,
  RotateCcw,
  X,
  Check,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export const MapTools: React.FC = () => {
  const {
    bbox,
    evidence,
    isCompareMode,
    setCompareMode,
    setMapFlyToBounds,
    measurement,
    setMeasurement,
    clearMeasurement,
    drawnAoi,
    setDrawnAoi,
    isDrawingAoi,
    setDrawingAoi,
  } = useAssetStore();

  const hasEvidence = !!evidence && (evidence.features?.length || 0) > 0;

  // 1. Fit AOI
  const handleFitAoi = () => {
    if (bbox && setMapFlyToBounds) {
      setMapFlyToBounds(bbox);
      toast.info("Map centered on primary AOI");
    }
  };

  // 2. Measure Mode Toggle
  const handleToggleMeasure = () => {
    if (measurement.active) {
      clearMeasurement();
      toast.info("Measurement mode deactivated");
    } else {
      setMeasurement({ active: true, mode: "distance", points: [] });
      toast.info("Measure Mode: Click on map points to measure distance & area");
    }
  };

  // 3. Draw AOI Mode Toggle
  const handleToggleDrawAoi = () => {
    if (isDrawingAoi) {
      setDrawingAoi(false);
      setDrawnAoi(null);
    } else {
      setDrawingAoi(true);
      toast.info("Draw AOI: Click 4 corners on map to define custom bounding polygon");
    }
  };

  // 4. Compare Toggle
  const handleToggleCompare = () => {
    setCompareMode(!isCompareMode);
    toast.info(!isCompareMode ? "Compare mode enabled" : "Returned to single map view");
  };

  // 5. Fit Evidence
  const handleFitEvidence = () => {
    if (!evidence || !evidence.features || evidence.features.length === 0) {
      toast.warning("No spatial evidence currently rendered");
      return;
    }

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

    evidence.features.forEach((f) => {
      if (f.geometry && "coordinates" in f.geometry) {
        scanCoords((f.geometry as any).coordinates);
      }
    });

    if (minLon !== Infinity && setMapFlyToBounds) {
      setMapFlyToBounds([minLon, minLat, maxLon, maxLat]);
      toast.info("Zoomed to active evidence clusters");
    }
  };

  // 6. Reset View
  const handleReset = () => {
    clearMeasurement();
    setDrawingAoi(false);
    setDrawnAoi(null);
    setCompareMode(false);
    if (bbox && setMapFlyToBounds) {
      setMapFlyToBounds(bbox);
    }
    toast.info("Map canvas reset to default view");
  };

  return (
    <>
      {/* Floating Toolbar on Left */}
      <div className="absolute top-14 left-4 z-[400] flex flex-col gap-1.5 liquid-glass p-1 rounded-2xl border border-white/70 dark:border-white/10 shadow-[0_8px_24px_rgba(78,59,42,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
        {/* Fit AOI */}
        <Tooltip content="Fit AOI" side="right">
          <button
            type="button"
            onClick={handleFitAoi}
            className="apple-interactive w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] hover:bg-white/80 dark:hover:bg-white/10 active:scale-[0.99] transition-all"
            aria-label="Fit AOI"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Measure */}
        <Tooltip content="Measure" side="right">
          <button
            type="button"
            onClick={handleToggleMeasure}
            className={`apple-interactive w-8 h-8 rounded-xl flex items-center justify-center active:scale-[0.99] transition-all ${
              measurement.active
                ? "bg-[#7F4B30] text-white shadow-xs"
                : "text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] hover:bg-white/80 dark:hover:bg-white/10"
            }`}
            aria-label="Measure tool"
          >
            <Ruler className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Draw AOI */}
        <Tooltip content="Draw AOI" side="right">
          <button
            type="button"
            onClick={handleToggleDrawAoi}
            className={`apple-interactive w-8 h-8 rounded-xl flex items-center justify-center active:scale-[0.99] transition-all ${
              isDrawingAoi
                ? "bg-[#7F4B30] text-white shadow-xs"
                : "text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] hover:bg-white/80 dark:hover:bg-white/10"
            }`}
            aria-label="Draw AOI tool"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Compare */}
        <Tooltip content="Compare" side="right">
          <button
            type="button"
            onClick={handleToggleCompare}
            className={`apple-interactive w-8 h-8 rounded-xl flex items-center justify-center active:scale-[0.99] transition-all ${
              isCompareMode
                ? "bg-[#7F4B30] text-white shadow-xs"
                : "text-secondary hover:text-primary dark:text-[#B8AEA3] dark:hover:text-[#F3EEE7] hover:bg-white/80 dark:hover:bg-white/10"
            }`}
            aria-label="Compare mode"
          >
            <Columns className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Fit Evidence */}
        <Tooltip content="Fit Evidence" side="right">
          <button
            type="button"
            onClick={handleFitEvidence}
            disabled={!hasEvidence}
            className={`apple-interactive w-8 h-8 rounded-xl flex items-center justify-center active:scale-[0.99] transition-all ${
              !hasEvidence
                ? "opacity-30 cursor-not-allowed"
                : "text-secondary hover:text-accent dark:text-[#B8AEA3] dark:hover:text-accent hover:bg-white/80 dark:hover:bg-white/10"
            }`}
            aria-label="Fit Evidence"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </Tooltip>

        <div className="w-5 h-px bg-stone-300/60 dark:bg-white/10 mx-auto my-0.5" />

        {/* Reset */}
        <Tooltip content="Reset" side="right">
          <button
            type="button"
            onClick={handleReset}
            className="apple-interactive w-8 h-8 rounded-xl flex items-center justify-center text-secondary dark:text-[#B8AEA3] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-[0.99] transition-all"
            aria-label="Reset map"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* Measurement Active HUD Banner */}
      {measurement.active && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[450] animate-fade-in-up">
          <div className="liquid-glass px-4 py-2 rounded-full flex items-center gap-3 border border-accent/40 shadow-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span className="font-semibold text-primary">Measurement Tool:</span>
            <span className="text-secondary font-mono">
              Points: {measurement.points.length} |{" "}
              {measurement.totalDistanceMeters > 0
                ? `${(measurement.totalDistanceMeters / 1000).toFixed(2)} km`
                : "Click map to add points"}
              {measurement.totalAreaMeters2 > 0 &&
                ` • Area: ${(measurement.totalAreaMeters2 / 1000000).toFixed(2)} km²`}
            </span>
            <button
              type="button"
              onClick={clearMeasurement}
              className="text-secondary hover:text-primary p-0.5 ml-1"
              title="Clear points"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Draw AOI Active HUD Banner */}
      {isDrawingAoi && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[450] animate-fade-in-up">
          <div className="liquid-glass px-4 py-2 rounded-full flex items-center gap-3 border border-emerald-500/40 shadow-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-primary">Draw AOI Active:</span>
            <span className="text-secondary font-mono">Click to set bounding vertices</span>
            <button
              type="button"
              onClick={() => {
                setDrawingAoi(false);
                toast.success("Custom AOI stored in analysis state");
              }}
              className="apple-interactive px-2 py-0.5 rounded-full bg-emerald-600 text-white font-medium text-[11px] flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Done
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawingAoi(false);
                setDrawnAoi(null);
              }}
              className="text-secondary hover:text-primary p-0.5 ml-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
