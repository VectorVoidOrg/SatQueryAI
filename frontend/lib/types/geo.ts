export interface LayerSource {
  type: "tile" | "image";
  url: string;                          // tile template or single image URL
  bounds?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

export interface AssetIngestResponse {
  asset_id: string;
  status: "ready" | "processing" | "failed";
  bbox: [number, number, number, number];
  name?: string;
  layers?: {
    optical?: LayerSource;
    sar?: LayerSource;
    aiChangeMask?: {
      type: "geojson";
      data?: GeoJSON.FeatureCollection;
    };
  };
}

export interface MapContext {
  visible_bounds?: [number, number, number, number];
  active_layers?: string[];
  drawn_aoi?: GeoJSON.Polygon;
}

export interface AssetMetadata {
  acquisitionDate?: string;
  sensor?: string;
  resolution?: string | number;
  bands?: number | string[];
  crs?: string;
  cloudCover?: number;
  fileSize?: number;
}

export interface ImageryTimelineItem {
  id: string;
  date: string;
  label?: string;
  sensor?: string;
  resolution?: string | number;
  cloudCover?: number;
  layerSources?: {
    optical?: LayerSource;
    sar?: LayerSource;
  };
}

export interface MeasurementState {
  active: boolean;
  mode: "distance" | "area" | null;
  points: [number, number][]; // [lat, lng]
  totalDistanceMeters: number;
  totalAreaMeters2: number;
}

