import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken) {
    return NextResponse.json({ detail: "Authentication is required." }, { status: 401 });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { detail: "Account deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the frontend server environment." },
      { status: 503 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ detail: "Your session is invalid or expired." }, { status: 401 });
  }

  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
