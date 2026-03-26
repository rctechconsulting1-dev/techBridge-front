# Tenant Feature Playbook - Email DLQ Operations

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook to inspect and replay failed email notifications.

`DLQ` means `Dead-Letter Queue`.

In this app, the email DLQ is the holding area for email-notification attempts that failed to send successfully. Instead of losing those failed messages, the system stores them so an admin can review the failure and replay the email later.

## What DLQ Is Used For

Use the email DLQ to:

1. Preserve failed outbound email notifications
2. See which tenant or website was affected
3. Review the failure reason and attempt count
4. Replay the email after the underlying issue is fixed
5. Keep email failures visible within the reliability workflow

## Current App Behavior

The current implementation supports:

1. Loading DLQ items from persistent backend storage when available
2. Falling back to in-memory DLQ storage when persistent storage is unavailable
3. Replaying a failed email item by ID
4. Acknowledging successful replay for persisted records

Access is protected by `EMAIL_DLQ_ADMIN_KEY`.

## Preconditions

Before starting, confirm all of the following:

1. You have the current `EMAIL_DLQ_ADMIN_KEY`.
2. You understand why the original email failed.
3. The underlying problem has been fixed or mitigated.

## Step 1 - Open Email DLQ

1. Open `Email DLQ` from the sidebar.
2. Enter the `EMAIL_DLQ_ADMIN_KEY`.
3. Click `Load DLQ`.

Expected result:

1. The page loads DLQ items.
2. If the key is missing or wrong, the page returns a forbidden or validation error.

## Step 2 - Inspect The Failed Email

For each item, review:

1. Subject
2. Recipient address
3. Attempt count
4. Error text
5. Created timestamp
6. Website ID if present
7. Tenant ID if present

Use this to determine whether the item is safe to replay.

## Step 3 - Replay Only After Fixing The Cause

Before clicking replay, confirm the root cause is addressed.

Examples:

1. Bad email provider configuration is fixed
2. Temporary network or provider outage has cleared
3. Tenant email profile or sender domain issue has been corrected

Then:

1. Click `Replay` on the DLQ item.
2. Wait for the replay result.

Expected result:

1. The app re-sends the stored notification payload.
2. If replay succeeds, the item is removed from local DLQ and acknowledged in persistent storage when available.

## Step 4 - Verify After Replay

1. Reload the DLQ list.
2. Confirm the replayed item is gone or reduced from the queue.
3. Confirm the underlying notification reached its recipient through normal support checks.

## When Not To Replay

Do not replay immediately when:

1. The failure cause is still unknown
2. The recipient address is clearly wrong
3. The sender/domain configuration is still broken
4. Replaying would create duplicate or confusing customer communication

## QA Checks

Complete these checks before handoff:

1. DLQ access key works.
2. Failed email items can be loaded.
3. At least one replay flow is understood and tested when safe.
4. The team knows replay is an operational recovery tool, not a bulk resend tool.

## Common Problems

1. `EMAIL_DLQ_ADMIN_KEY` not entered.
   Fix: enter the correct admin key before loading or replaying.
2. Replay fails again.
   Fix: the root cause is still present; stop retrying and escalate.
3. No DLQ items appear even though a failure happened.
   Fix: verify whether the failure was captured by the notification pipeline and persistence layer.

## Completion Checklist

Mark this playbook complete only when all of the following are true:

1. Admin can access the DLQ page.
2. Team understands what DLQ means.
3. Team understands replay must happen only after cause verification.
4. Recovery and escalation steps are documented.