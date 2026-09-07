import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, mode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Email and password are required." } },
        { status: 400 }
      );
    }

    const authUrl = process.env.AUTH_API_URL;
    if (authUrl) {
      const authResponse = await fetch(authUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, mode }),
      });

      return new NextResponse(await authResponse.arrayBuffer(), {
        status: authResponse.status,
        headers: {
          "content-type": authResponse.headers.get("content-type") || "application/json",
        },
      });
    }

    const displayName = name || email.split("@")[0] || "Researcher";
    return NextResponse.json({
      authenticated: true,
      token: `mock_token_${Date.now()}`,
      user: {
        name: displayName,
        email,
        role: "Geospatial Analyst",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return NextResponse.json(
      { error: { code: "AUTHENTICATION_FAILED", message } },
      { status: 500 }
    );
  }
}