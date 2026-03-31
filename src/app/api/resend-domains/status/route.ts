import { NextRequest, NextResponse } from "next/server";
import {
  buildSendingSubdomain,
  findResendDomainByName,
  getResendDomain,
  resendRecordsToDnsRecords,
} from "@/lib/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/resend-domains/status?domain={tenantDomain}
 *
 * Check the Resend sending domain status for a tenant's custom domain.
 * Looks up mg.{domain} in Resend and returns its verification status + DNS records.
 *
 * Returns: { found, resendDomainId?, sendingDomain, status?, dnsRecords[] }
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: "domain query param is required" }, { status: 400 });
  }

  const sendingDomain = buildSendingSubdomain(domain);
  const { data: existing, error } = await findResendDomainByName(sendingDomain);

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  if (!existing) {
    return NextResponse.json({
      found: false,
      sendingDomain,
      status: null,
      dnsRecords: [],
    });
  }

  // Get full record with DNS details
  const { data: full } = await getResendDomain(existing.id);

  return NextResponse.json({
    found: true,
    resendDomainId: existing.id,
    sendingDomain: existing.name,
    status: full?.status ?? existing.status,
    dnsRecords: full ? resendRecordsToDnsRecords(full.records) : [],
  });
}
