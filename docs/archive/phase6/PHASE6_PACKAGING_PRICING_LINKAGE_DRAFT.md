# Phase 6 Packaging and Pricing Linkage Draft

Date: 2026-03-24
Status: Draft v1
Owner: RD Tech Bridge

Purpose: convert Phase 6 packaging direction into implementation-ready plan definitions and a Stripe pricing linkage contract that backend and UI can enforce.

Related docs:

- `PHASE6_ENTITLEMENT_MATRIX_DRAFT.md`
- `PHASE6_BILLING_ENTITLEMENT_SYNC_CONTRACT.md`

## 1) Packaging Model

### 1.1 Plan Phase Definitions

Canonical plan phases:

- `phase_base`: launch tier for foundational website + lead operations
- `phase_growth`: operator tier for scaled lead/content workflows and partial automation
- `phase_scale`: advanced tier for multi-flow operations and higher limits

### 1.2 Business-Type Primary Flow Rule

For `phase_growth`, one primary operational module is included by business type:

- `appointments` -> `calendar_appointments`
- `ecommerce` -> `checkout_ecommerce`
- `reservations` -> `reservations`
- `lead_gen_services` -> no transactional flow module by default
- `hybrid_local` -> choose one primary flow at onboarding

Additional transactional flow modules are enabled through add-ons.

## 2) Plan Inclusions (Implementation Baseline)

### 2.1 `phase_base`

Included modules:

- `website_core`
- `seo_content`
- `lead_capture`

Included core capabilities:

- pages/content authoring
- SEO metadata edits
- media uploads
- lead form capture

Limits:

- seat cap: 3

### 2.2 `phase_growth`

Included modules:

- all `phase_base` modules
- one business-type primary flow module

Included capabilities:

- all `phase_base` capabilities
- primary flow operations management

Limits:

- seat cap: 8
- AI generation quota: medium monthly cap (final number pending pricing approval)

### 2.3 `phase_scale`

Included modules:

- all baseline modules
- all transactional flow modules (`calendar_appointments`, `checkout_ecommerce`, `reservations`)

Included capabilities:

- all `phase_growth` capabilities
- advanced analytics

Limits:

- seat cap: 20 (with optional seat-pack expansion)
- AI generation quota: high monthly cap (final number pending pricing approval)

## 3) Add-On Catalog and Eligibility

Launch add-ons (Phase 0 confirmed):

- `google_business_management`
- `sms_leads_and_comms`
- `google_ads_optimization`
- `custom_ai_agent`

Draft eligibility gates:

- `google_business_management`: available on all plan phases
- `sms_leads_and_comms`: available on all plan phases
- `google_ads_optimization`: requires `phase_growth` or `phase_scale`
- `custom_ai_agent`: requires `phase_growth` or `phase_scale`

## 4) Stripe Pricing Linkage Contract (Draft)

### 4.1 Canonical Keys

- `plan_phase_key`: one of `phase_base`, `phase_growth`, `phase_scale`
- `addon_key`: one of launch add-on keys
- `price_lookup_key`: Stripe price lookup key used for deterministic mapping

### 4.2 Required Mapping Object

Store this mapping in backend configuration (versioned):

- `plan_phase_key` -> `price_lookup_key` (monthly)
- `plan_phase_key` -> `price_lookup_key` (annual, optional)
- `addon_key` -> `price_lookup_key` (monthly)
- `addon_key` -> plan prerequisites
- `addon_key` -> entitlement deltas (modules/features/limits)

Example shape:

```json
{
  "plans": {
    "phase_base": {
      "monthly_lookup_key": "plan_phase_base_monthly",
      "annual_lookup_key": "plan_phase_base_annual"
    },
    "phase_growth": {
      "monthly_lookup_key": "plan_phase_growth_monthly",
      "annual_lookup_key": "plan_phase_growth_annual"
    },
    "phase_scale": {
      "monthly_lookup_key": "plan_phase_scale_monthly",
      "annual_lookup_key": "plan_phase_scale_annual"
    }
  },
  "addons": {
    "google_business_management": {
      "monthly_lookup_key": "addon_google_business_monthly",
      "allowed_plan_phases": ["phase_base", "phase_growth", "phase_scale"]
    },
    "sms_leads_and_comms": {
      "monthly_lookup_key": "addon_sms_comms_monthly",
      "allowed_plan_phases": ["phase_base", "phase_growth", "phase_scale"]
    },
    "google_ads_optimization": {
      "monthly_lookup_key": "addon_google_ads_monthly",
      "allowed_plan_phases": ["phase_growth", "phase_scale"]
    },
    "custom_ai_agent": {
      "monthly_lookup_key": "addon_custom_ai_agent_monthly",
      "allowed_plan_phases": ["phase_growth", "phase_scale"]
    }
  }
}
```

## 5) Upgrade and Downgrade Linkage Rules

- Plan upgrades apply immediately and recompute entitlements in the same webhook cycle.
- Plan downgrades apply at period boundary by default unless manual support override is approved.
- Add-on purchase applies immediately after successful invoice state.
- Add-on cancellation applies at period end unless immediate cancellation is explicitly requested.

## 6) Commercial Controls Needed Before Finalization

- Final currency and regional pricing policy.
- Final monthly quotas for AI and SMS.
- Whether annual plans are launch-ready or phase-2.
- Exact grace duration and restricted feature set for delinquent accounts.

## 7) Engineering Acceptance Criteria

- Every Stripe line item can be mapped to one `plan_phase_key` or `addon_key`.
- Mapping is deterministic, versioned, and auditable.
- Entitlement recompute is idempotent for repeated webhook delivery.
- UI can render current plan, add-ons, and upgrade opportunities from one entitlement payload.

## 8) Exit Criteria For This Draft

- Phase 6 items "Define plan phases" and "Define add-on catalog and pricing linkage" are implementation-ready at draft level.
- Open commercial controls are listed for final approval pass.
