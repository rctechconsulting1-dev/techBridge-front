import OpenAI from "openai";
import z from "zod";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getApiBaseUrl } from "@/lib/api";

// Ensure this route is always dynamic and runs on Node.js runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_DAILY_LIMIT = Number(process.env.AI_CONTENT_DAILY_LIMIT ?? 60);
const BACKEND_API_BASE = getApiBaseUrl();

type UsageRecord = {
  day: string;
  count: number;
};

const getUsageStore = (): Map<string, UsageRecord> => {
  const globalWithStore = globalThis as typeof globalThis & {
    __contentAgentUsageStore?: Map<string, UsageRecord>;
  };

  if (!globalWithStore.__contentAgentUsageStore) {
    globalWithStore.__contentAgentUsageStore = new Map<string, UsageRecord>();
  }

  return globalWithStore.__contentAgentUsageStore;
};

const decodeJwtPayload = (authorizationHeader: string | null): Record<string, unknown> | null => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const consumeUsage = (key: string, cost: number) => {
  const store = getUsageStore();
  const day = todayKey();
  const current = store.get(key);
  const active = current && current.day === day ? current : { day, count: 0 };

  if (active.count + cost > AI_DAILY_LIMIT) {
    return {
      allowed: false,
      used: active.count,
      remaining: Math.max(AI_DAILY_LIMIT - active.count, 0),
      limit: AI_DAILY_LIMIT,
    };
  }

  const updated = { ...active, count: active.count + cost };
  store.set(key, updated);

  return {
    allowed: true,
    used: updated.count,
    remaining: Math.max(AI_DAILY_LIMIT - updated.count, 0),
    limit: AI_DAILY_LIMIT,
  };
};

const consumeBackendEntitlementUsage = async ({
  authorizationHeader,
  tenantId,
  featureKey,
  amount,
  limitPerWindow,
}: {
  authorizationHeader: string | null;
  tenantId: number | null;
  featureKey: string;
  amount: number;
  limitPerWindow: number;
}) => {
  if (!authorizationHeader) {
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_API_BASE}/entitlements/usage/consume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
        ...(tenantId ? { "x-tenant-id": String(tenantId) } : {}),
      },
      body: JSON.stringify({
        featureKey,
        amount,
        limitPerWindow,
        window: "daily",
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  } catch {
    return null;
  }
};

const AI_MODEL = process.env.OPENAI_MODEL_CONTENT_AGENT || "gpt-4o-mini";
const AI_TIMEOUT_MS = Number(process.env.AI_AGENT_TIMEOUT_MS || 60000);
const AI_TIMEOUT_IDEAS_MS = Number(
  process.env.AI_AGENT_TIMEOUT_IDEAS_MS || 25000,
);
const AI_TIMEOUT_OUTLINE_MS = Number(
  process.env.AI_AGENT_TIMEOUT_OUTLINE_MS || 35000,
);
const AI_TIMEOUT_CONTENT_MS = Number(
  process.env.AI_AGENT_TIMEOUT_CONTENT_MS || 90000,
);
const AI_TIMEOUT_METADATA_MS = Number(
  process.env.AI_AGENT_TIMEOUT_METADATA_MS || 30000,
);
const AI_TIMEOUT_COMPETITOR_MS = Number(
  process.env.AI_AGENT_TIMEOUT_COMPETITOR_MS || 30000,
);
const AI_MAX_COMPLETION_TOKENS = Number(
  process.env.AI_AGENT_MAX_COMPLETION_TOKENS || 2000,
);
const AI_MAX_INPUT_CHARS = Number(process.env.AI_AGENT_MAX_INPUT_CHARS || 6000);
const AI_METADATA_MAX_CONTENT_CHARS = Number(
  process.env.AI_METADATA_MAX_CONTENT_CHARS || 12000,
);
const AI_RATE_LIMIT_WINDOW_MS = Number(
  process.env.AI_RATE_LIMIT_WINDOW_MS || 60000,
);
const AI_RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.AI_RATE_LIMIT_MAX_REQUESTS || 20,
);

const RequestSchema = z.object({
  websiteId: z.number().int().positive().optional(),
  mode: z
    .enum([
      "standard",
      "service_copy",
      "about_copy",
      "page_nav_copy",
      "site_settings_orchestrator",
      "built_in_page_seo",
      "location_page",
      "suggest_seo_answers",
    ])
    .optional(),
  ourUrl: z.string().optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
  keyword: z.string().optional(),
  pageKey: z.enum(["home", "services", "about", "shop"]).optional(),
  competitor1Url: z.string().optional(),
  competitor2Url: z.string().optional(),
  service: z.string().optional(),
  pageSlug: z.string().optional(),
  pageTitle: z.string().optional(),
  pageIntent: z.string().optional(),
  pageGoal: z.string().optional(),
  targetAudience: z.string().optional(),
  primaryCta: z.string().optional(),
  mustInclude: z.array(z.string()).optional(),
  mustAvoid: z.array(z.string()).optional(),
  servicesOffered: z.array(z.string()).optional(),
  businessName: z.string().optional(),
  aboutContext: z.string().optional(),
  userChosenIdea: z.string().optional(),
  content: z.string().optional(),
  rawContext: z.string().optional(),
  conversionMode: z.string().optional(),
});

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your environment to use /api/content-agent.");
  }
  return new OpenAI({ apiKey });
}

