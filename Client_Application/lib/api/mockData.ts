export interface MockAnalysisMetric {
  label: string;
  value: string;
  change?: string;
}

export interface MockAnalysisResult {
  title: string;
  timestamp: string;
  filename: string;
  aoi: string;
  bbox: [number, number, number, number];
  summary: string;
  insights: string[];
  metrics: MockAnalysisMetric[];
}

export function generateMockPayload(
  prompt?: string,
  fileOrSeed?: string | number
): MockAnalysisResult {
  const fileName =
    typeof fileOrSeed === "string" && fileOrSeed.trim().length > 0
      ? fileOrSeed
      : "sundarbans_delta_rgb_sar.tif";

  const userPrompt = prompt || "Sundarbans Multispectral Baseline Analysis";

  return {
    title: userPrompt,
    timestamp: new Date().toISOString(),
    filename: fileName,
    aoi: "Sundarbans_2026Q1",
    bbox: [88.021, 21.678, 88.412, 21.983],
    summary: `Automated satellite imagery evaluation processed for query: "${userPrompt}".`,
    insights: [
      "Water index (NDWI) indicates 14.2% surface water expansion relative to Q4 baseline.",
      "Dense mangrove canopy shows strong NIR reflectance with minimal degradation.",
      "SAR coherence highlights high structural stability across central tidal channels.",
      "Localized inundation flagged in low-lying coastal zones.",
    ],
    metrics: [
      { label: "Canopy Density (NDVI)", value: "0.78", change: "+2.4%" },
      { label: "Water Surface Index (NDWI)", value: "0.42", change: "+14.2%" },
      { label: "SAR Backscatter", value: "-12.8 dB", change: "Stable" },
    ],
  };
}