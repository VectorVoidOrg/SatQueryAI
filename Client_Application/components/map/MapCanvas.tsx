"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAssetStore } from "@/store/useAssetStore";
import { LayerControlGlass } from "@/components/map/LayerControlGlass";
import { RasterLayer } from "@/components/map/RasterLayer";
import { EvidenceLayer } from "@/components/map/EvidenceLayer";
import { UploadDropzone } from "@/components/ingestion/UploadDropzone";
import L from "leaflet";
import { applyLeafletContainerPatch } from "@/lib/map/leafletPatch";

// Apply container cleanup patch immediately before react-leaflet instantiation
applyLeafletContainerPatch();

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

  // Handle auto-fit on new spatial evidence arrival (US-6)
  useEffect(() => {
    if (!evidence || !map || evidence.features.length === 0) return;
    if (prevEvidenceRef.current === evidence) return;
    prevEvidenceRef.current = evidence;

    try {
      const geoJsonLayer = L.geoJSON(evidence);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, {
          duration: 0.8,
          padding: [50, 50],
          maxZoom: 16,
        });
      }
    } catch {
      // Ignored if geometry bounds cannot be calculated
    }
  }, [evidence, map]);

  return null;
}

export const MapCanvas: React.FC = () => {
  const { bbox, layerSources, activeLayers, layerOpacity, evidence } = useAssetStore();

  // Fix Leaflet marker icon asset resolution paths in Next.js
  useEffect(() => {
    applyLeafletContainerPatch();
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    } catch {
      // safe fallback
    }
  }, []);

  // Center on bounding box or fallback to Sundarbans default
  const defaultCenter: [number, number] = bbox
    ? [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2]
    : [21.83, 88.22];

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden select-none bg-[#EFE8DE]">
      <MapContainer
        key={bbox ? `map-${bbox.join("-")}` : "map-default"}
        center={defaultCenter}
        zoom={11}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full z-0"
        style={{ width: "100%", height: "100%", background: "#EFE8DE" }}
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

      {/* Atmospheric perimeter vignette to feather map into warm dashboard */}
      <div className="pointer-events-none absolute inset-0 z-[300] bg-[radial-gradient(ellipse_at_center,_transparent_70%,_rgba(78,59,42,0.12)_100%)]" />

      {/* Floating Layer Control (top-right glassmorphism widget) */}
      <LayerControlGlass />

      {/* Upload Dropzone (bottom-left) */}
      <UploadDropzone />

      {/* Subtle Coordinate / Instrument Status Bar */}
      <div className="liquid-glass absolute bottom-3 right-3 z-[400] pointer-events-none hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-white/60 text-[10px] font-mono text-secondary shadow-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          CANVAS READY
        </span>
        <span className="text-stone-300">|</span>
        <span>EPSG:4326</span>
        <span className="text-stone-300">|</span>
        <span className="text-secondary/70">
          {bbox
            ? `BBOX: [${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)}, ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}]`
            : "WORLD VIEW"}
        </span>
      </div>
    </div>
  );
};

export default MapCanvas;
