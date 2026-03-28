# Phase 6 Billing-to-Entitlement Sync Contract Draft

Date: 2026-03-24
Status: Draft v1
Owner: RC Tech Bridge

Purpose: define how billing state (plan/add-ons/status) becomes enforceable tenant entitlements in a deterministic and auditable way.

## 1) Scope

- Billing platform: Stripe Billing on the RC Tech Bridge platform account.
- Backend system of record: `backend-rc` (Express + PostgreSQL).
- Entitlement persistence: tenant module/feature tables and entitlement snapshot fields.

Out of scope for this contract:

- tenant ecommerce payments
- appointment deposits and later balance collection
- refunds and disputes on connected accounts

Those payment flows should run through separate Stripe Connect payment processing and must not directly define SaaS entitlements.

## 2) Source of Truth and Precedence

Primary sources:

1. Stripe subscription state (plan + active add-ons).
2. Backend entitlement mapping configuration (plan/add-on -> modules/features/limits).
3. Manual support override records (time-bounded, auditable).

Precedence order for effective entitlements:

1. Hard suspension/disable flags (highest priority).
2. Manual emergency overrides.
3. Stripe-derived plan + add-ons.
4. Default fallback for onboarding/trial.

## 3) Canonical Contract Objects

### 3.1 Billing State Input

- `tenant_id`
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan_phase` (`phase_base` | `phase_growth` | `phase_scale`)
- `addon_keys[]`
- `subscription_status` (`trialing` | `active` | `past_due` | `unpaid` | `canceled`)
- `current_period_start`
- `current_period_end`
- `grace_until` (nullable)

### 3.2 Effective Entitlement Output

- `tenant_id`
- `effective_modules[]`
- `effective_features[]`
- `feature_limits` (JSON map)
- `entitlement_state` (`active` | `grace` | `restricted` | `suspended`)
- `computed_at`
- `version`
- `reasons[]` (`plan`, `addon`, `override`, `grace`, `suspension`)

## 4) Event-Driven Sync Flow

### 4.1 Trigger Events

Stripe webhook event families:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `entitlements.active_entitlement_summary.updated` (if adopted)

Internal events:

- tenant manual override created/updated/expired
- reconciliation job detected drift

### 4.2 Processing Rules

For each event:

1. Verify Stripe signature.
2. Resolve tenant via `stripe_customer_id`, `stripe_subscription_id`, and metadata mapping.
3. Store raw event in idempotency/event log (`event_id` unique).
4. Build normalized billing state.
5. Compute effective entitlements from mapping config.
6. Upsert entitlement snapshot + module/feature grants in one DB transaction.
7. Emit audit log with diff (before -> after).

## 5) Reconciliation Contract

Scheduled reconciliation job (recommended every 15 minutes):

1. Pull active tenant subscriptions from Stripe.
2. Compare against local entitlement snapshot hash/version.
3. Recompute and repair drift where detected.
4. Record reconciliation outcome per tenant.

Drift categories:

- missing local snapshot
- stale version
- mismatched add-ons
- status mismatch (`past_due` not reflected)

## 6) Failure Handling and Fallback Behavior

- If webhook processing fails, mark event `failed` with reason and retry with exponential backoff.
- If retries exceed threshold, route to dead-letter queue and alert on-call.
- If Stripe is temporarily unavailable during reconciliation, keep last known good entitlements and mark tenant `sync_degraded`.
- Never grant broader access on uncertainty; fail closed for premium gated features.

## 7) Status-to-Access Policy (Draft)

- `trialing`: full plan/add-on access until trial end.
- `active`: full plan/add-on access.
- `past_due`: retain access during grace window; downgrade to `restricted` after `grace_until`.
- `unpaid`: restricted access (read + core admin), premium features disabled.
- `canceled`: restricted until period end, then baseline fallback policy.

## 8) Audit and Observability Requirements

Per entitlement write:

- capture actor/source (`stripe_webhook`, `reconcile_job`, `support_override`)
- capture old/new entitlement digest
- capture correlation IDs (`stripe_event_id`, request ID)

Monitoring:

- webhook failure rate
- event processing latency
- reconciliation drift count
- count of tenants in `sync_degraded`

## 9) API Contract Surface (Backend)

Required backend endpoints/services (names illustrative):

- `POST /internal/billing/webhooks/stripe`
- `POST /internal/entitlements/reconcile`
- `GET /internal/tenants/:tenantId/entitlements`
- `POST /internal/tenants/:tenantId/entitlements/override`

Implementation note: endpoint names can differ, but behavior and idempotency guarantees should match this contract.

Related but separate payment-processing endpoints for connected-account commerce and bookings should live outside this entitlement contract.

## 10) Minimal Data Model Additions (Draft)

Proposed tables/fields in backend DB:

- `tenant_entitlement_snapshots`
  - `tenant_id` unique
  - `plan_phase`
  - `addon_keys` (jsonb/text[])
  - `effective_modules` (jsonb/text[])
  - `effective_features` (jsonb/text[])
  - `feature_limits` (jsonb)
  - `entitlement_state`
  - `version`
  - `computed_at`
- `billing_events`
  - `event_id` unique
  - `tenant_id`
  - `source`
  - `status`
  - `payload`
  - `processed_at`
- `tenant_entitlement_overrides`
  - `tenant_id`
  - `override_payload`
  - `starts_at`
  - `ends_at`
  - `created_by`

## 11) Rollout Plan (Draft)

1. Ship plan/add-on mapping config in backend.
2. Add webhook idempotency + snapshot upsert transaction.
3. Add reconciliation job + alerts.
4. Turn on API middleware enforcement against snapshot.
5. Turn on UI gating from entitlement payload.

## 12) Open Decisions

- Final grace window duration for `past_due`.
- Exact restricted-access policy (which endpoints remain writable).
- Whether to use Stripe native entitlements event as primary or secondary signal.
- Manual override SLA and approval flow.

## 13) Exit Criteria For This Draft

- Backend team can implement deterministic billing-to-entitlement sync.
- Ops has a defined reconciliation and failure-recovery path.
