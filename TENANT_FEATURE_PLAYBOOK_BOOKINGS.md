# Tenant Feature Playbook - Bookings And Calendar

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook when the tenant package includes appointments or booking intake.

This playbook covers the current admin-side booking workflow available through:

1. `Calendar`
2. The tenant website booking sections that submit booking requests

## Preconditions

Before starting, confirm all of the following:

1. The tenant has the `calendar_appointments` module enabled.
2. You clicked `Select` on the tenant from `Tenants`.
3. The correct client is selected in the sidebar.
4. The selected website scope is available.

## What The Current Flow Supports

The current calendar flow supports:

1. Viewing a calendar UI
2. Creating internal calendar events in the UI
3. Submitting tenant-scoped booking requests from the admin dashboard
4. Public booking submission from website sections
5. Reliability tracking when booking requests fail

## Step 1 - Open Calendar

1. Open `Calendar` from the sidebar.
2. Confirm the page loads under the selected tenant context.

Expected result:

1. The page is accessible only when the tenant has the appointments entitlement.

## Step 2 - Verify Website Scope

Before creating a booking request, look for the website scope note near the booking form.

Expected result:

1. The page shows `Website scope: {id}`.
2. If the page instead warns that website scope is unavailable, stop and fix tenant selection first.

## Step 3 - Create A Booking Request From Admin

Use the `Create Booking Request` form on the calendar page.

Complete these fields:

1. Contact Name
2. Contact Email
3. Contact Phone if available
4. Start date and time if known
5. Booking notes

Then:

1. Click `Create Booking`.
2. Wait for the success or error message.

Expected result:

1. The request is posted to the tenant-scoped booking endpoint.
2. A success message includes the booking ID when returned.

## Step 4 - Understand Public Booking Entry Points

The tenant website also submits public booking requests from booking/contact sections.

Use this for QA only:

1. Open the tenant public site.
2. Trigger the booking form from the homepage, services page, or about page if present.
3. Submit a test booking.

Expected result:

1. Public booking requests reach the backend public booking route.

## Step 5 - Handle Failures

If booking submission fails:

1. Capture the on-screen error text.
2. Open the reliability dashboard.
3. Check whether a booking-related failure or alert was recorded.
4. Confirm the tenant website scope was correct.

## QA Checks

Complete these checks before handoff:

1. Calendar page loads for the tenant.
2. Website scope is visible.
3. At least one admin booking request can be submitted.
4. Public booking flow is tested if it is part of the sold package.
5. Any failure paths are reflected in reliability monitoring.

## Common Problems

1. Booking request rejected because website scope is missing.
   Fix: reselect the tenant and client context before retrying.
2. Tenant does not see Calendar.
   Fix: confirm the `calendar_appointments` module is enabled.
3. Public form exists but backend response fails.
   Fix: verify the backend booking route and check the reliability dashboard.

## Completion Checklist

Mark this playbook complete only when all of the following are true:

1. Calendar access is confirmed.
2. Admin booking request is tested.
3. Public booking flow is tested when sold.
4. Failures and escalation path are documented if any issue remains.