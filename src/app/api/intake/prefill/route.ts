/**
 * POST /api/intake/prefill
 *
 * AI-assisted intake pre-fill from an existing business website.
 *
 * Flow:
 *  1. Verify the intake token (same pattern as /api/intake/verify|submit).
 *  2. Rate-limit per IP (reuses the content-agent rate limiter).
 *  3. Fetch the provided URL, strip to readable text, cap size.
 *  4. Ask OpenAI to extract structured intake answers + suggested image URLs.
 *  5. Return the cleaned answers so the UI can hydrate the review form.
 *
 * This endpoint does not persist anything. The client reviews + edits the
 * prefilled answers and ultimately POSTs to /api/intake/submit, which is
 * the single write path into S3 (see src/lib/intake-storage.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { verifyIntakeToken } from "@/lib/email";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import {
  AI_INTAKE_JSON_SCHEMA,
  cleanAiAnswers,
  type AiSuggestedFile,
} from "@/lib/intake-ai-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Config ───────────────────────────────────────────────────────────────────
const AI_MODEL = process.env.OPENAI_MODEL_CONTENT_AGENT || "gpt-4o-mini";
const AI_TIMEOUT_MS = Number(process.env.AI_AGENT_TIMEOUT_MS || 60000);
const AI_MAX_COMPLETION_TOKENS = Number(
  process.env.AI_AGENT_MAX_COMPLETION_TOKENS || 2000,
);
const FETCH_TIMEOUT_MS = Number(process.env.INTAKE_PREFILL_FETCH_TIMEOUT_MS || 8000);
const MAX_HTML_BYTES = Number(process.env.INTAKE_PREFILL_MAX_HTML_BYTES || 800_000);
const MAX_TEXT_CHARS = Number(process.env.INTAKE_PREFILL_MAX_TEXT_CHARS || 20_000);
const MAX_IMAGE_CANDIDATES = 10;
const AI_RATE_LIMIT_WINDOW_MS = Number(
  process.env.AI_RATE_LIMIT_WINDOW_MS || 60000,
);
const AI_RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.AI_RATE_LIMIT_MAX_REQUESTS || 20,
);

// ─── Request schema ───────────────────────────────────────────────────────────
const schema = z.object({
  token: z.string().min(1),
  websiteUrl: z.string().url(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your environment.");
  }
  return new OpenAI({ apiKey });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fetch a URL and return a size-capped HTML body. We SSRF-gate the URL by
 * rejecting non-http(s) schemes and obvious loopback/private hostnames.
 */
