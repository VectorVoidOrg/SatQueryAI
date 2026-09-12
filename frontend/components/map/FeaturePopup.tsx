import React from "react";
import { ShieldCheck, Activity, MapPin } from "lucide-react";

interface FeaturePopupProps {
  properties: Record<string, any>;
}

export const FeaturePopup: React.FC<FeaturePopupProps> = ({ properties }) => {
  const className = properties.class || properties.name || "Identified Spatial Feature";
  const confidence = properties.confidence !== undefined ? (properties.confidence * 100).toFixed(1) : null;
  const areaM2 = properties.area_m2 ? properties.area_m2.toLocaleString() : null;

  return (
    <div className="p-1 min-w-[220px] max-w-[280px] font-sans text-primary">
      <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2 mb-2">
        <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-serif text-sm text-primary leading-tight font-medium">
          {className}
        </span>
      </div>

      <div className="space-y-2 text-[11px]">
        {confidence && (
          <div className="flex items-center justify-between">
            <span className="text-secondary flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              AI Confidence:
            </span>
            <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
              {confidence}%
            </span>
          </div>
        )}

        {areaM2 && (
          <div className="flex items-center justify-between">
            <span className="text-secondary flex items-center gap-1">
              <Activity className="w-3 h-3 text-accent" />
              Affected Area:
            </span>
            <span className="font-mono font-semibold text-primary">
              {areaM2} m²
            </span>
          </div>
        )}

        {properties.retreat_rate_m_yr && (
          <div className="flex items-center justify-between">
            <span className="text-secondary">Retreat Rate:</span>
            <span className="font-mono font-semibold text-amber-700">
              {properties.retreat_rate_m_yr} m/yr
            </span>
          </div>
        )}

        {properties.sensor_fusion && (
          <div className="pt-1.5 border-t border-stone-200/60 text-[10px] text-secondary/70 italic">
            Sensor: {properties.sensor_fusion}
          </div>
        )}
      </div>
    </div>
  );
};
