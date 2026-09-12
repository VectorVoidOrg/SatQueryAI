import { create } from "zustand";
import {
  LayerSource,
  AssetMetadata,
  ImageryTimelineItem,
  MeasurementState,
} from "@/lib/types/geo";

export interface AssetState {
  assetId: string | null;
  assetName: string;
  bbox: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]
  activeLayers: {
    optical: boolean;
    sar: boolean;
    aiChangeMask: boolean;
  };
  layerOpacity: {
    optical: number;
    sar: number;
    aiChangeMask: number;
  };
  layerSources: {
    optical?: LayerSource;
    sar?: LayerSource;
    aiChangeMask?: {
      type: "geojson";
      data?: GeoJSON.FeatureCollection;
    };
  };
  evidence: GeoJSON.FeatureCollection | null;
  evidenceTurnId: string | null;

  // Asset Metadata (Priority 3)
  metadata?: AssetMetadata;

  // Imagery Timeline (Priority 6)
  timeline: ImageryTimelineItem[];
  selectedTimelineId: string;

  // Before / After Comparison (Priority 5)
  isCompareMode: boolean;
  compareMode: "slider" | "side-by-side";
  compareSliderPosition: number; // 0 to 100
  beforeDate: string;
  afterDate: string;

  // Selected Evidence Feature (Priority 4)
  selectedFeature: GeoJSON.Feature | null;
  selectedEvidenceForReport: GeoJSON.Feature[];

  // Spatial Map Visibility (Conditional Map Requirement)
  requiresSpatialView: boolean;
  setRequiresSpatialView: (val: boolean) => void;

  // Map Navigation and Measurement State (Priority 7)
  mapFlyToBoundsTrigger: [number, number, number, number] | null;
  measurement: MeasurementState;
  drawnAoi: GeoJSON.Polygon | null;
  isDrawingAoi: boolean;
  setDrawingAoi: (active: boolean) => void;

  // Actions
  setAsset: (payload: {
    assetId: string;
    assetName?: string;
    bbox: [number, number, number, number];
    sources?: {
      optical?: LayerSource;
      sar?: LayerSource;
      aiChangeMask?: { type: "geojson"; data?: GeoJSON.FeatureCollection };
    };
    metadata?: AssetMetadata;
  }) => void;
  toggleLayer: (layer: keyof AssetState["activeLayers"]) => void;
  setLayerOpacity: (layer: keyof AssetState["layerOpacity"], opacity: number) => void;
  setEvidence: (geojson: GeoJSON.FeatureCollection | null, turnId?: string) => void;
  clearEvidence: () => void;

  setMetadata: (meta: Partial<AssetMetadata>) => void;
  setTimeline: (items: ImageryTimelineItem[]) => void;
  selectTimelineDate: (id: string) => void;

  setCompareMode: (enabled: boolean) => void;
  setCompareSliderPosition: (position: number) => void;
  setCompareModeType: (mode: "slider" | "side-by-side") => void;

  setSelectedFeature: (feature: GeoJSON.Feature | null) => void;
  addEvidenceToReport: (feature: GeoJSON.Feature) => void;
  setMapFlyToBounds: (bounds: [number, number, number, number] | null) => void;

  setMeasurement: (update: Partial<MeasurementState>) => void;
  clearMeasurement: () => void;
  setDrawnAoi: (geometry: GeoJSON.Polygon | null) => void;
}

// Initial realistic AOI: Sundarbans Delta mangrove / river delta region
const initialBbox: [number, number, number, number] = [88.021, 21.678, 88.412, 21.983];

const DEFAULT_TIMELINE: ImageryTimelineItem[] = [
  {
    id: "tl_2023",
    date: "2023-04-12",
    label: "2023 Baseline",
    sensor: "Sentinel-2A (MSI)",
    resolution: "10m",
    cloudCover: 1.2,
    layerSources: {
      optical: {
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      },
    },
  },
  {
    id: "tl_2024",
    date: "2024-05-18",
    label: "2024 Post-Monsoon",
    sensor: "Sentinel-2B (MSI)",
    resolution: "10m",
    cloudCover: 3.4,
    layerSources: {
      optical: {
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      },
    },
  },
  {
    id: "tl_2025",
    date: "2025-09-02",
    label: "2025 Pre-Cyclone",
    sensor: "Sentinel-1A + 2A Fusion",
    resolution: "10m",
    cloudCover: 2.1,
    layerSources: {
      optical: {
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      },
    },
  },
  {
    id: "tl_2026",
    date: "2026-02-14",
    label: "2026 Q1 Current",
    sensor: "Sentinel-1A (C-SAR) + Sentinel-2B",
    resolution: "10m",
    cloudCover: 0.8,
    layerSources: {
      optical: {
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      },
      sar: {
        type: "tile",
        url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
      },
    },
  },
];

