# Phase 6 Entitlement Matrix Draft

Date: 2026-03-24
Status: Draft v1
Owner: RC Tech Bridge

Purpose: define a first-pass matrix for plans, modules, features, and paid add-ons so API/UI entitlement enforcement can begin.

## 1) Scope and Principles

- Backend source of truth remains in `backend-rc` (Express + PostgreSQL).
- Entitlements are evaluated per tenant.
- Plans provide baseline module/feature access.
- Add-ons can extend plan access for specific capabilities.
- `website_core` and `seo_content` are required baseline modules.

## 2) Canonical Keys

Business type enum (from Phase 0):

- `lead_gen_services`
- `appointments`
- `ecommerce`
- `reservations`
- `hybrid_local`

Module enum (from Phase 0):

- `website_core`
- `seo_content`
- `lead_capture`
- `calendar_appointments`
- `checkout_ecommerce`
- `reservations`
- `google_business_management`
- `sms_leads_and_comms`
- `google_ads_optimization`
- `custom_ai_agent`

## 3) Plan Phases (Draft)

Phase naming is intentionally generic until pricing/packaging is approved.

- `phase_base`: foundational launch tier
- `phase_growth`: expanded tier for operators scaling lead flow/content
- `phase_scale`: advanced tier for high-volume operations and automation

## 4) Feature Keys (Draft)

Feature keys are used by API/UI middleware and should be stored in `tenant_features` as normalized flags/counters.

- `content.pages.read`
- `content.pages.write`
- `content.blogs.write`
- `content.media.upload`
- `seo.metadata.write`
- `leads.capture.forms`
- `calendar.appointments.manage`
- `commerce.checkout.manage`
- `reservations.manage`
- `integrations.google_business.sync`
- `integrations.sms.send`
- `integrations.google_ads.optimize`
- `ai.agent.generate`
- `ai.agent.autopilot`
- `analytics.advanced`
- `users.seats.max`

## 5) Plan x Module x Feature Matrix (Draft v1)

Legend:

- `included`: available by plan default
- `gated`: hidden/disabled unless plan/add-on unlocks
- `limit`: available with quota cap

### 5.1 `phase_base`

Included modules:

- `website_core`
- `seo_content`
- `lead_capture`

Conditionally included modules by business type:

- `calendar_appointments` for `appointments` and `hybrid_local` (basic configuration only)
- `checkout_ecommerce` for `ecommerce` (basic catalog + checkout)
- `reservations` for `reservations` and `hybrid_local` (basic availability settings)

Included features:

- `content.pages.read`
- `content.pages.write`
- `content.blogs.write`
- `content.media.upload`
- `seo.metadata.write`
- `leads.capture.forms`

Limited features:

- `users.seats.max` = 3

Gated features:

- `integrations.google_business.sync`
- `integrations.sms.send`
- `integrations.google_ads.optimize`
- `ai.agent.generate`
- `ai.agent.autopilot`
- `analytics.advanced`

### 5.2 `phase_growth`

Included modules:

- `website_core`
- `seo_content`
- `lead_capture`
- one of: `calendar_appointments` or `checkout_ecommerce` or `reservations` as business-type primary

Conditionally included modules by business type:

- non-primary module can be enabled via add-on

Included features:

- all `phase_base` included features
- business-type primary flow management:
  - `calendar.appointments.manage` or
  - `commerce.checkout.manage` or
  - `reservations.manage`

Limited features:

- `users.seats.max` = 8
- `ai.agent.generate` = limit (monthly quota)

Gated features:

- `ai.agent.autopilot`
- `analytics.advanced`

### 5.3 `phase_scale`

Included modules:

- `website_core`
- `seo_content`
- `lead_capture`
- `calendar_appointments`
- `checkout_ecommerce`
- `reservations`

Included features:

- all `phase_growth` included features
- `analytics.advanced`

Limited features:

- `users.seats.max` = 20 (expandable via seat pack)
- `ai.agent.generate` = higher monthly quota

Gated features:

- `ai.agent.autopilot` (premium add-on only)

## 6) Add-On Catalog (Launch Draft)

Launch add-ons confirmed in Phase 0:

- `google_business_management`
- `sms_leads_and_comms`
- `google_ads_optimization`
- `custom_ai_agent`

Add-on behavior draft:

- Add-ons unlock module access and corresponding feature keys.
- Add-ons may be blocked by prerequisite plan phase (example: AI autopilot requires `phase_growth` or `phase_scale`).
- Add-ons can define optional usage counters (for example monthly SMS segments, AI jobs).

## 7) Effective Entitlement Resolution (Draft)

At request time, effective entitlements are computed as:

1. Plan baseline entitlements by `plan_phase`.
2. Business-type conditional defaults.
3. Active add-on overrides.
4. Tenant-specific manual overrides (temporary support grants).
5. Time-window constraints (trial/grace/suspension).

Effective set output:

- enabled modules set
- enabled feature flags set
- feature limits map (for example seat max, monthly quotas)
- reason metadata for audit (`plan`, `addon`, `override`, `grace`)

## 8) API/UI Enforcement Targets (Initial)

- API middleware in `backend-rc` should enforce module + feature checks for protected routes.
- Frontend should consume a tenant entitlement payload for:
  - navigation visibility
  - disabled states
  - upgrade prompts

## 9) Open Items Before Final Approval

- Confirm final plan names and pricing.
- Confirm whether `phase_growth` includes one primary flow or multiple by default.
- Confirm quota values for AI/SMS and seat packs.
- Confirm downgrade grace-period behavior.

## 10) Exit Criteria For This Draft

- Matrix can be used to start implementation of entitlement middleware and UI gating.
- Open items are explicitly tracked for commercial approval.
