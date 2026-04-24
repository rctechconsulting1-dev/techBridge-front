import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";
import { getLatestIntakeSubmission } from "@/lib/intake-storage";
import { verifyAdminAuth } from "@/lib/route-auth";

type BackendAsset = {
  image?: {
    url?: string | null;
  } | null;
};

const isImageFile = (url: string, filename: string) => {
  const value = `${url} ${filename}`.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].some((ext) =>
    value.includes(ext),
  );
};

const toReadableFileTitle = (filename: string) =>
  filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  const websiteIdRaw = req.nextUrl.searchParams.get("websiteId");
  const tenantIdRaw = req.nextUrl.searchParams.get("tenantId");
  const websiteId = websiteIdRaw ? Number(websiteIdRaw) : null;
  const tenantId = tenantIdRaw ? Number(tenantIdRaw) : null;

  if (
    !websiteId ||
    Number.isNaN(websiteId) ||
    (tenantIdRaw && Number.isNaN(tenantId))
  ) {
    return NextResponse.json(
      { error: "websiteId is required and tenantId must be numeric when provided." },
      { status: 400 },
    );
  }

  let submission = await getLatestIntakeSubmission({ websiteId, tenantId });
  if (!submission && typeof tenantId === "number") {
    submission = await getLatestIntakeSubmission({ websiteId: null, tenantId });
  }
  if (!submission) {
    return NextResponse.json({ error: "No intake submission found." }, { status: 404 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
  };
  if (typeof tenantId === "number") {
    headers["x-tenant-id"] = String(tenantId);
  }

  const existingAssetsRes = await fetch(
    `${getApiBaseUrl()}/assets?website_id=${encodeURIComponent(String(websiteId))}&page=0&page_size=500`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  if (!existingAssetsRes.ok) {
    return NextResponse.json(
      { error: `Failed to load current assets (${existingAssetsRes.status}).` },
      { status: existingAssetsRes.status },
    );
  }

  const existingAssets = (await existingAssetsRes.json()) as BackendAsset[];
  const existingUrls = new Set(
    existingAssets
      .map((asset) => asset.image?.url)
      .filter((value): value is string => Boolean(value)),
  );

  const missingFiles = submission.files.filter(
    (file) => isImageFile(file.url, file.filename) && !existingUrls.has(file.url),
  );

  if (!missingFiles.length) {
    return NextResponse.json({ created: 0, skipped: submission.files.length });
  }

  const imagePayload = missingFiles.map((file) => ({
    url: file.url,
    alt_text: `${file.category ?? file.questionId} upload`,
    caption: toReadableFileTitle(file.filename) || file.filename,
  }));

  const imageRes = await fetch(`${getApiBaseUrl()}/images`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify(imagePayload),
  });

  if (!imageRes.ok) {
    const body = await imageRes.text();
    return NextResponse.json(
      { error: body || `Failed to create image rows (${imageRes.status}).` },
      { status: imageRes.status },
    );
  }

  const createdImages = (await imageRes.json()) as Array<{ id?: number }>;
  const relationshipPayload = createdImages
    .map((image) => image.id)
    .filter((id): id is number => Number.isInteger(id))
    .map((imageId) => ({
      website_id: websiteId,
      image_id: imageId,
    }));

  if (!relationshipPayload.length) {
    return NextResponse.json(
      { error: "Image creation response did not include ids." },
      { status: 500 },
    );
  }

  const assetRes = await fetch(`${getApiBaseUrl()}/assets`, {
    method: "POST",
    headers,
    body: JSON.stringify(relationshipPayload),
  });

  if (!assetRes.ok) {
    const body = await assetRes.text();
    return NextResponse.json(
      { error: body || `Failed to create asset rows (${assetRes.status}).` },
      { status: assetRes.status },
    );
  }

  return NextResponse.json({
    created: relationshipPayload.length,
    skipped: submission.files.length - relationshipPayload.length,
  });
}