function trimToCap(value: string | undefined, cap: number): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > cap ? trimmed.slice(0, cap) : trimmed;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`AI request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

//Prompt Chaining Steps
/*
1. User provides input data (ourUrl, city, industry, keyword, competitor1Url, competitor2Url, service)
2. Prompt: I am a content creator assistant. Here is my competitor's site: My company is in the ${industry} industry. Help me create 3 ideas to rank for the keyword "${keyword}" in ${city}.
3. User selects one idea from the 3 options
4. Create detailed content outline for the chosen idea, including: appropriate h1,h2,h3, seo best practices and accessibility
5. Write full markdown content based on the outline with SEO optimization
6. Analyze competitor content for gaps and opportunities. Give me target keywords for each idea, title, and strategy components.
7. Generate SEO metadata (title, description, keywords) for the final content according to Google best practices
*/

//Define the data models
const ContentIdeas = z.object({
  ideas: z.array(z.object({
    idea: z.string(),
    keywordTargets: z.array(z.string()),
    ideaType: z.string().optional(),
    intentMatchScore: z.number().min(0).max(100).optional(),
    whyMatch: z.string().optional(),
  }))
});

const Content = z.object({
    content: z.string()
});

const MarkdownContent = z.object({
    markdownContent: z.string()
});

const Metadata = z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string())
});

const ServiceCopyPack = z.object({
  heroHeadline: z.string(),
  heroSubheadline: z.string(),
  ctaHeadline: z.string(),
  ctaBody: z.string(),
  services: z.array(
    z.object({
      title: z.string(),
      slug: z.string(),
      description: z.string(),
      seoTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywordTargets: z.array(z.string()).optional(),
    }),
  ),
});

const AboutCopyPack = z.object({
  aboutHeadline: z.string(),
  aboutBody: z.string(),
  teamName: z.string(),
  teamTitle: z.string(),
  teamBio: z.string(),
  contactCtaHeadline: z.string(),
  contactCtaBody: z.string(),
});

const LocationPageCopyPack = z.object({
  heroHeadline: z.string(),
  heroBody: z.string(),
  bodyContent: z.string(),
  whyUs: z.string(),
  ctaHeadline: z.string(),
  ctaBody: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  nearbyAreas: z.array(z.string()),
});

const BuiltInPageSeoPack = z.object({
  primaryKeyword: z.string(),
  supportingTerms: z.array(z.string()),
  recommendedFields: z.record(z.string(), z.string()),
  seoTitle: z.string(),
  seoDescription: z.string(),
  missingInputs: z.array(z.string()),
  rationale: z.array(z.string()),
});

const BUILT_IN_PAGE_FIELDS: Record<
  "home" | "services" | "about" | "shop",
  string[]
> = {
  home: [
    "heroTitle",
    "heroBody",
    "heroPrimaryCtaText",
    "heroPrimaryCtaUrl",
    "ctaHeadline",
    "ctaBody",
    "ctaButtonText",
    "ctaButtonUrl",
  ],
  services: ["heroTitle", "heroBody", "emptyStateTitle", "emptyStateBody"],
  about: ["heroTitle", "heroBody", "missionTitle", "missionBody"],
  shop: ["heroTitle", "heroBody", "emptyStateTitle", "emptyStateBody"],
};

type JsonSchema = {
  name: string;
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
};

async function gatewayStructuredCall<T>(args: {
  messages: { role: "system" | "user"; content: string }[];
  responseSchema: JsonSchema;
  parser: (input: unknown) => T;
  maxCompletionTokens?: number;
  timeoutMs?: number;
}): Promise<T> {
  const response = await withTimeout(
    getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: args.messages,
      max_completion_tokens:
        args.maxCompletionTokens ?? AI_MAX_COMPLETION_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: args.responseSchema,
      },
    }),
    args.timeoutMs ?? AI_TIMEOUT_MS,
  );

  const content = response.choices[0]?.message?.content || "{}";
  return args.parser(JSON.parse(content));
}

//Define the functions/tools
const generateContentIdeasStandard = async ({
  city,
  industry,
  keyword,
}: {
  city: string;
  industry: string;
  keyword: string;
}) => {
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a specialist SEO ideation agent. Return concise, practical ideas for local business pages.",
      },
      {
        role: "user",
        content: `Company industry: ${industry}. City: ${city}. Target keyword: ${keyword}. Generate exactly 3 ideas to rank locally with keyword targets for each idea.`,
      },
    ],
    responseSchema: {
      name: "content_ideas",
      schema: {
        type: "object",
        properties: {
          ideas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                idea: { type: "string" },
                keywordTargets: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["idea", "keywordTargets"],
            },
          },
        },
        required: ["ideas"],
      },
    },
    parser: (raw) => ContentIdeas.parse(raw),
    maxCompletionTokens: 600,
    timeoutMs: AI_TIMEOUT_IDEAS_MS,
  });
};

const generateContentIdeasIntent = async ({
  city,
  industry,
  keyword,
  pageSlug,
  pageTitle,
  pageIntent,
  pageGoal,
  targetAudience,
  primaryCta,
  mustInclude,
  mustAvoid,
}: {
  city: string;
  industry: string;
  keyword: string;
  pageSlug?: string;
  pageTitle?: string;
  pageIntent?: string;
  pageGoal?: string;
  targetAudience?: string;
  primaryCta?: string;
  mustInclude?: string[];
  mustAvoid?: string[];
}) => {
  const requiredTopics = (mustInclude || []).filter(Boolean).join(", ");
  const excludedTopics = (mustAvoid || []).filter(Boolean).join(", ");

  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a specialist SEO ideation agent. Return concise, practical ideas for local business pages and stay tightly aligned to the requested page intent.",
      },
      {
        role: "user",
        content: `Company industry: ${industry}. City: ${city}. Target keyword: ${keyword}.
Page slug: ${pageSlug || "n/a"}. Page title: ${pageTitle || "n/a"}.
Page intent: ${pageIntent || "general"}. Page goal: ${pageGoal || "conversion"}.
Target audience: ${targetAudience || "local customers"}. Primary CTA: ${primaryCta || "contact us"}.
Must include topics: ${requiredTopics || "none"}. Must avoid topics: ${excludedTopics || "none"}.

Generate exactly 3 ideas that fit this page specifically.
For each idea, return:
- idea (short summary)
- keywordTargets (3-6)
- ideaType (example: pricing-guide, faq, comparison, service-overview)
- intentMatchScore (0-100 confidence that this idea matches requested page intent)
- whyMatch (1 sentence explaining fit)

