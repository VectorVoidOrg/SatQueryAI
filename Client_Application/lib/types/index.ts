export type RenderMode = 
  | "SINGLE_OVERLAY" 
  | "SPLIT_SCREEN_SLIDER" 
  | "HEATMAP_GRADING" 
  | "INSUFFICIENT_DATA_PROMPT";

export type DomainType = 
  | "agricultural_monitoring"
  | "disaster_management"
  | "urban_planning"
  | "forest_monitoring"
  | "water_resource_assessment"
  | "infrastructure_mapping"
  | "environmental_analysis";

export interface TelemetryData {
  device_used: string;
  model_architecture: string;
  resolution_m: number;
  inference_time_ms: number;
  bands_processed: string[];
}

export interface TaskMetadata {
  detected_intent: string;
  domain: DomainType;
  render_mode: RenderMode;
  confidence_score: number;
}

export interface ContentData {
  text_response: string;
  primary_overlay_url: string;
  secondary_overlay_url?: string | null;
  geojson_polygons?: Record<string, any> | null;
}

export interface AdaptivePayload {
  task_metadata: TaskMetadata;
  content: ContentData;
  execution_trace: TelemetryData;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  sessionId?: string;
}

export interface HistorySession {
  id: string;
  title: string;
  domain: DomainType;
  updatedAt: string;
}