import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";
import { getApiBaseUrl } from "@/lib/api";
import {
  findResendDomainByName,
  getResendDomain,
  verifyResendDomain,
} from "@/lib/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () => getApiBaseUrl();

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

  const sendingDomain = body.sendingDomain?.trim() || null;
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const apiBase = getBackendApiBase();

  const payload = {
    website_id: Number.isNaN(Number(websiteId)) ? websiteId : Number(websiteId),
    websiteId,
    sending_domain: sendingDomain,
  };

  // Try backend verification first
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

  // Backend verification not available — fall back to direct Resend API verification
  if (sendingDomain) {
    try {
      const existing = await findResendDomainByName(sendingDomain);
      if (existing.data) {
        await verifyResendDomain(existing.data.id);
        const updated = await getResendDomain(existing.data.id);
        const records = updated.data?.records || [];
        const spfRecord = records.find((r) => r.record === "SPF");
        const dkimRecords = records.filter((r) => r.record === "DKIM");
        const spfVerified = spfRecord?.status === "verified";
        const dkimVerified = dkimRecords.length > 0 && dkimRecords.every((r) => r.status === "verified");

        return NextResponse.json({
          message: `Resend verification triggered for ${sendingDomain}. SPF: ${spfVerified ? "verified" : "pending"}, DKIM: ${dkimVerified ? "verified" : "pending"}.`,
          spfVerified,
          dkimVerified,
          resendDomainStatus: updated.data?.status || "pending",
        });
      }

      return NextResponse.json({
        message: `Sending domain ${sendingDomain} is not registered in Resend. Use "Setup Sending Domain" on the domain card first.`,
        spfVerified: false,
        dkimVerified: false,
      });
    } catch {
      // Fall through to generic error
    }
  }

  return NextResponse.json(
    {
      error: "No SPF/DKIM verification endpoint is available in the backend yet.",
    },
    { status: 404 },
  );
}
