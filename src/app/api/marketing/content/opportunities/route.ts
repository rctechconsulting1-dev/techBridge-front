import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const { searchParams } = req.nextUrl;
  const dateRange = searchParams.get("dateRange") || "LAST_30_DAYS";
  const minImpressions = searchParams.get("minImpressions") || "10";
  const maxCtr = searchParams.get("maxCtr") || "0.10";

  const url = `${getApiBaseUrl()}/marketing/content/opportunities?dateRange=${encodeURIComponent(dateRange)}&minImpressions=${minImpressions}&maxCtr=${maxCtr}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 502 });
  }
}
