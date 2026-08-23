# Lead Contact Lookup (Investigate button) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-lead "Investigate" action that looks up a business's real website via Google Places API and scans that site for a visible contact email, filling in whatever it finds on the lead record.

**Architecture:** A new Next.js API route (`src/app/api/leads/investigate/route.ts`) does the external work (Places API calls, then a size/time-capped fetch of the found website with an SSRF guard) and persists results through the backend's existing `PATCH /outreach-leads/:id` — no backend or DB changes. A new frontend button in `LeadActionsModal.tsx` triggers it and shows the outcome.

**Tech Stack:** Next.js API route (Node runtime), Zod for request validation, Node's built-in `fetch`/`AbortController`/`node:dns`, no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-08-23-lead-contact-lookup-design.md`

## Global Constraints

- New env var `GOOGLE_PLACES_API_KEY` — server-side only, never sent to the client.
- Website/contact-page fetch: 5000ms timeout, 500,000 byte cap, reject non-`http(s)` URLs, reject URLs whose hostname resolves to a loopback/private/link-local IP.
- Max 2 external page fetches per investigate call (homepage, then one contact-like page if the homepage has no email).
- Rate limit: separate namespace `leads-investigate` via the existing `checkRateLimit` helper (`src/lib/ai/rate-limit.ts`), default 10 requests per 60000ms, both env-tunable (`AI_LEADS_INVESTIGATE_RATE_LIMIT_MAX_REQUESTS`, `AI_LEADS_INVESTIGATE_RATE_LIMIT_WINDOW_MS`).
- Never overwrite a `website_url` or `email` the lead already has — the route only fills fields the caller reports as missing (`hasWebsite`/`hasEmail` in the request body).
- No test runner exists in this repo. Verification is `npx tsc --noEmit` plus a documented manual check per task (a throwaway Node script for pure logic, curl/browser for the live route).

---

### Task 1: Contact-lookup pure helpers (email extraction, contact-link detection)

**Files:**
- Create: `src/lib/leads/contact-lookup-helpers.ts`

**Interfaces:**
- Produces: `isPrivateOrLoopbackIp(ip: string): boolean`, `extractEmailFromHtml(html: string): string | null`, `findContactLink(html: string, baseUrl: string): string | null` — all consumed by Task 3 (and `isPrivateOrLoopbackIp` by Task 2, added to this same file next).

- [ ] **Step 1: Write the helper functions**

```typescript
// src/lib/leads/contact-lookup-helpers.ts

const IMAGE_ISH_SUFFIX = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$/i;

/**
 * IPv4/IPv6 loopback, private, and link-local range check. Used to stop the
 * website/contact-page fetch in this module from reaching internal network
 * addresses (SSRF guard) — see isSafeExternalUrl in this same file.
 */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80")) return true;
  return false;
}

/**
 * Finds a visible contact email in raw HTML. Checks mailto: links first
 * (most reliable), then falls back to a plain email pattern in the text.
 * Filters out matches that are actually image/asset filenames caught by the
 * email regex (e.g. "logo@2x.png" matches `\S+@\S+\.\w{2,}` but isn't one).
 */
export function extractEmailFromHtml(html: string): string | null {
  const mailtoMatch = html.match(/mailto:([^"'\s?>]+)/i);
  if (mailtoMatch) {
    const candidate = decodeURIComponent(mailtoMatch[1]);
    if (!IMAGE_ISH_SUFFIX.test(candidate)) {
      return candidate;
    }
  }

  const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const candidate = emailMatches.find((match) => !IMAGE_ISH_SUFFIX.test(match));
  return candidate ?? null;
}

/**
 * Best-effort scan for an anchor tag whose visible text mentions "contact",
 * returning its href resolved against baseUrl. No HTML parser dependency —
 * this is intentionally a lightweight regex scan, not exhaustive.
 */
export function findContactLink(html: string, baseUrl: string): string | null {
  const anchorMatches = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];

  for (const anchor of anchorMatches) {
    const hrefMatch = anchor.match(/href=["']([^"']+)["']/i);
    const textOnly = anchor.replace(/<[^>]+>/g, "").trim();

    if (hrefMatch && /contact/i.test(textOnly)) {
      try {
        return new URL(hrefMatch[1], baseUrl).toString();
      } catch {
        return null;
      }
    }
  }

  return null;
}
```