If page intent is pricing, avoid generic blog post angles unless they directly answer pricing decisions.`,
      },
    ],
    responseSchema: {
      name: "content_ideas",
      schema: {
        type: "object",
        properties: {
          ideas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                idea: { type: "string" },
                keywordTargets: {
                  type: "array",
                  items: { type: "string" },
                },
                ideaType: { type: "string" },
                intentMatchScore: { type: "number" },
                whyMatch: { type: "string" },
              },
              required: ["idea", "keywordTargets", "ideaType", "intentMatchScore", "whyMatch"],
            },
          },
        },
        required: ["ideas"],
      },
    },
    parser: (raw) => ContentIdeas.parse(raw),
    maxCompletionTokens: 600,
    timeoutMs: AI_TIMEOUT_IDEAS_MS,
  });
};

const generateSiteSettingsIdeas = async ({
  city,
  industry,
  keyword,
  service,
  competitor1Url,
}: {
  city: string;
  industry: string;
  keyword: string;
  service?: string;
  competitor1Url?: string;
}) => {
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a Site Settings AI Orchestrator. Coordinate these specialist perspectives: Positioning Specialist, Local SEO Specialist, and Conversion Copy Specialist. Return 3 homepage/service framing ideas suitable for hero + CTA + starter services.",
      },
      {
        role: "user",
        content: `Business context:
- Industry: ${industry}
- City: ${city}
- Primary keyword: ${keyword}
- Core service: ${service || "n/a"}
- Competitor URL: ${competitor1Url || "n/a"}

Generate exactly 3 ideas for Site Settings copy direction.
Each idea should be practical for hero headline/subheadline, CTA, and 2-3 starter services.
Return only concise ideas with keyword targets.`,
      },
    ],
    responseSchema: {
      name: "site_settings_ideas",
      schema: {
        type: "object",
        properties: {
          ideas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                idea: { type: "string" },
                keywordTargets: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["idea", "keywordTargets"],
            },
          },
        },
        required: ["ideas"],
      },
    },
    parser: (raw) => ContentIdeas.parse(raw),
    maxCompletionTokens: 700,
    timeoutMs: AI_TIMEOUT_IDEAS_MS,
  });
};

const createSiteSettingsOutline = async ({
  userChosenIdea,
  city,
  industry,
  keyword,
}: {
  userChosenIdea: string;
  city: string;
  industry: string;
  keyword: string;
}) => {
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a Content Structure Specialist for local business websites. Build outlines that can power homepage hero, CTA, and service blocks.",
      },
      {
        role: "user",
        content: `Create a structured outline from this chosen direction: ${userChosenIdea}
Context: ${industry} business in ${city}, targeting ${keyword}.
Include sections for hero framing, trust points, featured services, and CTA path.`,
      },
    ],
    responseSchema: {
      name: "site_settings_outline",
      schema: {
        type: "object",
        properties: {
          content: { type: "string" },
        },
        required: ["content"],
      },
    },
    parser: (raw) => Content.parse(raw),
    maxCompletionTokens: 1000,
    timeoutMs: AI_TIMEOUT_OUTLINE_MS,
  });
};

const writeSiteSettingsMarkdown = async ({
  outline,
  userChosenIdea,
  city,
  industry,
  keyword,
}: {
  outline: string;
  userChosenIdea: string;
  city: string;
  industry: string;
  keyword: string;
}) => {
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a Conversion Copy Specialist. Produce markdown suitable for extracting hero intro and starter service sections from H2 headings.",
      },
      {
        role: "user",
        content: `Using this outline:
${outline}

Write complete markdown content for the direction: "${userChosenIdea}".
Business context: ${industry} in ${city}, keyword ${keyword}.

Requirements:
- Use clear H2 sections for service opportunities (these become starter services)
- Keep copy actionable and conversion-focused
- Include trust proof and a strong CTA
- Keep the content practical for site settings application`,
      },
    ],
    responseSchema: {
      name: "site_settings_markdown",
      schema: {
        type: "object",
        properties: {
          markdownContent: { type: "string" },
        },
        required: ["markdownContent"],
      },
    },
    parser: (raw) => MarkdownContent.parse(raw),
    maxCompletionTokens: 1700,
    timeoutMs: AI_TIMEOUT_CONTENT_MS,
  });
};

const analyzeCompetitorGaps = async ({
  contentIdeas,
  competitor1Url
}: {
  contentIdeas: { idea: string }[],
  competitor1Url: string
}) => {
  const response = await gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are an SEO gap analysis specialist. Return concrete gaps and strategy components.",
      },
      {
        role: "user",
        content: `Based on these content ideas:
1. ${contentIdeas?.[0]?.idea || ""}
2. ${contentIdeas?.[1]?.idea || ""}
3. ${contentIdeas?.[2]?.idea || ""}

Competitor URL: ${competitor1Url}

Analyze potential gaps and opportunities. Provide target keywords, titles, and strategy components for each idea. Focus on what content gaps might exist that we could fill.` 
      },
    ],
    responseSchema: {
      name: "competitor_analysis",
      schema: {
        type: "object",
        properties: {
          gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keywordTargets: { type: "array", items: { type: "string" } },
                title: { type: "string" },
                strategyComponents: { type: "array", items: { type: "string" } },
              },
              required: ["keywordTargets", "title", "strategyComponents"],
            },
          },
        },
        required: ["gaps"],
      },
    },
    parser: (raw) => raw as { gaps: unknown[] },
    maxCompletionTokens: 900,
    timeoutMs: AI_TIMEOUT_COMPETITOR_MS,
  });

  return JSON.stringify(response);
};

const createContentOutline = async ({
  userChosenIdea,
  pageIntent,
  pageGoal,
  targetAudience,
  primaryCta,
  mustInclude,
  mustAvoid,
}: {
  userChosenIdea: string;
  pageIntent?: string;
  pageGoal?: string;
  targetAudience?: string;
  primaryCta?: string;
  mustInclude?: string[];
  mustAvoid?: string[];
}) => {
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are an SEO outline specialist. Produce a practical heading structure with key points and strictly align to the page intent.",
      },
      {
        role: "user",
        content: `Create a detailed content outline for: ${userChosenIdea}.
