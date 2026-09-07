export interface AuditModelRecord {
  name: string;
  version: string;
  duration_ms: number;
}

export interface AuditRecord {
  models: AuditModelRecord[];
  metrics: Record<string, number | string>;
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
}

export interface ChatResponse {
  message_id: string;
  text: string;
  evidence?: GeoJSON.FeatureCollection;
  audit?: AuditRecord;
}
