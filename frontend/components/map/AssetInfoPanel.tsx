"use client";

import React, { useState } from "react";
import { useAssetStore } from "@/store/useAssetStore";
import { Info, ChevronDown, ChevronUp, Database, Calendar, Eye, Layers, Compass, Cloud, HardDrive } from "lucide-react";

export const AssetInfoPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { assetName, metadata } = useAssetStore();

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatBands = (bands?: number | string[]) => {
    if (!bands) return null;
    if (Array.isArray(bands)) return bands.join(", ");
    return `${bands} Bands`;
  };

  if (!isOpen) {
    return (
      <div className="absolute top-4 left-4 z-[400]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="apple-interactive glass-pill rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-medium text-primary hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-200 shadow-xs group"
          title="Inspect Asset Telemetry"
        >
          <Database className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-[11px] truncate max-w-[130px] sm:max-w-[180px]">{assetName}</span>
          <Info className="w-3 h-3 text-secondary/60 group-hover:text-primary transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-[400] w-72 max-w-[calc(100vw-32px)]">
      <div className="glass-card rounded-2xl p-4 text-xs text-primary shadow-[0_16px_36px_rgba(78,59,42,0.12)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.5)] border border-white/70 dark:border-white/10 animate-fade-in-up space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/50 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-secondary/70 dark:text-[#91877D] font-semibold block">
                ASSET INFORMATION
              </span>
              <span className="font-serif text-sm font-medium text-primary leading-none truncate max-w-[170px] block">
                {assetName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-secondary/60 hover:text-primary dark:text-[#91877D] dark:hover:text-[#F3EEE7] p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Minimize Panel"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Fields Grid (Only rendered if available) */}
        <div className="space-y-2 text-[11px]">
          {metadata?.acquisitionDate && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-accent/80" /> Acquisition Date:
              </span>
              <span className="font-mono text-primary font-medium">{metadata.acquisitionDate}</span>
            </div>
          )}

          {metadata?.sensor && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-accent/80" /> Sensor:
              </span>
              <span className="font-mono text-primary font-medium text-right truncate max-w-[140px]" title={metadata.sensor}>
                {metadata.sensor}
              </span>
            </div>
          )}

          {metadata?.resolution && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-accent/80" /> Resolution:
              </span>
              <span className="font-mono text-primary font-medium">{metadata.resolution}</span>
            </div>
          )}

          {metadata?.bands && (
            <div className="space-y-1 pt-1 border-t border-stone-100 dark:border-white/10">
              <span className="text-secondary flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-accent/80" /> Spectral Bands:
              </span>
              <p className="font-mono text-[10px] text-primary/90 dark:text-[#F3EEE7] bg-white/50 dark:bg-[#1F1B17] px-2 py-1 rounded-lg border border-stone-200/60 dark:border-white/10 break-words leading-tight">
                {formatBands(metadata.bands)}
              </p>
            </div>
          )}

          {metadata?.crs && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-secondary">CRS:</span>
              <span className="font-mono text-[10px] text-secondary dark:text-[#B8AEA3] bg-stone-100 dark:bg-[#1F1B17] px-1.5 py-0.5 rounded border border-stone-200 dark:border-white/10">
                {metadata.crs}
              </span>
            </div>
          )}

          {metadata?.cloudCover !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <Cloud className="w-3 h-3 text-sky-600" /> Cloud Cover:
              </span>
              <span className="font-mono text-primary font-medium">{metadata.cloudCover}%</span>
            </div>
          )}

          {metadata?.fileSize && (
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-secondary/70" /> File Size:
              </span>
              <span className="font-mono text-primary font-medium">{formatFileSize(metadata.fileSize)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