Page intent: ${pageIntent || "general"}
Page goal: ${pageGoal || "conversion"}
Target audience: ${targetAudience || "local prospects"}
Primary CTA: ${primaryCta || "contact us"}
Must include: ${(mustInclude || []).join(", ") || "none"}
Must avoid: ${(mustAvoid || []).join(", ") || "none"}

Include H1, H2, H3 headings, key points, local SEO and accessibility best practices.
Do not shift to unrelated formats (for example blog narrative) unless the intent requires it.`,
      },
    ],
    responseSchema: {
      name: "content",
      schema: {
        type: "object",
        properties: {
          content: { type: "string" },
        },
        required: ["content"],
      },
    },
    parser: (raw) => Content.parse(raw),
    maxCompletionTokens: 1100,
    timeoutMs: AI_TIMEOUT_OUTLINE_MS,
  });
};

const writeMarkdownContent = async ({ outline, userChosenIdea, city, industry, keyword, pageIntent, pageGoal, targetAudience, primaryCta, mustInclude, mustAvoid }: { 
  outline: string, 
  userChosenIdea: string,
  city: string,
  industry: string, 
  keyword: string,
  pageIntent?: string,
  pageGoal?: string,
  targetAudience?: string,
  primaryCta?: string,
  mustInclude?: string[],
  mustAvoid?: string[]
}) => {
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content: `You are a specialist long-form copywriter for ${industry}. Prioritize clarity, conversion, and local SEO relevance for ${city}.`,
      },
      {
        role: "user",
        content: `Based on this content outline:
${outline}

      Write complete markdown page content for: "${userChosenIdea}"

