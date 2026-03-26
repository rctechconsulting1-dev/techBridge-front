import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const parseConnectStatus = (raw: Record<string, unknown>) => {
  const accountId =
    typeof raw.accountId === "string"
      ? raw.accountId
      : typeof raw.stripeConnectedAccountId === "string"
        ? raw.stripeConnectedAccountId
        : typeof raw.stripe_connected_account_id === "string"
          ? raw.stripe_connected_account_id
          : null;

  const chargesEnabled =
    typeof raw.chargesEnabled === "boolean"
      ? raw.chargesEnabled
      : typeof raw.charges_enabled === "boolean"
        ? raw.charges_enabled
        : false;

  const payoutsEnabled =
    typeof raw.payoutsEnabled === "boolean"
      ? raw.payoutsEnabled
      : typeof raw.payouts_enabled === "boolean"
        ? raw.payouts_enabled
        : false;

  const onboardingComplete =
    typeof raw.onboardingComplete === "boolean"
      ? raw.onboardingComplete
      : typeof raw.onboarding_complete === "boolean"
        ? raw.onboarding_complete
        : chargesEnabled && payoutsEnabled;

  return {
    connected: Boolean(accountId),
    accountId,
    chargesEnabled,
    payoutsEnabled,
    onboardingComplete,
    raw,
  };
};

export async function GET(req: NextRequest) {
  const websiteId = req.nextUrl.searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 },
    );
  }

  const apiBase = getBackendApiBase();
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");

  const candidates = [
    `${apiBase}/stripe/connect/status?website_id=${encodeURIComponent(websiteId)}`,
    `${apiBase}/stripe/connect/status?websiteId=${encodeURIComponent(websiteId)}`,
    `${apiBase}/stripe/status?website_id=${encodeURIComponent(websiteId)}`,
    `${apiBase}/stripe/context?website_id=${encodeURIComponent(websiteId)}`,
  ];

  const result = await fetchFirstSuccessfulCandidate({
    candidates,
    makeRequest: (url) =>
      fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
        },
      }),
    passthroughStatuses: new Set([400, 401, 402, 403, 409, 429]),
  });

  if (result.kind === "passthrough") {
    return result.response;
  }

  if (result.kind === "success") {
    const raw = (await result.response.json()) as Record<string, unknown>;
    return NextResponse.json(parseConnectStatus(raw));
  }

  return NextResponse.json(
    {
      available: false,
      error:
        "No Stripe Connect status endpoint is available in the backend yet.",
      connected: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      onboardingComplete: false,
    },
    { status: 200 },
  );
}
