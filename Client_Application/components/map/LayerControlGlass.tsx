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
  } = useAssetStore();

  const evidenceFeatureCount = evidence?.features?.length || 0;

  return (
    <div className="liquid-glass absolute top-4 right-4 z-[400] w-64 rounded-2xl shadow-glass text-slate-900 transition-all duration-300 border border-white/60">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b border-slate-200/60"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          <span className="font-serif text-sm tracking-wide text-slate-900 font-medium">
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
          className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="p-3.5 space-y-3.5 text-xs">
          {/* Optical Basemap */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 shadow-sm" />
              <label htmlFor="layer-optical" className="cursor-pointer font-medium text-slate-800">
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
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 shadow-sm" />
              <label htmlFor="layer-sar" className="cursor-pointer font-medium text-slate-800">
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
          <div className="pt-2.5 border-t border-slate-200/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
                <label htmlFor="layer-change-mask" className="cursor-pointer font-medium text-slate-800 flex items-center gap-1.5">
                  AI Change Mask
                  {evidenceFeatureCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-100 border border-amber-300 text-amber-900 rounded-full font-mono text-[10px]">
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
              <div className="pl-4 pr-1 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Opacity
                  </span>
                  <span className="font-mono text-slate-700 font-semibold">{Math.round(layerOpacity.aiChangeMask * 100)}%</span>
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
        </div>
      )}
    </div>
  );
};