async function fetchSiteHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid website URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Website URL must use http or https.");
  }

  const host = parsed.hostname.toLowerCase();
  const blocked = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254", // cloud metadata
  ];
  if (
    blocked.includes(host) ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("That hostname is not allowed.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "techBridge-intake-prefill/1.0 (+https://rdtechbridge.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new Error(`Site returned HTTP ${res.status}.`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("text/")) {
      throw new Error("That URL does not appear to be an HTML page.");
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { html: text.slice(0, MAX_HTML_BYTES), finalUrl: res.url };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    await reader.cancel().catch(() => {});
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { html: buffer.toString("utf-8"), finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strip HTML to a readable text blob. We skip <script>/<style> bodies and
 * collapse whitespace. Good enough for an LLM extraction pass — we don't
 * need DOM fidelity.
 */
function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
}

/** Pull a handful of image URLs (logo-likely, team-likely, and others). */
function extractImageCandidates(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    if (urls.size >= MAX_IMAGE_CANDIDATES) break;
    const raw = match[1];
    if (!raw) continue;
    try {
      const abs = new URL(raw, baseUrl).toString();
      if (abs.startsWith("http://") || abs.startsWith("https://")) {
        urls.add(abs);
      }
    } catch {
      // ignore malformed src
    }
  }
  // also grab og:image as a strong candidate
  const og = html.match(
    /<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']+)["']/i,
  );
  if (og?.[1]) {
    try {
      urls.add(new URL(og[1], baseUrl).toString());
    } catch {
      // ignore
    }
  }
  return Array.from(urls);
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

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

  // Token verification — same gate as /api/intake/submit
  const tokenPayload = await verifyIntakeToken(parsed.data.token);
  if (!tokenPayload) {
    return NextResponse.json(
      { error: "Invalid or expired intake link. Please request a new one." },
      { status: 401 },
    );
  }

  // Rate limit
  const forwardedFor = req.headers.get("x-forwarded-for") || "unknown";
  const ipKey = forwardedFor.split(",")[0]?.trim() || "unknown";
  const limiter = await checkRateLimit({
    namespace: "intake-prefill",
    key: ipKey,
    windowMs: AI_RATE_LIMIT_WINDOW_MS,
    maxRequests: AI_RATE_LIMIT_MAX_REQUESTS,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait and try again.",
        retryAfter: limiter.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } },
    );
  }

  // Scrape the site
  let siteText: string;
  let imageCandidates: string[] = [];
  let finalUrl = parsed.data.websiteUrl;
  try {
    const { html, finalUrl: resolvedUrl } = await fetchSiteHtml(parsed.data.websiteUrl);
    finalUrl = resolvedUrl;
    siteText = htmlToText(html);
    imageCandidates = extractImageCandidates(html, resolvedUrl);
    if (siteText.length < 200) {
      throw new Error(
        "Not enough readable content on that page. Try the homepage URL.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    return NextResponse.json(
      {
        error: `We couldn't read that site (${message}). You can continue without it or try a different URL.`,
      },
      { status: 422 },
    );
  }

  // Extract structured answers via OpenAI
  try {
    const openai = getOpenAI();
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: AI_MODEL,
        max_completion_tokens: AI_MAX_COMPLETION_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: AI_INTAKE_JSON_SCHEMA,
        },
        messages: [
          {
            role: "system",
            content: [
              "You are an onboarding assistant for a local-business website platform.",
              "Given the text content and image URLs from a business's existing website,",
              "extract the intake questionnaire answers you can CONFIDENTLY infer.",
              "Rules:",
              "- Never fabricate. If a field is not clearly supported by the source, emit an empty string (or empty array).",
              "- `brand_words`: infer 3 short adjectives from tone and design cues only if clear.",
              "- `customer_action`: pick up to 2 of the allowed enum values based on prominent CTAs on the site.",
              "- `suggestedFiles`: pick at most 3 image URLs that look like a logo, a team/owner headshot, or work samples. Prefer og:image for logo and larger contextual images for work. Each item must include a short `reason` string.",
              "- Keep written answers concise and first-person-friendly (the client will edit them).",
              "- `notes`: one short sentence summarizing what you couldn't confidently fill.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `Business website URL: ${finalUrl}`,
              "",
              "--- Readable text content (truncated) ---",
              siteText,
              "",
              "--- Image URL candidates ---",
              imageCandidates.length
                ? imageCandidates.join("\n")
                : "(none found)",
            ].join("\n"),
          },
        ],
      }),
      AI_TIMEOUT_MS,
    );

    const raw = completion.choices[0]?.message?.content || "{}";
    let payload: {
      answers?: unknown;
      suggestedFiles?: unknown;
      notes?: unknown;
    };
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }

    const cleanedAnswers = cleanAiAnswers(payload.answers);

    const suggestedFiles: AiSuggestedFile[] = Array.isArray(payload.suggestedFiles)
      ? (payload.suggestedFiles
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as {
              questionId?: unknown;
              url?: unknown;
              reason?: unknown;
            };
            const qid = entry.questionId;
            const url = entry.url;
            if (
              typeof qid !== "string" ||
              !["logo", "headshot", "work_photos"].includes(qid) ||
              typeof url !== "string" ||
              !/^https?:\/\//i.test(url)
            ) {
              return null;
            }
            return {
              questionId: qid as AiSuggestedFile["questionId"],
              url,
              reason: typeof entry.reason === "string" ? entry.reason : undefined,
            };
          })
          .filter(Boolean) as AiSuggestedFile[])
      : [];

    return NextResponse.json({
      source: "prefill",
      finalUrl,
      answers: cleanedAnswers,
      suggestedFiles,
      notes: typeof payload.notes === "string" ? payload.notes : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI extraction failed";
    const isTimeout = /timed out/i.test(message);
    return NextResponse.json(
      { error: isTimeout ? "AI extraction timed out. Please try again." : message },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
