import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "SatQuery AI Frontend Canvas",
    version: "1.0.0",
    sih_problem_id: "SIH 26167",
    timestamp: new Date().toISOString(),
    telemetry: {
      geospatial_projection: "EPSG:4326",
      default_aoi: "Sundarbans_2026Q1",
      supported_formats: [".tif", ".tiff", "COG"],
    },
  });
}
