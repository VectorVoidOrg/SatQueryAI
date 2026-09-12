export interface AuditModelRecord {
  name: string;
  version: string;
  duration_ms: number;
}

export interface AuditRecord {
  models: AuditModelRecord[];
  metrics: Record<string, number | string>;
}

export type AnalysisStepStatus = "pending" | "running" | "complete" | "error";

export interface AnalysisStep {
  id: string;
  label: string;
  status: AnalysisStepStatus;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  evidenceRef?: string;
  evidenceData?: GeoJSON.FeatureCollection;
  metrics?: AuditRecord;
  status: "pending" | "complete" | "error";
  createdAt: number;
  errorMessage?: string;
  pipelineSteps?: AnalysisStep[];
  activeStepIndex?: number;
  backendStatus?: string;
  requiresMap?: boolean;
}

export interface ChatResponse {
  message_id: string;
  text: string;
  evidence?: GeoJSON.FeatureCollection;
  audit?: AuditRecord;
  requiresMap?: boolean;
  spatialOutput?: any;
  mapData?: any;
}
