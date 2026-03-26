# Tenant Feature Playbook - Reliability Dashboard

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook to monitor operational health across flows such as bookings, email replay, and other reliability-tracked events.

The reliability dashboard is the operational view of:

1. Request volume
2. Failures
3. Success rate
4. Latency
5. Recent alerts and events

## Current App Behavior

The dashboard currently supports:

1. Multiple time windows
2. Manual refresh
3. Flow health summaries
4. Recent alert/event listing
5. Data-source visibility

The page can show either:

1. `Persistent DB` data source
2. `Memory fallback` data source

## Preconditions

Before starting, confirm all of the following:

1. The app is running.
2. Reliability events are being recorded for the workflows under test.
3. You know which tenant workflow you are validating.

## Step 1 - Open Reliability Dashboard

1. Open `Reliability` from the sidebar.
2. Choose a time window.

Available windows include:

1. Last 15 minutes
2. Last 60 minutes
3. Last 4 hours
4. Last 24 hours

## Step 2 - Refresh And Confirm Data Source

1. Click `Refresh`.
2. Note the `Updated` timestamp.
3. Check the `Data source` badge.

Interpretation:

1. `Persistent DB` means the page is reading from persistent operational storage.
2. `Memory fallback` means the page is using non-persistent in-process data and may not show the full history.

## Step 3 - Review Topline Metrics

Review the summary cards:

1. Requests
2. Failures
3. Successful

Use these values to confirm whether a recent test flow behaved as expected.

## Step 4 - Review Flow Health

In `Flow Health`, review per-flow metrics:

1. Flow name
2. Requests
3. Failures
4. Success percentage
5. Average duration
6. P95 duration

Use this section to identify:

1. Failing workflows
2. Slow workflows
3. Regressions after operational changes

## Step 5 - Review Recent Alerts

In `Recent Alerts`, review:

1. Source
2. Message
3. Severity
4. Timestamp
5. Website ID when present

Use this list to correlate failures back to the affected tenant or workflow.

## Step 6 - Use Reliability During SOP Testing

Use this dashboard while testing:

1. Bookings
2. Email DLQ replay
3. Other operational flows that emit reliability metrics

Expected result:

1. The tested flow appears in Flow Health or Recent Alerts within the selected time window.

## QA Checks

Complete these checks before handoff:

1. Dashboard loads successfully.
2. Time-window switching works.
3. Flow Health populates when traffic exists.
4. Recent Alerts populate when failures exist.
5. Team understands the difference between persistent data and memory fallback.

## Common Problems

1. No metrics appear.
   Fix: confirm the tested flow actually emitted reliability data and widen the time window.
2. Dashboard shows memory fallback only.
   Fix: verify persistent ops ingestion or backend snapshot availability.
3. Alerts show failures but no tenant context.
   Fix: use website ID, timestamp, and related workflow logs to trace the issue.

## Completion Checklist

Mark this playbook complete only when all of the following are true:

1. Team can open and refresh the dashboard.
2. Team can interpret requests, failures, and success rate.
3. Team can read recent alerts and correlate them to a workflow.
4. Team understands when to escalate based on recurring failure patterns.