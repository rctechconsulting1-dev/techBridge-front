import OpenAI from "openai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_MODEL = process.env.OPENAI_MODEL_CONTENT_AGENT || "gpt-4o-mini";
const RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 20);
// This route runs on a Vercel Hobby-tier function, hard-killed at ~60s
// regardless of anything set here. Measured generation speed for this
// model/schema is ~77 completion tokens/sec, so a paste this size (~65-70
// CSLB rows) needs ~3000-3500 completion tokens to finish, ~40-45s — safe
// margin under the platform ceiling. A larger paste must be split into
// multiple captures rather than raising these numbers further; raising
// them without more function time just trades a clean 422 for a bare
// platform timeout. Dedicated (not shared with content-agent's smaller,
// faster calls) so tuning one never silently affects the other.
const MAX_RAW_TEXT_CHARS = Number(process.env.AI_LEADS_PARSE_MAX_RAW_TEXT_CHARS || 7000);
const AI_LEADS_PARSE_MAX_COMPLETION_TOKENS = Number(
  process.env.AI_LEADS_PARSE_MAX_COMPLETION_TOKENS || 6000,
);
const AI_LEADS_PARSE_TIMEOUT_MS = Number(
  process.env.AI_LEADS_PARSE_TIMEOUT_MS || 50000,
);

const RequestSchema = z.object({
  source: z.enum(["google_maps", "facebook", "instagram", "craigslist", "cslb"]),
  rawText: z.string().min(1).max(MAX_RAW_TEXT_CHARS),
});

const DraftLead = z.object({
  businessName: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  websiteUrl: z.string(),
  licenseNumber: z.string(),
  rating: z.number().nullable(),
  reviewCount: z.number().nullable(),
  notes: z.string(),
});
const ParsedLeads = z.object({ leads: z.array(DraftLead) });

const SOURCE_GUIDANCE: Record<string, string> = {
  google_maps:
    "Google Maps search results text. It repeats per business: name (often twice), a rating like '5.0(88)' or 'No reviews', a category and street address separated by '·', open/closed status and hours, a phone number, and sometimes the word 'Website' (this only means a website link exists — the actual URL is never in the copied text, so leave websiteUrl empty even when you see 'Website'). Sometimes a customer review quote follows in quotes — put a short version of it in notes. Extract every distinct business listed once (duplicates can appear twice in the same paste — extract each occurrence, the caller deduplicates).",
  facebook:
    "Facebook ad or page text. Usually just ad copy and a page/business name. Phone, address, and email are rarely present — leave those fields empty rather than guessing.",
  instagram:
    "Instagram ad or profile text. Usually just ad copy and a page/business name. Phone, address, and email are rarely present — leave those fields empty rather than guessing.",
  craigslist:
    "A Craigslist listing. Usually a service description, sometimes a phone number or email. Extract whatever is actually present.",
  cslb:
    "CSLB (California contractor license board) search results, one business per line, columns in order: license number, business name, street address, city, zip, phone. There is never an email or trade/category per row in this data. Put the license number in licenseNumber, the city in a note if you can't find a dedicated field for it (there isn't one on this schema — leave it out), and the phone in phone.",
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set." }),
        { status: 500 },
      );
    }

    const authorizationHeader = request.headers.get("authorization");
    if (!authorizationHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
    }

    // Verify the caller against the backend's /auth/me, which runs the token
    // through jwt.verify — never trust an unverified, client-decoded payload
    // for an authorization decision (anyone can hand-craft a base64 JWT body
    // claiming role: "admin").
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
      console.error("[leads/parse] failed to verify auth token:", verifyError);
      return new Response(JSON.stringify({ error: "Could not verify authorization" }), { status: 502 });
    }

    if (role !== "admin" && role !== "platform_admin") {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
    const ipKey = forwardedFor.split(",")[0]?.trim() || "unknown";
    const limiter = await checkRateLimit({
      namespace: "leads-parse",
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
        JSON.stringify({
          error: "Invalid request",
          details: requestBody.error.flatten(),
        }),
        { status: 400 },
      );
    }
    const { source, rawText } = requestBody.data;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timed out after ${AI_LEADS_PARSE_TIMEOUT_MS}ms`)), AI_LEADS_PARSE_TIMEOUT_MS);
    });

    const completion = await Promise.race([
      client.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You extract structured business-lead records from raw copy-pasted text for a cold-outreach tool. Never fabricate a field you cannot see in the text — leave it as an empty string (or null for rating/reviewCount). " +
              SOURCE_GUIDANCE[source],
          },
          { role: "user", content: rawText },
        ],
        max_completion_tokens: AI_LEADS_PARSE_MAX_COMPLETION_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "parsed_leads",
            // Without strict mode, OpenAI treats `required` as a hint, not
            // a guarantee — the model can (and did, in production) omit
            // fields our Zod schema requires, failing validation. Strict
            // mode makes every listed field actually always present.
            strict: true,
            schema: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      businessName: { type: "string" },
                      contactName: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      websiteUrl: { type: "string" },
                      licenseNumber: { type: "string" },
                      rating: { type: ["number", "null"] },
                      reviewCount: { type: ["number", "null"] },
                      notes: { type: "string" },
                    },
                    required: [
                      "businessName",
                      "contactName",
                      "email",
                      "phone",
                      "websiteUrl",
                      "licenseNumber",
                      "rating",
                      "reviewCount",
                      "notes",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["leads"],
              additionalProperties: false,
            },
          },
        },
      }),
      timeoutPromise,
    ]);

    // Defense in depth: even with a generous token budget, an unusually
    // dense paste can still exhaust it mid-generation, leaving `content` as
    // truncated (invalid) JSON. finish_reason === "length" is OpenAI's own
    // signal that this happened — catch it here with an actionable message
    // instead of letting JSON.parse fail with an opaque syntax error.
    if (completion.choices[0]?.finish_reason === "length") {
      return new Response(
        JSON.stringify({
          error: "Too much text to parse in one request",
          details:
            "The AI response was cut off before finishing. Try pasting fewer listings at once.",
        }),
        { status: 422 },
      );
    }

    const content = completion.choices[0]?.message?.content || '{"leads":[]}';
    const parsed = ParsedLeads.parse(JSON.parse(content));

    return new Response(JSON.stringify(parsed), { status: 200 });
  } catch (error) {
    console.error("[leads/parse] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = error instanceof Error && /timed out/i.test(error.message);
    return new Response(
      JSON.stringify({ error: isTimeout ? "AI gateway timeout" : "Internal server error", details: message }),
      { status: isTimeout ? 504 : 500 },
    );
  }
}
