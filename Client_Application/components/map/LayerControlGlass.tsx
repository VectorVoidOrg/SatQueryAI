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
    <div className="glass-card absolute top-4 right-4 z-[400] w-64 rounded-2xl text-primary transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b border-white/40 bg-white/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
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
        <div className="p-3.5 space-y-3.5 text-xs">
          {/* Optical Basemap */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm" />
              <label htmlFor="layer-optical" className="cursor-pointer font-medium text-primary">
                Optical Basemap
              </label>
            </div>
            <Switch
              id="layer-optical"
              aria-label="Toggle optical basemap layer"
              checked={activeLayers.optical}
              onCheckedChange={() => toggleLayer("optical")}
            />
          </div>

          {activeLayers.optical && (
            <div className="space-y-1.5 pl-4 border-l-2 border-sky-400/30">
              <div className="flex items-center justify-between text-[11px] text-secondary">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Opacity
                </span>
                <span className="font-mono">{Math.round(layerOpacity.optical * 100)}%</span>
              </div>
              <Slider
                id="opacity-optical"
                aria-label="Optical layer opacity"
                value={layerOpacity.optical}
                onChange={(val) => setLayerOpacity("optical", val)}
              />
            </div>
          )}

          {/* SAR Radar Layer */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-200/40">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
              <label htmlFor="layer-sar" className="cursor-pointer font-medium text-primary">
                Sentinel-1 SAR
              </label>
            </div>
            <Switch
              id="layer-sar"
              aria-label="Toggle Sentinel-1 SAR layer"
              checked={activeLayers.sar}
              onCheckedChange={() => toggleLayer("sar")}
            />
          </div>

          {activeLayers.sar && (
            <div className="space-y-1.5 pl-4 border-l-2 border-emerald-500/30">
              <div className="flex items-center justify-between text-[11px] text-secondary">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Opacity
                </span>
                <span className="font-mono">{Math.round(layerOpacity.sar * 100)}%</span>
              </div>
              <Slider
                id="opacity-sar"
                aria-label="SAR layer opacity"
                value={layerOpacity.sar}
                onChange={(val) => setLayerOpacity("sar", val)}
              />
            </div>
          )}

          {/* AI Change Mask Evidence */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-200/40">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm animate-pulse" />
              <div className="flex items-center gap-1.5">
                <label htmlFor="layer-change-mask" className="cursor-pointer font-medium text-primary">
                  AI Change Mask
                </label>
                {evidenceFeatureCount > 0 && (
                  <span className="text-[10px] font-mono text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded-full border border-amber-200">
                    {evidenceFeatureCount}
                  </span>
                )}
              </div>
            </div>
            <Switch
              id="layer-change-mask"
              aria-label="Toggle AI Change Mask layer"
              checked={activeLayers.aiChangeMask}
              onCheckedChange={() => toggleLayer("aiChangeMask")}
            />
          </div>

          {activeLayers.aiChangeMask && (
            <div className="space-y-1.5 pl-4 border-l-2 border-amber-500/30">
              <div className="flex items-center justify-between text-[11px] text-secondary">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Opacity
                </span>
                <span className="font-mono">{Math.round(layerOpacity.aiChangeMask * 100)}%</span>
              </div>
              <Slider
                id="opacity-change-mask"
                aria-label="AI Change Mask opacity"
                value={layerOpacity.aiChangeMask}
                onChange={(val) => setLayerOpacity("aiChangeMask", val)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
