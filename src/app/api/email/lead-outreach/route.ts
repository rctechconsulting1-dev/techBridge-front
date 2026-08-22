import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getResendClient } from "@/lib/resend-client";
import { getApiBaseUrl } from "@/lib/api";
import { complianceFooter } from "@/lib/outreach-templates";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "RD TechBridge <noreply@rdtechbridge.com>";
const BACKEND_API_BASE = getApiBaseUrl();

const RequestSchema = z.object({
  leadId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  source: z.string().min(1),
  tier: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const authorizationHeader = req.headers.get("authorization");
  if (!authorizationHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { leadId, to, subject, body: emailBody, source, tier } = parsed.data;

  // Gate check: re-fetch the lead's current status right before sending.
  // This is the real safety check — creation-time flagging (backend-rc
  // Task 2) can be stale if the lead was captured before it matched an
  // existing tenant/prospect.
  const leadResponse = await fetch(`${BACKEND_API_BASE}/outreach-leads/${leadId}`, {
    headers: { Authorization: authorizationHeader },
    cache: "no-store",
  });
  if (!leadResponse.ok) {
    return NextResponse.json({ error: "Could not verify lead status" }, { status: 502 });
  }
  const lead = await leadResponse.json();
  if (lead.status === "do_not_contact") {
    return NextResponse.json(
      { error: "This lead is flagged do_not_contact and cannot be emailed", code: "LEAD_DO_NOT_CONTACT" },
      { status: 409 },
    );
  }

  // The compliance footer is appended here, server-side, unconditionally —
  // never trust the client's editable `emailBody` to include it, since the
  // composer UI (Task 9) intentionally lets the sender edit everything else.
  let footer: string;
  try {
    footer = complianceFooter();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Compliance footer not configured" },
      { status: 500 },
    );
  }

  const { data, error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    text: `${emailBody}${footer}`,
  });
  if (error) {
    console.error("[email/lead-outreach] Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 });
  }

  const touchResponse = await fetch(`${BACKEND_API_BASE}/outreach-leads/${leadId}/touches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorizationHeader },
    body: JSON.stringify({
      channel: "email",
      templateOpener: source,
      templateTier: tier,
      resendMessageId: data?.id,
    }),
  });
  if (!touchResponse.ok) {
    console.error("[email/lead-outreach] failed to log touch after successful send", await touchResponse.text());
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
