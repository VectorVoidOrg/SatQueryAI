export const APP_CONFIG = {
  middlewareUrl: process.env.NEXT_PUBLIC_MIDDLEWARE_URL || "",
  fastApiIngestUrl: process.env.NEXT_PUBLIC_FASTAPI_INGEST_URL || "",
  defaultAoiName: "Sundarbans_2026Q1",
  defaultBbox: [88.021, 21.678, 88.412, 21.983] as [number, number, number, number],
  defaultAssetId: "ast_sundarbans_demo",
};
