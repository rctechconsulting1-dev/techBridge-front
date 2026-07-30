import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendProspectInviteEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email(),
  firstName: z.string().nullish(),
  tenantName: z.string().min(1),
  planName: z.string().min(1),
  priceFormatted: z.string().min(1),
  checkoutUrl: z.string().url(),
  intakeUrl: z.string().url(),
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

  const { to, firstName, tenantName, planName, priceFormatted, checkoutUrl, intakeUrl } =
    parsed.data;

  const { data, error } = await sendProspectInviteEmail({
    to,
    firstName: firstName ?? undefined,
    tenantName,
    planName,
    priceFormatted,
    checkoutUrl,
    intakeUrl,
  });

  if (error) {
    console.error("[email/prospect-invite] Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
