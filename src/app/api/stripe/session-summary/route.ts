import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api"
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const session_id = request.nextUrl.searchParams.get("session_id");
  const website_id = request.nextUrl.searchParams.get("website_id");

  if (!session_id || !website_id) {
    return NextResponse.json(
      { error: "Missing session_id or website_id" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/stripe/connect/session-summary?session_id=${encodeURIComponent(session_id)}&website_id=${encodeURIComponent(website_id)}`,
      { cache: "no-store" },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend" },
      { status: 502 },
    );
  }
}
