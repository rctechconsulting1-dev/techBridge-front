import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email(),
  // Accept both undefined and explicit null from JSON to avoid 400s caused by
  // JSON.stringify serialising JS `null` values sent by client code.
  firstName: z.string().nullish(),
  tenantId: z.number().int().positive().optional(),
  websiteId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { to, firstName, tenantId, websiteId } = parsed.data;

  const { data, error } = await sendWelcomeEmail({
    to,
    firstName: firstName ?? undefined,
    tenantId,
    websiteId,
  });

  if (error) {
    console.error("[email/welcome] Resend error:", JSON.stringify(error));
    // In Resend sandbox mode (from: onboarding@resend.dev), emails can only be
    // delivered to the Resend account owner's address. Add a verified domain
    // in the Resend dashboard and update RESEND_FROM_EMAIL to fix this in production.
    return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
