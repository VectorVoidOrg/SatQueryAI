import React from "react";
import ReactDOMServer from "react-dom/server";
import { FeaturePopup } from "@/components/map/FeaturePopup";
import { useAssetStore } from "@/store/useAssetStore";

interface EvidenceLayerProps {
  GeoJSONComponent: React.ComponentType<any>;
}

export const EvidenceLayer: React.FC<EvidenceLayerProps> = ({ GeoJSONComponent }) => {
  const { evidence, evidenceTurnId, activeLayers, layerOpacity } = useAssetStore();

  if (!evidence || !activeLayers.aiChangeMask) {
    return null;
  }

  const opacity = layerOpacity.aiChangeMask;

  const style = () => ({
    color: "#F59E0B", // Amber-500
    weight: 2.5,
    opacity: Math.min(1, opacity + 0.2),
    fillColor: "#F59E0B",
    fillOpacity: opacity * 0.35,
    dashArray: "4, 2",
    lineJoin: "round" as const,
  });

  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const popupHtml = ReactDOMServer.renderToString(
        <FeaturePopup properties={feature.properties} />
      );
      layer.bindPopup(popupHtml, {
        className: "satquery-feature-popup",
        closeButton: true,
      });

      layer.on({
        mouseover: (e: any) => {
          const l = e.target;
          l.setStyle({
            weight: 4,
            fillOpacity: opacity * 0.6,
          });
        },
        mouseout: (e: any) => {
          const l = e.target;
          l.setStyle(style());
        },
      });
    }
  };

  return (
    <GeoJSONComponent
      key={evidenceTurnId || "default_evidence"}
      data={evidence}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
};
