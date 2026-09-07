import { create } from "zustand";
import { LayerSource } from "@/lib/types/geo";

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

  setAsset: (payload: {
    assetId: string;
    assetName?: string;
    bbox: [number, number, number, number];
    sources?: {
      optical?: LayerSource;
      sar?: LayerSource;
      aiChangeMask?: { type: "geojson"; data?: GeoJSON.FeatureCollection };
    };
  }) => void;
  toggleLayer: (layer: keyof AssetState["activeLayers"]) => void;
  setLayerOpacity: (layer: keyof AssetState["layerOpacity"], opacity: number) => void;
  setEvidence: (geojson: GeoJSON.FeatureCollection | null, turnId?: string) => void;
  clearEvidence: () => void;
}

// Initial realistic AOI: Sundarbans Delta mangrove / river delta region
const initialBbox: [number, number, number, number] = [88.021, 21.678, 88.412, 21.983];

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
      // High-res satellite / terrain map tiles
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    },
    sar: {
      type: "tile",
      // Radar / Grayscale shaded tiles
      url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    },
  },
  evidence: null,
  evidenceTurnId: null,

  setAsset: (payload) =>
    set((state) => ({
      assetId: payload.assetId,
      assetName: payload.assetName || `Asset_${payload.assetId.slice(0, 8)}`,
      bbox: payload.bbox,
      layerSources: {
        ...state.layerSources,
        ...(payload.sources || {}),
      },
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
    set(() => ({
      evidence: geojson,
      evidenceTurnId: turnId || `turn_${Date.now()}`,
      activeLayers: {
        optical: true,
        sar: false,
        aiChangeMask: true,
      },
    })),

  clearEvidence: () =>
    set(() => ({
      evidence: null,
      evidenceTurnId: null,
    })),
}));
