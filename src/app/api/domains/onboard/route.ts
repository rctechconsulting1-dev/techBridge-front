import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";
import { getApiBaseUrl } from "@/lib/api";
import {
  buildSendingSubdomain,
  createResendDomain,
  findResendDomainByName,
  getResendDomain,
  resendRecordsToDnsRecords,
} from "@/lib/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () => getApiBaseUrl();

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
    const data = (await result.response.json().catch(() => ({}))) as Record<string, unknown>;

    // Auto-create Resend sending subdomain (mg.{domain}) alongside Vercel domain.
    // This is fire-and-merge — if Resend fails, we still return the Vercel result
    // so the domain onboarding is not blocked.
    const isSubdomain = normalizedDomain.split(".").length > 2;
    const isRCDomain = normalizedDomain.endsWith(".rctechbridge.com");
    let resendDnsRecords: { type: string; name: string; value: string; reason: string }[] = [];
    let resendDomainId: string | null = null;
    let resendStatus: string | null = null;

    if (!isSubdomain && !isRCDomain) {
      try {
        const sendingDomain = buildSendingSubdomain(normalizedDomain);

        // Check if already exists first
        const existing = await findResendDomainByName(sendingDomain);
        if (existing.data) {
          resendDomainId = existing.data.id;
          resendStatus = existing.data.status;
          const full = await getResendDomain(existing.data.id);
          if (full.data) {
            resendDnsRecords = resendRecordsToDnsRecords(full.data.records);
            resendStatus = full.data.status;
          }
        } else {
          const { data: created } = await createResendDomain(sendingDomain);
          if (created) {
            resendDomainId = created.id;
            resendStatus = created.status;
            resendDnsRecords = resendRecordsToDnsRecords(created.records);
          }
        }
      } catch {
        // Non-fatal — Resend domain creation is best-effort during onboard
      }
    }

    // Merge Resend DNS records into the existing Vercel DNS records
    const vercelDnsRecords = Array.isArray(data.dnsRecords) ? data.dnsRecords : [];
    const mergedDnsRecords = [...vercelDnsRecords, ...resendDnsRecords];

    return NextResponse.json({
      domain: normalizedDomain,
      ...data,
      dnsRecords: mergedDnsRecords,
      ...(resendDomainId ? { resendDomainId, resendStatus } : {}),
    });
  }

  return NextResponse.json(
    {
      error: "No domain onboarding endpoint is available in the backend yet.",
    },
    { status: 404 },
  );
}
