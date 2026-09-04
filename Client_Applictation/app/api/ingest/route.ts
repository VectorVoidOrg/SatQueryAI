import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: "INVALID_FILE", message: "No file provided in multipart request." } },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "tif" && extension !== "tiff") {
      return NextResponse.json(
        { error: { code: "INVALID_FILE_TYPE", message: "Only .tif and .tiff satellite files are supported." } },
        { status: 400 }
      );
    }

    const rawName = file.name.replace(/\.[^/.]+$/, "");
    const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const assetId = `ast_${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.json({
      asset_id: assetId,
      name: cleanName,
      status: "ready",
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
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "PROCESSING_FAILED", message: err.message || "Failed to process GeoTIFF ingestion." } },
      { status: 500 }
    );
  }
}
