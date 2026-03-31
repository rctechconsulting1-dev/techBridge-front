# Stripe Billing And Payments Architecture

Date: 2026-03-26
Owner: RC Tech Bridge
Status: Draft v1

Purpose: define a scalable Stripe architecture for a multi-tenant platform where tenants both pay RC Tech Bridge for software access and receive payments from their own customers for ecommerce orders and appointment deposits.

## 1) Core Principle

Treat platform billing and tenant merchant payments as two separate Stripe domains:

- Platform billing: tenant pays RC Tech Bridge for subscription plans and recurring add-ons.
- Merchant payments: tenant customer pays the tenant for products, services, deposits, and later balance collection.

Do not mix these domains inside one subscription or one account-scoping model.

## 2) Stripe Account Topology

### 2.1 Platform Billing Account

Use the main RC Tech Bridge Stripe platform account for SaaS billing.

Per tenant:

- one Stripe `Customer`
- one active Stripe `Subscription`
- one base plan subscription item
- zero or more recurring add-on subscription items

This is the account used for:

- plan upgrades and downgrades
- recurring add-ons
- invoice collection
- dunning and grace policies
- billing portal or internal billing operations
- entitlement synchronization

### 2.2 Connected Accounts For Merchant Payments

Use Stripe Connect for tenant-operated commerce and service payments.

Per tenant:

- one connected Stripe account
- one onboarding lifecycle
- one payout and compliance state

This is the account used for:

- ecommerce checkout
- appointment deposits
- later balance collection
- refunds
- disputes and chargebacks
- optional application fees retained by RC Tech Bridge

## 3) Payment Domain Mapping

| Domain | Paying party | Stripe surface | Account scope | System of record |
| --- | --- | --- | --- | --- |
| SaaS plan | tenant | Stripe Billing | platform account | `backend-rc` |
| SaaS add-on | tenant | Stripe Billing | platform account | `backend-rc` |
| Ecommerce order | tenant customer | Checkout Session or PaymentIntent | connected account | `backend-rc` |
| Appointment deposit | tenant customer | PaymentIntent preferred | connected account | `backend-rc` |
| Appointment balance | tenant customer | PaymentIntent or invoice flow | connected account | `backend-rc` |

## 4) Scalable Design Rules

### 4.1 Thin Webhook Ingress

Webhook handlers should do only the minimum synchronous work needed to:

1. verify Stripe signature
2. identify the account domain and tenant
3. persist the raw event idempotently
4. enqueue a downstream job
5. return `2xx` quickly

Business mutation logic should run in backend workers, not in the public webhook route.

### 4.2 Durable Event Ledger

Store all Stripe events in a durable event table with:

- unique `event_id`
- `stripe_account_scope` (`platform`, `connected`)
- `stripe_account_id` nullable for platform events
- `tenant_id` nullable until resolution
- `event_type`
- raw payload
- processing status
- retry metadata

This supports replay, audit, dead-letter recovery, and per-tenant debugging.

### 4.3 Queue-Based Processing

Use a worker queue behind webhook ingestion.

Recommended worker lanes:

- `billing-events`
- `merchant-payment-events`
- `reconciliation`

This prevents long-running invoice or booking logic from blocking webhook acknowledgements.

### 4.4 Reconciliation Is Mandatory

Stripe webhooks are necessary but not sufficient for scale.

Run scheduled reconciliation jobs to detect:

- missing events
- stale subscription state
- payout or capability drift on connected accounts
- booking or order records not updated after successful payment

### 4.5 Fail Closed For Entitlements

If billing state is uncertain, do not grant premium platform access by default.

Keep the last known good snapshot, mark the tenant sync state degraded, alert operations, and reconcile.

## 5) Canonical Tenant Data Model

Use separate billing and merchant-payment records.

### 5.1 Tenant Billing Profile

Recommended backend table: `tenant_billing_profiles`

Fields:

- `tenant_id` unique
- `stripe_customer_id` unique
- `stripe_subscription_id` nullable unique
- `billing_email`
- `plan_phase_key`
- `billing_cycle` (`monthly`, `annual`)
- `subscription_status`
- `grace_until`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `last_invoice_id`
- `last_synced_at`
- `sync_status` (`ok`, `degraded`, `failed`)

### 5.2 Tenant Billing Add-Ons Snapshot

Recommended backend table: `tenant_billing_addons`

Fields:

