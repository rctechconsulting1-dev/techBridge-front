import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const dateRange = req.nextUrl.searchParams.get("dateRange") || "LAST_30_DAYS";
  const dimensions = req.nextUrl.searchParams.get("dimensions") || "query";

  const url = `${getApiBaseUrl()}/marketing/search-console?dateRange=${encodeURIComponent(dateRange)}&dimensions=${encodeURIComponent(dimensions)}`;

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
    return NextResponse.json({ error: "Failed to fetch Search Console data" }, { status: 502 });
  }
}
