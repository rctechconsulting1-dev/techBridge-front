import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: number | string;
    domainId?: number | string;
    domain?: string;
  };

  const websiteId = body.websiteId ? String(body.websiteId) : "";
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const apiBase = getBackendApiBase();

  const payload = {
    website_id: Number.isNaN(Number(websiteId)) ? websiteId : Number(websiteId),
    websiteId,
    ...(body.domainId ? { domain_id: body.domainId, domainId: body.domainId } : {}),
    ...(body.domain ? { domain: body.domain } : {}),
  };

  const candidates = [
    `${apiBase}/domains/verify`,
    `${apiBase}/tenant-domains/verify`,
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
  });

  if (result.kind === "passthrough") {
    return result.response;
  }

  if (result.kind === "success") {
    const data = await result.response.json().catch(() => ({}));
    return NextResponse.json(data);
  }

  return NextResponse.json(
    { error: "No domain verification endpoint is available in the backend yet." },
    { status: 404 },
  );
}
