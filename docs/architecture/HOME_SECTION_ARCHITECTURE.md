# Home Section Architecture

## Goal

Define a concrete, SEO-safe architecture for Home page sections so the Built-in Pages editor can support variants without turning into a freeform page builder.

This spec is grounded in the current codebase:

- Home page composition already happens in `Built-in Pages -> Home`.
- Some sections are already collection-backed in the public route.
- Variants already exist and should remain controlled.
- Launch-one needs a structured system that operators can actually complete.

## Core Rule

Every Home section must declare its content source.

There are only three allowed sources:

1. Global site settings
2. Reusable collections
3. Page-owned section content

Do not let section variants become fully freeform content blocks.

## Source Of Truth Model

### 1. Global Site Settings

Use for cross-site utility data only.

Examples:

- business name
- logo
- primary, secondary, accent colors
- phone
- email
- address
- review count
- average rating
- reusable CTA background token

Global settings should not be the long-term source of Home-specific copy once the Home editor owns that field.

### 2. Reusable Collections

Use when the content can appear in more than one page or must be managed as records.

Examples:

- services
- testimonials
- FAQ items
- team members
- products

The Home editor should configure how the section uses the collection. It should not duplicate the collection data inline.

### 3. Page-Owned Section Content

Use when the copy exists for this page only and is tightly tied to conversion intent.

Examples:

- hero headline and body
- hero CTA
- CTA section headline/body/button
- promo / offer messaging
- page-specific intro copy for collection-backed sections

## Home Section Buckets

### A. Direct-Edit Sections

These should be edited directly in the Home editor.

- Hero
- CTA
- Offer

Optional future additions in this bucket:

- local credibility intro
- campaign announcement band

### B. Collection-Backed Sections

These should use collection records as the source of truth, with page-level configuration only.

- Services Preview
- Testimonials
- FAQ
- About Preview / Team Preview
- Booking source selectors if booking gets collection-backed later

### C. Computed Trust Sections

These should render from global or derived data and expose only limited configuration.

- star rating bar
- badges / stats
- contact snippet
- location snippet

## Current Codebase Alignment

The current implementation already supports the following patterns:

- `HomeHeroVariants` renders from Home content merged into presentation settings.
- `HomeServicesPreviewVariants` renders from the services collection.
- `HomeTestimonialsVariants` renders from the testimonials collection.
- `FAQSection` renders from the FAQ collection.
- `TeamSection` renders from the team collection.
- `HomeProofVariants` can render from review signals or computed counts.

That means the product direction should be to formalize section contracts, not to replace the system with per-section freeform modals.

## Recommended Admin UI Pattern

Use section cards in the Home editor with a drawer-based configuration flow.

### Why Drawer Over Modal

A drawer is better than a modal for section editing because:

- the operator needs to see section order while editing
- SEO guidance needs more space than a modal should hold
- variant selection often needs examples and warnings
- source-of-truth links need to stay visible

Use modals only for small, focused actions:

- choose featured testimonials
- reorder FAQ items
- pick assets
- confirm destructive actions

## Section Card Model

Each Home section card should show:

- section name
- active variant
- source type: global, collection, or page-owned
- readiness status
- SEO status
- quick actions

Suggested statuses:

- Ready
- Needs Source Content
- Needs Page Copy
- Needs Review
- Not Recommended For Current Recipe

## Drawer Model

Each section drawer should contain:

1. Variant picker
2. Section contract
3. Source configuration
4. Page-owned copy fields
5. SEO guidance
6. Mini preview

### Section Contract Block

Every variant must declare:

- required data source
- required fields
- optional fields
- rendering constraints
- SEO constraints

This prevents operators from using a variant without the data it needs.

## Concrete Home Section Contracts

## 1. Hero

### Source

- page-owned copy
- global phone/address for supporting trust snippets
- optional global/default background fallback only until page-owned value exists

### Variants

- `service_area_call`
- `credential_split`
- `appointment_split`
- `offer_stack`

### Page-Owned Fields

- heroTitle
- heroBody
- heroPrimaryCtaText
- heroPrimaryCtaUrl
- heroBackgroundImageUrl
- heroBackgroundOverlayColor

### Required Rules

