import { NextResponse } from "next/server";
import { sendChatQuery } from "@/lib/api/middlewareClient";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  return NextResponse.json({
    sessionId,
    status: "active",
    assetId: `ast_${sessionId}`,
    assetName: "Sundarbans_2026Q1",
    bbox: [88.021, 21.678, 88.412, 21.983],
    layers: {
      optical: {
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      },
      sar: {
        type: "tile",
        url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
      },
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await req.json();
    const { message, map_context } = body;

    if (!message) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Message string required." } },
        { status: 400 }
      );
    }

    const response = await sendChatQuery({
      session_id: sessionId,
      asset_id: `ast_${sessionId}`,
      message,
      map_context,
    });

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err.message || "Session update error." } },
      { status: 500 }
    );
  }
}
