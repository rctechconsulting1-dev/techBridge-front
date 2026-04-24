# RD Tech Bridge — Product Vision

**Last updated:** April 2026  
**Status:** Active source of truth

---

## What We Are Building

A **white-label website and growth platform** that helps small businesses get conversions.

We handle everything needed to make a business rank on Google, convert visitors, and run smarter — packaged as subscriptions and add-ons managed from one admin dashboard.

---

## Core Belief

A small business website is only valuable if it:
1. **Ranks** — shows up when customers search
2. **Converts** — turns visitors into leads, bookings, or sales
3. **Runs itself** — reduces the time the owner spends managing it

Every decision in the platform should serve one of those three things.

---

## The 5 Business Types

The platform is built around five business models. Each has a different primary conversion goal.

| Type | Code | Conversion Goal |
|---|---|---|
| **Home Services / Trades** | `lead_gen_services` | Phone call or contact form submission |
| **Appointments** | `appointments` | Appointment booked (online or by phone) |
| **Ecommerce** | `ecommerce` | Product purchase |
| **Reservations / Hospitality** | `reservations` | Reservation or table booking (restaurants, hotels, event venues) |
| **Local Business / Hybrid** | `hybrid_local` | Walk-in, call, or form — mix of intent |

These types drive the intake flow, section recipes, CTA variants, and which add-ons are recommended at onboarding.

---

## The Website Is the Foundation

Before any add-on matters, the website must rank and convert. This is the non-negotiable core.

### SEO — Ranking Requirements
- Proper semantic HTML structure (H1/H2/H3 hierarchy)
- Page-level SEO title and meta description (editable per page)
- Automatic XML sitemap generation
- Structured data / schema markup per business type
- Internal linking enforced by page structure
- Image alt text on all uploads
- Performance: optimized images, minimal JS, fast TTFB
- Accessibility: contrast, ARIA labels, keyboard navigation
- Google Search Console connection — import real keyword/click data to improve page copy

### Website Structure
Each site starts with a default page system.

Structured built-in pages:
- **Home**
- **Services**
- **About**
- **Shop** (when ecommerce is enabled)

Default page-backed navigation rules:
- Industry navbar links are page-backed parent pages by default
- **Contact** is a real page by default
- **FAQ** is a real page when it appears in the industry navbar or header navigation
- Any industry navbar item that uses a route like `/contact`, `/faq`, `/locations`, or `/reviews` must resolve to a real page
- Custom Pages supports standalone parent pages and child pages under another parent when the information architecture requires it
- Example: `/blog` is the parent page and `/blog/how-to-do-x` is a child page
- If a header route is removed later, the linked page should be unpublished instead of deleted, and the system should preserve that unpublished state for sitemap and 404 safety

Each structured page has:
- **Content** — headline, body, CTAs (edited in the admin dashboard)
- **SEO** — title and description (editable, AI-assisted)
- **Presentation** — recipe (layout strategy), theme pack (visual style), section order, section variants

### Page Builder Direction
The page builder should be **controlled, strategic, and conversion-focused**.

We are not building a freeform website builder like Wix. We are building a system that gives tenants a unique-looking website while keeping every important page aligned to SEO and conversion best practices.

Core builder rules:
- When a tenant is created, the system should generate default **industry pages** based on business type
- Platform admins can add more parent pages through the header navigation model
- The **Custom Pages** system can create additional parent pages and child pages
- Industry pages must include required sections that keep the page on-topic and structurally strong for ranking
- Blog pages, support pages, resource pages, and other child pages can use a more flexible content model

### How We Keep Sites Unique Without Becoming a Generic Builder
Each structured page should be assembled from:
- **Required section slots** for the page type
- **Optional section slots** where appropriate
- **A small set of high-quality variants** per section
- **Theme packs** that control overall visual language
- **Recipes** that control strategy and section order

This lets us mix and match layouts, tone, and visual presentation across tenants without losing control of what makes a page rank and convert.

### Builder Ownership By Page Type
- **Industry parent pages** use the structured builder with required slots, approved section variants, AI-assisted copy, and strong SEO guardrails
- **Built-in pages** like Home, Services, About, and Shop are the first structured page set in this system
- **Custom parent pages** can use a lighter structured model or custom page model depending on purpose
- **Child pages** like blog posts or nested support content can use a more flexible editor, as long as SEO rules still apply

### AI Content Role
AI should help draft and improve copy for every page type.

