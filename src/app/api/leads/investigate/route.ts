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
});

interface PlacesSearchResponse {
  places?: Array<{ id: string }>;
}

interface PlacesDetailsResponse {
  websiteUri?: string;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_API_KEY is not set." }), { status: 500 });
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
    const { leadId, businessName, city } = requestBody.data;

    // Never trust client-supplied "hasEmail"/"hasWebsite" flags: a stale prop
    // (another tab/admin edited the lead) or a crafted request could overwrite
    // a value a human already entered. Read the real row server-side instead.
    const leadResponse = await fetch(`${getApiBaseUrl()}/outreach-leads/${leadId}`, {
      headers: { Authorization: authorizationHeader },
      cache: "no-store",
    });

    if (leadResponse.status === 404) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404 });
    }
    if (!leadResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch lead" }), { status: 502 });
    }

    const leadData = (await leadResponse.json()) as { email?: string | null; website_url?: string | null };
    const currentEmail = leadData.email || null;
    const currentWebsite = leadData.website_url || null;

    if (currentEmail && currentWebsite) {
      return new Response(JSON.stringify({ outcome: "already_complete" }), { status: 200 });
    }

    let discoveredWebsite: string | null = null;
    let placeSearched = false;
    let placeFound = false;

    // Only search Places when there is no website on file. Searching anyway
    // would spend a call and risk scanning a different business with the same
    // name instead of the site already recorded for this lead.
    if (!currentWebsite) {
      placeSearched = true;
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

      if (placeId) {
        placeFound = true;
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
        discoveredWebsite = detailsData.websiteUri || null;
      }
    }

    const scanTargetUrl = currentWebsite || discoveredWebsite;
    let foundEmail: string | null = null;

    if (!currentEmail && scanTargetUrl && (await isSafeExternalUrl(scanTargetUrl))) {
      const homepageHtml = await fetchTextCapped(scanTargetUrl, {
        timeoutMs: FETCH_TIMEOUT_MS,
        maxBytes: FETCH_MAX_BYTES,
      });

      if (homepageHtml) {
        foundEmail = extractEmailFromHtml(homepageHtml);

        if (!foundEmail) {
          const contactUrl = findContactLink(homepageHtml, scanTargetUrl);
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

    const newWebsiteUrl = !currentWebsite && discoveredWebsite ? discoveredWebsite : null;
    const newEmail = !currentEmail && foundEmail ? foundEmail : null;

    const patchBody: Record<string, string> = {};
    if (newWebsiteUrl) patchBody.websiteUrl = newWebsiteUrl;
    if (newEmail) patchBody.email = newEmail;

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

    // Outcome semantics: these describe what was DISCOVERED, not whether
    // something happened to be newly saved.
    //   already_complete  - handled above, short-circuits before this point
    //   found_email       - an email was found (and saved) this call, whether
    //                       the website was pre-existing or newly found
    //   found_website     - a website was newly found (and saved) this call,
    //                       but no email scan was attempted because an email
    //                       was already on file
    //   place_no_website  - no website on file, Places matched a business, but
    //                       it has no website listed
    //   no_match          - no website on file, Places found no matching business
    //   website_no_email  - a website (pre-existing or newly found) WAS scanned
    //                       for an email but none was found on it
    let outcome: string;
    if (newEmail) {
      outcome = "found_email";
    } else if (newWebsiteUrl && currentEmail) {
      outcome = "found_website";
    } else if (scanTargetUrl && !currentEmail) {
      outcome = "website_no_email";
    } else if (placeSearched && placeFound) {
      outcome = "place_no_website";
    } else {
      outcome = "no_match";
    }

    return new Response(
      JSON.stringify({
        outcome,
        websiteUrl: newWebsiteUrl ?? undefined,
        email: newEmail ?? undefined,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("[leads/investigate] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: message }), { status: 500 });
  }
}
