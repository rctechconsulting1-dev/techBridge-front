# Phase 7 Incident Runbook

Date: 2026-03-24
Status: Active v1

## 1) Scope

This runbook covers critical-flow incidents for:

- payment webhooks
- subscription change worker
- booking creation (admin + public intake)
- lead delivery

## 2) Alert Sources

- Stripe webhook alert payloads from `src/app/api/stripe/webhook/route.ts`
- Subscription change worker alert payloads from `backend-rc/scripts/run-subscription-change-worker.js`
- Booking proxy/backend alerts from `src/app/api/bookings/create/route.ts`, `src/app/api/bookings/public/create/route.ts`, and `backend-rc/routes/bookings.js` / `backend-rc/routes/publicBookings.js`

## 3) First 5 Minutes

1. Confirm alert payload fields:
   - source
   - message
   - eventId (if present)
   - stripeAccountId (if present)
2. Check whether issue is transient or sustained:
   - repeated alerts with same dedupe key
   - consecutive failures in logs
3. Classify severity:
   - warning: signature failures, missing latest charge
   - error: cannot record charge, missing required env configuration

## 4) Payment Webhook Triage

1. Validate env configuration:
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_API_URL`
2. Validate Stripe delivery status and recent event IDs.
3. Replay failed webhook event from Stripe dashboard after config fixes.
4. Verify charge persistence in backend `/api/stripe/charges` data path.

## 5) Subscription Worker Triage

1. Validate worker process is running.
2. Confirm worker env vars:
   - `SUBSCRIPTION_CHANGE_WORKER_INTERVAL_MS`
   - `SUBSCRIPTION_CHANGE_ALERT_WEBHOOK_URL`
3. Execute manual apply once:
   - `npm run subscription-change:apply`
4. If still failing, inspect skippedDetails reasons and fix root cause.

## 6) Booking Failure Triage

Booking create endpoints:

- Frontend proxy: `POST /api/bookings/create`
- Public frontend proxy: `POST /api/bookings/public/create`
- Backend write path: `POST /api/bookings`
- Public backend write path: `POST /api/public/bookings`

Triage steps:

1. Validate tenant context and auth token are present on booking requests.
2. Check request payload requirements:
   - `contactName`
   - `contactEmail`
3. Inspect backend logs for `BOOKING_CREATE_FAILED` or validation codes.
4. Verify DB writes in `public.booking_request`.
5. Confirm ops telemetry/alerts in persisted tables:
   - `public.ops_flow_metric` (flow `booking_create`)
   - `public.ops_alert_event` (source `booking_create` or `booking_create_proxy`)

## 7) Email DLQ Operations

List dead-letter items:

```bash
curl -H "x-email-dlq-admin-key: $EMAIL_DLQ_ADMIN_KEY" \
   "http://localhost:3000/api/email/dlq?limit=50"
```

Replay a dead-letter item:

```bash
curl -X POST \
   -H "Content-Type: application/json" \
   -H "x-email-dlq-admin-key: $EMAIL_DLQ_ADMIN_KEY" \
   -d '{"id":"<dlq-id>"}' \
   "http://localhost:3000/api/email/dlq"
```

Notes:

- DLQ now persists via backend API (`backend-rc/routes/emailDlq.js`) with Postgres storage.
- Frontend route handlers use persisted DLQ when `OPS_METRICS_INGEST_KEY` is configured, with in-memory fallback when unavailable.

## 8) Reliability Dashboard Checks

Dashboard page:

- `/reliability`

Snapshot API:

- `GET /api/ops/reliability?windowMinutes=60&eventLimit=50`

Optional protection:

- set `OPS_DASHBOARD_ADMIN_KEY` and send header `x-ops-admin-key` for API access

Use this dashboard to verify:

- per-flow failure counts (payment webhook, email notify, DLQ replay)
- per-flow latency trends (avg and p95)
- recent alert stream with source/severity context

## 9) Recovery Verification

- Alerts stop firing for the same failure mode.
- New payment events are accepted and recorded.
- Worker loop runs without failed/skipped spikes.
- Incident summary recorded with root cause and remediation.

## 10) On-Call Readiness Drill (Phase 7 Exit)

Run this drill at least once per environment (staging/prod) and retain evidence in incident notes.

Checklist:

1. Trigger a non-destructive test alert for each critical flow family:
   - payment webhook
   - subscription worker
   - booking create
   - lead delivery/DLQ replay
2. Confirm alerts are received in the configured destination within 2 minutes.
3. Confirm operator can navigate from alert to:
   - reliability dashboard (`/reliability`)
   - runbook section for the relevant flow
4. Execute one controlled recovery action:
   - replay failed webhook OR
   - run `npm run subscription-change:apply` OR
   - replay one DLQ item
5. Verify post-recovery stabilization in dashboard metrics and alert stream.

Pass criteria:

- Alert receipt, triage, and one recovery action completed by on-call operator end-to-end with no missing runbook step.
