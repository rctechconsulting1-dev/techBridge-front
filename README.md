# RC Tech Bridge — Admin Dashboard

A custom admin dashboard built for RC Tech Bridge, powering multi-tenant client website management, Google Business Profile integration, and AI-assisted content generation.

Built on **Next.js 15**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

---

## Overview

This dashboard enables RC Tech Bridge to manage client digital presence end-to-end:

- **Multi-tenant CMS** — Create and publish dynamic websites for each client via ISR-powered `sites/[websiteId]` routes
- **Google Business Profile** — Connect, post, view reviews, and track performance for client GMB listings
- **AI Content Agent** — OpenAI-powered pipeline: idea generation → outline → full markdown content → SEO metadata
- **Page Manager** — MDX editor with image uploads, page hierarchy, and SEO metadata management
- **Asset Manager** — S3 image uploads and asset library per client
- **Calendar** — FullCalendar integration for scheduling
- **Authentication** — Backend-managed auth flow with Google OAuth

### Tech Stack

- Next.js 15.x (App Router, Server Components, ISR)
- React 19
- TypeScript
- Tailwind CSS v4
- Express.js backend API + PostgreSQL
- AWS S3 (asset storage)
- OpenAI (content generation)
- Google Business Profile API

---

## Installation

### Prerequisites

- Node.js 18.x or later (20.x recommended)

### Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

   > Use `--legacy-peer-deps` if you encounter peer-dependency errors.

2. Copy environment variables and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

---

## Project Structure

```
src/
├── app/
│   ├── (admin)/          # Protected admin routes (auth-guarded)
│   ├── (full-width-pages)/ # Auth pages and error pages
│   ├── api/              # API routes (Google OAuth, content agent, S3, revalidation)
│   ├── auth/             # Auth callback handlers
│   ├── sites/[websiteId]/ # ISR-rendered public client websites
│   └── page.tsx          # RC Tech Bridge public landing page
├── components/
│   ├── google-business/  # GMB connect, posts, reviews, performance
│   ├── landing/          # Public marketing page sections
│   ├── page-manager/     # Page creation wizard and MDX editor
│   ├── sections/         # CMS-driven client site sections (templates)
│   ├── ecommerce/        # Dashboard metric components (UI templates)
│   ├── charts/           # Chart components (UI templates)
│   ├── form/             # Form primitives and field components
│   └── ui/               # Core UI primitives (Alert, Badge, Button, Modal, etc.)
├── hooks/                # SWR data hooks
├── lib/                  # API client, CMS helpers, Google OAuth manager
├── types/                # TypeScript type definitions
└── utils/                # Google Business API utilities
```

---

## Key Features

### Client Site Engine

Each client gets a dynamically-generated website served from `sites/[websiteId]/`. Pages are rendered server-side with ISR and driven entirely by CMS data — branding colors, content, team, services, FAQs, and testimonials are all configurable per client.

### Google Business Integration

Admins can connect a client's Google Business Profile via OAuth, create posts (standard, event, offer), view reviews, and monitor performance metrics — all from the dashboard.

### AI Content Agent

The `/chat-gpt` page runs a multi-step AI pipeline: enter a topic, select from generated ideas, get a full outline, then generate complete page-ready markdown content with SEO metadata.

### Page Manager

The `/main-page` form combines MDX editing, AI content generation, image management, and SEO metadata into a single workflow for creating and updating client pages.

---

## Component Library

The dashboard includes a set of reusable UI primitives and template components deliberately kept for building new features and client sites:

- **UI elements** — Alert, Avatar, Badge, Button, Dropdown, Modal, Table
- **Charts** — Bar and Line charts (ApexCharts)
- **Ecommerce widgets** — KPI cards, sales charts, demographic map (dashboard templates)
- **Form elements** — All input types, dropdowns, file upload, date picker
- **Video embeds** — YouTube embed and aspect ratio wrappers
- **Image grids** — Responsive and multi-column layouts
- **Sections** — NavBar, Hero, Features, Testimonials, Team, FAQ, CTA, Footer (for client sites)

---

## Environment Variables

