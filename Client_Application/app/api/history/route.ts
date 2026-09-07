import { NextResponse } from "next/server";
import { HistorySession } from "@/lib/types";

export async function GET() {
  try {
    const mockSessions: HistorySession[] = [
      {
        id: "sess_101",
        title: "Crop Yield & Chlorophyll NDVI Check",
        domain: "agricultural_monitoring",
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: "sess_102",
        title: "Flood Basin Inundation Boundaries",
        domain: "disaster_management",
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        id: "sess_103",
        title: "Forest Canopy Cover Loss Analysis",
        domain: "forest_monitoring",
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return NextResponse.json({ success: true, data: mockSessions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}