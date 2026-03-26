import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const normalizeDomainInput = (domain: string): string =>
  domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\.$/, "");

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: number | string;
    domain?: string;
    isPrimary?: boolean;
  };

  const websiteId = body.websiteId ? String(body.websiteId) : "";
  const normalizedDomain = normalizeDomainInput(body.domain || "");

  if (!websiteId || !normalizedDomain) {
    return NextResponse.json(
      { error: "websiteId and domain are required" },
      { status: 400 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const apiBase = getBackendApiBase();
  const payload = {
    website_id: Number.isNaN(Number(websiteId)) ? websiteId : Number(websiteId),
    websiteId,
    domain: normalizedDomain,
    is_primary: Boolean(body.isPrimary),
    isPrimary: Boolean(body.isPrimary),
  };

  const candidates = [
    `${apiBase}/domains/onboard`,
    `${apiBase}/domains`,
    `${apiBase}/tenant-domains/onboard`,
    `${apiBase}/tenant-domains`,
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
    return NextResponse.json({ domain: normalizedDomain, ...data });
  }

  return NextResponse.json(
    {
      error: "No domain onboarding endpoint is available in the backend yet.",
    },
    { status: 404 },
  );
}
