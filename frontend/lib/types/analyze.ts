// frontend/lib/types/analyze.ts
// Exact TypeScript interfaces matching the backend POST /analyze 200 response.
// These are derived directly from backend/app.py — do not add fields that
// aren't in the backend contract.

// ---- Input metadata --------------------------------------------------------

export interface InputRecord {
  filename: string;
  modality: "optical" | "multispectral" | "sar";
  timestamp: string | null;
}

// ---- Visual evidence -------------------------------------------------------

export type ModelAgreement = {
  agree: true | false | null;
  parsed_polarity: string;
  overlay_shows_change: boolean;
  parse_basis: string;
  note: string;
} | null;

export interface EvidenceRegion {
  bbox_pixels: [number, number, number, number]; // [x1, y1, x2, y2]
  area_pixels: number;
  fill_fraction: number;
  share_of_all_change: number;
}

export interface VisualEvidence {
  status: string;
  source: string;
  is_model_prediction: boolean;
  georeferenced: boolean;
  coordinate_space?: string;
  changed_pixel_fraction?: number;
  region_count?: number;
  regions?: EvidenceRegion[];
  overlay_png_base64?: string;
  geojson?: object;
  caveats?: string[];
  model_agreement?: ModelAgreement;
  reason?: string; // present when status === "not_applicable" or "failed"
}

// ---- Execution trace -------------------------------------------------------

export interface TraceStep {
  tool: string;
  [key: string]: unknown; // extra fields vary per step
}

// ---- Report links ----------------------------------------------------------

export interface ReportLinks {
  report_id: string;
  view_url: string;      // /report/{id}?download=0  (inline HTML)
  download_url: string;  // /report/{id}             (download HTML)
  json_url: string;      // /report/{id}?format=json
}

// ---- Top-level response ----------------------------------------------------

export interface AnalyzeResponse {
  task_intent: string;
  query: string;
  answer: string;
  confidence: number;
  confidence_source: string;
  duration_seconds: number;
  inputs: InputRecord[];
  visual_evidence: VisualEvidence | null;
  auditable_execution_trace: TraceStep[];
  report: ReportLinks;
  debug_fixture?: boolean;
  structured_debug_output?: Record<string, unknown>;
}

// ---- 400 refusal shape -----------------------------------------------------

export interface BackendRefusal {
  detail: string;
}

// ---- Upload form fields (sent to /api/analyze proxy) -----------------------

export type Modality = "optical" | "multispectral" | "sar";

export interface ImageSlot {
  file: File;
  modality: Modality;
  timestamp: string; // "YYYY-MM-DD" or ""
}

export interface AnalyzeFormValues {
  images: ImageSlot[];  // 1 or 2
  query: string;
  bands?: string;       // default "1,2,3"
  dataset?: string;     // default "operational"
  conversationId?: string;
  conversationContext?: Array<{
    query: string;
    answer: string;
  }>;
}
