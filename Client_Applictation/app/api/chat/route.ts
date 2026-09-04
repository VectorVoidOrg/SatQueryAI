import { NextResponse } from "next/server";
import { sendChatQuery } from "@/lib/api/middlewareClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, asset_id, message, map_context } = body;

    if (!message) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Message string is required." } },
        { status: 400 }
      );
    }

    const result = await sendChatQuery({
      session_id: session_id || `sess_${Date.now()}`,
      asset_id: asset_id || "ast_sundarbans_2026q1",
      message,
      map_context,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err.message || "Failed to process chat query." } },
      { status: 500 }
    );
  }
}
