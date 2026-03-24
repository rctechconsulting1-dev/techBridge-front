import OpenAI from "openai";
import z from "zod";

// Ensure this route is always dynamic and runs on Node.js runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_DAILY_LIMIT = Number(process.env.AI_CONTENT_DAILY_LIMIT ?? 60);

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

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your environment to use /api/content-agent.");
  }
  return new OpenAI({ apiKey });
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
    keywordTargets: z.array(z.string())
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

//Define the functions/tools
const generateContentIdeas = async ({ city, industry, keyword }: { city: string, industry: string, keyword: string }) => {
  // Call OpenAI API to generate content ideas
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: `I am a content creator assistant. Here is my competitor's site: My company is in the ${industry} industry. Help me create 3 ideas to rank for the keyword "${keyword}" in ${city}.` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
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
                    items: { type: "string" }
                  }
                },
                required: ["idea", "keywordTargets"]
              }
            }
          },
          required: ["ideas"]
        }
      }
    }
  });
  
  const parsedResponse = ContentIdeas.parse(JSON.parse(response.choices[0].message.content || "{}"));
  return parsedResponse;
};

const analyzeCompetitorGaps = async ({
  contentIdeas,
  competitor1Url
}: {
  contentIdeas: { idea: string }[],
  competitor1Url: string
}) => {
  // Call OpenAI API to analyze competitor gaps
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { 
        role: "system", 
        content: `You are an SEO content analyst. Analyze competitor content for gaps and opportunities based on the provided content ideas and competitor URL.` 
      },
      { 
        role: "user", 
        content: `Based on these content ideas:
1. ${contentIdeas?.[0]?.idea || ""}
2. ${contentIdeas?.[1]?.idea || ""}
3. ${contentIdeas?.[2]?.idea || ""}

Competitor URL: ${competitor1Url}

Analyze potential gaps and opportunities. Provide target keywords, titles, and strategy components for each idea. Focus on what content gaps might exist that we could fill.` 
      }
    ],
    response_format: { 
      type: "json_schema",
      json_schema: {
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
                  strategyComponents: { type: "array", items: { type: "string" } }
                },
                required: ["keywordTargets", "title", "strategyComponents"]
              }
            }
          },
          required: ["gaps"]
        }
      }
    }
  });
  return response.choices[0].message.content;
};

const createContentOutline = async ({ userChosenIdea }: { userChosenIdea: string }) => {
  // Call OpenAI API to create content outline
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: `Create a detailed content outline for the following idea: ${userChosenIdea}. Include appropriate H1, H2, H3 headings, key points to cover, and SEO best practices.` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content",
        schema: {
          type: "object",
          properties: {
            content: { type: "string" }
          },
          required: ["content"]
        }
      }
    }
  });
  
  const parsedResponse = Content.parse(JSON.parse(response.choices[0].message.content || "{}"));
  return parsedResponse;
};

const writeMarkdownContent = async ({ outline, userChosenIdea, city, industry, keyword }: { 
  outline: string, 
  userChosenIdea: string,
  city: string,
  industry: string, 
  keyword: string 
}) => {
  // Call OpenAI API to write the full markdown content
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { 
        role: "system", 
        content: `You are an expert content writer specializing in SEO content for the ${industry} industry. Write comprehensive, engaging content that targets the keyword "${keyword}" for businesses in ${city}.` 
      },
      { 
        role: "user", 
        content: `Based on this content outline:
${outline}

Write a complete blog post in markdown format for: "${userChosenIdea}"

Requirements:
- Use proper markdown syntax (# ## ### for headings)
- Target keyword: "${keyword}"
- Location: ${city}
- Industry: ${industry}
- Include SEO-optimized headings with the target keyword
- Write engaging, informative content
- Add relevant examples and practical tips
- Include a strong call-to-action at the end
- Use appropriate heading hierarchy (H1, H2, H3)
- Ensure accessibility with clear structure
- Target length: 1000-1500 words

Focus on providing real value to readers while naturally incorporating the target keyword and location.` 
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "markdown_content",
        schema: {
          type: "object",
          properties: {
            markdownContent: { type: "string" }
          },
          required: ["markdownContent"]
        }
      }
    }
  });
  
  const parsedResponse = MarkdownContent.parse(JSON.parse(response.choices[0].message.content || "{}"));
  return parsedResponse;
};

const generateMetadata = async ({ content }: { content: string }) => {
  // Call OpenAI API to generate metadata
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: `Generate SEO metadata for the following content: ${content}.` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "metadata",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            keywords: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["title", "description", "keywords"]
        }
      }
    }
  });
  
  const parsedResponse = Metadata.parse(JSON.parse(response.choices[0].message.content || "{}"));
  return parsedResponse;
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: "OPENAI_API_KEY is not set. Add it to your environment to use this endpoint.",
      }), { status: 500 });
    }

    const requestBody = await request.json();
    const {
      ourUrl: _ourUrl,
      city,
      industry,
      keyword,
      competitor1Url,
      service: _service,
      userChosenIdea,
      content,
      websiteId: bodyWebsiteId,
    } = requestBody;

    const headerWebsiteId = request.headers.get("x-website-id");
    const websiteId = toPositiveInteger(bodyWebsiteId) ?? toPositiveInteger(headerWebsiteId);
    const tokenPayload = decodeJwtPayload(request.headers.get("authorization"));
    const userId = tokenPayload?.sub ? String(tokenPayload.sub) : "anonymous";
    const requestIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const usageKey = `website:${websiteId ?? "unscoped"}|user:${userId}|ip:${requestIp}`;

    const usageCost = userChosenIdea && !content ? 3 : 1;
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

    // Step 1: Generate content ideas (initial request)
    if (!userChosenIdea && !content && city && industry && keyword) {
      const contentIdeas = await generateContentIdeas({ city, industry, keyword });
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
      // Create content outline
      const outline = await createContentOutline({ userChosenIdea });
      
      // Generate the full markdown content based on the outline
      const markdownContent = await writeMarkdownContent({ 
        outline: outline.content, 
        userChosenIdea, 
        city, 
        industry, 
        keyword 
      });
      
      // Also analyze competitor gaps if we have competitor URL
      let competitorAnalysis = null;
      if (competitor1Url) {
        const contentIdeas = [{ idea: userChosenIdea }];
        competitorAnalysis = await analyzeCompetitorGaps({ contentIdeas, competitor1Url });
      }
      
      // Automatically generate metadata for the markdown content
      const metadata = await generateMetadata({ content: markdownContent.markdownContent });
      
      return new Response(JSON.stringify({ 
        role: "assistant", 
        content: outline.content,
        markdownContent: markdownContent.markdownContent,
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
      expectedFlow: "1. Provide city, industry, keyword to get ideas. 2. Choose an idea to get outline. 3. Provide content to get metadata."
    }), { status: 400 });
    
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: errorMessage 
    }), { status: 500 });
  }
}
