import React from "react";
import { LayerSource } from "@/lib/types/geo";

interface RasterLayerProps {
  source?: LayerSource;
  visible: boolean;
  opacity: number;
  TileLayerComponent: React.ComponentType<any>;
  ImageOverlayComponent: React.ComponentType<any>;
}

export const RasterLayer: React.FC<RasterLayerProps> = ({
  source,
  visible,
  opacity,
  TileLayerComponent,
  ImageOverlayComponent,
}) => {
  if (!source) return null;

  const effectiveOpacity = visible ? opacity : 0;

  if (source.type === "image" && source.bounds) {
    // LatLngBoundsLiteral: [[south, west], [north, east]]
    // bounds is [minLon, minLat, maxLon, maxLat] -> [[minLat, minLon], [maxLat, maxLon]]
    const latLngBounds: [[number, number], [number, number]] = [
      [source.bounds[1], source.bounds[0]],
      [source.bounds[3], source.bounds[2]],
    ];

    return (
      <ImageOverlayComponent
        url={source.url}
        bounds={latLngBounds}
        opacity={effectiveOpacity}
        zIndex={10}
      />
    );
  }

  // Default: XYZ TileLayer
  return (
    <TileLayerComponent
      url={source.url}
      opacity={effectiveOpacity}
      maxZoom={19}
      attribution="&copy; OpenStreetMap contributors, Esri, Stadia"
    />
  );
};
