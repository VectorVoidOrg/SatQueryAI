import { AnalysisStep } from "@/lib/types/chat";

/**
 * The 7 canonical satellite analysis steps for Aceternity Multi-Step Loader
 */
export const SATELLITE_ANALYSIS_STEPS = [
  { text: "Preparing satellite imagery" },
  { text: "Validating asset" },
  { text: "Loading AOI" },
  { text: "Optical analysis" },
  { text: "SAR analysis" },
  { text: "Change detection" },
  { text: "Generating spatial evidence" },
] as const;

export type BackendAnalysisStatus =
  | "preparing"
  | "queued"
  | "validating"
  | "ingesting"
  | "loading_aoi"
  | "processing_optical"
  | "processing_sar"
  | "detecting_change"
  | "generating_evidence"
  | "complete"
  | "error";

/**
 * Explicit mapping between backend pipeline statuses and Multi-Step Loader step indices
 */
export const STATUS_TO_STEP_INDEX: Record<string, number> = {
  preparing: 0,
  queued: 0,
  validating: 1,
  ingesting: 2,
  loading_aoi: 2,
  processing_optical: 3,
  processing_sar: 4,
  detecting_change: 5,
  generating_evidence: 6,
  complete: 6,
};

/**
 * Maps a backend status string (e.g. "validating", "processing_optical") to loader step index (0-6)
 */
export function mapBackendStatusToStepIndex(status?: string | null): number {
  if (!status) return 0;
  const normalized = status.toLowerCase().trim();
  if (normalized in STATUS_TO_STEP_INDEX) {
    return STATUS_TO_STEP_INDEX[normalized];
  }
  return 0;
}

/**
 * Adapter that resolves the current loader step index from backendStatus, activeStepIndex, or pipelineSteps.
 * Allows seamless consumption of both current Zustand store progress and future backend streamed statuses.
 */
export function resolveAnalysisStep(params: {
  backendStatus?: string;
  activeStepIndex?: number;
  steps?: AnalysisStep[];
}): number {
  if (params.backendStatus) {
    return mapBackendStatusToStepIndex(params.backendStatus);
  }

  if (typeof params.activeStepIndex === "number") {
    return Math.max(0, Math.min(params.activeStepIndex, SATELLITE_ANALYSIS_STEPS.length - 1));
  }

  if (params.steps && params.steps.length > 0) {
    const runningIdx = params.steps.findIndex((s) => s.status === "running");
    if (runningIdx !== -1) {
      return Math.max(0, Math.min(runningIdx, SATELLITE_ANALYSIS_STEPS.length - 1));
    }
    const completeCount = params.steps.filter((s) => s.status === "complete").length;
    return Math.max(0, Math.min(completeCount, SATELLITE_ANALYSIS_STEPS.length - 1));
  }

  return 0;
}

/**
 * Initial 7-step analysis pipeline used by Zustand store
 */
export const DEFAULT_SATELLITE_PIPELINE_STEPS: AnalysisStep[] = [
  { id: "step_prepare", label: "Preparing satellite imagery", status: "running", detail: "Initializing telemetry & sensor headers" },
  { id: "step_asset", label: "Validating asset", status: "pending", detail: "Checking multi-band GeoTIFF headers & CRS" },
  { id: "step_aoi", label: "Loading AOI", status: "pending", detail: "Delineating bounding coordinates & pyramid tiles" },
  { id: "step_optical", label: "Optical analysis", status: "pending", detail: "Calibrating RGB/NIR surface reflectance" },
  { id: "step_sar", label: "SAR analysis", status: "pending", detail: "Computing dual-pol backscatter coherence" },
  { id: "step_change", label: "Change detection", status: "pending", detail: "Isolating biophysical retreat & structural shifts" },
  { id: "step_evidence", label: "Generating spatial evidence", status: "pending", detail: "Synthesizing vector boundaries & audit metrics" },
];

/**
 * Robust, result-driven determination of whether a query result requires spatial map visualization.
 * Evaluates explicit flags, spatial vector/raster outputs, and GeoJSON evidence features.
 * NEVER relies on superficial prompt keyword matching.
 */
export function isSpatialResponse(responseOrMsg?: {
  evidence?: GeoJSON.FeatureCollection | null;
  evidenceData?: GeoJSON.FeatureCollection | null;
  requiresMap?: boolean;
  spatialOutput?: any;
  mapData?: any;
}): boolean {
  if (!responseOrMsg) return false;

  // 1. Explicit flag provided by backend or response contract takes precedence
  if (typeof responseOrMsg.requiresMap === "boolean") {
    return responseOrMsg.requiresMap;
  }

  // 2. Specialized spatial vector/raster outputs
  if (responseOrMsg.spatialOutput || responseOrMsg.mapData) {
    return true;
  }

  // 3. Structured GeoJSON evidence with non-empty features
  const geojson = responseOrMsg.evidenceData || responseOrMsg.evidence;
  if (
    geojson &&
    geojson.type === "FeatureCollection" &&
    Array.isArray(geojson.features) &&
    geojson.features.length > 0
  ) {
    return true;
  }

  return false;
}
