import { z } from "zod";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getApiBaseUrl } from "@/lib/api";
import {
  isSafeExternalUrl,
  fetchTextCapped,
  extractEmailFromHtml,
  findContactLink,
} from "@/lib/leads/contact-lookup-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = Number(process.env.AI_LEADS_INVESTIGATE_RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.AI_LEADS_INVESTIGATE_RATE_LIMIT_MAX_REQUESTS || 10);
const FETCH_TIMEOUT_MS = 5000;
const FETCH_MAX_BYTES = 500_000;

const RequestSchema = z.object({
  leadId: z.string().uuid(),
  businessName: z.string().min(1),
  city: z.string().optional(),
  hasEmail: z.boolean(),
  hasWebsite: z.boolean(),
});

interface PlacesSearchResponse {
  places?: Array<{ id: string }>;
}

interface PlacesDetailsResponse {
  websiteUri?: string;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY is not set." }), { status: 500 });
    }

    const authorizationHeader = request.headers.get("authorization");
    if (!authorizationHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
    }

    // Verify the caller against the backend's /auth/me, which runs the token
    // through jwt.verify — never trust an unverified, client-decoded payload
    // for an authorization decision.
    let role: string | null = null;
    try {
      const meResponse = await fetch(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: authorizationHeader },
        cache: "no-store",
      });
      if (!meResponse.ok) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 });
      }
      const meData = await meResponse.json().catch(() => null);
      role = typeof meData?.user?.role === "string" ? meData.user.role : null;
    } catch (verifyError) {
      console.error("[leads/investigate] failed to verify auth token:", verifyError);
      return new Response(JSON.stringify({ error: "Could not verify authorization" }), { status: 502 });
    }

    if (role !== "admin" && role !== "platform_admin") {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
    const ipKey = forwardedFor.split(",")[0]?.trim() || "unknown";
    const limiter = await checkRateLimit({
      namespace: "leads-investigate",
      key: ipKey,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
    });
    if (!limiter.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", details: `Retry in ${limiter.retryAfter}s.` }),
        { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } },
      );
    }

    const requestBody = RequestSchema.safeParse(await request.json());
    if (!requestBody.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: requestBody.error.flatten() }),
        { status: 400 },
      );
    }
    const { leadId, businessName, city, hasEmail, hasWebsite } = requestBody.data;

    if (hasEmail && hasWebsite) {
      return new Response(JSON.stringify({ foundWebsite: false, foundEmail: false }), { status: 200 });
    }

    const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery: `${businessName} ${city ?? ""}`.trim() }),
    });

    if (!searchResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Google Places search failed", details: `HTTP ${searchResponse.status}` }),
        { status: 502 },
      );
    }

    const searchData = (await searchResponse.json()) as PlacesSearchResponse;
    const placeId = searchData.places?.[0]?.id;
    if (!placeId) {
      return new Response(JSON.stringify({ foundWebsite: false, foundEmail: false }), { status: 200 });
    }

    const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "websiteUri",
      },
    });

    if (!detailsResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Google Places details failed", details: `HTTP ${detailsResponse.status}` }),
        { status: 502 },
      );
    }

    const detailsData = (await detailsResponse.json()) as PlacesDetailsResponse;
    const websiteUri = detailsData.websiteUri;

    if (!websiteUri) {
      return new Response(JSON.stringify({ foundWebsite: false, foundEmail: false }), { status: 200 });
    }

    let foundEmail: string | null = null;

    if (!hasEmail && (await isSafeExternalUrl(websiteUri))) {
      const homepageHtml = await fetchTextCapped(websiteUri, {
        timeoutMs: FETCH_TIMEOUT_MS,
        maxBytes: FETCH_MAX_BYTES,
      });

      if (homepageHtml) {
        foundEmail = extractEmailFromHtml(homepageHtml);

        if (!foundEmail) {
          const contactUrl = findContactLink(homepageHtml, websiteUri);
          if (contactUrl && (await isSafeExternalUrl(contactUrl))) {
            const contactHtml = await fetchTextCapped(contactUrl, {
              timeoutMs: FETCH_TIMEOUT_MS,
              maxBytes: FETCH_MAX_BYTES,
            });
            if (contactHtml) {
              foundEmail = extractEmailFromHtml(contactHtml);
            }
          }
        }
      }
    }

    const patchBody: Record<string, string> = {};
    if (!hasWebsite) patchBody.websiteUrl = websiteUri;
    if (!hasEmail && foundEmail) patchBody.email = foundEmail;

    if (Object.keys(patchBody).length > 0) {
      const patchResponse = await fetch(`${getApiBaseUrl()}/outreach-leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify(patchBody),
      });

      if (!patchResponse.ok) {
        return new Response(JSON.stringify({ error: "Failed to save lookup results" }), { status: 502 });
      }
    }

    return new Response(
      JSON.stringify({
        foundWebsite: !hasWebsite && Boolean(websiteUri),
        foundEmail: Boolean(!hasEmail && foundEmail),
        websiteUrl: !hasWebsite ? websiteUri : undefined,
        email: !hasEmail && foundEmail ? foundEmail : undefined,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("[leads/investigate] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: message }), { status: 500 });
  }
}
