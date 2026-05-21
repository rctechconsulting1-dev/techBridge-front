/**
 * Next.js proxy for the backend /api/business-profile route.
 *
 * GET  /api/business-profile?websiteId=N  — fetch current profile
 * PUT  /api/business-profile?websiteId=N  — upsert profile fields
 *
 * Auth and tenant headers are forwarded from the browser request so
 * the backend's authMiddleware + requireTenantMembership apply normally.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forwardHeaders = (req: NextRequest): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  const tenant = req.headers.get("x-tenant-id");
  if (tenant) headers["x-tenant-id"] = tenant;
  return headers;
};

export async function GET(req: NextRequest) {
  const websiteId = req.nextUrl.searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/business-profile/${encodeURIComponent(websiteId)}`,
      {
        method: "GET",
        headers: forwardHeaders(req),
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach backend." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const websiteId = req.nextUrl.searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/business-profile/${encodeURIComponent(websiteId)}`,
      {
        method: "PUT",
        headers: forwardHeaders(req),
        body: JSON.stringify(body),
      },
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach backend." }, { status: 502 });
  }
}
