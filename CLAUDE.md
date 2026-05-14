# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (requires Node 20)
npm run dev        # Start Next.js dev server on port 3000 (uses webpack bundler)
npm run build      # Production build
npm run lint       # ESLint check on src/
npm run lint:fix   # Auto-fix lint issues

# Smoke tests (no server required)
npm run smoke:nav  # Navigation assignment smoke test
npm run smoke:blog # Blog variant smoke test
```

## Architecture

### App Router Layout Groups

| Route group | Purpose |
|---|---|
| `(admin)/` | Authenticated admin dashboard — sidebar + header shell, client-side session guard |
| `(full-width-pages)/(auth)/` | Sign in, sign up, reset password — no sidebar |
| `sites/[websiteId]/` | Public-facing tenant site pages (SSG/ISR) |
| `intake/` | Client onboarding intake flow |
| `app/api/` | Next.js Route Handlers (see below) |

The `(admin)` layout (`src/app/(admin)/layout.tsx`) is a client component that calls `apiClient.getSession()` on mount. If no session is found, it redirects to `/signin`. All admin pages render only after session is confirmed.

### Two-App Pattern

This is simultaneously a **multi-tenant admin dashboard** and a **white-label public site renderer**:

- **Admin** (`/(admin)/*`) — users manage content for a selected tenant; all API calls include `x-tenant-id` from `localStorage.active_tenant_id`
- **Public sites** (`/sites/[websiteId]/*`) — ISR pages that fetch from the backend using `x-tenant-domain` header forwarding; revalidate every 60s (`SITE_REVALIDATE_SECONDS`)

### API Proxy

`next.config.ts` rewrites `/api/:path*` → `${NEXT_PUBLIC_API_URL}/:path*` when `NEXT_PUBLIC_API_URL` is an absolute URL. This means Next.js Route Handlers under `src/app/api/` share the `/api/` namespace with the proxied backend. Route Handlers always win — only paths not matched by a Route Handler are forwarded.

### Auth Flow

Token storage: `localStorage.auth_token` (primary) with `auth_token_client` cookie as a bootstrap for SSR hydration.

- **Client-side**: `apiClient` from `src/lib/api-client.ts` — singleton class that reads/writes the JWT and automatically injects `Authorization` + `x-tenant-id` headers on every request
- **Server-side (Route Handlers)**: `verifyAuth` / `verifyAdminAuth` from `src/lib/route-auth.ts` — reads token from `auth_token` cookie, `auth_token_client` cookie, or `Authorization` header, then validates against `GET /auth/me`
- **Session normalization**: `normalizeAuthSession()` in `src/lib/auth-context.ts` merges `/auth/me` response with JWT payload claims, resolving `enabledModules`, `enabledFeatures`, and `activeTenantId`

### Tenant Context (Client)

`getActiveTenantId()` from `src/lib/auth-context.ts` returns the tenant ID from `localStorage.active_tenant_id` (set when admin selects a client) or falls back to the JWT payload. The `fetcher` (used by SWR throughout the admin) and `apiClient` both inject this as `x-tenant-id` automatically.

### Entitlements

`src/lib/entitlements.ts` exposes helpers to check whether a given module or feature key is enabled for the active session. Module keys have aliases (e.g. `custom_ai_agent` === `ai_agent`). The enabled list comes from `user.enabledModules` and `user.enabledFeatures` on the session object.

### SWR Data Fetching (Admin)

The admin layout wraps children in `<SWRConfig value={{ fetcher }}>`. The shared `fetcher` (`src/hooks/fetcher.ts`) auto-injects auth token and tenant ID, translates `PATCH` → `PUT` (backend doesn't accept PATCH), and normalizes `xUrl` → `x_url` in outbound payloads.

Custom hooks in `src/hooks/` wrap SWR for specific resources (e.g. `usePages`, `useSeo`, `useAiLeads`).

### Public Site ISR

Pages under `src/app/sites/[websiteId]/` use Next.js ISR with `revalidate = 300` (layout) or `revalidate = 60` (individual pages). The CMS API client (`src/lib/cms-api.ts`) forwards the incoming `host` header as `x-tenant-domain` on server-side fetches so the backend can resolve the tenant without a numeric ID.

ISR cache tags follow `website:{id}` and `website:{id}:{resource}` — trigger revalidation via `POST /api/revalidate`.

### Next.js Route Handlers

Route Handlers in `src/app/api/` handle concerns that must stay server-side:

| Path | Purpose |
|---|---|
| `stripe/webhook` | Stripe event processing (idempotency via in-memory store, Printify fulfillment trigger) |
| `stripe/checkout` | Checkout session creation |
| `email/*` | Transactional emails via Resend |
| `marketing/*` | Proxy to ads-mcp services |
| `domains/*` | Vercel domain provisioning |
| `intake/*` | Client onboarding form submission + AI-assisted prefill |
| `s3-upload` | S3 pre-signed URL generation via `next-s3-upload` |
| `revalidate` | ISR cache invalidation |

Use `verifyAuth` or `verifyAdminAuth` from `src/lib/route-auth.ts` to guard Route Handlers.

### Key `src/lib/` Files

| File | Purpose |
|---|---|
| `api-client.ts` | Singleton `apiClient` for all client-side backend calls |
| `api.ts` | `getApiBaseUrl()`, `toApiUrl()` URL utilities |
| `auth-context.ts` | Token storage, `normalizeAuthSession`, `getActiveTenantId` |
| `route-auth.ts` | `verifyAuth` / `verifyAdminAuth` for Route Handlers |
| `cms-api.ts` | ISR-aware CMS data fetching for public sites |
| `cms-types.ts` | Shared TypeScript types for all CMS entities |
| `entitlements.ts` | Module/feature gate helpers with alias resolution |
| `public-site-routing.ts` | `isPlatformHost()` — distinguishes platform domain from tenant domains |
| `navigation.ts` | Resolves page navigation assignments into header/footer link trees |
| `ops-alerts.ts` / `opsMetrics.ts` | Server-side ops telemetry helpers |

### SVG Imports

SVGs are processed by `@svgr/webpack` (configured in `next.config.ts`). Import SVGs as React components:

```tsx
import MyIcon from "@/icons/my-icon.svg";
// Use as: <MyIcon className="h-5 w-5" />
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api   # Backend base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000        # This app's public URL (used for OAuth callbacks)
NEXT_PUBLIC_SITE_URL=                           # Platform root domain (distinguishes it from tenant domains)

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# S3 image uploads
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Google OAuth (intake AI agent)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OpenAI (content agent, intake AI)
OPENAI_API_KEY=
```