- `tenant_id`
- `addon_key`
- `stripe_subscription_item_id`
- `stripe_price_id`
- `status`
- `quantity`
- `current_period_start`
- `current_period_end`

Constraint:

- unique (`tenant_id`, `addon_key`)

### 5.3 Tenant Payment Account

Recommended backend table: `tenant_payment_accounts`

Fields:

- `tenant_id` unique
- `stripe_connected_account_id` unique
- `account_type`
- `charges_enabled`
- `payouts_enabled`
- `details_submitted`
- `onboarding_completed_at`
- `default_currency`
- `country`
- `capabilities_json`
- `requirements_due_json`
- `status` (`pending`, `active`, `restricted`, `disabled`)
- `last_synced_at`

### 5.4 Payment Intent And Checkout Records

Recommended backend tables:

- `tenant_order_payments`
- `tenant_booking_payments`

Shared fields:

- `tenant_id`
- `website_id`
- `stripe_account_id`
- `stripe_checkout_session_id` nullable
- `stripe_payment_intent_id` nullable
- `stripe_charge_id` nullable
- `amount`
- `currency`
- `status`
- `payment_purpose`
- `metadata_json`
- `created_at`
- `updated_at`

Purpose-specific fields:

- `order_id` for ecommerce
- `booking_id` for appointments
- `deposit_amount` and `remaining_amount` for bookings when applicable

### 5.5 Entitlement Snapshot

Keep the entitlement contract separate from payment event tables.

Recommended tables:

- `tenant_entitlement_snapshots`
- `tenant_entitlement_overrides`
- `billing_events`

This remains the correct place for modules, features, limits, and billing-derived access state.

## 6) Backend Service And Endpoint Plan

Implement these in `backend-rc` as internal platform services. Exact route names can vary, but the boundaries should remain stable.

### 6.1 Platform Billing Endpoints

- `POST /api/billing/customers/sync`
  - ensure tenant has platform Stripe customer
- `POST /api/billing/subscriptions`
  - create tenant subscription from selected plan and add-ons
- `POST /api/billing/subscriptions/:tenantId/change-plan`
  - preview and apply plan phase changes
- `POST /api/billing/subscriptions/:tenantId/addons`
  - add or remove recurring add-ons
- `GET /api/billing/subscriptions/:tenantId`
  - return normalized billing snapshot
- `GET /api/billing/entitlements/:tenantId`
  - return effective entitlements plus access state
- `POST /api/billing/reconcile/:tenantId`
  - manual repair entry point

### 6.2 Merchant Payments Endpoints

- `POST /api/payments/connect/onboard`
  - create or refresh connected-account onboarding link
- `GET /api/payments/connect/status`
  - return connected-account capability state for tenant
- `POST /api/payments/ecommerce/checkout-session`
  - create tenant-scoped Checkout Session
- `POST /api/payments/bookings/deposit-intent`
  - create booking deposit PaymentIntent
- `POST /api/payments/bookings/final-balance-intent`
  - create later balance PaymentIntent when needed
- `POST /api/payments/refunds`
  - create refund in connected-account scope
- `GET /api/payments/orders/:orderId`
  - inspect payment status for order lifecycle
- `GET /api/payments/bookings/:bookingId`
  - inspect payment status for booking lifecycle

### 6.3 Webhook Endpoints

- `POST /api/webhooks/stripe/platform-billing`
- `POST /api/webhooks/stripe/connect-payments`

If one public endpoint is kept for operational simplicity, dispatch internally by:

- `event.account` presence
- event family
- metadata contract

Even with one ingress route, processing should split into separate worker paths.

## 7) Metadata Contract

Every Stripe object created by the platform should include enough metadata to resolve tenant and business object ownership deterministically.

### 7.1 Platform Billing Metadata

Attach to subscription or customer objects:

- `tenantId`
- `planPhaseKey`
- `environment`

Attach to add-on subscription items where helpful:

- `tenantId`
- `addonKey`

### 7.2 Merchant Payment Metadata

Attach to Checkout Sessions and PaymentIntents:

- `tenantId`
- `websiteId`
- `paymentPurpose`
- `orderId` or `bookingId`
- `environment`

Allowed `paymentPurpose` values:

- `ecommerce_order`
- `appointment_deposit`
- `appointment_balance`

## 8) Webhook Event Matrix

### 8.1 Platform Billing Events

