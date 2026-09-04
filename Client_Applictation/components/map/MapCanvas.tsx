"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAssetStore } from "@/store/useAssetStore";
import { LayerControlGlass } from "@/components/map/LayerControlGlass";
import { RasterLayer } from "@/components/map/RasterLayer";
import { EvidenceLayer } from "@/components/map/EvidenceLayer";
import { UploadDropzone } from "@/components/ingestion/UploadDropzone";
import L from "leaflet";

// Dynamic imports of react-leaflet primitives (TRD §3)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);
const ImageOverlay = dynamic(
  () => import("react-leaflet").then((mod) => mod.ImageOverlay),
  { ssr: false }
);

// Map view controller hook & component
import { useMap } from "react-leaflet";

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

  // Handle bounding box updates (e.g. on new asset ingestion)
  useEffect(() => {
    if (!bbox || !map) return;
    const bboxKey = bbox.join(",");
    if (prevBboxRef.current === bboxKey) return;
    prevBboxRef.current = bboxKey;

    // bbox is [minLon, minLat, maxLon, maxLat]
    const bounds = L.latLngBounds(
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]]
    );

    map.flyToBounds(bounds, {
      duration: 0.8,
      padding: [40, 40],
      easeLinearity: 0.25,
    });
  }, [bbox, map]);

  // Handle evidence bounds updates (fit bounds IF outside current viewport)
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
            padding: [60, 60],
          });
        }
      }
    } catch (e) {
      console.warn("Could not calculate evidence bounds", e);
    }
  }, [evidence, map]);

  return null;
}

const MapCanvas: React.FC = () => {
  const { bbox, evidence, activeLayers, layerOpacity, layerSources } = useAssetStore();

  useEffect(() => {
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    } catch (err) {
      // Non-browser fallback
    }
  }, []);

  const initialCenter: [number, number] = bbox
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

      {/* Floating Layer Control (top-right glassmorphism widget) */}
      <LayerControlGlass />

      {/* Upload Dropzone (bottom-left) */}
      <UploadDropzone />

      {/* Subtle Coordinate / Instrument Status Bar */}
      <div className="liquid-glass absolute bottom-3 right-3 z-[400] pointer-events-none hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-slate-200/80 text-[10px] font-mono text-slate-600 shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          CANVAS READY
        </span>
        <span className="text-slate-300">|</span>
        <span>EPSG:4326</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">
          {bbox
            ? `BBOX: [${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)}, ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}]`
            : "WORLD VIEW"}
        </span>
      </div>
    </div>
  );
};

export default MapCanvas;
