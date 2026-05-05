import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");

  try {
    const response = await fetch(`${getApiBaseUrl()}/marketing/connections`, {
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
    return NextResponse.json({ error: "Failed to fetch marketing connections" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");

  try {
    const body = await req.json();
    const response = await fetch(`${getApiBaseUrl()}/marketing/connections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to save marketing connection" }, { status: 502 });
  }
}