| Variable                             | Description                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                | Backend API base URL                                                                                           |
| `NEXT_PUBLIC_APP_URL`                | Public base URL of this app (e.g. `http://localhost:3000`) — used to build Stripe success/cancel redirect URLs |
| `GOOGLE_CLIENT_ID`                   | Google OAuth client ID                                                                                         |
| `GOOGLE_CLIENT_SECRET`               | Google OAuth client secret                                                                                     |
| `GOOGLE_REDIRECT_URI`                | Google OAuth redirect URI                                                                                      |
| `OPENAI_API_KEY`                     | OpenAI API key                                                                                                 |
| `REVALIDATE_SECRET`                  | Secret for ISR revalidation webhook                                                                            |
| `S3_UPLOAD_KEY`                      | AWS S3 access key                                                                                              |
| `S3_UPLOAD_SECRET`                   | AWS S3 secret key                                                                                              |
| `S3_UPLOAD_BUCKET`                   | AWS S3 bucket name                                                                                             |
| `S3_UPLOAD_REGION`                   | AWS S3 region                                                                                                  |
| `STRIPE_SECRET_KEY`                  | Stripe secret key — **never expose to the client** (`sk_test_...` for dev, `sk_live_...` for prod)             |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...` or `pk_live_...`)                                                        |
| `STRIPE_WEBHOOK_SECRET`              | Signing secret for verifying Stripe webhook events (`whsec_...`)                                               |

---

## Stripe Setup (Ecommerce / Shop)

The shop template at `sites/[websiteId]/shop` uses **Stripe Checkout** (hosted, single-product Buy Now flow). No cart or stored session state — clicking **Buy Now** opens Stripe's hosted payment page directly.

### How it works

1. User clicks **Buy Now** on a product page.
2. The frontend calls `POST /api/stripe/checkout` (a Next.js API route — server-side only).
3. That route creates a Stripe Checkout Session and returns a redirect URL.
4. The user is redirected to Stripe's hosted checkout page.
5. After payment, Stripe redirects back to `/sites/[websiteId]/shop/[slug]/success`.
6. Stripe fires a `checkout.session.completed` webhook to `POST /api/stripe/webhook`, which records the charge to the Express backend.

### Prerequisites

- A [Stripe account](https://dashboard.stripe.com/register) (free)
- The [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook forwarding

### 1. Get your API keys

1. Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys)
2. Copy the **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)
3. Add them to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### 2. Set your app URL

Make sure `NEXT_PUBLIC_APP_URL` matches where your app is running:

```env
# Local development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Set up the webhook (local dev)

Install the Stripe CLI:

```bash
brew install stripe/stripe-cli/stripe
```

Log in — make sure you authenticate with the **same Stripe account** your API keys are from:

```bash
stripe login
# Verify: stripe whoami
```

Start forwarding webhook events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will print:

```
> Ready! Your webhook signing secret is whsec_abc123...
```

Copy that value into `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

> Keep `stripe listen` running in a separate terminal while you test.

### 4. Set up the webhook (production)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the URL to `https://yourdomain.com/api/stripe/webhook`
4. Select the event: `checkout.session.completed`
5. Copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in your production environment

### 5. Enable ecommerce for a client site

The shop only appears if `ecommerce_enabled = true` in the `site_settings` row for that website. Set this in DBeaver or via the API:

```sql
UPDATE public.site_settings SET ecommerce_enabled = true WHERE website_id = 1;
```

### 6. Add test products

Insert a published product for the website:

```sql
INSERT INTO public.product (website_id, title, slug, description, price, stock_quantity, is_published)
VALUES (1, 'My Product', 'my-product', 'A great product.', 29.99, 10, true);
```

### 7. Test the payment flow

1. Visit `http://localhost:3000/sites/1/shop` (replace `1` with your `website_id`)
2. Click a product → click **Buy Now**
3. Use Stripe's test card: **`4242 4242 4242 4242`**, any future expiry, any CVC
4. After payment you'll be redirected to the success page
5. The `stripe listen` terminal will show the `checkout.session.completed` event logged

### API routes

| Route                  | Method | Description                                                                                                                         |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/api/stripe/checkout` | POST   | Creates a Stripe Checkout Session. Body: `{ quantity, websiteId, productSlug }`. Returns `{ url }`. |
| `/api/stripe/webhook`  | POST   | Receives Stripe events. Verifies signature, records `checkout.session.completed` charges to the backend.                            |

---

## Developer Guide

See [docs/guides/MIGRATION_GUIDE.md](./docs/guides/MIGRATION_GUIDE.md) for:

- Breaking changes and how to update imports after each refactor
- New environment setup steps
- Database migration instructions
- Google Business OAuth setup
- Adding new client sites
- Troubleshooting common issues

See [docs/architecture/MULTI_TENANCY_ARCHITECTURE_DRAFT.md](./docs/architecture/MULTI_TENANCY_ARCHITECTURE_DRAFT.md) for:
- Tenant/domain architecture decisions
- Per-tenant email and Stripe strategy
- Migration plan for existing features

See [docs/README.md](./docs/README.md) for the broader documentation map.

---

## License

MIT
