"use client";

import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  ImageOverlay,
  useMap,
} from "react-leaflet";
import { useAssetStore } from "@/store/useAssetStore";
import { LayerControlGlass } from "@/components/map/LayerControlGlass";
import { RasterLayer } from "@/components/map/RasterLayer";
import { EvidenceLayer } from "@/components/map/EvidenceLayer";
import { UploadDropzone } from "@/components/ingestion/UploadDropzone";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet default marker icons
try {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com",
    iconUrl: "https://unpkg.com",
    shadowUrl: "https://unpkg.com",
  });
} catch {
  // Non-browser fallback
}

// Controller component for map view transitions
function MapViewController({
  bbox,
  evidence,
}: {
  bbox: [number, number, number, number] | null;
  evidence: GeoJSON.FeatureCollection | null;
}) {
  const map = useMap();
  const prevBboxRef = useRef<string | null>(null);
  const prevEvidenceRef = useRef<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!bbox || !map) return;
    const bboxKey = bbox.join(",");
    if (prevBboxRef.current === bboxKey) return;
    prevBboxRef.current = bboxKey;

    const bounds = L.latLngBounds(
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]]
    );

    map.flyToBounds(bounds, {
      duration: 0.8,
      easeLinearity: 0.25,
    });
  }, [bbox, map]);

  useEffect(() => {
    if (!evidence || !map || prevEvidenceRef.current === evidence) return;
    prevEvidenceRef.current = evidence;

    try {
      const geoJsonLayer = L.geoJSON(evidence);
      const evidenceBounds = geoJsonLayer.getBounds();

      if (evidenceBounds.isValid()) {
        const currentBounds = map.getBounds();
        if (!currentBounds.contains(evidenceBounds)) {
          map.flyToBounds(evidenceBounds, {
            duration: 0.8,
          });
        }
      }
    } catch (e) {
      console.warn("Could not calculate evidence bounds", e);
    }
  }, [evidence, map]);

  return null;
}

export const MapCanvas: React.FC = () => {
  const { bbox, evidence, activeLayers, layerOpacity, layerSources } = useAssetStore();

  // Compute center safely based on available bounding box arrays
  const initialCenter: [number, number] = bbox && bbox.length >= 4
    ? [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2]
    : [21.83, 88.22];

  return (
    <div
      id="satquery-map-container"
      className="relative w-full h-full min-h-[500px] overflow-hidden bg-slate-100 select-none"
    >
      <MapContainer
        center={initialCenter}
        zoom={11}
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ width: "100%", height: "100%", background: "#E2E8F0" }}
      >
        <MapViewController bbox={bbox} evidence={evidence} />

        {/* Optical Basemap */}
        <RasterLayer
          source={layerSources.optical}
          visible={activeLayers.optical}
          opacity={layerOpacity.optical}
          TileLayerComponent={TileLayer}
          ImageOverlayComponent={ImageOverlay}
        />

        {/* SAR Overlay */}
        <RasterLayer
          source={layerSources.sar}
          visible={activeLayers.sar}
          opacity={layerOpacity.sar}
          TileLayerComponent={TileLayer}
          ImageOverlayComponent={ImageOverlay}
        />

        {/* Spatial Evidence / AI Change Mask */}
        <EvidenceLayer GeoJSONComponent={GeoJSON} />
      </MapContainer>

      {/* Floating Layer Control */}
      <LayerControlGlass />

      {/* Upload Dropzone */}
      <UploadDropzone />

      {/* Coordinate Status Bar */}
      <div className="liquid-glass absolute bottom-3 right-3 z-[400] pointer-events-none hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-slate-200/80 text-[10px] font-mono text-slate-600 shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          CANVAS READY
        </span>
        <span className="text-slate-300">|</span>
        <span>EPSG:4326</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">
          {bbox && bbox.length >= 4
            ? `BBOX: [${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)}, ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}]`
            : "WORLD VIEW"}
        </span>
      </div>
    </div>
  );
};

export default MapCanvas;
