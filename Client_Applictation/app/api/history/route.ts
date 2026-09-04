import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    sessions: [
      {
        id: "c_sundarbans_demo",
        title: "Sundarbans Riverbank Coastal Erosion",
        assetName: "Sundarbans_2026Q1",
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
  });
}
