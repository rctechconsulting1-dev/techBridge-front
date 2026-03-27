# Phase 7 Alert Destination Contract

Date: 2026-03-24
Status: Active
Owner: RD Tech Bridge

## 1) Primary Destination

- Provider: Slack Incoming Webhook
- Channel: `#ops-critical`
- Purpose: collect critical flow alerts from webhook processing, subscription worker, booking creation, and reliability replay failures.

## 2) Environment Variable Contract

- `OPS_ALERT_WEBHOOK_URL`
  - Shared destination for operational alerts.
  - Used by frontend alert emitter (`src/lib/ops-alerts.ts`).
- `PAYMENT_WEBHOOK_ALERT_WEBHOOK_URL` (optional override)
  - If set, payment-webhook alerts can route to a dedicated channel.
- `SUBSCRIPTION_CHANGE_ALERT_WEBHOOK_URL`
  - Destination for backend subscription worker failure/skip alerts.
- `SUBSCRIPTION_CHANGE_WORKER_INTERVAL_MS`
  - Worker loop interval in milliseconds.

## 3) Routing Policy

- Default: all critical alerts route to `OPS_ALERT_WEBHOOK_URL`.
- Optional split-routing:
  - Payment-only alerts to `PAYMENT_WEBHOOK_ALERT_WEBHOOK_URL`.
  - Worker alerts to `SUBSCRIPTION_CHANGE_ALERT_WEBHOOK_URL`.

## 4) Validation Procedure

1. Confirm all required vars are set in deployment target(s).
2. Trigger a controlled test alert payload for each source family.
3. Verify alert appears in channel with expected fields:
   - `source`
   - `message`
   - `severity`
   - `at`
4. Record timestamp and operator initials in incident log.

## 5) Rollback / Fallback

- If destination fails, set worker alert URL to shared ops URL.
- Keep dedupe throttle enabled (`OPS_ALERT_THROTTLE_MS`) to reduce alert storms.