Requirements:
- Use proper markdown syntax (# ## ### for headings)
- Target keyword: "${keyword}"
- Location: ${city}
- Industry: ${industry}
      - Page intent: ${pageIntent || "general"}
      - Page goal: ${pageGoal || "conversion"}
      - Target audience: ${targetAudience || "local prospects"}
      - Primary CTA: ${primaryCta || "contact us"}
      - Must include: ${(mustInclude || []).join(", ") || "none"}
      - Must avoid: ${(mustAvoid || []).join(", ") || "none"}
- Include SEO-optimized headings with the target keyword
- Write engaging, informative content
- Add relevant examples and practical tips
      - Include a strong call-to-action aligned to the primary CTA at the end
- Use appropriate heading hierarchy (H1, H2, H3)
- Ensure accessibility with clear structure
- Target length: 1000-1500 words

      Focus on providing real value while naturally incorporating the target keyword and location.
      Do not drift away from the requested page intent.` 
      },
    ],
    responseSchema: {
      name: "markdown_content",
      schema: {
        type: "object",
        properties: {
          markdownContent: { type: "string" },
        },
        required: ["markdownContent"],
      },
    },
    parser: (raw) => MarkdownContent.parse(raw),
    maxCompletionTokens: 1800,
    timeoutMs: AI_TIMEOUT_CONTENT_MS,
  });
};

const generateMetadata = async ({ content }: { content: string }) => {
  const cappedContent = content.slice(0, AI_METADATA_MAX_CONTENT_CHARS);
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are an SEO metadata specialist. Output concise, click-worthy and factual metadata.",
      },
      {
        role: "user",
        content: `Generate SEO metadata for the following content: ${cappedContent}`,
      },
    ],
    responseSchema: {
      name: "metadata",
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          keywords: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["title", "description", "keywords"],
      },
    },
    parser: (raw) => Metadata.parse(raw),
    maxCompletionTokens: 500,
    timeoutMs: AI_TIMEOUT_METADATA_MS,
  });
};

const generateServiceCopyPack = async ({
  city,
  industry,
  keyword,
  competitor1Url,
  servicesOffered,
}: {
  city: string;
  industry: string;
  keyword: string;
  competitor1Url?: string;
  servicesOffered: string[];
}) => {
  const normalizedServices = servicesOffered
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a local SEO service-page copy specialist. IMPORTANT: Do not generate blog topics. Generate only concrete services provided by the business. Use concise conversion-focused copy.",
      },
      {
        role: "user",
        content: `Create a structured service copy pack for a ${industry} business in ${city}.\n\nPrimary keyword: ${keyword}\nCompetitor URL (optional): ${competitor1Url || "N/A"}\n\nServices offered by client (must remain service offerings, not blog ideas):\n${normalizedServices.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nRequirements:\n- Keep services aligned to the provided services list (can normalize naming only).\n- Do not output informational article topics (e.g. costs, benefits, regulations) as services.\n- Each service description must be 2-3 sentences focused on outcomes, deliverables, and local trust.\n- Include strong local SEO language naturally (city/service area).\n- Include hero + CTA suitable for a service business homepage.`,
      },
    ],
    responseSchema: {
      name: "service_copy_pack",
      schema: {
        type: "object",
        properties: {
          heroHeadline: { type: "string" },
          heroSubheadline: { type: "string" },
          ctaHeadline: { type: "string" },
          ctaBody: { type: "string" },
          services: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                slug: { type: "string" },
                description: { type: "string" },
                seoTitle: { type: "string" },
                metaDescription: { type: "string" },
                keywordTargets: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["title", "slug", "description"],
            },
          },
        },
        required: [
          "heroHeadline",
          "heroSubheadline",
          "ctaHeadline",
          "ctaBody",
          "services",
        ],
      },
    },
    parser: (raw) => ServiceCopyPack.parse(raw),
    maxCompletionTokens: 1800,
    timeoutMs: AI_TIMEOUT_CONTENT_MS,
  });
};

const generateAboutCopyPack = async ({
  city,
  industry,
  businessName,
  aboutContext,
}: {
  city: string;
  industry: string;
  businessName: string;
  aboutContext?: string;
}) => {
  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are an About-page copy specialist for local businesses. Write concise trust-building copy, not blog content.",
      },
      {
        role: "user",
        content: `Create an About copy pack for business ${businessName} in ${city} (${industry}).\n\nContext from admin: ${aboutContext || "N/A"}\n\nRequirements:\n- About body should be 2 concise paragraphs max.\n- Team bio should be practical and trust-focused.\n- CTA should invite contact/consultation.`,
      },
    ],
    responseSchema: {
      name: "about_copy_pack",
      schema: {
        type: "object",
        properties: {
          aboutHeadline: { type: "string" },
          aboutBody: { type: "string" },
          teamName: { type: "string" },
          teamTitle: { type: "string" },
          teamBio: { type: "string" },
          contactCtaHeadline: { type: "string" },
          contactCtaBody: { type: "string" },
        },
        required: [
          "aboutHeadline",
          "aboutBody",
          "teamName",
          "teamTitle",
          "teamBio",
          "contactCtaHeadline",
          "contactCtaBody",
        ],
      },
    },
    parser: (raw) => AboutCopyPack.parse(raw),
    maxCompletionTokens: 900,
    timeoutMs: AI_TIMEOUT_OUTLINE_MS,
  });
};

const generateLocationPageCopy = async ({
  city,
  service,
  businessName,
  industry,
  servicesOffered,
  nearbyAreas,
  context,
}: {
  city: string;
  service: string;
  businessName: string;
  industry: string;
  servicesOffered: string[];
  nearbyAreas?: string[];
  context?: string;
}) => {
  const nearbyList = nearbyAreas && nearbyAreas.length > 0
    ? nearbyAreas.join(", ")
    : "N/A";

  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a local SEO specialist writing city-specific service pages for small businesses. Write conversion-focused copy with genuine local intent. Do not fabricate awards, certifications, or years in business unless provided.",
      },
      {
        role: "user",
        content: `Generate a complete location page copy pack for:

Business: ${businessName}
Industry: ${industry}
Primary Service: ${service}
Target City: ${city}
Other services: ${servicesOffered.join(", ") || "N/A"}
Nearby areas to mention: ${nearbyList}
Additional context: ${context || "N/A"}

Requirements:
- heroHeadline: H1 keyword-rich, e.g. "Professional Plumbing in San Jose, CA"
- heroBody: 2 sentences max. Who, what, where, why call now.
- bodyContent: 3–4 short paragraphs (markdown). Cover: what we do in ${city}, why local matters, process/approach, trust signals. Do NOT invent facts not provided.
- whyUs: 2–3 bullet points (markdown) specific to the city and service.
- ctaHeadline: Short, direct call to action headline.
- ctaBody: 1 sentence reinforcing urgency or value.
- metaTitle: SEO title, 50–60 chars, format: "${service} in ${city} | ${businessName}"
- metaDescription: 140–160 chars, includes city + service + CTA signal.
- nearbyAreas: array of 3–6 nearby cities/areas the business realistically serves from ${city}.`,
      },
    ],
    responseSchema: {
      name: "location_page_copy_pack",
      schema: {
        type: "object",
        properties: {
          heroHeadline: { type: "string" },
          heroBody: { type: "string" },
          bodyContent: { type: "string" },
          whyUs: { type: "string" },
          ctaHeadline: { type: "string" },
          ctaBody: { type: "string" },
          metaTitle: { type: "string" },
          metaDescription: { type: "string" },
          nearbyAreas: { type: "array", items: { type: "string" } },
        },
        required: [
          "heroHeadline",
          "heroBody",
          "bodyContent",
          "whyUs",
          "ctaHeadline",
          "ctaBody",
          "metaTitle",
          "metaDescription",
          "nearbyAreas",
        ],
      },
    },
    parser: (raw) => LocationPageCopyPack.parse(raw),
    maxCompletionTokens: 2000,
    timeoutMs: AI_TIMEOUT_CONTENT_MS,
  });
};

const generateBuiltInPageSeoPack = async ({
  pageKey,
  city,
  industry,
  keyword,
  businessName,
  recipe,
  conversionMode,
  themePack,
  servicesOffered,
  context,
}: {
  pageKey: "home" | "services" | "about" | "shop";
  city: string;
  industry: string;
  keyword: string;
  businessName?: string;
  recipe?: string;
  conversionMode?: string;
  themePack?: string;
  servicesOffered: string[];
  context?: string;
}) => {
  const fieldList = BUILT_IN_PAGE_FIELDS[pageKey];

  return gatewayStructuredCall({
    messages: [
      {
        role: "system",
        content:
          "You are a built-in page SEO specialist for local business websites. Return field-by-field copy only for the allowed CMS fields. Optimize for ranking and conversion without inventing facts.",
      },
      {
        role: "user",
        content: `Generate SEO-first built-in page copy for this page:

Page key: ${pageKey}
Business name: ${businessName || "Unknown business"}
Business context/site profile: ${industry}
City/service area: ${city}
Target keyword: ${keyword}
Recipe: ${recipe || "not provided"}
Conversion mode: ${conversionMode || "not provided"}
Theme pack: ${themePack || "not provided"}
Services offered: ${servicesOffered.join(", ") || "not provided"}

Allowed CMS fields for this page: ${fieldList.join(", ")}

Additional trusted context:
${context || "No additional context provided."}

Requirements:
- Return concise, implementation-ready copy for the allowed fields only.
- Match local intent and conversion intent.
- Do not invent licenses, awards, years in business, review counts, or neighborhoods.
- If facts are missing, reflect that in missingInputs instead of fabricating them.
- SEO title and SEO description must be specific and usable.
- heroPrimaryCtaUrl and ctaButtonUrl may use #contact, /contact, /services, or /shop when appropriate.
- For services/shop empty states, write only if useful for this page type.
`,
      },
    ],
    responseSchema: {
      name: "built_in_page_seo_pack",
      schema: {
        type: "object",
        properties: {
          primaryKeyword: { type: "string" },
          supportingTerms: {
            type: "array",
            items: { type: "string" },
          },
          recommendedFields: {
            type: "object",
            additionalProperties: { type: "string" },
          },
          seoTitle: { type: "string" },
          seoDescription: { type: "string" },
          missingInputs: {
            type: "array",
            items: { type: "string" },
          },
          rationale: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "primaryKeyword",
          "supportingTerms",
          "recommendedFields",
          "seoTitle",
          "seoDescription",
          "missingInputs",
          "rationale",
        ],
      },
    },
    parser: (raw) => BuiltInPageSeoPack.parse(raw),
    maxCompletionTokens: 1500,
    timeoutMs: AI_TIMEOUT_CONTENT_MS,
  });
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: "OPENAI_API_KEY is not set. Add it to your environment to use this endpoint.",
      }), { status: 500 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
    const ipKey = forwardedFor.split(",")[0]?.trim() || "unknown";
    const limiter = await checkRateLimit({
      namespace: "content-agent",
      key: ipKey,
      windowMs: AI_RATE_LIMIT_WINDOW_MS,
      maxRequests: AI_RATE_LIMIT_MAX_REQUESTS,
    });
    if (!limiter.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          details: `Too many requests. Retry in ${limiter.retryAfter}s. (${limiter.source})`,
        }),
        {
          status: 429,
          headers: { "Retry-After": String(limiter.retryAfter) },
        },
      );
    }

    const body = RequestSchema.parse(await request.json());
    const headerWebsiteId = request.headers.get("x-website-id");
    const headerTenantId = request.headers.get("x-tenant-id");
    const websiteId =
      toPositiveInteger(body.websiteId) ?? toPositiveInteger(headerWebsiteId);
    const authorizationHeader = request.headers.get("authorization");
    const tokenPayload = decodeJwtPayload(authorizationHeader);
    const tenantId =
      toPositiveInteger(headerTenantId) ??
      toPositiveInteger(tokenPayload?.tenant_id) ??
      toPositiveInteger(tokenPayload?.tenantId) ??
      toPositiveInteger(tokenPayload?.active_tenant_id) ??
      toPositiveInteger(tokenPayload?.activeTenantId);
    const role =
      typeof tokenPayload?.role === "string" ? tokenPayload.role : null;
    const bypassEntitlementsForRole =
      role === "admin" || role === "platform_admin";
    const userId = tokenPayload?.sub ? String(tokenPayload.sub) : "anonymous";
    const usageKey = `website:${websiteId ?? "unscoped"}|user:${userId}|ip:${ipKey}`;

    const usageCost = body.userChosenIdea && !body.content ? 3 : 1;
    const entitlementUsage = bypassEntitlementsForRole
      ? null
      : await consumeBackendEntitlementUsage({
          authorizationHeader,
          tenantId,
          featureKey: "ai.agent.generate",
          amount: usageCost,
          limitPerWindow: AI_DAILY_LIMIT,
        });

    if (entitlementUsage && !entitlementUsage.ok) {
      const payload = entitlementUsage.payload as { code?: string; error?: string };
      if (entitlementUsage.status === 403 || entitlementUsage.status === 429) {
        return new Response(
          JSON.stringify({
            error:
              entitlementUsage.status === 403
                ? "AI feature access is not enabled for this tenant."
                : "Daily AI usage limit reached for this tenant.",
            code: payload?.code,
            details: payload,
          }),
          { status: entitlementUsage.status },
        );
      }
    }

    const usage = consumeUsage(usageKey, usageCost);
    if (!usage.allowed) {
      return new Response(
        JSON.stringify({
          error: "Daily AI usage limit reached for this workspace context.",
          usage,
        }),
        { status: 429 },
      );
    }

    const mode = body.mode ?? "standard";
    const city = trimToCap(body.city, 120);
    const industry = trimToCap(body.industry, 120);
    const keyword = trimToCap(body.keyword, 160);
    const competitor1Url = trimToCap(body.competitor1Url, 500);
    const userChosenIdea = trimToCap(body.userChosenIdea, 400);
    const content = trimToCap(body.content, AI_MAX_INPUT_CHARS);
    const pageSlug = trimToCap(body.pageSlug, 120);
    const pageTitle = trimToCap(body.pageTitle, 160);
    const pageIntent = trimToCap(body.pageIntent, 80);
    const pageGoal = trimToCap(body.pageGoal, 120);
    const targetAudience = trimToCap(body.targetAudience, 180);
    const primaryCta = trimToCap(body.primaryCta, 120);
    const mustInclude = (body.mustInclude || [])
      .map((s) => trimToCap(s, 120) || "")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const mustAvoid = (body.mustAvoid || [])
      .map((s) => trimToCap(s, 120) || "")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const servicesOffered = (body.servicesOffered || [])
      .map((s) => trimToCap(s, 120) || "")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    const pageKey = body.pageKey;
    const normalizedBusinessName = trimToCap(body.businessName, 120) || undefined;

    // ── suggest_seo_answers ─────────────────────────────────────────────────
    // Infers SEO question answers from all available tenant context so the
    // admin doesn't have to know the tenant's trade/industry.
    if (mode === "suggest_seo_answers") {
      const rawContext = trimToCap(body.rawContext, 3000) || "";
      const conversionMode = trimToCap(body.conversionMode, 80) || "call";

      const SuggestedAnswers = z.object({
        targetKeyword: z.string(),
        targetCity: z.string(),
        primaryService: z.string(),
        idealCustomer: z.string(),
        differentiator: z.string(),
        trustSignals: z.string(),
        conversionGoal: z.string(),
        priorityServices: z.string().optional(),
        customerProblems: z.string().optional(),
        businessStory: z.string().optional(),
        credibility: z.string().optional(),
        productFocus: z.string().optional(),
        customerFit: z.string().optional(),
        storeDifferentiator: z.string().optional(),
      });

      const pack = await gatewayStructuredCall({
        messages: [
          {
            role: "system",
            content: [
              "You are an SEO strategist helping a platform admin build local-business websites.",
              "Given the business context below, infer concise, factual answers for each SEO question field.",
              "Rules:",
              "- Never fabricate credentials, licenses, or claims not present in the context.",
              "- targetKeyword: primary keyword phrase the home page should rank for, e.g. 'electrician sacramento'.",
              "- targetCity: city or service area name only.",
              "- primaryService: list the top 1-3 services/offers, one per line.",
              "- idealCustomer: describe who needs this business (homeowners, restaurant owners, etc.).",
              "- differentiator: 1-2 sentences on what makes this business stand out.",
              "- trustSignals: bullet list of verifiable trust items (licenses, years, ratings, certifications).",
              `- conversionGoal: one of 'Call us now', 'Request a free quote', 'Book an appointment', 'Make a reservation', 'Shop now' — pick based on conversion mode '${conversionMode}'.`,
              "- For page-specific keys (priorityServices, businessStory, etc.) provide relevant content or leave blank if not applicable.",
              "- Keep answers short enough to fit in a text input — no markdown headers, no long prose.",
            ].join("\n"),
          },
          {
            role: "user",
            content: rawContext || "No context provided. Use generic placeholders.",
          },
        ],
        responseSchema: {
          name: "suggested_seo_answers",
          schema: {
            type: "object",
            properties: {
              targetKeyword: { type: "string" },
              targetCity: { type: "string" },
              primaryService: { type: "string" },
              idealCustomer: { type: "string" },
              differentiator: { type: "string" },
              trustSignals: { type: "string" },
              conversionGoal: { type: "string" },
              priorityServices: { type: "string" },
              customerProblems: { type: "string" },
              businessStory: { type: "string" },
              credibility: { type: "string" },
              productFocus: { type: "string" },
              customerFit: { type: "string" },
              storeDifferentiator: { type: "string" },
            },
            required: [
              "targetKeyword",
              "targetCity",
              "primaryService",
              "idealCustomer",
              "differentiator",
              "trustSignals",
              "conversionGoal",
            ],
          },
        },
        parser: (raw) => SuggestedAnswers.parse(raw),
        maxCompletionTokens: 800,
        timeoutMs: AI_TIMEOUT_MS,
      });

      return new Response(
        JSON.stringify({
          step: "seo_answers_suggested",
          suggestedAnswers: pack,
          usage,
        }),
        { status: 200 },
      );
    }

    if (mode === "built_in_page_seo") {
      if (!pageKey) {
        return new Response(
          JSON.stringify({
            error: "Built-in page SEO mode requires pageKey.",
          }),
          { status: 400 },
        );
      }

      const normalizedCity = city || "your service area";
      const normalizedIndustry = industry || "local business";
      const normalizedKeyword =
        keyword || `${normalizedBusinessName || normalizedIndustry} ${normalizedCity}`;
      const context = [
        body.aboutContext ? `Trusted context:\n${body.aboutContext}` : null,
        content ? `Existing draft content:\n${content}` : null,
        pageIntent ? `Page intent: ${pageIntent}` : null,
        pageGoal ? `Page goal: ${pageGoal}` : null,
        targetAudience ? `Target audience: ${targetAudience}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const pack = await generateBuiltInPageSeoPack({
        pageKey,
        city: normalizedCity,
        industry: normalizedIndustry,
        keyword: normalizedKeyword,
        businessName: normalizedBusinessName,
        recipe: pageIntent || undefined,
        conversionMode: primaryCta || undefined,
        themePack: pageGoal || undefined,
        servicesOffered,
        context: context || undefined,
      });

      return new Response(
        JSON.stringify({
          role: "assistant",
          step: "built_in_page_seo_generated",
          message: "Built-in page SEO draft generated.",
          usage,
          ...pack,
        }),
        { status: 200 },
      );
    }

    if (mode === "service_copy") {
      if (!city || !industry || servicesOffered.length === 0) {
        return new Response(
          JSON.stringify({
            error:
              "Service copy mode requires city, industry, and at least one offered service.",
          }),
          { status: 400 },
        );
      }

      const pack = await generateServiceCopyPack({
        city,
        industry,
        keyword: keyword || `${industry} ${city}`,
        competitor1Url,
        servicesOffered,
      });

      return new Response(
        JSON.stringify({
          role: "assistant",
          step: "service_copy_generated",
          message: "Service-first AI copy pack generated.",
          usage,
          ...pack,
        }),
        { status: 200 },
      );
    }

    if (mode === "about_copy") {
      const businessName =
        trimToCap(body.businessName, 120) || "Your Business";
      const aboutContext = trimToCap(body.aboutContext, 1200);

      if (!city || !industry) {
        return new Response(
          JSON.stringify({
            error: "About copy mode requires city and industry.",
          }),
          { status: 400 },
        );
      }

      const pack = await generateAboutCopyPack({
        city,
        industry,
        businessName,
        aboutContext,
      });

      return new Response(
        JSON.stringify({
          role: "assistant",
          step: "about_copy_generated",
          message: "About/Team AI copy pack generated.",
          usage,
          ...pack,
        }),
        { status: 200 },
      );
    }

    if (mode === "location_page") {
      const locationCity = trimToCap(body.city, 120);
      const locationService = trimToCap(body.service, 120);
      const locationBusiness = trimToCap(body.businessName, 120) || "Your Business";
      const locationIndustry = trimToCap(body.industry, 120);
      const locationNearby = (body.mustInclude ?? [])
        .map((s) => trimToCap(s, 80) || "")
        .filter(Boolean)
        .slice(0, 8);

      if (!locationCity || !locationService || !locationIndustry) {
        return new Response(
          JSON.stringify({
            error: "location_page mode requires city, service, and industry.",
          }),
          { status: 400 },
        );
      }

      const pack = await generateLocationPageCopy({
        city: locationCity,
        service: locationService,
        businessName: locationBusiness,
        industry: locationIndustry,
        servicesOffered,
        nearbyAreas: locationNearby,
        context: trimToCap(body.aboutContext, 500),
      });

      return new Response(
        JSON.stringify({
          role: "assistant",
          step: "location_page_copy_generated",
          message: `Location page copy generated for ${locationService} in ${locationCity}.`,
          usage,
          ...pack,
        }),
        { status: 200 },
      );
    }

    // Step 1: Generate content ideas (initial request)
    if (!userChosenIdea && !content && industry && keyword) {
      const normalizedCity = city || "your area";
      const contentIdeas =
        mode === "page_nav_copy"
          ? await generateContentIdeasIntent({
              city: normalizedCity,
              industry,
              keyword,
              pageSlug,
              pageTitle,
              pageIntent,
              pageGoal,
              targetAudience,
              primaryCta,
              mustInclude,
              mustAvoid,
            })
          : mode === "site_settings_orchestrator"
            ? await generateSiteSettingsIdeas({
                city: normalizedCity,
                industry,
                keyword,
                service: trimToCap(body.service, 160),
                competitor1Url,
              })
          : await generateContentIdeasStandard({ city: normalizedCity, industry, keyword });
      return new Response(JSON.stringify({ 
        ...contentIdeas,
        role: "assistant", 
        step: "ideas_generated",
        message: "Here are 3 content ideas for you to choose from:",
        usage,
      }), { status: 200 });
    }

    // Step 2: User has chosen an idea, now create outline, write content, analyze competitor, and generate metadata
    if (userChosenIdea && !content) {
      if (mode === "site_settings_orchestrator") {
        const outline = await createSiteSettingsOutline({
          userChosenIdea,
          city: city || "your area",
          industry: industry || "local services",
          keyword: keyword || "local service",
        });

        let markdownText = "";
        try {
          const markdownContent = await writeSiteSettingsMarkdown({
            outline: outline.content,
            userChosenIdea,
            city: city || "your area",
            industry: industry || "local services",
            keyword: keyword || "local service",
          });
          markdownText = markdownContent.markdownContent;
        } catch (error) {
          console.warn("Site settings content fallback triggered:", error);
          markdownText = `# ${userChosenIdea}\n\n${outline.content}`;
        }

        let metadata: z.infer<typeof Metadata> | null = null;
        try {
          metadata = await generateMetadata({ content: markdownText });
        } catch (error) {
          console.warn("Site settings metadata generation skipped due to error:", error);
        }

        return new Response(
          JSON.stringify({
            role: "assistant",
            content: outline.content,
            markdownContent: markdownText,
            metadata,
            step: "complete_workflow",
            orchestration: {
              orchestrator: "site_settings_orchestrator_v1",
              gateway: "gatewayStructuredCall",
              specialists: [
                "positioning-specialist",
                "local-seo-specialist",
                "conversion-copy-specialist",
              ],
            },
            message: "Site Settings orchestrated draft generated.",
          }),
          { status: 200 },
        );
      }

      // Create content outline
      const outline = await createContentOutline({
        userChosenIdea,
        pageIntent,
        pageGoal,
        targetAudience,
        primaryCta,
        mustInclude,
        mustAvoid,
      });
      
      // Generate the full markdown content based on the outline.
      // Fail soft here so Site Settings can still receive usable draft text.
      let markdownText = "";
      try {
        const markdownContent = await writeMarkdownContent({
          outline: outline.content,
          userChosenIdea,
          city: city || "your area",
          industry: industry || "local services",
          keyword: keyword || "local service",
          pageIntent,
          pageGoal,
          targetAudience,
          primaryCta,
          mustInclude,
          mustAvoid,
        });
        markdownText = markdownContent.markdownContent;
      } catch (error) {
        console.warn("Content generation fallback triggered:", error);
        markdownText = `# ${userChosenIdea}\n\n${outline.content}`;
      }
      
      // Also analyze competitor gaps if we have competitor URL
      let competitorAnalysis = null;
      if (competitor1Url) {
        try {
          const contentIdeas = [{ idea: userChosenIdea }];
          competitorAnalysis = await analyzeCompetitorGaps({
            contentIdeas,
            competitor1Url,
          });
        } catch (error) {
          console.warn("Competitor analysis skipped due to error:", error);
        }
      }
      
      // Automatically generate metadata for the markdown content
      let metadata: z.infer<typeof Metadata> | null = null;
      try {
        metadata = await generateMetadata({ content: markdownText });
      } catch (error) {
        console.warn("Metadata generation skipped due to error:", error);
      }
      
      return new Response(JSON.stringify({ 
        role: "assistant", 
        content: outline.content,
        markdownContent: markdownText,
        competitorAnalysis,
        metadata,
        step: "complete_workflow",
        message: "Content outline, full markdown content, and SEO metadata have been generated. Here's your complete content strategy:",
        usage,
      }), { status: 200 });
    }

    // Step 3: Generate metadata for the content
    if (content) {
      const metadata = await generateMetadata({ content });
      return new Response(JSON.stringify({ 
        role: "assistant", 
        content: JSON.stringify(metadata),
        step: "metadata_generated",
        message: "SEO metadata has been generated for your content.",
        usage,
      }), { status: 200 });
    }

    // Fallback for any other requests
    return new Response(JSON.stringify({ 
      error: "Invalid request. Please provide the required parameters.",
      expectedFlow: "1. Provide industry and keyword (city/service area optional) to get ideas. 2. Choose an idea to get outline. 3. Provide content to get metadata."
    }), { status: 400 });
    
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const isTimeoutError =
      error instanceof Error && /timed out/i.test(error.message);
    return new Response(JSON.stringify({ 
      error: isTimeoutError ? "AI gateway timeout" : "Internal server error", 
      details: errorMessage 
    }), { status: isTimeoutError ? 504 : 500 });
  }
}
