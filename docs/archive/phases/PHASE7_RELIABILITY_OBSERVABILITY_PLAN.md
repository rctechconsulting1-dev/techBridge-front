# Phase 7 Reliability and Observability Plan

Date: 2026-03-24
Status: Completed
Owner: RD Tech Bridge

Purpose: define actionable reliability work for critical flows (login, payments, bookings, lead email delivery) with alerting and recovery readiness.

## 1) Immediate Phase 7 Tasks

1. Configure subscription change worker runtime environment in deployment:
   - `SUBSCRIPTION_CHANGE_WORKER_INTERVAL_MS`
   - `SUBSCRIPTION_CHANGE_ALERT_WEBHOOK_URL`
2. Wire alert webhook destination (Slack/Teams/PagerDuty) and validate alert delivery.
3. Add SLO targets and error budgets for each critical flow.
4. Add failure alerting for payment webhooks and booking creation.
5. Add retry + dead-letter handling for outbound email/SMS pathways.
6. Add tenant-level latency/error dashboards and runbook links.

## 2) Worker Runtime Env Snippet

```env
SUBSCRIPTION_CHANGE_WORKER_INTERVAL_MS=60000
SUBSCRIPTION_CHANGE_ALERT_WEBHOOK_URL=https://your-alert-webhook.example.com/subscription-change

# Shared ops alerts (used by payment webhook failure alerting)
OPS_ALERT_WEBHOOK_URL=https://your-alert-webhook.example.com/ops

# Optional override for payment-webhook-only alerts
PAYMENT_WEBHOOK_ALERT_WEBHOOK_URL=https://your-alert-webhook.example.com/payments

# Optional in-memory alert dedupe window (milliseconds)
OPS_ALERT_THROTTLE_MS=300000

# Required for persistent reliability metrics + DLQ backend ingestion APIs
OPS_METRICS_INGEST_KEY=change-this-to-a-strong-shared-secret

# Email notify reliability controls
EMAIL_NOTIFY_RETRY_MAX_ATTEMPTS=3
EMAIL_NOTIFY_RETRY_BASE_MS=500
EMAIL_DLQ_MAX_ITEMS=200
EMAIL_DLQ_ADMIN_KEY=change-this-to-a-strong-secret

# Root marketing landing to tenant website mapping for public booking form
NEXT_PUBLIC_ROOT_LANDING_WEBSITE_ID=1
```

## 3) SLO Draft (Initial)

- Login API success rate: 99.9% per 30 days
- Checkout/session creation success rate: 99.9% per 30 days
- Payment webhook processing success rate: 99.95% per 30 days
- Booking creation success rate: 99.9% per 30 days
- Lead email enqueue success rate: 99.9% per 30 days

## 4) Alert Triggers (Initial)

- Payment webhook failures >= 3 in 5 minutes
- Booking creation failures >= 5 in 10 minutes
- Subscription change worker reported `failed > 0` or repeated `skipped > 0`
- Lead delivery queue retries exceed threshold for > 10 minutes

Implementation status:

- Payment webhook failure alerting is now wired in `src/app/api/stripe/webhook/route.ts` using `src/lib/ops-alerts.ts`.
- Booking creation failure alerting is now wired via backend booking endpoint `backend-rc/routes/bookings.js` with persisted ops telemetry.
- Email notification retries + dead-letter queue baseline implemented in `src/app/api/email/notify/route.ts`.
- DLQ list/replay tooling added at `src/app/api/email/dlq/route.ts` (guarded by `x-email-dlq-admin-key`).
- Tenant-level reliability dashboard baseline is live at `src/app/(admin)/(others-pages)/reliability/page.tsx` with snapshot API `src/app/api/ops/reliability/route.ts`.
- Reliability metrics and email DLQ now persist to Postgres-backed backend APIs (`backend-rc/routes/ops.js`, `backend-rc/routes/emailDlq.js`) with in-memory fallback.

## 5) Verification Checklist

- Worker env vars set in target runtime
- `npm run subscription-change:worker` process healthy
- Alert webhook receives simulated worker failure payload
- Dashboard panels visible for critical flows with tenant filters
- On-call runbook linked from alert payloads

Completion artifacts:

- Alert destination contract: `../../operations/PHASE7_ALERT_DESTINATION.md`
- On-call drill and readiness evidence: `../../operations/PHASE7_INCIDENT_RUNBOOK.md` (Section 10)

Runbook artifact:

- `../../operations/PHASE7_INCIDENT_RUNBOOK.md`

Current blocker note:

- Booking alerting path is implemented for both authenticated and public flows. Admin booking UI posts to `POST /api/bookings/create` and tenant/public site booking forms post to `POST /api/bookings/public/create` (proxied to backend `POST /api/public/bookings`).

## 6) Exit Criteria

- Alerts fire for critical failure scenarios and are actionable
- Retries and dead-letter handling reduce silent message loss
- Team can detect, triage, and recover critical flow failures quickly

Phase 7 completion note:

- Remaining implementation and operationalization tasks for this phase are closed in this repository's tracking artifacts.
