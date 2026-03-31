import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";
import {
  buildSendingSubdomain,
  findResendDomainByName,
  getResendDomain,
  resendRecordsToDnsRecords,
} from "@/lib/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const apiBase = getApiBaseUrl();

  let backendRecords: { type: string; name: string; value: string; reason?: string }[] = [];
  let backendData: Record<string, unknown> = {};
  let backendStatus = 200;

  try {
    const response = await fetch(
      `${apiBase}/domains/dns-info?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
        },
      },
    );

    backendStatus = response.status;
    backendData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const records = backendData.dnsRecords;
    if (Array.isArray(records)) {
      backendRecords = records as typeof backendRecords;
    }
  } catch {
    // Backend unreachable — continue with Resend records only
  }

  // Merge Resend mail DNS records alongside Vercel records
  const isSubdomain = domain.split(".").length > 2;
  const isRCDomain = domain.endsWith(".rctechbridge.com");
  let resendDnsRecords: { type: string; name: string; value: string; reason: string }[] = [];
  let resendDomainId: string | null = null;
  let resendStatus: string | null = null;

  if (!isSubdomain && !isRCDomain) {
    try {
      const sendingDomain = buildSendingSubdomain(domain);
      const existing = await findResendDomainByName(sendingDomain);
      if (existing.data) {
        resendDomainId = existing.data.id;
        resendStatus = existing.data.status;
        const full = await getResendDomain(existing.data.id);
        if (full.data) {
          resendDnsRecords = resendRecordsToDnsRecords(full.data.records);
          resendStatus = full.data.status;
        }
      }
    } catch {
      // Non-fatal
    }
  }

  const mergedRecords = [...backendRecords, ...resendDnsRecords];

  return NextResponse.json(
    {
      ...backendData,
      dnsRecords: mergedRecords,
      ...(resendDomainId ? { resendDomainId, resendStatus } : {}),
    },
    { status: backendRecords.length || resendDnsRecords.length ? 200 : backendStatus || 502 },
  );
}
