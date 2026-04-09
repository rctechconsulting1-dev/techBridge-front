import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendIntakeEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email(),
  firstName: z.string().nullish(),
  tenantName: z.string().trim().min(1).optional(),
  tenantId: z.number().int().positive(),
  businessType: z.string().min(1).optional().default("universal"),
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

  const { to, firstName, tenantName, tenantId, businessType, websiteId } = parsed.data;

  const { data, error } = await sendIntakeEmail({
    to,
    firstName: firstName ?? undefined,
    tenantName: tenantName ?? undefined,
    tenantId,
    businessType,
    websiteId,
  });

  if (error) {
    console.error("[email/intake] Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
