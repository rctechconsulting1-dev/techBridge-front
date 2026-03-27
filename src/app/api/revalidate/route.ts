import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { getApiBaseUrl } from "@/lib/api";
import { getWebsiteCacheTag } from "@/lib/public-cache";

type ContentRecord = Record<string, unknown>;

const getContentSlug = (record: ContentRecord): string | null => {
  const value =
    typeof record.slug === "string"
      ? record.slug
      : typeof record.path === "string"
        ? record.path
        : null;
  const normalized = value?.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return normalized || null;
};

const isPublished = (record: ContentRecord): boolean => {
  if (typeof record.is_published === "boolean") {
    return record.is_published;
  }
  if (typeof record.isPublished === "boolean") {
    return record.isPublished;
  }
  return true;
};

const extractRecords = (payload: unknown): ContentRecord[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is ContentRecord => Boolean(item && typeof item === "object"),
    );
  }

  if (payload && typeof payload === "object") {
    const candidates = [
      (payload as { items?: unknown }).items,
      (payload as { data?: unknown }).data,
      (payload as { pages?: unknown }).pages,
      (payload as { products?: unknown }).products,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (item): item is ContentRecord => Boolean(item && typeof item === "object"),
        );
      }
    }
  }

  return [];
};

const fetchRecords = async (path: string): Promise<ContentRecord[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }

    return extractRecords(await response.json().catch(() => []));
  } catch {
    return [];
  }
};

const getWebsitePaths = async (websiteId: string): Promise<string[]> => {
  const basePath = `/sites/${websiteId}`;
  const paths = new Set<string>([
    basePath,
    `${basePath}/about`,
    `${basePath}/services`,
    `${basePath}/shop`,
  ]);

  const encodedWebsiteId = encodeURIComponent(websiteId);
  const [pages, products] = await Promise.all([
    fetchRecords(`/pages?website_id=${encodedWebsiteId}`),
    fetchRecords(`/products?website_id=${encodedWebsiteId}`),
  ]);

  for (const page of pages) {
    const slug = getContentSlug(page);
    if (slug && isPublished(page)) {
      paths.add(`${basePath}/${slug}`);
    }
  }

  for (const product of products) {
    const slug = getContentSlug(product);
    if (slug && isPublished(product)) {
      paths.add(`${basePath}/shop/${slug}`);
    }
  }

  return Array.from(paths);
};

/**
 * Webhook endpoint for ISR revalidation.
 *
 * Call this from your admin panel every time CMS content is saved:
 *
 *   POST /api/revalidate
 *   Headers:
 *     x-revalidation-secret: <CMS_REVALIDATION_SECRET>
 *     Content-Type: application/json
 *   Body:
 *     { "websiteId": "1" }   // optional — omit to revalidate all sites
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CMS_REVALIDATION_SECRET;
  if (!expected) {
    return Response.json({ error: "Revalidation not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-revalidation-signature") ?? "";

  // HMAC verification (preferred)
  const computedHmac =
    "sha256=" + createHmac("sha256", expected).update(rawBody).digest("hex");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(computedHmac);
  const hmacValid =
    sigBuffer.length === expectedBuffer.length &&
    timingSafeEqual(sigBuffer, expectedBuffer);

  // Fallback: legacy plain-secret header for backward compat
  const legacySecret = request.headers.get("x-revalidation-secret");
  if (!hmacValid && legacySecret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody || "{}");
    const websiteId = body?.websiteId as string | undefined;

    if (websiteId) {
      revalidateTag(getWebsiteCacheTag(websiteId), "max");
      const paths = await getWebsitePaths(websiteId);
      for (const path of paths) {
        revalidatePath(path);
      }

      return Response.json({
        revalidated: true,
        websiteId,
        paths,
        strategy: "tenant-tag-and-path",
      });
    } else {
      // Revalidate root — catches any site
      revalidatePath("/sites", "layout");
      return Response.json({
        revalidated: true,
        websiteId: "all",
        strategy: "sites-layout",
      });
    }
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
