"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAssetStore } from "@/store/useAssetStore";
import { LayerControlGlass } from "@/components/map/LayerControlGlass";
import { RasterLayer } from "@/components/map/RasterLayer";
import { EvidenceLayer } from "@/components/map/EvidenceLayer";
import { UploadDropzone } from "@/components/ingestion/UploadDropzone";
import { MapTools } from "@/components/map/MapTools";
import { AssetInfoPanel } from "@/components/map/AssetInfoPanel";
import { EvidenceDetailPanel } from "@/components/map/EvidenceDetailPanel";
import { TemporalTimeline } from "@/components/map/TemporalTimeline";
import { CompareSlider } from "@/components/map/CompareSlider";
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
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);

// Map view controller & event hooks
import { useMap, useMapEvents } from "react-leaflet";

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

  const { mapFlyToBoundsTrigger, setMapFlyToBounds, isDrawingAoi, setDrawnAoi } = useAssetStore();

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

  // Handle explicit fly to bounds trigger (from Zoom to Feature, Fit Evidence, etc.)
  useEffect(() => {
    if (!mapFlyToBoundsTrigger || !map) return;
    const [minLon, minLat, maxLon, maxLat] = mapFlyToBoundsTrigger;
    const bounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);
    map.flyToBounds(bounds, {
      duration: 0.8,
      padding: [50, 50],
      easeLinearity: 0.25,
    });
    setMapFlyToBounds(null);
  }, [mapFlyToBoundsTrigger, map, setMapFlyToBounds]);

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

  // Handle measurement clicks on map
  useMapEvents({
    click(e) {
      const { measurement, setMeasurement } = useAssetStore.getState();
      if (isDrawingAoi) {
        const currentAoi = useAssetStore.getState().drawnAoi;
        const existingPoints = currentAoi?.coordinates[0]?.slice(0, -1) || [];
        const nextPoints = [...existingPoints, [e.latlng.lng, e.latlng.lat]];
        if (nextPoints.length >= 3) {
          nextPoints.push(nextPoints[0]);
        }
        setDrawnAoi({ type: "Polygon", coordinates: [nextPoints] });
        return;
      }
      if (measurement.active) {
        const newPoints = [
          ...measurement.points,
          [e.latlng.lat, e.latlng.lng] as [number, number],
        ];

        let dist = 0;
        for (let i = 1; i < newPoints.length; i++) {
          dist += L.latLng(newPoints[i - 1][0], newPoints[i - 1][1]).distanceTo(
            L.latLng(newPoints[i][0], newPoints[i][1])
          );
        }

        let area = 0;
        if (newPoints.length >= 3) {
          const R = 6378137;
          let total = 0;
          for (let i = 0; i < newPoints.length; i++) {
            const j = (i + 1) % newPoints.length;
            const p1 = newPoints[i];
            const p2 = newPoints[j];
            total +=
              (p2[1] - p1[1]) *
              (Math.PI / 180) *
              (2 +
                Math.sin(p1[0] * (Math.PI / 180)) +
                Math.sin(p2[0] * (Math.PI / 180)));
          }
          area = Math.abs((total * R * R) / 2);
        }

        setMeasurement({
          points: newPoints,
          totalDistanceMeters: Math.round(dist),
          totalAreaMeters2: Math.round(area),
        });
      }
    },
  });

  return null;
}

