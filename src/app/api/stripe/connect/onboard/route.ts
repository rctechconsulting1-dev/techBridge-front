import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";
import { getApiBaseUrl, getAppBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () => getApiBaseUrl();

const getAppUrl = () => getAppBaseUrl();

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: number | string;
  };

  if (!body.websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 },
    );
  }

  const websiteId = String(body.websiteId);
  const apiBase = getBackendApiBase();
  const appUrl = getAppUrl();

  const refreshUrl = `${appUrl}/site-settings?stripe=refresh&websiteId=${encodeURIComponent(websiteId)}`;
  const returnUrl = `${appUrl}/site-settings?stripe=return&websiteId=${encodeURIComponent(websiteId)}`;

  const payload = {
    website_id: Number.isNaN(Number(websiteId)) ? websiteId : Number(websiteId),
    websiteId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    refreshUrl,
    returnUrl,
  };

  const candidates = [
    `${apiBase}/stripe/connect/onboard`,
    `${apiBase}/stripe/connect/link`,
    `${apiBase}/stripe/connect/account-link`,
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
    const data = (await result.response.json()) as Record<string, unknown>;
    const onboardingUrl =
      (typeof data.url === "string" && data.url) ||
      (typeof data.onboardingUrl === "string" && data.onboardingUrl) ||
      (typeof data.accountLinkUrl === "string" && data.accountLinkUrl) ||
      null;

    if (onboardingUrl) {
      return NextResponse.json({ url: onboardingUrl });
    }
  }

  return NextResponse.json(
    {
      error:
        "No Stripe Connect onboarding endpoint is available in the backend yet.",
    },
    { status: 404 },
  );
}
