# Migration Guide

This document tracks breaking changes, refactors, and setup steps developers need to follow when pulling updates to the RC Tech Bridge admin dashboard.

---

## March 2026 — Codebase Refactor & Branding Cleanup

### What Changed

This refactor removed TailAdmin template artifacts and dead code, consolidated types, and updated all metadata branding from TailAdmin to RC Tech Bridge.

### Breaking Changes

#### 1. `src/types/googleBusiness.ts` — Deleted

The standalone `googleBusiness.ts` type file has been removed. The `Post` interface it contained is now exported from `src/types/google-business.ts`.

**Update any imports:**
```ts
// Before
import type { Post } from "@/types/googleBusiness";

// After
import type { Post } from "@/types/google-business";
```

#### 2. `src/hooks/useBusinessListing.ts` — Deleted

This was a duplicate of `useBusinessByWebsiteId.ts`. Use the canonical hook instead:

```ts
// Before
import { useGetBusinessByWebsiteId } from "@/hooks/useBusinessListing";

// After
import { useBusinessByWebsiteId } from "@/hooks/useBusinessByWebsiteId";
```

> Note: The canonical hook also exposes a `mutate` function — use it to trigger refetches after mutations.

#### 3. `src/lib/google-token-manager.ts` — Deleted

`GoogleTokenManager` was removed. Google token operations go through the API routes:
- `POST /api/auth/google/connect` — initiate OAuth
- `GET /api/auth/google/callback` — exchange code for tokens
- `POST /api/auth/google/refresh` — refresh access token

#### 4. `src/utils/googleApi.ts` — Reduced

Only two functions remain:
- `createGoogleBusinessPost(locationId, postData, clientId?)` — posts via backend proxy
- `formatPostForAPI(post: Post)` — formats a `Post` object for the GMB API

All other exports (`getStoredGoogleTokens`, `makeGoogleApiRequest`, `getGoogleUserProfile`, `createGoogleBusinessPost_legacy`, `callGoogleMyBusinessAPI`, `createMockResponse`, `isTokenExpired`, `refreshGoogleToken`) have been removed. If you depended on any of these, use the backend API routes or the `src/lib/google-oauth.ts` manager class instead.

#### 5. `src/components/page-manager/TestImageUpload.tsx` — Deleted

Debug-only component. Remove any references if you had local imports.

---

## Page Management System Setup

When setting up a new environment, run the database migration for the page management system.

### Step 1: Run Database Migration

Execute the migration SQL in your Supabase SQL Editor:

```sql
-- Run the contents of supabase/migrations/improve_page_structure.sql
-- in your Supabase dashboard SQL editor
```

### Step 2: Regenerate Supabase Types

After running the migration, regenerate `database.types.ts`:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > database.types.ts
```

### Step 3: Verify the Page Manager

1. Navigate to `/main-page` in the admin dashboard
2. Confirm the Page Organizer, Page Editor, and Create New Page wizard all load correctly

### Supported Page Types

| Type | Description |
|------|-------------|
| Main Navigation | Home, About, Contact, Services |
| Service Pages | Individual service detail pages |
| Blog Posts | Content marketing articles |
| Gallery Pages | Photo showcases and portfolios |
| Landing Pages | Campaign-specific pages |
| Legal Pages | Privacy Policy, Terms of Service |
| Custom | Any other type |

---

## New Environment Setup

For a fresh clone, follow these steps in order:

### 1. Install dependencies

```bash
npm install
```

> Use `--legacy-peer-deps` if you see peer-dependency errors.

### 2. Configure environment variables

Create `.env.local` from the table below. All variables are required unless marked optional.

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI (must match Google Console) | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for content agent | ✅ |
| `REVALIDATE_SECRET` | Secret header value for ISR revalidation webhook | ✅ |
| `S3_UPLOAD_KEY` | AWS S3 access key | ✅ |
| `S3_UPLOAD_SECRET` | AWS S3 secret key | ✅ |
| `S3_UPLOAD_BUCKET` | AWS S3 bucket name | ✅ |
| `S3_UPLOAD_REGION` | AWS S3 region | ✅ |

### 3. Run database migration

See [Page Management System Setup](#page-management-system-setup) above.

### 4. Start development server

```bash
npm run dev
```

---

## Google Business Profile Setup

See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for the full OAuth configuration walkthrough.

Key points:
- The redirect URI registered in Google Cloud Console must exactly match `GOOGLE_REDIRECT_URI` in your env
- The OAuth flow is initiated from the admin dashboard at `/google-business`
- Tokens are stored and refreshed via the backend — never stored client-side

---

## Adding a New Client Site

Each client is served from `src/app/sites/[websiteId]/`. No code changes are needed to add a new client — create the client record in the database with a `website_id` and populate their CMS data (site settings, services, team, testimonials, FAQs).

To trigger a content refresh after a CMS update, `POST` to `/api/revalidate` with the header:

```
x-revalidate-secret: <REVALIDATE_SECRET>
```

---

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| TypeScript error on `Post` import | Update import to `@/types/google-business` |
| `useGetBusinessByWebsiteId` not found | Switch to `useBusinessByWebsiteId` from `@/hooks/useBusinessByWebsiteId` |
| Google OAuth redirect mismatch | Ensure `GOOGLE_REDIRECT_URI` matches exactly what's registered in Google Cloud Console |
| S3 upload fails | Verify all four S3 env vars are set and the bucket has the correct CORS policy |
| ISR pages not updating | Check `REVALIDATE_SECRET` matches and `POST /api/revalidate` returns 200 |
| Supabase types out of date | Re-run `npx supabase gen types typescript ...` after any schema migration |