The AI agent should:
- Generate first-draft copy based on business type, intake answers, and page intent
- Respect the purpose of the page instead of writing generic content
- Suggest SEO titles, meta descriptions, headings, CTAs, and section copy
- Learn from manual edits over time so future drafts improve

AI helps produce content, but the builder controls structure.

### Page Builder Spec

#### Page Types
- **Industry parent pages** — top-level pages generated from business type and header navigation choices
- **Built-in core pages** — the first structured page set: Home, Services, About, Shop
- **Custom parent pages** — additional top-level pages such as Blog, Locations, Reviews, Resources, or Campaigns
- **Custom child pages** — nested pages such as blog posts, service detail pages, support articles, or location detail pages

#### Builder Modes
- **Structured builder** — used for industry parent pages and built-in core pages
- **Semi-structured builder** — used for custom parent pages that still need conversion and SEO guardrails
- **Flexible content builder** — used for custom child pages where the format varies more by content type

#### Structured Builder Rules
- Every industry parent page has a defined page intent
- Every industry parent page has required section slots based on that intent
- Every required slot has a small number of approved variants
- Optional slots can be added only where they support the page goal
- Recipes define the recommended section order and strategy for the page
- Theme packs define the visual language without changing core structure

#### Required Section Philosophy
Required sections exist to keep the page focused, complete, and rankable.

Examples:
- **Home** should usually include hero, proof, services preview, and CTA
- **Services** should usually include hero, service list, trust/supporting proof, FAQ, and CTA
- **About** should usually include hero, credibility/story, team or trust proof, and CTA
- **Contact** should usually include hero or intro, contact methods, service area or location context, and lead form/CTA
- **FAQ** should usually include intro, grouped questions, trust reinforcement, and CTA
- **Locations** should usually include intro, location/service area content, trust proof, and CTA

These are patterns, not arbitrary layouts. The system should allow curated variation without removing the required strategic structure.

#### Semi-Structured Builder Rules
- Custom parent pages can use a lighter version of the structured builder
- They may have fewer required slots depending on page type
- They can support parent/child relationships
- They should still follow SEO rules for headings, metadata, slug quality, and internal linking

#### Flexible Content Builder Rules
- Custom child pages can use a more flexible editor suited to articles, resource content, or nested informational pages
- They still require SEO fields, publishing status, slug rules, and internal linking support
- They do not appear in the main header by default

#### Parent / Child URL Rules
- Parent pages own top-level routes like `/blog`, `/locations`, or `/reviews`
- Child pages inherit from the parent route, such as `/blog/how-to-prepare-for-panel-upgrade`
- Parent pages can serve as landing pages and also hold children
- Removing a parent from header navigation should not automatically destroy its children

#### Navigation Assignment Model
We should adopt one consistent rule set for page hierarchy and navigation assignment.

Recommended platform rule set:
- Required core pages are always present: **Home**, **Services**, **About**, **Contact**
- Optional high-level pages are toggleable: **Shop**, **Menu**, **FAQ**, **Reviews**, **Locations**, **Blog**, **Reservations**
- Every internal header item must map to a real page unless it is explicitly marked external
- Parent/child routing must be stored on the page model
- Header placement must be stored separately from routing hierarchy
- Child pages are hidden from the header by default
- Dropdowns are opt-in and should only be used for stable, browseable child-page groups
- Built-in and industry-managed parent pages should have safer constraints than custom pages

This means the architecture and the UI are separate concerns:
- **Architecture** decides whether a page exists, what type it is, whether it is a parent or child, and what route it owns
- **Navigation UI** decides whether that page is enabled, visible in the header, direct, grouped, or hidden

The platform should not use a single boolean like `is_main_nav` as the source of truth for all header behavior.

#### Recommended Field Model
The backend contract should model page structure and navigation structure separately.

Page-level fields:
- `page_source` — `built_in`, `industry_nav`, `custom`, `system`
- `page_role` — `parent`, `child`
- `page_type` — `home`, `services`, `about`, `contact`, `faq`, `reviews`, `locations`, `blog`, `menu`, `shop`, `reservation`, `article`, `location_detail`, `service_detail`, `custom`
- `parent_id` — nullable parent page reference used for route hierarchy and content hierarchy
- `is_required` — whether the page is part of the minimum tenant site structure
- `is_enabled` — whether this page is active for the tenant at all
- `is_published` — whether the page is publicly routable and indexable
- `slug` — page URL segment
- `path` or derived full path — generated from parent/child pathing rules

