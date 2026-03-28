# Phase 6 Stripe Webhook Worker Design

Date: 2026-03-26
Status: Draft v1
Owner: RC Tech Bridge

Purpose: define the webhook ingestion, queueing, retry, and reconciliation design needed to scale Stripe billing and tenant payment operations safely.

Related docs:

- `PHASE6_STRIPE_BACKEND_API_CONTRACT.md`
- `PHASE6_BILLING_ENTITLEMENT_SYNC_CONTRACT.md`
- `../../architecture/STRIPE_BILLING_AND_PAYMENTS_ARCHITECTURE.md`

## 1) Design Goals

- acknowledge Stripe quickly
- preserve every event durably
- process idempotently
- separate platform billing from merchant payment workers
- support replay and reconciliation without manual database surgery

## 2) Ingress Model

Recommended public endpoints:

- `POST /api/webhooks/stripe/platform-billing`
- `POST /api/webhooks/stripe/connect-payments`

If one ingress route is kept for external simplicity, it must dispatch internally by:

- `event.account` presence
- event family
- metadata contract

Ingress handler responsibilities only:

1. verify Stripe signature
2. parse event safely
3. determine `stripe_account_scope`
4. persist to `billing_events`
5. enqueue worker job
6. return `200`

Ingress must not do heavy business mutations.

## 3) Event Resolution Rules

### 3.1 Platform Billing Events

Resolve tenant using this order:

1. `stripe_customer_id`
2. `stripe_subscription_id`
3. metadata fallback

### 3.2 Connected-Account Merchant Events

Resolve tenant using this order:

1. `event.account`
2. payment object metadata `tenantId`
3. website or business object lookup fallback

If tenant cannot be resolved:

- mark event `failed`
- do not discard it
- raise alert after retry threshold

## 4) Worker Lanes

### 4.1 `billing-events`

Processes:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Primary outputs:

- `tenant_billing_profiles`
- `tenant_billing_addons`
- `tenant_entitlement_snapshots`

### 4.2 `merchant-payment-events`

Processes:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `account.updated`
- `capability.updated`

Primary outputs:

- `tenant_payment_accounts`
- `tenant_order_payments`
- `tenant_booking_payments`

### 4.3 `reconciliation`

Processes:

- scheduled Stripe state comparisons
- replay of missed or drifted objects
- post-incident repair jobs

## 5) Idempotency Model

### 5.1 Event-Level Idempotency

Use `billing_events` unique key:

- `event_id`
- `stripe_account_scope`
- `stripe_account_id` or `platform`

Repeated delivery should:

- not create duplicate business mutations
- return the already-known event state

### 5.2 Mutation-Level Idempotency

Within workers, business upserts must target stable natural keys:

- `tenant_id` for billing profiles
- (`tenant_id`, `addon_key`) for add-ons
- `stripe_payment_intent_id` for payment rows
- `stripe_checkout_session_id` for checkout rows

## 6) Retry And Dead-Letter Policy

Recommended retry schedule:

1. immediate retry for transient DB lock or network failures
2. exponential backoff after first retry
3. dead-letter after threshold, for example 8 attempts

Store on the event row:

- `retry_count`
- `failure_code`
- `failure_message`
- latest `updated_at`

Dead-lettered events should trigger alerts with:

- `tenant_id`
- `event_id`
- `event_type`
- `stripe_account_scope`

## 7) Worker Transactions

### 7.1 Billing Worker Transaction

For one event:

1. load current tenant billing state
2. normalize Stripe subscription and invoice data
3. update `tenant_billing_profiles`
4. update `tenant_billing_addons`
5. recompute entitlements
6. update `tenant_entitlement_snapshots`
7. mark `billing_events.status = processed`

These writes should happen in one transaction where practical.

### 7.2 Merchant Payment Worker Transaction

For one event:

1. resolve tenant and business object
2. upsert payment row
3. update domain record if needed:
   - order status
   - booking status
   - connected-account state
4. mark `billing_events.status = processed`

If external side effects are needed, use outbox or follow-up jobs rather than mixing them into the event transaction.

## 8) Reconciliation Jobs

### 8.1 Billing Reconciliation

Run every 15 minutes.

Checks:

- local subscription state matches Stripe
- add-on state matches Stripe items
- entitlement snapshot version matches expected mapping version
- grace and delinquency windows are reflected correctly

### 8.2 Merchant Payment Reconciliation

Run every 15 minutes for hot tenants and at least hourly for the rest.

Checks:

- recent Checkout Sessions and PaymentIntents have local records
- refund and dispute states are reflected locally
- connected-account capabilities have not drifted

## 9) Observability

Every structured log or metric should include:

- `tenant_id`
- `event_id`
- `event_type`
- `stripe_account_scope`
- `stripe_account_id`
- `worker_lane`
- `status`

Minimum dashboards:

- webhook ingress success rate
- worker failure rate by event type
- dead-letter count
- oldest queued event age
- reconciliation drift count

## 10) Step 1 Through Step 8 Execution Order

Yes, execute in order, but grouped into three phases.

### Phase A: Platform Billing Foundation

Step 1. create billing customer sync

Step 2. create subscription management

Step 3. implement entitlement read model and sync

### Phase B: Merchant Payment Foundation

Step 4. implement Connect onboarding

Step 5. implement Connect status sync

Step 6. move ecommerce checkout onto backend payment service

Step 7. implement booking deposit PaymentIntent flow

### Phase C: Operational Hardening

Step 8. add replay, health inspection, queue monitoring, and reconciliation tooling

This order is correct because platform billing unlocks entitlements first, while merchant payments can be added without coupling tenant access control to customer payment flows.

## 11) Definition Of Done

- webhook ingress is fast and idempotent
- no Stripe event is lost without an audit row
- premium entitlements derive only from platform billing
- tenant payment records derive only from connected-account payment events
- replay and reconciliation can repair drift without direct database edits