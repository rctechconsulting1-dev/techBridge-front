/**
 * POST /api/intake/agent
 *
 * Cold-start conversational intake for clients with no existing website.
 *
 * Each turn the client sends:
 *   { token, messages, currentAnswers }
 * The agent returns:
 *   { reply, extractedAnswers, isComplete, suggestedDrafts }
 *
 * `extractedAnswers` is a delta — only the fields the agent is newly
 * confident about. The client merges it into local state so the review
 * form fills in progressively as the conversation goes. The agent leans
 * heavily on category priors ("most dog groomers offer these 6 services…")
 * so the client is picking from drafts, not typing from a blank prompt.
 *
 * Persistence happens when the client POSTs to /api/intake/submit, not here.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { verifyIntakeToken } from "@/lib/email";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import {
  AI_INTAKE_JSON_SCHEMA,
  cleanAiAnswers,
} from "@/lib/intake-ai-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Config ───────────────────────────────────────────────────────────────────
const AI_MODEL = process.env.OPENAI_MODEL_CONTENT_AGENT || "gpt-4o-mini";
const AI_TIMEOUT_MS = Number(process.env.AI_AGENT_TIMEOUT_MS || 60000);
const AI_MAX_COMPLETION_TOKENS = Number(
  process.env.AI_AGENT_MAX_COMPLETION_TOKENS || 3000,
);
const AI_RATE_LIMIT_WINDOW_MS = Number(
  process.env.AI_RATE_LIMIT_WINDOW_MS || 60000,
);
const AI_RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.AI_RATE_LIMIT_MAX_REQUESTS || 30,
);
const MAX_TURNS = 20;
const MAX_USER_MESSAGE_CHARS = 2000;

// ─── Request schema ───────────────────────────────────────────────────────────
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
});

const schema = z.object({
  token: z.string().min(1),
  messages: z.array(messageSchema).max(MAX_TURNS * 2),
  currentAnswers: z.record(z.string(), z.unknown()).optional().default({}),
  businessSeed: z
    .object({
      businessName: z.string().max(200).optional(),
      category: z.string().max(200).optional(),
      location: z.string().max(200).optional(),
    })
    .optional(),
});

// ─── JSON schema for turn output ──────────────────────────────────────────────
// Reuses the shared answer shape so the delta drops into the same form state.
// additionalProperties: false is required at every object level for strict mode.
const AGENT_TURN_SCHEMA = {
  name: "ai_intake_turn",
  schema: {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      reply: {
        type: "string",
        description:
          "The assistant's next message to the client. Friendly, concise, asks at most ONE question at a time, and offers concrete drafts to react to whenever possible.",
      },
      extractedAnswers: {
        ...AI_INTAKE_JSON_SCHEMA.schema.properties.answers,
        additionalProperties: false,
      },
      isComplete: {
        type: "boolean",
        description:
          "True once enough required fields are confidently filled (business_name, owner_name, location, ideal_client, brand_words, primary_offerings, business_phone, email_preference) that the client can proceed to review.",
      },
      suggestedDrafts: {
        type: "array",
        description:
          "Optional draft snippets the client can accept/tweak (e.g., drafted ideal_client description, service list, brand words).",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            field: { type: "string" },
            value: { type: "string" },
          },
          required: ["field", "value"],
        },
      },
    },
    required: ["reply", "extractedAnswers", "isComplete", "suggestedDrafts"],
  },
};

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

const SYSTEM_PROMPT = [
  "You are the techBridge onboarding assistant. You help a brand-new local-business owner",
  "fill out a website intake questionnaire through a short, friendly chat.",
  "",
  "Your primary goal: reduce the work for the owner. Instead of asking open-ended questions,",
  "lean on category priors — e.g., 'Most mobile dog groomers offer these six services at",
  "these typical price points. Which apply to you? I'll adjust the list.' The owner should",
  "almost always be REACTING to a draft, not writing from scratch.",
  "",
  "Rules:",
  "- Ask at most ONE question per turn. Keep replies under ~100 words.",
  "- Whenever you ask a question, also offer a concrete draft (list, example, suggestion).",
  "- Whenever the owner answers, update `extractedAnswers` with ONLY the fields you are",
  "  now confident about. Emit empty strings / empty arrays for everything else.",
  "- Never fabricate licenses, years-in-business, team size, or credentials. Ask.",
  "- `brand_words` should be 3 short adjectives. `primary_offerings` should be a short",
  "  list separated by newlines or commas. `ideal_client` should be one or two sentences.",
  "- Set `isComplete: true` only once you have confidently filled: business_name, owner_name,",
  "  location, ideal_client, brand_words, primary_offerings, business_phone, email_preference.",
  "- When `isComplete` is true, your `reply` should summarize what you filled in and tell the",
  "  owner they can now review and edit everything on the next screen.",
  "- Stay in scope. Don't write marketing copy beyond what maps to the intake fields. The",
  "  platform has a separate content agent for page copy.",
].join("\n");

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

  const tokenPayload = await verifyIntakeToken(parsed.data.token);
  if (!tokenPayload) {
    return NextResponse.json(
      { error: "Invalid or expired intake link. Please request a new one." },
      { status: 401 },
    );
  }

  // Rate limit per IP
  const forwardedFor = req.headers.get("x-forwarded-for") || "unknown";
  const ipKey = forwardedFor.split(",")[0]?.trim() || "unknown";
  const limiter = await checkRateLimit({
    namespace: "intake-agent",
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

  const { messages, currentAnswers, businessSeed } = parsed.data;

  // Build the OpenAI message array. The system prompt includes the current
  // snapshot of answers so the agent can skip what's already filled.
  const seed = businessSeed
    ? [
        "Seed context provided by the owner up front:",
        businessSeed.businessName ? `- Business name: ${businessSeed.businessName}` : null,
        businessSeed.category ? `- Category: ${businessSeed.category}` : null,
        businessSeed.location ? `- Location: ${businessSeed.location}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Seed context: (none provided yet — ask for business name, category, and location first)";

  const currentSnapshot = JSON.stringify(currentAnswers ?? {}, null, 2).slice(0, 4000);

  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: [
        seed,
        "",
        "Current intake answers already confirmed (do not re-ask these):",
        currentSnapshot,
      ].join("\n"),
    },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // If this is the first turn (no prior messages), prime an opening message.
  if (messages.length === 0) {
    openaiMessages.push({
      role: "user",
      content:
        "Please give me your opening message: greet me warmly, explain we'll do this together in about 5 minutes, and ask the single best first question to get going.",
    });
  }

  try {
    const openai = getOpenAI();
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: AI_MODEL,
        max_completion_tokens: AI_MAX_COMPLETION_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: { ...AGENT_TURN_SCHEMA, strict: true },
        },
        messages: openaiMessages,
      }),
      AI_TIMEOUT_MS,
    );

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsedTurn: {
      reply?: unknown;
      extractedAnswers?: unknown;
      isComplete?: unknown;
      suggestedDrafts?: unknown;
    };
    try {
      parsedTurn = JSON.parse(raw);
    } catch {
      parsedTurn = {};
    }

    const reply =
      typeof parsedTurn.reply === "string" && parsedTurn.reply.trim()
        ? parsedTurn.reply.trim()
        : "Sorry — I didn't catch that. Could you rephrase?";

    const extractedAnswers = cleanAiAnswers(parsedTurn.extractedAnswers);

    const isComplete =
      typeof parsedTurn.isComplete === "boolean" ? parsedTurn.isComplete : false;

    const suggestedDrafts = Array.isArray(parsedTurn.suggestedDrafts)
      ? parsedTurn.suggestedDrafts
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as { field?: unknown; value?: unknown };
            if (typeof entry.field !== "string" || typeof entry.value !== "string") {
              return null;
            }
            return { field: entry.field, value: entry.value };
          })
          .filter(Boolean)
      : [];

    return NextResponse.json({
      reply,
      extractedAnswers,
      isComplete,
      suggestedDrafts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent error";
    const isTimeout = /timed out/i.test(message);
    return NextResponse.json(
      { error: isTimeout ? "The assistant took too long. Please try again." : message },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
