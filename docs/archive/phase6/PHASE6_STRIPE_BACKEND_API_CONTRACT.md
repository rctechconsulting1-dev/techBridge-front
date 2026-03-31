# Phase 6 Stripe Backend API Contract

Date: 2026-03-26
Status: Draft v1
Owner: RC Tech Bridge

Purpose: define the backend API surface for scalable Stripe billing and merchant payment operations in `backend-rc`.

Related docs:

- `PHASE6_BILLING_ENTITLEMENT_SYNC_CONTRACT.md`
- `PHASE6_PACKAGING_PRICING_LINKAGE_DRAFT.md`
- `../../architecture/STRIPE_BILLING_AND_PAYMENTS_ARCHITECTURE.md`

## 1) Contract Boundaries

Split the API into two domains:

- platform billing APIs: tenant pays RC Tech Bridge
- merchant payment APIs: tenant customer pays the tenant

Do not expose one mixed set of endpoints for both concerns.

## 2) Shared Rules

Every protected request must:

1. authenticate the caller
2. resolve `tenantId`
3. verify caller has access to the tenant
4. emit structured logs with `tenant_id` and request correlation id

Shared response envelope for errors:

```json
{
  "error": "Human-readable summary",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

## 3) Platform Billing APIs

### 3.1 Sync Tenant Billing Customer

`POST /api/billing/customers/sync`

Purpose:

- create or fetch the platform Stripe customer for a tenant

Request:

```json
{
  "tenantId": 42,
  "billingEmail": "owner@example.com",
  "billingName": "Acme Services LLC"
}
```

Success response:

```json
{
  "tenantId": 42,
  "stripeCustomerId": "cus_123",
  "created": true
}
```

### 3.2 Create Or Replace Subscription

`POST /api/billing/subscriptions`

Purpose:

- create a tenant subscription from selected plan and recurring add-ons

Request:

```json
{
  "tenantId": 42,
  "planPhaseKey": "phase_growth",
  "billingCycle": "monthly",
  "addonKeys": ["google_business_management", "sms_leads_and_comms"],
  "trialDays": 14
}
```

Success response:

```json
{
  "tenantId": 42,
  "stripeCustomerId": "cus_123",
  "stripeSubscriptionId": "sub_123",
  "status": "trialing",
  "planPhaseKey": "phase_growth",
  "addonKeys": ["google_business_management", "sms_leads_and_comms"]
}
```

### 3.3 Preview Plan Change

`POST /api/billing/subscriptions/:tenantId/change-preview`

Request:

```json
{
  "nextPlanPhaseKey": "phase_scale",
  "changeType": "upgrade",
  "effectiveBehavior": "immediate"
}
```

Success response:

```json
{
  "tenantId": 42,
  "currentPlanPhaseKey": "phase_growth",
  "nextPlanPhaseKey": "phase_scale",
  "changeType": "upgrade",
  "effectiveBehavior": "immediate",
  "billingDelta": {
    "amountCents": 12000,
    "currency": "USD"
  }
}
```

### 3.4 Apply Plan Change

`POST /api/billing/subscriptions/:tenantId/change-plan`

Request:

```json
{
  "nextPlanPhaseKey": "phase_scale",
  "changeType": "upgrade",
  "effectiveBehavior": "immediate",
  "metadata": {
    "source": "billing_ops_ui"
  }
}
```

Success response:

```json
{
  "tenantId": 42,
  "stripeSubscriptionId": "sub_123",
  "status": "requested",
  "effectiveBehavior": "immediate"
}
```

### 3.5 Add Or Remove Recurring Add-On

`POST /api/billing/subscriptions/:tenantId/addons`

Request:

```json
{
  "addonKey": "custom_ai_agent",
  "action": "add",
  "effectiveBehavior": "immediate"
}
```

Success response:

```json
{
  "tenantId": 42,
  "addonKey": "custom_ai_agent",
  "status": "active"
}
```

### 3.6 Get Billing Snapshot

`GET /api/billing/subscriptions/:tenantId`

Success response:

```json
{
  "tenantId": 42,
  "stripeCustomerId": "cus_123",
  "stripeSubscriptionId": "sub_123",
  "planPhaseKey": "phase_growth",
  "billingCycle": "monthly",
  "subscriptionStatus": "active",
  "addonKeys": ["google_business_management"],
  "currentPeriodStart": "2026-03-01T00:00:00.000Z",
  "currentPeriodEnd": "2026-04-01T00:00:00.000Z",
  "graceUntil": null
}
```

### 3.7 Get Effective Entitlements

`GET /api/billing/entitlements/:tenantId`

Success response:

```json
{
  "tenantId": 42,
  "planPhaseKey": "phase_growth",
  "addonKeys": ["google_business_management"],
  "effectiveModules": ["website_core", "seo_content", "lead_capture", "calendar_appointments", "google_business_management"],
  "effectiveFeatures": ["commerce.checkout.manage"],
  "featureLimits": {
    "aiMonthly": 1000,
    "seatCap": 8
  },
  "entitlementState": "active",
  "accessStatus": {
    "allowed": true,
    "code": "OK"
  }
}
```

### 3.8 Reconcile Billing State

`POST /api/billing/reconcile/:tenantId`

Purpose:

- manually trigger Stripe-to-local repair for one tenant

Success response:

```json
{
  "tenantId": 42,
  "status": "reconciled",
  "driftDetected": true,
  "updated": true
}
```

## 4) Merchant Payment APIs

### 4.1 Start Connect Onboarding

`POST /api/payments/connect/onboard`

Request:

```json
{
  "tenantId": 42,
  "websiteId": 42,
  "refreshUrl": "https://app.example.com/site-settings?stripe=refresh",
  "returnUrl": "https://app.example.com/site-settings?stripe=return"
}
```

Success response:

```json
{
  "tenantId": 42,
  "stripeConnectedAccountId": "acct_123",
  "url": "https://connect.stripe.com/..."
}
```

### 4.2 Get Connect Status

`GET /api/payments/connect/status?tenantId=42`

Success response:

```json
{
  "tenantId": 42,
  "connected": true,
  "stripeConnectedAccountId": "acct_123",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true,
  "status": "active"
}
```

### 4.3 Create Ecommerce Checkout Session

`POST /api/payments/ecommerce/checkout-session`

Request:

```json
{
  "tenantId": 42,
  "websiteId": 42,
  "orderId": 9001,
  "lineItems": [
    {
      "name": "Main Product",
      "unitAmountCents": 2999,
      "quantity": 2
    }
  ],
  "successUrl": "https://tenant.example.com/checkout/success",
  "cancelUrl": "https://tenant.example.com/checkout/cancel"
}
```

Success response:

```json
{
  "tenantId": 42,
  "orderId": 9001,
  "stripeAccountId": "acct_123",
  "checkoutSessionId": "cs_test_123",
  "url": "https://checkout.stripe.com/..."
}
```

### 4.4 Create Booking Deposit PaymentIntent

`POST /api/payments/bookings/deposit-intent`

Request:

```json
{
  "tenantId": 42,
  "websiteId": 42,
  "bookingId": 501,
  "depositAmountCents": 5000,
  "currency": "USD",
  "captureMethod": "automatic"
}
```

Success response:

```json
{
  "tenantId": 42,
  "bookingId": 501,
  "stripeAccountId": "acct_123",
  "paymentIntentId": "pi_123",
  "clientSecret": "pi_123_secret_abc"
}
```

### 4.5 Create Booking Balance PaymentIntent

`POST /api/payments/bookings/final-balance-intent`

Request:

```json
{
  "tenantId": 42,
  "bookingId": 501,
  "remainingAmountCents": 12500,
  "currency": "USD"
}
```

### 4.6 Create Refund

`POST /api/payments/refunds`

Request:

```json
{
  "tenantId": 42,
  "paymentIntentId": "pi_123",
  "amountCents": 1000,
  "reason": "requested_by_customer"
}
```

Success response:

```json
{
  "tenantId": 42,
  "refundId": "re_123",
  "status": "succeeded"
}
```

## 5) Operational APIs

### 5.1 Replay Stripe Event

`POST /api/ops/stripe/events/:eventId/replay`

Purpose:

- replay one durable event from `billing_events`

### 5.2 Inspect Tenant Stripe Health

`GET /api/ops/stripe/tenants/:tenantId/health`

Purpose:

- return billing sync state, connect state, failed events, and drift status

## 6) Machine-Readable Error Codes

Platform billing errors:

- `BILLING_TENANT_NOT_FOUND`
- `BILLING_CUSTOMER_SYNC_FAILED`
- `BILLING_SUBSCRIPTION_NOT_FOUND`
- `BILLING_PLAN_PHASE_INVALID`
- `BILLING_ADDON_NOT_ALLOWED`
- `BILLING_RECONCILE_FAILED`

Merchant payment errors:

- `PAYMENTS_CONNECT_NOT_READY`
- `PAYMENTS_ACCOUNT_RESTRICTED`
- `PAYMENTS_CHECKOUT_CREATE_FAILED`
- `PAYMENTS_BOOKING_PAYMENT_FAILED`
- `PAYMENTS_REFUND_FAILED`

Authorization and entitlement errors:

- `TENANT_ACCESS_DENIED`
- `ENTITLEMENT_MODULE_MISSING`
- `ENTITLEMENT_FEATURE_MISSING`
- `ENTITLEMENT_RESTRICTED_STATE`

## 7) Recommended Implementation Order

Execute in this order:

1. `customers/sync`
2. `subscriptions`
3. `entitlements`
4. `connect/onboard`
5. `connect/status`
6. `ecommerce/checkout-session`
7. `bookings/deposit-intent`
8. `ops/stripe` replay and health tools

This order matches the platform-first, then merchant-payments rollout.