# AI Agent Best Practices (Orchestrator + Gateway + Specialists)

This project uses a multi-agent pattern in `src/app/api/content-agent/route.ts`.

## Architecture

1. Orchestrator
- Entry point: `POST` handler.
- Decides workflow stage:
  - Ideas generation
  - Full content workflow
  - Metadata-only generation
- Owns validation, caps, and response shape.

2. Gateway
- Function: `gatewayStructuredCall(...)`.
- Responsibilities:
  - Single OpenAI call path
  - Shared timeout policy
  - Shared model selection
  - Shared output schema enforcement

3. Specialist agents
- `generateContentIdeas` (ideation specialist)
- `createContentOutline` (outline specialist)
- `writeMarkdownContent` (writer specialist)
- `analyzeCompetitorGaps` (SEO analyst specialist)
- `generateMetadata` (metadata specialist)

## Guardrails and limits

1. Request validation
- Incoming payload is validated with zod.
- Trimming and capping applied per field.

2. Input/output caps
- `AI_AGENT_MAX_INPUT_CHARS`
- `AI_METADATA_MAX_CONTENT_CHARS`
- `AI_AGENT_MAX_COMPLETION_TOKENS`

3. Runtime controls
- `AI_AGENT_TIMEOUT_MS` for gateway timeout.
- Per-IP in-memory rate limiting:
  - `AI_RATE_LIMIT_WINDOW_MS`
  - `AI_RATE_LIMIT_MAX_REQUESTS`

4. Failure behavior
- 429 for rate-limit violations with `Retry-After` header.
- Structured 500 payload with `details` when unexpected errors occur.

## Operational recommendations

1. Use separate model variables per domain
- Keep content model independent from chat/general model.

2. Add telemetry
- Track stage latency, token usage, and error rates by specialist.

3. Add retry policy selectively
- Retry transient gateway failures once with jitter.
- Do not retry on schema/validation failures.

4. Add quality checks
- Add a post-generation validation pass to enforce:
  - required headings
  - max title/description lengths
  - forbidden claims/policy constraints by industry

5. Add persistence for production rate limiting
- Move from in-memory buckets to Redis/KV for serverless scale.
- Implemented via `src/lib/ai/rate-limit.ts` using Upstash Redis with in-memory fallback.

## Redis-backed limiter setup

1. Configure environment variables
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

2. Fallback behavior
- If Redis is not configured or unavailable, limiter falls back to in-memory buckets.
- This keeps local development simple while enabling distributed caps in production.

## Environment variables

Use `.env.local.example` guardrail variables as defaults, then tune by traffic and cost profile.
