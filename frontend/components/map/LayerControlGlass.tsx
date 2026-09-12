import React, { useState } from "react";
import { Layers, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useAssetStore } from "@/store/useAssetStore";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export const LayerControlGlass: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    activeLayers,
    layerOpacity,
    toggleLayer,
    setLayerOpacity,
    evidence,
    isCompareMode,
    setCompareMode,
    compareMode,
    setCompareModeType,
  } = useAssetStore();

  const evidenceFeatureCount = evidence?.features?.length || 0;

  return (
    <div className="glass-card absolute top-4 right-4 z-[400] w-60 rounded-2xl text-primary transition-all duration-300 overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none border-b border-white/40 dark:border-white/10 bg-white/20 dark:bg-white/[0.04]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span className="font-serif text-sm tracking-wide text-primary font-medium">
            Map Layers
          </span>
          {evidenceFeatureCount > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={isExpanded ? "Collapse layer control" : "Expand layer control"}
          className="text-secondary/60 hover:text-primary p-1 rounded-full transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="p-3 space-y-2.5 text-xs">
          {/* Optical Basemap */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm" />
              <label htmlFor="layer-optical" className="cursor-pointer font-medium text-primary">
                Optical Basemap
              </label>
            </div>
            <Switch
              id="layer-optical"
              aria-label="Toggle Optical Basemap"
              checked={activeLayers.optical}
              onCheckedChange={() => toggleLayer("optical")}
            />
          </div>

          {/* SAR Overlay */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 shadow-sm" />
              <label htmlFor="layer-sar" className="cursor-pointer font-medium text-primary">
                SAR Radar Overlay
              </label>
            </div>
            <Switch
              id="layer-sar"
              aria-label="Toggle SAR Radar Overlay"
              checked={activeLayers.sar}
              onCheckedChange={() => toggleLayer("sar")}
            />
          </div>

          {/* AI Change Mask / Evidence */}
          <div className="pt-2 border-t border-white/40 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                <label htmlFor="layer-change-mask" className="cursor-pointer font-medium text-primary flex items-center gap-1.5">
                  AI Change Mask
                  {evidenceFeatureCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/50 text-amber-800 dark:text-amber-300 rounded-full font-mono text-[10px]">
                      {evidenceFeatureCount}
                    </span>
                  )}
                </label>
              </div>
              <Switch
                id="layer-change-mask"
                aria-label="Toggle AI Change Mask"
                checked={activeLayers.aiChangeMask}
                onCheckedChange={() => toggleLayer("aiChangeMask")}
              />
            </div>

            {/* Opacity Slider */}
            {activeLayers.aiChangeMask && (
              <div className="pl-3.5 pr-1 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-secondary">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Opacity
                  </span>
                  <span className="font-mono text-accent font-semibold">{Math.round(layerOpacity.aiChangeMask * 100)}%</span>
                </div>
                <Slider
                  aria-label="AI Change Mask Opacity"
                  value={layerOpacity.aiChangeMask}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  onChange={(val) => setLayerOpacity("aiChangeMask", val)}
                />
              </div>
            )}
          </div>

          {/* Before / After Comparison Section */}
          <div className="pt-2 border-t border-white/40 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C86D3B] shadow-sm" />
                <span className="font-medium text-primary">Compare Mode</span>
              </div>
              <Switch
                id="layer-compare"
                aria-label="Toggle Before / After Comparison"
                checked={isCompareMode}
                onCheckedChange={setCompareMode}
              />
            </div>
            {isCompareMode && (
              <div className="flex items-center gap-1.5 pt-0.5 pl-3.5">
                <button
                  type="button"
                  onClick={() => setCompareModeType("slider")}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                    compareMode === "slider"
                      ? "bg-[#7F4B30] text-white font-medium"
                      : "bg-white/50 dark:bg-[#1F1B17] text-secondary dark:text-[#B8AEA3] hover:text-primary dark:hover:text-[#F3EEE7]"
                  }`}
                >
                  Slider
                </button>
                <button
                  type="button"
                  onClick={() => setCompareModeType("side-by-side")}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                    compareMode === "side-by-side"
                      ? "bg-[#7F4B30] text-white font-medium"
                      : "bg-white/50 dark:bg-[#1F1B17] text-secondary dark:text-[#B8AEA3] hover:text-primary dark:hover:text-[#F3EEE7]"
                  }`}
                >
                  Side-by-Side
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
