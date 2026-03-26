# CMS-Connected Landing Page Template

A multi-tenant business landing page template built into the RCTech Next.js app. Each website record in the database gets its own fully CMS-driven, statically-generated landing page at `/sites/[websiteId]`.

---

## How It Works

```
Backend (PostgreSQL + Express)
  └─ website, site_settings, service, testimonial, team_member, faq_item tables
        │
        │  REST API (http://localhost:5001/api)
        ▼
Next.js (ISR — revalidate every 60 s)
  └─ /sites/[websiteId]/page.tsx
        │  assembles all sections at build / revalidation time
        ▼
Static HTML served from CDN / Node server
        │
        │  Admin saves content →  POST /api/revalidate  →  instant rebuild
        ▼
Updated page live in < 1 s
```

---

## Prerequisites

- Node ≥ 20
- Backend (`backend-rc`) running — see its README
- PostgreSQL with the `rc-local` database (port 5433 by default)

---

## Environment Setup

Copy and fill in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api   # Express backend
CMS_REVALIDATION_SECRET=change_me               # Shared secret for ISR webhook
```

---

## Running Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/sites/1` (replace `1` with a real website ID).

---

## File Structure

```
src/
├── lib/
│   ├── cms-types.ts        # TypeScript interfaces matching DB columns
│   ├── cms-api.ts          # Typed server-side fetch functions (ISR)
│   └── cms-auth.ts         # JWT helpers (client-side, admin panel)
├── components/
│   ├── sections/
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── TeamSection.tsx
│   │   ├── FAQSection.tsx
│   │   ├── CTASection.tsx
│   │   └── FooterSection.tsx
│   └── ui/
│       ├── EditableImage.tsx   # next/image wrapper with fallback
│       └── RichText.tsx        # safe HTML renderer for CMS content
└── app/
    ├── sites/[websiteId]/page.tsx   # ISR landing page
    └── api/revalidate/route.ts      # Webhook for instant revalidation
```

---

## Backend Changes Required

Run in your `backend-rc` folder:

```bash
DATABASE_URL="postgres://postgres@localhost:5433/rc-local" \
  npx node-pg-migrate up --migrations-dir migrations
```

This creates four new tables:

- `site_settings` — hero, CTA, footer, colors, contact info (1 row per website)
- `testimonial` — client quotes
- `team_member` — staff profiles
- `faq_item` — FAQ entries

And registers four new API routes:

- `GET/PUT /api/site-settings/:websiteId`
- `GET/POST/PUT/DELETE /api/testimonials`
- `GET/POST/PUT/DELETE /api/team-members`
- `GET/POST/PUT/DELETE /api/faq`

Protected write routes require `Authorization: Bearer <token>`.

---

## CMS Content Fields

### site_settings (one row per website)

Note: as of Phase 2 built-in pages, page-specific copy is being moved out of `site_settings` into dedicated built-in page content records. The fields below still exist for legacy compatibility and shared presentation settings, but Home, Services, About, and Shop page copy should be treated as built-in page content rather than long-term page-source-of-truth fields.

| Field                                                                           | Description         |
| ------------------------------------------------------------------------------- | ------------------- |
| `logo_url`                                                                      | Logo image URL      |
| `primary_color` / `secondary_color` / `accent_color`                            | Brand colours (hex) |
| `contact_email`, `contact_phone`, `address`                                     | Contact info        |
| `hero_headline`, `hero_subheadline`                                             | Legacy homepage hero fields |
| `hero_cta_text`, `hero_cta_url`                                                 | CTA button          |
| `hero_bg_image_url`, `hero_bg_overlay_color`                                    | Hero background     |
| `cta_headline`, `cta_body`, `cta_button_text`, `cta_button_url`, `cta_bg_color` | Shared CTA section  |
| `footer_tagline`, `footer_copyright`, `footer_nav_links` (JSONB)                | Footer              |
| `footer_social_facebook/instagram/x/linkedin`                                   | Social links        |

### service (features grid)

`title`, `content` (HTML or plain text), `website_id`

### testimonial

`quote`, `author_name`, `author_title`, `avatar_url`, `star_rating`, `sort_order`

### team_member

`name`, `title`, `bio`, `photo_url`, `linkedin_url`, `sort_order`

### faq_item

`question`, `answer`, `sort_order`

---

## How to Add a New Editable Section

1. **DB**: Add columns to an existing table or create a new one with a migration
2. **Backend**: Add the GET/PUT routes in `backend-rc/routes/`; register in `server.js`
3. **Types**: Add the interface to `src/lib/cms-types.ts`
4. **API**: Add a typed fetch function to `src/lib/cms-api.ts`; include it in `getLandingPageData()`
5. **Component**: `src/components/sections/YourSection.tsx` — accept typed props, never hardcode strings
6. **Page**: Import and render in `src/app/sites/[websiteId]/page.tsx`

---

## ISR Revalidation (Admin Panel Integration)

When the admin panel saves any CMS content, call:

```
POST /api/revalidate
Headers:
  x-revalidation-secret: <CMS_REVALIDATION_SECRET>
  Content-Type: application/json
Body:
  { "websiteId": "1" }
```

The page will rebuild within seconds without redeployment.
