import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: number | string;
    sendingDomain?: string;
  };

  const websiteId = body.websiteId ? String(body.websiteId) : "";
  if (!websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const apiBase = getBackendApiBase();

  const payload = {
    website_id: Number.isNaN(Number(websiteId)) ? websiteId : Number(websiteId),
    websiteId,
    sending_domain: body.sendingDomain?.trim() || null,
  };

  const candidates = [
    `${apiBase}/email/profile/verify`,
    `${apiBase}/email/sender-profile/verify`,
    `${apiBase}/tenant-email/profile/verify`,
  ];

  const result = await fetchFirstSuccessfulCandidate({
    candidates,
    makeRequest: (url) =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
        },
        body: JSON.stringify(payload),
      }),
    passthroughStatuses: new Set([400, 401, 402, 403, 409, 429]),
  });

  if (result.kind === "passthrough") {
    return result.response;
  }

  if (result.kind === "success") {
    const data = await result.response.json().catch(() => ({}));
    return NextResponse.json(data);
  }

  return NextResponse.json(
    {
      error: "No SPF/DKIM verification endpoint is available in the backend yet.",
    },
    { status: 404 },
  );
}