- exactly one H1 on the page
- hero title required
- primary CTA text required
- primary CTA URL required
- hero body strongly recommended

### SEO Rules

- include the primary local intent naturally in hero title or hero body
- do not keyword stuff city + service repeatedly
- primary CTA must align with conversion mode
- support entity trust with phone, location, or credentials only when true

### UX Recommendation

- keep this in the main editor, not a collection
- show intent helper for `call`, `email`, `appointment`, `checkout`
- warn if hero CTA and page conversion mode conflict

## 2. Proof / Trust Section

### Source

- computed signals from global review data and collections

### Variants

- `star_rating_bar`
- `badges_and_stats`
- `logo_and_badge_row`
- `stats_bar`
- `review_strip`

### Config Fields

- optional eyebrow label override
- optional heading override
- optional support text
- trust mode: `reviews`, `counts`, `mixed`

### Required Rules

- `star_rating_bar` requires review count or average rating
- stats-based variants require enough collection data to avoid looking empty

### SEO Rules

- never invent ratings or review counts
- do not show aggregate review claims without real source data
- prefer trust signals that are visible and verifiable

### UX Recommendation

- use a drawer with disabled variants when required data is missing
- show live dependency checks before allowing save

## 3. Services Preview

### Source

- services collection

### Variants

- `three_card_grid`
- `authority_list`
- `service_tiles`
- `compact_cards`

### Section Config Fields

- sectionEyebrow
- sectionHeading
- sectionIntro
- itemsToShow
- sourceFilter: `featured`, `manual`, `all_published`, `category`
- selectedServiceIds
- CTA style
- CTA destination rule

### Collection Fields

- service title
- service slug
- service content / excerpt
- publish state
- optional category
- optional featured flag

### Required Rules

- minimum 3 published services for standard Home usage
- all cards should link to crawlable service routes when those exist
- if service pages do not exist yet, fallback CTA should be explicit

### SEO Rules

- link to real service pages whenever available
- section heading should support service intent without duplicating H1
- use descriptive link text, not generic repeated anchors everywhere

### UX Recommendation

- section drawer for heading, intro, variant, count, filter
- picker modal only for manual service selection
- direct link to Services manager

## 4. Testimonials

### Source

- testimonials collection

### Variants

- `review_cards`
- `single_featured_quote`
- `featured_quote`
- `review_strip`

### Section Config Fields

- sectionEyebrow
- sectionHeading
- sectionIntro
- displayCount
- sourceFilter: `featured`, `manual`, `latest`, `highest_rated`, `service_type`, `city`
- selectedTestimonialIds

### Collection Fields

- quote
- author_name
- author_title
- optional city
- optional service_type
- optional rating
- featured flag
- publish state

### Required Rules

- review card variants require at least 2 to 3 published testimonials
- single featured quote requires at least 1 featured or manually selected testimonial

### SEO Rules

- prefer real names and relevant local/service context when true
- do not rewrite testimonials into keyword spam
- testimonials should strengthen trust, not carry ranking intent alone

### UX Recommendation

- drawer for heading, intro, count, filter, variant
- modal for manual testimonial picking and ordering
- direct link to Testimonials manager

## 5. FAQ

### Source

- FAQ collection

### Variants

- `accordion`
- `cards`
- `split_list`

### Section Config Fields

- sectionEyebrow
- sectionHeading
- sectionIntro
- sourceFilter: `featured`, `manual`, `topic`, `page_intent`
- selectedFaqIds
- maxItems

### Collection Fields

- question
- answer
- optional topic
- featured flag
- publish state

### Required Rules

- minimum 3 FAQ items for Home if FAQ is enabled
- maximum 5 to 6 items on Home unless a strong reason exists

### SEO Rules

- questions should mirror real search phrasing
- answers should be concise and factual
- avoid cloning the exact same FAQ block across all pages
- only output FAQ schema for visible, real content

### UX Recommendation

- drawer for heading, intro, variant, source rules, max items
- modal for manual selection and ordering
- direct link to FAQ manager

## 6. About Preview / Team Preview

### Source

- team collection
- optional page-owned intro copy

### Variants

- current preview path uses `TeamSection` variants from generic section variants

### Section Config Fields