Navigation-level fields:
- `nav_placement` — `header`, `footer`, `hidden`
- `nav_style` — `direct`, `dropdown_parent`, `dropdown_child`
- `nav_parent_id` — nullable reference to the header parent item when a page is rendered inside a dropdown
- `nav_order` — explicit order in the header group
- `nav_label` — optional label override for header presentation
- `is_external_link` — whether the nav item is not backed by an internal page

Important rule:
- `parent_id` must not automatically equal `nav_parent_id`

Examples:
- `/blog/how-to-do-x` should usually have `parent_id = blog` and `nav_placement = hidden`
- `/locations/elk-grove` may have `parent_id = locations` and `nav_style = dropdown_child`

#### Recommended Admin UI Controls
The admin experience should present these as intentional controls rather than inferred behavior.

For optional system pages:
- `Enable Page`
- `Publish Page`
- `Show in Header`

When a page is header-visible:
- `Display As` — `Direct Link` or `Dropdown Parent`
- `Header Order`
- `Navigation Label`

For child pages:
- `Parent Page`
- `Show Under Parent Dropdown`
- `Dropdown Order`

Expected UI behavior:
- Turning on `Enable Page` for **Shop**, **Menu**, **Locations**, or another optional system page should ensure the real page exists
- Turning off `Enable Page` for an industry-managed optional page should unpublish or hide it safely rather than delete it
- `Show in Header` should be separate from `Enable Page`
- `Display As` should be separate from `Show in Header`
- Child pages should default to `hidden` unless explicitly promoted into a dropdown

#### Header and Dropdown Rules
The header should only show pages that deserve primary navigation attention.

Top-level direct link candidates:
- Home
- Services
- About
- Contact
- Shop
- Blog
- FAQ
- Reviews
- Reservations

Dropdown-parent candidates:
- Services, when multiple service-detail children are worth surfacing
- Locations, when multiple city or service-area children exist
- Shop, when category or collection pages need direct browsing
- Resources or Blog, when the parent is a real landing page and the children are stable enough to browse from nav

Dropdowns should only be enabled when all of these are true:
- The parent page is header-visible
- The parent page is a real landing page, not just a folder concept
- At least 2 published children are marked as nav-eligible
- The child pages are stable and meaningfully different
- The group is small enough to scan quickly

Child pages should remain hidden from the header when they are:
- Blog posts
- Support articles
- Long-tail SEO pages
- Location detail pages that are better discovered from the parent landing page body

#### Tenant Onboarding Generation Rules
Tenant creation should generate both the page set and the initial nav structure.

Required by default for all tenants:
- Home
- Services
- About
- Contact

Enabled conditionally by business model or onboarding choice:
- Shop for ecommerce tenants
- Menu and Reservations for hospitality flows
- FAQ when the industry preset or header preset calls for it
- Reviews when review-led trust is part of the industry strategy
- Locations when multi-area landing pages are part of the SEO plan
- Blog when content marketing is intentionally enabled

Onboarding should assign:
- Which pages are enabled
- Which enabled pages appear in the header
- Which header pages are direct versus dropdown parents
- Which child pages are hidden versus dropdown children

Example outcomes:
- Lead-gen electrician: Home, Services, About, Reviews, FAQ, Contact in header; service children hidden until promoted
- Ecommerce brand: Home, Shop, About, FAQ, Contact in header; Shop may become a dropdown if categories are enabled
- Restaurant or hospitality: Home, Menu, Reservations, About, Contact in header; Menu and Reservations optional but toggleable

#### Safe Constraints
The system should protect against fragile nav states.

Constraints:
- Required core pages should not be fully removed from the tenant site structure
- Internal header items should not point at missing or unpublished pages
- Child pages should not become top-level header items by accident
- Removing a header item should not delete the underlying page by default
- Removing an industry-managed optional header page should unpublish or hide it with an audit trail
- Custom pages with children should not lose their children when removed from header navigation

#### Concrete Backend Contract
The backend implementation in `backend-rc` should move away from overloading `is_main_nav` as the only page-navigation flag.

Minimum durable contract:
- Keep existing page identity and publishing fields
- Add page-structure fields that describe hierarchy and source
- Add navigation-assignment fields that describe header/footer visibility independently of hierarchy

