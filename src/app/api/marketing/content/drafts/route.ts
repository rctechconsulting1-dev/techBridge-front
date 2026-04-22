import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";
  const limit = searchParams.get("limit") || "20";

  const qs = new URLSearchParams({ limit });
  if (status) qs.set("status", status);

  try {
    const response = await fetch(`${getApiBaseUrl()}/marketing/content/drafts?${qs}`, {
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
    return NextResponse.json({ error: "Failed to fetch drafts" }, { status: 502 });
  }
}
