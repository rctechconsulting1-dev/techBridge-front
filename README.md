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
- **Authentication** — Supabase-backed sign-in/sign-up with Google OAuth

### Tech Stack

- Next.js 15.x (App Router, Server Components, ISR)
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase (auth + database)
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
│   ├── auth/             # Supabase auth callback handlers
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

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |
| `OPENAI_API_KEY` | OpenAI API key |
| `REVALIDATE_SECRET` | Secret for ISR revalidation webhook |
| `S3_UPLOAD_KEY` | AWS S3 access key |
| `S3_UPLOAD_SECRET` | AWS S3 secret key |
| `S3_UPLOAD_BUCKET` | AWS S3 bucket name |
| `S3_UPLOAD_REGION` | AWS S3 region |

---

## Developer Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for:
- Breaking changes and how to update imports after each refactor
- New environment setup steps
- Database migration instructions
- Google Business OAuth setup
- Adding new client sites
- Troubleshooting common issues

---

## License

MIT