- [ ] **Step 2: Verify with a throwaway script**

Create a temporary file `scratch-verify-helpers.cjs` in the repo root with the same three function bodies (copy-pasted, since this repo has no ts-node/tsx to import the `.ts` file directly) plus these assertions:

```javascript
// scratch-verify-helpers.cjs — DELETE after running, do not commit
const assert = require("node:assert");

// paste isPrivateOrLoopbackIp, extractEmailFromHtml, findContactLink here verbatim

assert.strictEqual(isPrivateOrLoopbackIp("127.0.0.1"), true);
assert.strictEqual(isPrivateOrLoopbackIp("10.5.5.5"), true);
assert.strictEqual(isPrivateOrLoopbackIp("172.20.1.1"), true);
assert.strictEqual(isPrivateOrLoopbackIp("192.168.1.1"), true);
assert.strictEqual(isPrivateOrLoopbackIp("169.254.1.1"), true);
assert.strictEqual(isPrivateOrLoopbackIp("::1"), true);
assert.strictEqual(isPrivateOrLoopbackIp("8.8.8.8"), false);
assert.strictEqual(isPrivateOrLoopbackIp("172.32.0.1"), false); // just outside 172.16.0.0/12

assert.strictEqual(
  extractEmailFromHtml('<a href="mailto:info@acme.com">Email us</a>'),
  "info@acme.com",
);
assert.strictEqual(
  extractEmailFromHtml('<img src="logo@2x.png"> contact us at hello@acme.com'),
  "hello@acme.com",
);
assert.strictEqual(extractEmailFromHtml("<p>no email here</p>"), null);

assert.strictEqual(
  findContactLink('<a href="/contact-us">Contact Us</a>', "https://acme.com"),
  "https://acme.com/contact-us",
);
assert.strictEqual(findContactLink("<a href=\"/about\">About</a>", "https://acme.com"), null);

console.log("All helper assertions passed");
```

Run: `node scratch-verify-helpers.cjs`
Expected output: `All helper assertions passed`

Then delete the file: it's a throwaway verification script, not part of the codebase.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/leads/contact-lookup-helpers.ts
git commit -m "feat: add pure helpers for lead contact-page email extraction"
```

---

### Task 2: SSRF-safe fetch (extends the Task 1 file)

**Files:**
- Modify: `src/lib/leads/contact-lookup-helpers.ts` (created in Task 1)

**Interfaces:**
- Consumes: `isPrivateOrLoopbackIp(ip: string): boolean` from Task 1 (same file).
- Produces: `isSafeExternalUrl(urlString: string): Promise<boolean>`, `fetchTextCapped(url: string, options: { timeoutMs: number; maxBytes: number }): Promise<string | null>` — both consumed by Task 3.

- [ ] **Step 1: Add the two functions**

Add to the top of `src/lib/leads/contact-lookup-helpers.ts`:

```typescript
import { promises as dns } from "node:dns";
```

Append to the file:

```typescript
/**
 * Rejects non-http(s) URLs and URLs whose hostname resolves to a
 * loopback/private/link-local address. This is a pre-flight DNS check, not
 * a connection-time guarantee (a determined attacker could race a DNS
 * rebind between this check and the fetch in fetchTextCapped) — acceptable
 * here because the URL comes from Google Places' own index, not directly
 * from user input, and the caller is always an authenticated admin.
 */
export async function isSafeExternalUrl(urlString: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  try {
    const { address } = await dns.lookup(parsed.hostname);
    return !isPrivateOrLoopbackIp(address);
  } catch {
    return false;
  }
}

