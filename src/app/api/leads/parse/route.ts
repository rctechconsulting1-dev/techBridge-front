import OpenAI from "openai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { decodeJwtPayload } from "@/lib/auth-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_MODEL = process.env.OPENAI_MODEL_CONTENT_AGENT || "gpt-4o-mini";
const AI_TIMEOUT_MS = Number(process.env.AI_AGENT_TIMEOUT_MS || 60000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 20);
const MAX_RAW_TEXT_CHARS = 20000;

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
    const token = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length).trim()
      : null;
    const payload = token ? decodeJwtPayload(token) : null;
    const role = typeof payload?.role === "string" ? payload.role : null;
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

    const { source, rawText } = RequestSchema.parse(await request.json());

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timed out after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS);
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
        max_completion_tokens: 3000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "parsed_leads",
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
                  },
                },
              },
              required: ["leads"],
            },
          },
        },
      }),
      timeoutPromise,
    ]);

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