const MapCanvas: React.FC = () => {
  const {
    bbox,
    evidence,
    activeLayers,
    layerOpacity,
    layerSources,
    measurement,
    drawnAoi,
    isCompareMode,
    compareMode,
  } = useAssetStore();

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
      className="relative w-full h-full min-h-[500px] overflow-hidden bg-[#EFE8DE] select-none"
    >
      {/* Side-by-side mode layout vs standard single canvas layout */}
      {isCompareMode && compareMode === "side-by-side" ? (
        <div className="w-full h-full flex">
          {/* Left: Before Map */}
          <div className="w-1/2 h-full relative border-r-2 border-white/80">
            <div className="absolute top-4 left-4 z-[400] liquid-glass px-3 py-1 rounded-full text-xs font-semibold text-secondary shadow-xs">
              Before (2023 Baseline)
            </div>
            <MapContainer
              center={initialCenter}
              zoom={11}
              zoomControl={false}
              className="w-full h-full"
              style={{ width: "100%", height: "100%", background: "#EFE8DE" }}
            >
              <RasterLayer
                source={layerSources.optical}
                visible={true}
                opacity={1.0}
                TileLayerComponent={TileLayer}
                ImageOverlayComponent={ImageOverlay}
              />
            </MapContainer>
          </div>

          {/* Right: After Map */}
          <div className="w-1/2 h-full relative">
            <div className="absolute top-4 right-4 z-[400] liquid-glass px-3 py-1 rounded-full text-xs font-semibold text-accent shadow-xs">
              After (2026 Current)
            </div>
            <MapContainer
              center={initialCenter}
              zoom={11}
              zoomControl={false}
              className="w-full h-full"
              style={{ width: "100%", height: "100%", background: "#EFE8DE" }}
            >
              <RasterLayer
                source={layerSources.optical}
                visible={activeLayers.optical}
                opacity={layerOpacity.optical}
                TileLayerComponent={TileLayer}
                ImageOverlayComponent={ImageOverlay}
              />
              <RasterLayer
                source={layerSources.sar}
                visible={activeLayers.sar}
                opacity={layerOpacity.sar}
                TileLayerComponent={TileLayer}
                ImageOverlayComponent={ImageOverlay}
              />
              <EvidenceLayer GeoJSONComponent={GeoJSON} />
            </MapContainer>
          </div>
        </div>
      ) : (
        <MapContainer
          center={initialCenter}
          zoom={11}
          zoomControl={false}
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

          {/* Interactive Measurement Overlay */}
          {measurement.points.length >= 2 && (
            <Polyline
              positions={measurement.points}
              pathOptions={{ color: "#C86D3B", weight: 3, dashArray: "6, 4" }}
            />
          )}
          {measurement.points.length >= 3 && (
            <Polygon
              positions={measurement.points}
              pathOptions={{
                color: "#C86D3B",
                fillColor: "#C86D3B",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
          {measurement.points.map((pt, idx) => (
            <CircleMarker
              key={idx}
              center={pt}
              radius={5}
              pathOptions={{
                color: "#7F4B30",
                fillColor: "#FFFFFF",
                fillOpacity: 1,
                weight: 2,
              }}
            />
          ))}
          {drawnAoi && drawnAoi.coordinates[0].length >= 4 && (
            <Polygon
              positions={drawnAoi.coordinates[0].map(([longitude, latitude]) => [latitude, longitude] as [number, number])}
              pathOptions={{ color: "#2F8F5B", fillColor: "#2F8F5B", fillOpacity: 0.18, weight: 2 }}
            />
          )}
        </MapContainer>
      )}

      {/* Atmospheric perimeter vignette to feather map into warm dashboard in light mode; hidden in dark mode to keep satellite imagery punchy, clear, and natural */}
      <div className="pointer-events-none absolute inset-0 z-[300] bg-[radial-gradient(ellipse_at_center,_transparent_70%,_rgba(78,59,42,0.12)_100%)] dark:hidden" />

      {/* Map Tools (Measure, Draw, Fit AOI, Compare, Fit Evidence, Reset) */}
      <MapTools />

      {/* Asset Information Panel (top-left) */}
      <AssetInfoPanel />

      {/* Active Evidence Detail Panel (docked when feature is selected) */}
      <EvidenceDetailPanel />

      {/* Before / After Comparison Slider Overlay */}
      <CompareSlider />

      {/* Temporal Timeline (docked at bottom center) */}
      <TemporalTimeline />

      {/* Floating Layer Control (top-right glassmorphism widget) */}
      <LayerControlGlass />

      {/* Upload Dropzone (bottom-left) */}
      <UploadDropzone />

      {/* Subtle Coordinate / Instrument Status Bar */}
      <div className="liquid-glass absolute bottom-3 right-3 z-[400] pointer-events-none hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-white/60 dark:border-white/10 text-[10px] font-mono text-secondary shadow-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          CANVAS READY
        </span>
        <span className="text-stone-300 dark:text-stone-600">|</span>
        <span>EPSG:4326</span>
        <span className="text-stone-300 dark:text-stone-600">|</span>
        <span className="text-secondary/70 dark:text-stone-400">
          {bbox
            ? `BBOX: [${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)}, ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}]`
            : "WORLD VIEW"}
        </span>
      </div>
    </div>
  );
};

export default MapCanvas;