/**
 * Fetches a URL with a timeout and a byte cap enforced during the stream
 * read (not after the fact), and refuses to follow redirects (a redirect
 * to an internal address would otherwise bypass isSafeExternalUrl's check
 * on the original URL). Returns null on any failure — callers treat that
 * the same as "nothing found", not a hard error.
 */
export async function fetchTextCapped(
  url: string,
  options: { timeoutMs: number; maxBytes: number },
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "manual" });
    if (!response.ok || !response.body) {
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > options.maxBytes) {
        await reader.cancel();
        break;
      }
      text += decoder.decode(value, { stream: true });
    }

    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 2: Verify with a throwaway script**

Create `scratch-verify-safe-fetch.cjs` in the repo root:

```javascript
// scratch-verify-safe-fetch.cjs — DELETE after running, do not commit
const dns = require("node:dns").promises;
const assert = require("node:assert");

// paste isPrivateOrLoopbackIp and isSafeExternalUrl here verbatim
// (isSafeExternalUrl needs the same dns.lookup import, already required above as `dns`)

(async () => {
  assert.strictEqual(await isSafeExternalUrl("not a url"), false);
  assert.strictEqual(await isSafeExternalUrl("ftp://example.com"), false);
  assert.strictEqual(await isSafeExternalUrl("http://127.0.0.1"), false);
  assert.strictEqual(await isSafeExternalUrl("http://localhost"), false);
  assert.strictEqual(await isSafeExternalUrl("https://example.com"), true);
  console.log("All safe-fetch assertions passed");
})();
```

Run: `node scratch-verify-safe-fetch.cjs`
Expected output: `All safe-fetch assertions passed`
(Requires network access to resolve `example.com` — if offline, skip the last assertion and confirm the first four pass.)

Then delete the file.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/leads/contact-lookup-helpers.ts
git commit -m "feat: add SSRF-guarded capped fetch for lead contact lookup"
```

---

### Task 3: `/api/leads/investigate` route

**Files:**
- Create: `src/app/api/leads/investigate/route.ts`

**Interfaces:**
- Consumes: `isSafeExternalUrl`, `fetchTextCapped`, `extractEmailFromHtml`, `findContactLink` from `@/lib/leads/contact-lookup-helpers` (Tasks 1–2); `checkRateLimit` from `@/lib/ai/rate-limit`; `getApiBaseUrl` from `@/lib/api`.
- Produces: `POST /api/leads/investigate` accepting `{ leadId: string, businessName: string, city?: string, hasEmail: boolean, hasWebsite: boolean }`, responding `200 { foundWebsite: boolean, foundEmail: boolean, websiteUrl?: string, email?: string }` on success or `{ error: string, details?: unknown }` on failure (401/403/429/400/502/500) — consumed by Task 4.

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/leads/investigate/route.ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Get a Google Places API key and set it locally**

In the Google Cloud Console, enable "Places API (New)" on a project and create an API key. Add to `.env`:

```
GOOGLE_PLACES_API_KEY=<the key>
```

- [ ] **Step 4: Manual verification against the running dev server**

Start both dev servers (`npm run dev` in `admin-dashboard-rc`, `npm run dev` in `backend-rc`). Sign in to the admin dashboard in a browser as an admin/platform_admin user. Open the browser console and run:

```javascript
localStorage.getItem("auth_token")
```

Copy the returned token, then from a terminal:

```bash
curl -X POST http://localhost:3000/api/leads/investigate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <paste token>" \
  -d '{"leadId":"<a real lead uuid from the leads page>","businessName":"Starbucks","city":"Seattle","hasEmail":false,"hasWebsite":false}'
```

Expected: `200` with `foundWebsite: true` and a real Starbucks website URL (a large chain won't have a scrapeable contact email on its homepage, so `foundEmail: false` is an acceptable/expected result here — this call is mainly confirming the Places lookup and PATCH-persist path work end to end). Re-fetch the lead (`GET /outreach-leads/:id` via the leads list) to confirm `website_url` was actually saved.

Then repeat with a nonsense `businessName` (e.g. `"zzqxnotarealbusiness123"`) and confirm `200` with `foundWebsite: false, foundEmail: false` and no change to the lead.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/leads/investigate/route.ts
git commit -m "feat: add /api/leads/investigate route for lead website/email lookup"
```

