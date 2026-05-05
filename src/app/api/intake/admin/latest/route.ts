import { NextRequest, NextResponse } from "next/server";
import { getLatestIntakeSubmission, saveLatestIntakeSubmission } from "@/lib/intake-storage";
import type { IntakeAnswers, IntakeAnswerValue } from "@/lib/intake-types";
import { verifyAdminAuth } from "@/lib/route-auth";
import { getApiBaseUrl } from "@/lib/api";

const EDITABLE_ANSWER_KEYS = [
  // Core business info
  "business_name",
  "owner_name",
  "location",
  "business_phone",
  "business_address",
  "hours_service_area",
  "tagline",
  "topics_to_avoid",
  "content_approval_contact",
  // Services
  "primary_offerings",
  "pricing_packages",
  "policies_guarantees",
  "fulfillment_details",
  // Online presence
  "google_business_url",
  "facebook_url",
  "instagram_url",
  "yelp_url",
  "other_review_platforms",
  "has_google_ads",
  "existing_booking_software",
  // Setup & launch
  "existing_website_url",
  "existing_domain",
  "domain_registrar",
  "target_go_live",
  // Legacy
  "service_list",
] as const;

const sanitizeAnswerValue = (value: unknown): IntakeAnswerValue => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    const cleaned = value.map((item) => item.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
  }

  return null;
};

const parseRequestIds = (req: NextRequest) => {
  const websiteIdRaw = req.nextUrl.searchParams.get("websiteId");
  const tenantIdRaw = req.nextUrl.searchParams.get("tenantId");
  const websiteId = websiteIdRaw ? Number(websiteIdRaw) : null;
  const tenantId = tenantIdRaw ? Number(tenantIdRaw) : null;

  return {
    websiteIdRaw,
    tenantIdRaw,
    websiteId,
    tenantId,
  };
};

const getAdminIdentity = async (token: string) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      user?: { email?: string | null; name?: string | null };
    };

    return {
      email: payload.user?.email ?? null,
      name: payload.user?.name ?? null,
    };
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { websiteIdRaw, tenantIdRaw, websiteId, tenantId } = parseRequestIds(req);

  if (
    (websiteIdRaw && Number.isNaN(websiteId)) ||
    (tenantIdRaw && Number.isNaN(tenantId))
  ) {
    return NextResponse.json(
      { error: "websiteId or tenantId must be numeric." },
      { status: 400 },
    );
  }

  const submission = await getLatestIntakeSubmission({ websiteId, tenantId });

  if (!submission) {
    return NextResponse.json({ error: "No intake submission found." }, { status: 404 });
  }

  return NextResponse.json(submission, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { websiteIdRaw, tenantIdRaw, websiteId, tenantId } = parseRequestIds(req);

  if (
    (websiteIdRaw && Number.isNaN(websiteId)) ||
    (tenantIdRaw && Number.isNaN(tenantId))
  ) {
    return NextResponse.json(
      { error: "websiteId or tenantId must be numeric." },
      { status: 400 },
    );
  }

  const submission = await getLatestIntakeSubmission({ websiteId, tenantId });

  if (!submission) {
    return NextResponse.json({ error: "No intake submission found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null) as { answers?: Record<string, unknown> } | null;
  if (!body?.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "answers object is required." }, { status: 400 });
  }

  const nextAnswers: IntakeAnswers = { ...submission.answers };

  for (const key of EDITABLE_ANSWER_KEYS) {
    if (!(key in body.answers)) {
      continue;
    }

    nextAnswers[key] = sanitizeAnswerValue(body.answers[key]);
  }

  const adminIdentity = await getAdminIdentity(auth.token);

  const updatedSubmission = {
    ...submission,
    adminEditedAt: new Date().toISOString(),
    adminEditedByEmail: adminIdentity?.email ?? submission.adminEditedByEmail ?? null,
    adminEditedByName: adminIdentity?.name ?? submission.adminEditedByName ?? null,
    answers: nextAnswers,
  };

  await saveLatestIntakeSubmission(updatedSubmission);

  return NextResponse.json(updatedSubmission, {
    headers: { "Cache-Control": "no-store" },
  });
}