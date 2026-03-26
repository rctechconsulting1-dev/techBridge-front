import { NextRequest, NextResponse } from "next/server";
import { getPersistentReliabilitySnapshot } from "@/lib/opsMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS_DASHBOARD_ADMIN_KEY = process.env.OPS_DASHBOARD_ADMIN_KEY || "";

const isAuthorized = (req: NextRequest): boolean => {
  if (!OPS_DASHBOARD_ADMIN_KEY) {
    return true;
  }

  return req.headers.get("x-ops-admin-key") === OPS_DASHBOARD_ADMIN_KEY;
};

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const windowMinutes = Number(req.nextUrl.searchParams.get("windowMinutes") || 60);
  const websiteId = req.nextUrl.searchParams.get("websiteId") || undefined;
  const tenantId = req.nextUrl.searchParams.get("tenantId") || undefined;
  const eventLimit = Number(req.nextUrl.searchParams.get("eventLimit") || 100);

  const snapshot = await getPersistentReliabilitySnapshot({
    windowMinutes,
    websiteId,
    tenantId,
    eventLimit,
  });

  return NextResponse.json(snapshot, { status: 200 });
}
