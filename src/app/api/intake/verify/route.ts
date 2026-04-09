import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyIntakeToken } from "@/lib/email";

const schema = z.object({
  token: z.string().min(1),
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

  const payload = await verifyIntakeToken(parsed.data.token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired intake link. Please request a new one." },
      { status: 401 },
    );
  }

  const { email, tenantId, businessType, websiteId, tenantName } = payload as unknown as {
    email: string;
    tenantId: number;
    businessType?: string;
    websiteId?: number;
    tenantName?: string;
  };

  return NextResponse.json({
    email,
    tenantId,
    businessType: businessType ?? "universal",
    websiteId,
    tenantName,
  });
}
