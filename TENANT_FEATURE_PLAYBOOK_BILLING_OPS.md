# Tenant Feature Playbook - Billing Operations

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook when the tenant package includes checkout or subscription billing operations.

This page currently supports subscription plan-change operations through backend Stripe endpoints.

## Preconditions

Before starting, confirm all of the following:

1. The tenant has the `checkout_ecommerce` module enabled.
2. The active user has the `commerce.checkout.manage` feature.
3. Stripe products and subscriptions exist in the backend.

## What The Current Billing Ops Page Does

The `Billing Operations` page supports:

1. Loading Stripe subscriptions
2. Loading Stripe products
3. Previewing a plan change
4. Applying or requesting a plan change

It is an operations page, not a customer self-service billing portal.

## Step 1 - Open Billing Operations

1. Open `Billing Ops` from the sidebar.
2. Wait for subscriptions and products to load.

Expected result:

1. The page displays the `Subscription Plan Change` card.

## Step 2 - Select The Current Subscription

In the `Subscription` dropdown:

1. Choose the correct subscription.
2. Verify the current status.
3. Verify the current product reference.

Expected result:

1. The selected subscription external ID is visible under the form.

## Step 3 - Select The Next Product

In the `Next Product` dropdown:

1. Choose the destination product.
2. Confirm the selection matches the approved commercial change.

## Step 4 - Choose Change Behavior

Set both:

1. `Change Type`
   Use either `upgrade` or `downgrade`.
2. `Effective Behavior`
   Use either `immediate` or `period_end`.

Use the approved commercial rule before changing these values.

## Step 5 - Preview Before Applying

Always preview first.

1. Click `Preview Change`.
2. Review the returned JSON payload.
3. Confirm the preview reflects the intended change.

Expected result:

1. A preview payload is shown.
2. No backend error is returned.

## Step 6 - Apply Or Request The Change

Only after preview is approved:

1. Click `Apply / Request Change`.
2. Wait for the result message.

Expected result:

1. The page confirms a plan change request was created.
2. The returned status is visible in the success message or JSON payload.

## QA Checks

Complete these checks before handoff:

1. Correct subscription was selected.
2. Correct target product was selected.
3. Preview was reviewed first.
4. Apply/request action returned a valid status.
5. Commercial approval for the change is documented.

## Common Problems

1. No subscriptions or products load.
   Fix: verify backend Stripe endpoints and auth.
2. Wrong subscription is selected.
   Fix: stop before applying and re-check tenant records.
3. Plan change preview fails.
   Fix: capture the backend error and escalate before applying anything.

## Completion Checklist

Mark this playbook complete only when all of the following are true:

1. Preview completed successfully.
2. Final change action returned a valid response.
3. The subscription change is documented in the tenant record or ops notes.