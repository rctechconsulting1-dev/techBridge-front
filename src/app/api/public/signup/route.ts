import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendIntakeEmail } from "@/lib/email";
import { getApiBaseUrl } from "@/lib/api";
import { checkRateLimit } from "@/lib/ai/rate-limit";

const schema = z.object({
  plan_key: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  business_name: z.string().trim().min(1).max(200),
  website_url: z.string().optional(),
});

async function logIntakeEmailFailure(tenantId: number, email: string) {
  const internalKey = process.env.INTERNAL_API_KEY;
  try {
    const res = await fetch(`${getApiBaseUrl()}/tenant-prospects/${tenantId}/signup-email-failed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalKey ? { "x-internal-key": internalKey } : {}),
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      console.error("[public/signup] signup-email-failed logging call returned", res.status);
    }
  } catch (notifyError) {
    console.error("[public/signup] Failed to log email failure:", notifyError);
  }
}

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

  const { plan_key, name, email, business_name, website_url } = parsed.data;

  // Honeypot: a real visitor never fills this hidden field. Absorb silently.
  if (website_url && website_url.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipKey = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const limiter = await checkRateLimit({
    namespace: "public-signup",
    key: ipKey,
    windowMs: 10 * 60 * 1000,
    maxRequests: 5,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ ok: true });
  }

  let tenantId: number | null = null;
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    const backendRes = await fetch(`${getApiBaseUrl()}/tenant-prospects/public`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalKey ? { "x-internal-key": internalKey } : {}),
      },
      body: JSON.stringify({
        businessName: business_name,
        ownerName: name,
        ownerEmail: email,
        planKey: plan_key,
      }),
    });

    if (!backendRes.ok) {
      console.error("[public/signup] tenant-prospects/public call failed:", backendRes.status);
      return NextResponse.json({ ok: true });
    }

    const backendBody = (await backendRes.json()) as { tenantId: number | null };
    tenantId = backendBody.tenantId;
  } catch (error) {
    console.error("[public/signup] Failed to reach backend:", error);
    return NextResponse.json({ ok: true });
  }

  // tenantId === null means an active non-prospect account already owns
  // this email (backend-rc's OWNER_EMAIL_IN_USE case) — send nothing.
  if (tenantId === null) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { error } = await sendIntakeEmail({
      to: email,
      firstName: name,
      tenantName: business_name,
      tenantId,
      businessType: "lead_gen_services",
    });
    if (error) {
      console.error("[public/signup] Resend error:", JSON.stringify(error));
      await logIntakeEmailFailure(tenantId, email);
    }
  } catch (error) {
    console.error("[public/signup] Failed to send intake email:", error);
    await logIntakeEmailFailure(tenantId, email);
  }

  return NextResponse.json({ ok: true });
}
