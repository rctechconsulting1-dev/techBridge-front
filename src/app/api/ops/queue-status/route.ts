import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS_DASHBOARD_ADMIN_KEY = process.env.OPS_DASHBOARD_ADMIN_KEY || "";
const OPS_INGEST_KEY = process.env.OPS_METRICS_INGEST_KEY || "";

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

  if (!OPS_INGEST_KEY) {
    return NextResponse.json(
      { queue: { depth: 0, byStatus: {} }, dlq: { size: 0 }, recentFailed: [] },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/ops/queue-status`, {
      headers: { "x-ops-ingest-key": OPS_INGEST_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { queue: { depth: 0, byStatus: {} }, dlq: { size: 0 }, recentFailed: [] },
        { status: 200 },
      );
    }

    return NextResponse.json(await res.json(), { status: 200 });
  } catch {
    return NextResponse.json(
      { queue: { depth: 0, byStatus: {} }, dlq: { size: 0 }, recentFailed: [] },
      { status: 200 },
    );
  }
}