Recommended database-facing page fields:
- `page_source` — `built_in`, `industry_nav`, `custom`, `system`
- `page_role` — `parent`, `child`
- `page_type` — controlled page classification used for builder rules and onboarding defaults
- `parent_id` — route/content parent
- `is_required` — true for minimum tenant structure pages
- `is_enabled` — whether the tenant has this page concept enabled
- `is_published` — whether the page is publicly routable
- `slug` — route segment
- `sort_order` — content-level order if needed

Recommended navigation-assignment fields:
- `nav_placement` — `header`, `footer`, `hidden`
- `nav_style` — `direct`, `dropdown_parent`, `dropdown_child`
- `nav_parent_id` — header-group parent for dropdown children
- `nav_order` — order within the current nav group
- `nav_label` — optional display override
- `is_external_link` — for explicit external links only

Compatibility rule:
- `is_main_nav` can remain temporarily as a legacy compatibility field, but it should become a derived or transitional flag rather than the long-term source of truth

Behavior rules the backend must enforce:
- Internal header items must resolve to a real enabled page unless intentionally marked external
- Child pages may exist and be published without appearing in header nav
- `parent_id` drives route hierarchy, not header grouping by itself
- `nav_parent_id` drives dropdown grouping only when `nav_style = dropdown_child`
- Disabling an optional industry-managed page should unpublish or hide it safely rather than hard-delete it
- Removing a page from header nav must not delete its children

#### Concrete Frontend UI Mapping
The frontend should absorb this model in two places first:
- `src/app/(admin)/(others-pages)/site-settings/page.tsx`
- `src/app/(admin)/(others-pages)/(forms)/main-page/page.tsx`

Current reality in the codebase:
- Site Settings still owns industry header templates and header-link syncing
- Page creation and page organization still rely heavily on `is_main_nav`
- The public navbar still reads header links from site settings and falls back to legacy nav link behavior

Phase-1 frontend adaptation should be:

1. Site Settings becomes the place to toggle optional system pages
- Add toggles for: Shop, Menu, FAQ, Reviews, Locations, Blog, Reservations
- Keep industry nav presets, but convert them into "enable and assign" actions rather than raw link lists only
- When a toggle is turned on, ensure the page exists
- When a toggle is turned off, hide or unpublish the page safely according to backend rules

2. Main Page Manager becomes the place to organize hierarchy and nav presentation
- Replace the mental model of `is_main_nav` with explicit page role plus navigation assignment
- Let admins choose parent/child hierarchy independently of header visibility
- Let admins choose whether a header-visible page is a direct link or dropdown parent
- Let admins assign child pages into dropdowns explicitly

3. Public navbar rendering should read normalized navigation assignment
- Prefer backend-provided header navigation records over inferred page state
- Continue supporting legacy site-settings links during migration
- Only render dropdowns when the page is explicitly marked as a dropdown parent and has eligible dropdown children

#### Concrete File-Level Changes
Frontend files that should change first:

`src/types/page.ts`
- Add navigation-facing fields to the `Page` type: `nav_placement`, `nav_style`, `nav_parent_id`, `nav_order`, `nav_label`, `is_enabled`, `is_required`
- Keep `is_main_nav` only as a temporary compatibility field during migration

`src/hooks/usePageManager.ts`
- Stop treating `is_main_nav` as the main classifier for header parents
- Derive groups from `page_role`, `nav_placement`, and `nav_style`
- Return new collections such as `headerDirectPages`, `dropdownParentPages`, `dropdownChildPages`, and `hiddenChildPages`

`src/components/page-manager/PageCreationWizardEnhanced.tsx`
- Replace the simple `is_main_nav` checkbox with explicit controls:
	- page role
	- parent page
	- show in header
	- display as direct or dropdown parent
	- show under parent dropdown for eligible child pages
- Preserve the current parent-page picker but separate it from header assignment

`src/components/page-manager/PageOrganizer.tsx`
- Replace the current `Header Parent Pages` grouping based on `is_main_nav` with nav-aware groupings:
	- Header Direct Pages
	- Dropdown Parents
	- Dropdown Children
	- Standalone Parent Pages
	- Hidden Child Pages

`src/app/(admin)/(others-pages)/(forms)/main-page/page.tsx`
- Replace missing-header-page sync logic so it works from enabled nav-assignment rules instead of only required slugs plus `is_main_nav`
- Continue using slug-health checks, but validate against page existence and nav placement separately

