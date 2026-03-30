import { NextRequest, NextResponse } from "next/server";
import {
  buildSendingSubdomain,
  createResendDomain,
  findResendDomainByName,
  getResendDomain,
  resendRecordsToDnsRecords,
} from "@/lib/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/resend-domains/create
 *
 * Creates a Resend sending subdomain (mg.{domain}) for a tenant's custom domain.
 * If the sending subdomain already exists in Resend, returns its current state.
 *
 * Body: { domain: string }
 * Returns: { resendDomainId, sendingDomain, status, dnsRecords[] }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { domain?: string };
  const domain = body.domain?.trim().toLowerCase();

  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  const sendingDomain = buildSendingSubdomain(domain);

  // Check if already exists
  const existing = await findResendDomainByName(sendingDomain);
  if (existing.data) {
    // Fetch full record to get DNS records
    const full = await getResendDomain(existing.data.id);
    if (full.data) {
      return NextResponse.json({
        resendDomainId: full.data.id,
        sendingDomain: full.data.name,
        status: full.data.status,
        dnsRecords: resendRecordsToDnsRecords(full.data.records),
        alreadyExisted: true,
      });
    }
    // If we can't get full record, return list-level info
    return NextResponse.json({
      resendDomainId: existing.data.id,
      sendingDomain: existing.data.name,
      status: existing.data.status,
      dnsRecords: [],
      alreadyExisted: true,
    });
  }

  // Create new
  const { data, error } = await createResendDomain(sendingDomain);
  if (error || !data) {
    return NextResponse.json(
      { error: error || "Failed to create Resend sending domain" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    resendDomainId: data.id,
    sendingDomain: data.name,
    status: data.status,
    dnsRecords: resendRecordsToDnsRecords(data.records),
    alreadyExisted: false,
  });
}