export const useAssetStore = create<AssetState>((set) => ({
  assetId: "ast_sundarbans_2026q1",
  assetName: "Sundarbans_2026Q1",
  bbox: initialBbox,
  activeLayers: {
    optical: true,
    sar: false,
    aiChangeMask: true,
  },
  layerOpacity: {
    optical: 1.0,
    sar: 0.85,
    aiChangeMask: 0.75,
  },
  layerSources: {
    optical: {
      type: "tile",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    },
    sar: {
      type: "tile",
      url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    },
  },
  evidence: null,
  evidenceTurnId: null,

  metadata: {
    acquisitionDate: "2026-02-14",
    sensor: "Sentinel-1A (C-SAR) + Sentinel-2B (MSI)",
    resolution: "10m / px",
    bands: ["B02 (Blue)", "B03 (Green)", "B04 (Red)", "B08 (NIR)", "VV", "VH"],
    crs: "EPSG:4326 (WGS 84)",
    cloudCover: 0.8,
    fileSize: 428000000,
  },

  timeline: DEFAULT_TIMELINE,
  selectedTimelineId: "tl_2026",

  isCompareMode: false,
  compareMode: "slider",
  compareSliderPosition: 50,
  beforeDate: "2023 Baseline",
  afterDate: "2026 Q1 Current",

  selectedFeature: null,
  selectedEvidenceForReport: [],
  mapFlyToBoundsTrigger: null,

  measurement: {
    active: false,
    mode: null,
    points: [],
    totalDistanceMeters: 0,
    totalAreaMeters2: 0,
  },
  drawnAoi: null,
  isDrawingAoi: false,
  requiresSpatialView: false,

  setRequiresSpatialView: (val) => set({ requiresSpatialView: val }),
  setDrawingAoi: (active) => set({ isDrawingAoi: active }),

  setAsset: (payload) =>
    set((state) => ({
      assetId: payload.assetId,
      assetName: payload.assetName || `Asset_${payload.assetId.slice(0, 8)}`,
      bbox: payload.bbox,
      layerSources: {
        ...state.layerSources,
        ...(payload.sources || {}),
      },
      metadata: payload.metadata || state.metadata,
      activeLayers: {
        ...state.activeLayers,
        optical: true,
      },
    })),

  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: !state.activeLayers[layer],
      },
    })),

  setLayerOpacity: (layer, opacity) =>
    set((state) => ({
      layerOpacity: {
        ...state.layerOpacity,
        [layer]: opacity,
      },
    })),

  setEvidence: (geojson, turnId) =>
    set(() => {
      const hasSpatialFeatures = !!(
        geojson &&
        geojson.type === "FeatureCollection" &&
        Array.isArray(geojson.features) &&
        geojson.features.length > 0
      );
      return {
        evidence: geojson,
        evidenceTurnId: turnId || `turn_${Date.now()}`,
        requiresSpatialView: hasSpatialFeatures,
        activeLayers: {
          optical: true,
          sar: false,
          aiChangeMask: true,
        },
      };
    }),

  clearEvidence: () =>
    set(() => ({
      evidence: null,
      evidenceTurnId: null,
      selectedFeature: null,
      requiresSpatialView: false,
    })),

  setMetadata: (meta) =>
    set((state) => ({
      metadata: { ...(state.metadata || {}), ...meta },
    })),

  setTimeline: (items) => set({ timeline: items }),

  selectTimelineDate: (id) =>
    set((state) => {
      const item = state.timeline.find((t) => t.id === id);
      if (!item) return state;
      return {
        selectedTimelineId: id,
        metadata: {
          ...state.metadata,
          acquisitionDate: item.date,
          sensor: item.sensor || state.metadata?.sensor,
          resolution: item.resolution || state.metadata?.resolution,
          cloudCover: item.cloudCover !== undefined ? item.cloudCover : state.metadata?.cloudCover,
        },
      };
    }),

  setCompareMode: (enabled) => set({ isCompareMode: enabled }),
  setCompareSliderPosition: (pos) => set({ compareSliderPosition: Math.max(0, Math.min(100, pos)) }),
  setCompareModeType: (mode) => set({ compareMode: mode }),

  setSelectedFeature: (feature) => set({ selectedFeature: feature }),

  addEvidenceToReport: (feature) =>
    set((state) => ({
      selectedEvidenceForReport: [...state.selectedEvidenceForReport, feature],
    })),

  setMapFlyToBounds: (bounds) => set({ mapFlyToBoundsTrigger: bounds }),

  setMeasurement: (update) =>
    set((state) => ({
      measurement: { ...state.measurement, ...update },
    })),

  clearMeasurement: () =>
    set({
      measurement: {
        active: false,
        mode: null,
        points: [],
        totalDistanceMeters: 0,
        totalAreaMeters2: 0,
      },
    }),

  setDrawnAoi: (geometry) => set({ drawnAoi: geometry }),
}));