`src/app/(admin)/(others-pages)/site-settings/page.tsx`
- Move from template-only header-link lists toward:
	- industry nav presets
	- optional page toggles
	- safe sync actions that create or hide route-backed parent pages

`src/components/sections/NavBar.tsx`
- Eventually consume normalized header navigation records, not only site settings header links or inferred page assumptions
- During migration, support both the new navigation records and current settings-driven links

#### Recommended Admin Workflow
The admin workflow should become:

1. During onboarding or Site Settings
- choose business type
- apply industry navigation preset
- enable optional parent pages
- let the system create missing route-backed parent pages

2. In Page Manager
- choose whether a page is a parent or child
- assign route parent if needed
- choose whether the page is hidden, header direct, dropdown parent, or dropdown child
- order pages within the current nav group

3. In public rendering
- only enabled and published pages can be navigated to
- only header-assigned pages render in header nav
- only explicitly grouped dropdown children render under dropdown parents

#### Recommended Delivery Sequence
Implementation order should be:

1. Backend contract and migration plan in `backend-rc`
2. Frontend `Page` type updates in `src/types/page.ts`
3. Page Manager grouping and creation UI refactor
4. Site Settings optional-page toggles and safe sync behavior
5. Public navbar migration to normalized navigation data
6. Cleanup of legacy `is_main_nav`-driven logic after compatibility window

#### AI Workflow Rules
- AI drafts copy after the page type, page intent, and builder mode are known
- AI writes within the structure of the selected recipe and section slots
- AI should generate page-specific copy, not generic filler
- AI should suggest SEO titles, meta descriptions, headings, CTA copy, and supporting section content
- AI output must remain editable by admins and tenant editors according to permissions

#### Phase 1 Implementation
- Generate default industry parent pages when a tenant is created
- Map business type to a default header navigation and parent page set
- Keep built-in core pages on the structured builder
- Add Contact and FAQ as supported parent-page patterns
- Support custom parent pages and child pages in the existing page manager model
- Keep nav removal behavior as unpublish, not delete, for industry-managed parent pages

#### Phase 2 Implementation
- Expand the structured builder to more parent page types such as Reviews, Locations, Reservations, and Menu
- Add more approved section variants and recipe options
- Improve AI page drafting and learning from manual edits
- Add stronger parent/child management, previews, and editorial workflow
- Add redirect handling and richer SEO lifecycle tools for slug changes and page retirement

### Current Build Map

This is the practical rollout plan against the current codebase.

#### Phase 1 Goal
Make the existing product behave like the new page-system model without attempting a full CMS rebuild.

#### Frontend Ownership
- **Business-type and onboarding defaults**
	- Owns which industry parent pages should exist for a tenant
	- Current frontend touchpoints: onboarding preset definitions and onboarding workflow
	- Files: `src/lib/onboarding-presets.ts`, `src/app/(admin)/(others-pages)/onboarding/page.tsx`

- **Industry navbar to parent-page mapping**
	- Owns default header navigation per industry and determines which parent-page slugs must exist
	- Current frontend touchpoint: global site settings navigation editor
	- File: `src/app/(admin)/(others-pages)/site-settings/page.tsx`

- **Built-in structured page editor**
	- Owns structured builder behavior for the core page set first
	- Current frontend touchpoints: built-in page content defaults and built-in page editor
	- Files: `src/lib/builtInPageContent.ts`, `src/app/(admin)/(others-pages)/built-in-pages/[pageKey]/page.tsx`

- **Custom parent and child page management**
	- Owns flexible page creation, parent-child relationships, and non-core page editing
	- Current frontend touchpoints: main page manager, page creation wizard, page hook types
	- Files: `src/types/page.ts`, `src/hooks/usePageManager.ts`, `src/components/page-manager/PageCreationWizardEnhanced.tsx`, `src/app/(admin)/(others-pages)/(forms)/main-page/page.tsx`

- **Public site rendering**
	- Owns whether parent pages and child pages resolve correctly on the site
	- Current frontend touchpoints: built-in page routes, dynamic custom page route, navbar rendering
	- Files: `src/components/sections/NavBar.tsx`, `src/app/sites/[websiteId]/page.tsx`, `src/app/sites/[websiteId]/[slug]/page.tsx`, built-in route files under `src/app/sites/[websiteId]/...`

#### Backend Work Required For Phase 1
The frontend repo can define the rules, but backend work will be required to make the model durable.