---

### Task 4: "Investigate" button in the lead actions modal

**Files:**
- Modify: `src/components/leads/LeadActionsModal.tsx`

**Interfaces:**
- Consumes: `POST /api/leads/investigate` from Task 3; `getStoredAuthToken` from `@/lib/auth-context` (already used the same way in `LeadCaptureModal.tsx:71`).

- [ ] **Step 1: Add the import and state**

In `src/components/leads/LeadActionsModal.tsx`, add to the imports at the top:

```typescript
import { getStoredAuthToken } from "@/lib/auth-context";
```

Add alongside the other `useState` declarations (after the `error` state, matching the existing declaration order):

```typescript
const [isInvestigating, setIsInvestigating] = useState(false);
const [investigateResult, setInvestigateResult] = useState<string | null>(null);
```

- [ ] **Step 2: Add the handler**

Add after `handleSaveEmail` (before `handleLogTouch`):

```typescript
const handleInvestigate = async () => {
  setIsInvestigating(true);
  setInvestigateResult(null);
  setError(null);
  try {
    const token = getStoredAuthToken();
    const response = await fetch("/api/leads/investigate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        leadId: lead.id,
        businessName: lead.business_name,
        city: lead.city || undefined,
        hasEmail: Boolean(lead.email),
        hasWebsite: Boolean(lead.website_url),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Failed to investigate lead");
    }
    if (data.foundWebsite && data.foundEmail) {
      setInvestigateResult("Found website and email — saved.");
    } else if (data.foundWebsite) {
      setInvestigateResult("Found website, no email visible on the site.");
    } else {
      setInvestigateResult("No matching business found.");
    }
    onUpdated();
  } catch (err) {
    setError(getErrorMessage(err, "Failed to investigate lead"));
  } finally {
    setIsInvestigating(false);
  }
};
```

- [ ] **Step 3: Add the button to the JSX**

In the render, add this block right after the closing `</div>` of the top-level conditional block that renders either the "do not contact" message, the email/subject/body form, or the "no email on file" form (i.e., right after the `)}` that closes the `{lead.status === "do_not_contact" ? (...) : lead.email ? (...) : (...)}` conditional, before the "Log a call or text" `<div className="mb-6 border-t ...">` section):

```tsx
{lead.status !== "do_not_contact" && (!lead.email || !lead.website_url) && (
  <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
    <Button variant="outline" onClick={handleInvestigate} disabled={isInvestigating}>
      {isInvestigating ? "Investigating..." : "Investigate (find website/email)"}
    </Button>
    {investigateResult && (
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{investigateResult}</p>
    )}
  </div>
)}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification in the browser**

With both dev servers running (Task 3, Step 4), open the leads page, click "Manage" on a lead that has no email and no website, click "Investigate", and confirm: the button disables and shows "Investigating...", a result message appears, and (if a website/email was found) the modal's email form updates to reflect the new state without needing to close and reopen it — `onUpdated()` already refreshes both the list and this modal's `lead` prop per the existing `refreshActionLead` wiring in `leads/page.tsx`.

Then cover the two remaining spec scenarios (`docs/superpowers/specs/2026-08-23-lead-contact-lookup-design.md`, Testing section):
- A lead for a real business that has a website but no visible contact email on its homepage or a contact page (e.g. a large chain) → confirm `website_url` gets saved, `email` stays blank, and `status` stays `needs_email_lookup`.
- A lead that already has a `website_url` set (via `apiClient.updateOutreachLead` or by hand in the DB) but no email → click Investigate and confirm the existing `website_url` is unchanged (only the email lookup ran).

- [ ] **Step 6: Commit**

```bash
git add src/components/leads/LeadActionsModal.tsx
git commit -m "feat: add Investigate button to lead actions modal"
```