- sectionEyebrow
- sectionHeading
- sectionIntro
- displayCount
- sourceFilter: `featured`, `manual`, `leadership_only`, `all_published`
- selectedTeamMemberIds

### Collection Fields

- name
- title
- bio
- photo_url
- linkedin_url

### Required Rules

- do not enable when no team members exist
- keep Home usage short; this is a preview, not the full About page

### SEO Rules

- use to reinforce credibility and experience
- include real people only
- keep text differentiated from About page copy

### UX Recommendation

- drawer for section config
- modal for featured team selection if needed
- direct link to Team manager

## 7. CTA Section

### Source

- page-owned copy

### Variants

- `quote_request`
- `consultation_request`
- `book_now`
- `offer_claim`

### Page-Owned Fields

- ctaHeadline
- ctaBody
- ctaButtonText
- ctaButtonUrl

### Global Dependencies

- theme colors
- optional reusable background token

### Required Rules

- if CTA section is enabled, headline and button text are required
- button destination must match conversion mode

### SEO Rules

- CTA should close the page narrative, not introduce a new unrelated intent
- do not repeat generic CTA text across every page

### UX Recommendation

- direct-edit inside Home editor
- variant-specific copy guidance

## 8. Offer Section

### Source

- page-owned copy

### Section Config Fields

- offerLabel
- offerHeadline
- offerBody
- offerButtonText
- offerButtonUrl
- optional expiry note

### Required Rules

- use only when there is a truthful, current offer
- hide entirely if the tenant has no real offer

### SEO Rules

- avoid fake urgency
- keep claims truthful and time-bound when shown

## Home Editor UX Recommendation

## Recommended Screen Structure

### 1. Strategy Layer

- recipe
- conversion mode
- theme pack
- section order

### 2. Section Cards Layer

Each active section gets a card with:

- section name
- current variant
- source type
- readiness badge
- SEO badge
- `Configure`
- `Manage Source`

### 3. Direct Page Fields Layer

Only for page-owned fields:

- hero
- CTA
- offer

### 4. Preview Layer

- draft preview link
- mini inline preview per section where possible

## Readiness Checks

Each section should validate independently.

Examples:

- Testimonials enabled but zero published testimonials -> blocking
- FAQ enabled but only one FAQ item -> blocking
- Services Preview enabled but no published services -> blocking
- Hero missing title -> blocking
- CTA enabled but no button text -> blocking
- Proof section using review variant without review data -> advisory or blocking depending on variant

## SEO Guardrails By Section

## Hard Rules

- one H1 only
- page intent must match conversion mode
- collection-backed sections must use real published records only
- schema should only be emitted for visible, supported content
- no variant should allow fake proof or fake business claims

## Soft Rules

- avoid identical section headings across Home, Services, and About
- avoid using the same testimonial subset on every page
- cap Home FAQ length for scannability
- prioritize service-page internal links from Home

## Recommended Product Rule For Variants

Variants should be approved presentation recipes, not layout freedoms.

That means:

- operators can choose from approved variants
- operators can configure allowed fields
- operators cannot arbitrarily add fields per variant
- each variant has declared dependencies and validation

## Modal Vs Drawer Decision

Use drawers by default.

Use modals only for:

- selecting records
- sorting records
- picking media
- confirming removal

Do not use full-screen modals as the primary section editor for Home.

## Phased Implementation

## Phase 1

Formalize section metadata and validation.

- define source type per section
- define required fields per variant
- define readiness checks
- expose source manager links from section cards

## Phase 2

Add drawer-based section configuration.

- section config drawers for collection-backed sections
- direct-edit panels remain for Hero and CTA
- manual record-picker modals where needed

## Phase 3

Add SEO-aware section guidance.

- section-level recommendations
- warnings for weak or duplicate configurations
- intent alignment checks between recipe, variant, and CTA

## Recommendation Summary

The right architecture is not:

- one freeform modal per section

The right architecture is:

- structured Home section cards
- drawer-based configuration
- modal pickers only for small tasks
- collection-backed sections where content is reusable
- direct page-owned editing only where the content is truly page-specific
- variant-level SEO and validation contracts

This keeps the system rankable, reusable, and much harder for operators to break.