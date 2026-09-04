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
}
