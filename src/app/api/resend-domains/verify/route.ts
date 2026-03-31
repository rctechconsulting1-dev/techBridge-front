import { NextRequest, NextResponse } from "next/server";
import {
  verifyResendDomain,
  getResendDomain,
  resendRecordsToDnsRecords,
} from "@/lib/resend-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/resend-domains/verify
 *
 * Triggers Resend domain verification (async — checks SPF/DKIM records).
 * After triggering, fetches the domain to return current DNS record status.
 *
 * Body: { resendDomainId: string }
 * Returns: { status, dnsRecords[], message }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    resendDomainId?: string;
  };

  const domainId = body.resendDomainId?.trim();
  if (!domainId) {
    return NextResponse.json(
      { error: "resendDomainId is required" },
      { status: 400 },
    );
  }

  // Trigger verification
  const { success, error } = await verifyResendDomain(domainId);
  if (!success) {
    return NextResponse.json(
      { error: error || "Resend domain verification failed" },
      { status: 502 },
    );
  }

  // Fetch updated domain state
  const { data } = await getResendDomain(domainId);

  return NextResponse.json({
    status: data?.status ?? "pending",
    dnsRecords: data ? resendRecordsToDnsRecords(data.records) : [],
    message:
      "Verification triggered. Resend will check DNS records asynchronously. Status will update shortly.",
  });
}