| Event | Worker lane | Primary action | Notes |
| --- | --- | --- | --- |
| `customer.subscription.created` | `billing-events` | create or refresh tenant billing snapshot | initialize base plan state |
| `customer.subscription.updated` | `billing-events` | recompute plan and add-ons | primary source for upgrades and downgrades |
| `customer.subscription.deleted` | `billing-events` | mark canceled state and recompute access | respect period-end rules |
| `invoice.paid` | `billing-events` | clear delinquency and activate or restore full access | authoritative for successful collection |
| `invoice.payment_failed` | `billing-events` | set past-due or grace state | do not immediately hard-suspend unless policy says so |
| `invoice.finalized` | `billing-events` | optional audit or preview capture | useful for ops visibility |
| `customer.subscription.trial_will_end` | `billing-events` | notify ops or tenant owner | optional but useful |

### 8.2 Connected-Account Merchant Events

| Event | Worker lane | Primary action | Notes |
| --- | --- | --- | --- |
| `checkout.session.completed` | `merchant-payment-events` | mark ecommerce checkout completed and hydrate charge intent linkage | mostly ecommerce |
| `payment_intent.succeeded` | `merchant-payment-events` | mark order or booking payment succeeded | primary for deposits |
| `payment_intent.payment_failed` | `merchant-payment-events` | mark payment failed and release or flag business object | critical for booking hold logic |
| `charge.refunded` | `merchant-payment-events` | sync refund status into order or booking records | include partial refunds |
| `charge.dispute.created` | `merchant-payment-events` | flag risk workflow and notify ops | tenant-visible incident |
| `account.updated` | `merchant-payment-events` | refresh connected-account capabilities and requirements | capability drift detection |
| `capability.updated` | `merchant-payment-events` | update tenant payment availability state | optional but useful for stricter onboarding state |

## 9) Booking Deposit Strategy

For appointments, prefer `PaymentIntent` over Checkout Session when any of the following apply:

- deposit amount is dynamic
- booking availability must stay on-page
- card should be stored for later balance collection
- the workflow may collect a remaining balance later

Recommended booking lifecycle:

1. create tentative booking with `pending_payment`
2. create connected-account PaymentIntent for deposit amount
3. confirm payment
4. on `payment_intent.succeeded`, mark booking `confirmed`
5. if needed, create a second PaymentIntent later for the remaining balance

Avoid depending on long-delay manual capture windows for future appointments.

## 10) Entitlements And Access Control

Platform billing should be the only source that grants or removes SaaS entitlements.

Connected-account merchant payments must not directly change tenant plan entitlements.

Examples:

- successful ecommerce sale does not enable `checkout_ecommerce`
- a connected-account dispute does not downgrade the tenant subscription
- tenant plan cancellation does not alter historical order payment records

This separation keeps accounting and access control predictable.

## 11) Scaling Guardrails

### 11.1 Database

- index every high-volume table by `tenant_id`, `status`, and `created_at`
- keep immutable event payloads in append-only tables
- maintain compact materialized current-state tables for reads

### 11.2 Workers

- process Stripe events idempotently
- use exponential backoff retries
- move poison messages to dead-letter storage after threshold breaches
- expose queue depth and age metrics

### 11.3 Observability

Every Stripe log, metric, and alert should include:

- `tenant_id`
- `stripe_account_scope`
- `stripe_account_id`
- `event_id`
- `business_object_type`
- `business_object_id`

### 11.4 Operational Limits

Design for:

- one platform account handling all SaaS subscriptions
- hundreds to low thousands of connected accounts
- per-tenant queue isolation via logical partitioning when hot tenants emerge

If a single tenant becomes unusually high volume, isolate worker throughput by tenant key before considering dedicated infrastructure.

## 12) Recommended Build Order

1. lock the billing catalog and lookup-key mapping
2. implement platform billing customer and subscription persistence
3. implement billing webhook ledger and entitlement recompute worker
4. implement connected-account onboarding and status sync
5. move ecommerce checkout persistence behind backend payment services
6. add booking deposit PaymentIntent flow
7. add reconciliation jobs for both billing and merchant payments
8. add support tooling for replay, refund, dispute, and entitlement drift repair

## 13) Final Architecture Decision

Use:

- Stripe Billing on the RC Tech Bridge platform account for tenant subscription plans and recurring add-ons
- Stripe Connect connected accounts for tenant ecommerce, appointment deposits, and other customer-facing payments

That split is the default architecture to scale safely without coupling SaaS billing logic to tenant merchant operations.