import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

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
  const secret = request.headers.get("x-revalidation-secret");
  const expected = process.env.CMS_REVALIDATION_SECRET;

  if (!expected || secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const websiteId = body?.websiteId as string | undefined;

    if (websiteId) {
      revalidatePath(`/sites/${websiteId}`);
    } else {
      // Revalidate root — catches any site
      revalidatePath("/sites", "layout");
    }

    return Response.json({ revalidated: true, websiteId: websiteId ?? "all" });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
