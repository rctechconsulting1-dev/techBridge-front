import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
}

export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/plans`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: "Failed to load plans" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Plans service unavailable" },
      { status: 503 },
    );
  }
}