Required backend outcomes:
- Support page source/type distinctions for built-in, industry-nav parent pages, custom parent pages, and child pages
- Support parent-child path generation and validation
- Support unpublish-on-nav-removal behavior for industry-managed parent pages
- Support auditability for page state transitions
- Support default page generation when a tenant is created or when an industry preset is applied

Because the backend lives in `backend-rc`, this frontend repo should document and consume that contract rather than inventing a local-only page system.

#### Recommended Phase 1 Order
1. Define the backend page contract for page source, parent-child relationships, and publish state behavior
2. Extend frontend page types to reflect the new page roles cleanly
3. Map business presets to default parent-page slugs
4. Use Site Settings to keep industry header navigation and required parent pages in sync
5. Keep built-in pages as the first structured-builder set
6. Use the existing custom page manager for non-core parent pages and child pages until a richer builder is needed

#### What We Should Not Do In Phase 1
- Do not build a drag-and-drop website builder
- Do not try to make every page type use the exact same editor immediately
- Do not blur the difference between industry-managed parent pages and flexible custom content pages
- Do not make AI responsible for page structure decisions

#### Success Criteria For Phase 1
- A new tenant gets the right parent-page set from business type and industry navbar defaults
- Header navigation reflects real parent pages instead of placeholder links
- Built-in core pages continue using a structured builder
- Custom Pages can represent parent pages and child pages cleanly
- Removing an industry header page unpublishes it safely instead of deleting it
- AI can assist copy generation for both structured pages and custom pages without breaking the page model

### Themes and Variants (Controlled, Not Freeform)
We do not offer drag-and-drop. We offer curated choices:
- **Theme packs** — visual language (colors, typography, spacing) set by brand tokens
- **Recipes** — pre-approved section layouts optimized per business type and conversion mode
- **Section variants** — multiple rendering options per section slot (e.g. hero: `service_area_call`, `trust_bar`, `credential_split`)

Platform admin controls recipe/theme/section order. Tenant editors control copy and SEO drafts.

---

## Growth Features (Add-ons)

Once the site is live, these features help the business grow and run:

### Visibility & Traffic
- **Google My Business** — connect, post updates, respond to reviews, manage listing from the dashboard
- **Google Search Console** — pull real performance data (impressions, clicks, keywords) to guide content improvements
- **Google Ads** — create and manage campaigns from the dashboard

### Social Media
- Connect Instagram, Facebook, etc.
- Schedule and publish posts across platforms
- Track engagement from the dashboard

### Conversion Tools
- **Booking / Appointment system** — embedded booking widget, calendar management
- **Intake forms** — custom lead capture forms per business type
- **Online store / checkout** — product catalog, cart, Stripe payments (ecommerce type)

### AI Agents
- **SEO content agent** — generates and improves page copy using intake answers + Search Console data, learns from manual edits
- **Review response agent** — drafts responses to Google reviews
- **Custom agents** — business-specific automations (scheduling, follow-ups, estimates, etc.) built as add-ons

---

## Monetization

Everything is subscription + add-on based.

- **Base subscription** — website hosting, built-in pages, basic SEO
- **Add-ons** — each growth feature (GMB, GSC, Ads, Social, Booking, AI agents) is a separately activated module
- **Platform admin** — RD Tech Bridge controls what's enabled per tenant via entitlements

---

## Platform Architecture (Brief)

- **Frontend:** Next.js 15 App Router (`admin-dashboard-rc`)
- **Backend:** Express.js REST API, PostgreSQL on AWS RDS (`backend-rc`)
- **Multi-tenancy:** Every API call is scoped to `tenant_id` + `website_id`
- **Tenant resolution:** Hostname → domain table lookup → tenant context on every request
- **No Supabase.** Migrations live in `backend-rc/migrations/` as node-pg-migrate `.js` files.
- **Admin dashboard:** Platform staff + tenant owners/managers use one shared app; permissions control what each role sees

---

## What We Are NOT Building (V1)

- A generic website builder (no drag-and-drop, no arbitrary layouts)
- A full CMS with freeform content types

---

## What This Platform Also Is

**We are a marketing agency.** The platform is the delivery vehicle — we use it to build, manage, and grow our clients' digital presence. The tooling (GMB, GSC, Ads, social, AI agents) exists so our team can operate at scale across many clients from one dashboard.

**Enterprise deployments are a future goal.** V1 runs all tenants on shared infrastructure. As the platform matures, high-value or high-volume clients may receive dedicated deployments. Architecture decisions should not block this path.
