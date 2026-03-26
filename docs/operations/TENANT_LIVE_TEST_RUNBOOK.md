# Tenant Live Test Runbook

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this runbook to execute a real end-to-end tenant launch test in two scenarios:

1. Tenant already has a domain and RC imports or manages it in Vercel
2. Tenant does not have a domain yet and RC starts from scratch

This runbook is narrower than the full onboarding SOP. It is intended for live validation of the current platform flow from tenant creation through domain, email, and launch checks.

## Critical Rule

Treat website hosting and outbound email as two separate systems.

1. Website domain is what resolves to the tenant website in Vercel
2. Sending domain is what Resend verifies for outbound email

Example:

1. Website domain: `clientexample.com`
2. Sending domain: `mg.clientexample.com`

## Scenario A - Tenant Already Has A Domain

Use this when the client already owns a website domain and RC will either:

1. import it into Vercel-managed DNS, or
2. keep DNS external and add the required records

### A1 - Pre-Flight

Before creating the tenant, confirm:

1. You have admin access to the RC dashboard
2. Backend routes for tenant creation, domain onboarding, and email profile are live in the target environment
3. You have access to the RC Vercel account/team
4. You have access to the shared RC Resend account
5. You know the final website domain
6. You know the final sender inbox, reply-to inbox, and lead recipient inboxes

### A2 - Create The Tenant In The App

In `Tenants`:

1. Search first to avoid duplicates
2. Create the tenant with:
   1. tenant name
   2. business type
   3. owner name and email
   4. temporary password
   5. optional domain field populated with the final website domain
   6. required modules only
3. Confirm tenant row appears
4. Confirm invite status is recorded
5. Click `Select`
6. Click `Onboard`
7. Save the permissions profile

Expected app result:

1. tenant exists
2. website exists
3. owner exists
4. active tenant context is set

### A3 - Add The Domain In Vercel

In Vercel:

1. Add the tenant website domain to the correct project
2. Set the intended primary hostname
3. Add any redirect hostname such as `www`
4. If DNS is external, capture the Vercel DNS records required for website resolution
5. If DNS is in Vercel, apply the website records there

Expected Vercel result:

1. domain is attached to the project
2. DNS instructions or applied records exist

### A4 - Register The Domain In The App

In `Global Site Settings` under Domains:

1. Add the bare domain
2. Mark as primary if appropriate
3. Save
4. Refresh status
5. Verify when DNS is ready

Expected app result:

1. domain record appears in the list
2. domain status moves from pending toward active

### A5 - Create The Resend Sending Domain

In Resend:

1. Create a sending domain using a subdomain, usually `mg.clientdomain.com`
2. Copy SPF and DKIM records exactly

If DNS is in Vercel:

1. add the Resend DNS records in Vercel DNS

If DNS is external:

1. send the Resend DNS records to the DNS owner

Expected Resend result:

1. sending domain exists and can be verified

### A6 - Configure Email Delivery In The App

In `Global Site Settings` under Email Delivery:

1. set `From Name`
2. set `From Email`
3. set `Reply-To`
4. set `Sending Domain`
5. set `Lead Notification Recipients`
6. save the email profile
7. run SPF/DKIM verification

Expected app result:

1. profile saves without validation failure
2. verification state is visible

### A7 - Finish Website Setup

Complete the remaining tenant steps:

1. Global Site Settings
2. Built-in Pages
3. Branding
4. Services, Team, Shop as applicable
5. Public preview QA

### A8 - Final Live Checks

Mark Scenario A complete only when all of the following are true:

1. tenant website loads on the final custom domain
2. domain status in app reflects the expected state
3. Resend sender domain is verified
4. email profile is saved in app with real values
5. a real lead or notification email is sent using the expected branded sender identity
6. lead notification recipients are configured
7. public site content renders correctly

Note:

1. Shared platform onboarding emails can still use the platform sender by design.
2. Tenant-branded sender validation should focus on tenant-scoped lead and notification flows.

## Scenario B - Tenant Does Not Have A Domain Yet

Use this when the client has not bought a domain yet or has not decided on the final domain.

### B1 - Recommended Temporary Hosting Pattern

Do not use an ephemeral Vercel preview URL as the tenant's stable public identity.

Preferred temporary pattern:

1. give the tenant a stable RC-controlled subdomain on the main Vercel project
2. examples:
   1. `tenant-slug.rctechbridge.com`
   2. `tenant-slug.preview.rctechbridge.com`

Avoid using:

1. one-off `vercel.app` preview URLs as the long-term tenant URL

Reason:

1. preview URLs are deployment-scoped and not a durable customer-facing hostname
2. they are fine for short smoke testing but weak for onboarding, QA, and email handoff

### B2 - Create The Tenant In The App

In `Tenants`:

1. create the tenant without a final customer-owned domain, or
2. use the temporary RC-controlled subdomain if your current process stores one at creation time

Then:

1. select tenant
2. run onboarding
3. save permissions
4. complete site setup and branding

### B3 - Temporary Email Strategy

Until the client has a real domain, do not pretend the tenant has branded outbound email from their future domain.

Use one of these temporary strategies:

1. platform-owned verified sender domain
   1. example: `hello@mg.rctechbridge-mail.com`
2. platform-owned operational sender plus tenant-specific reply-to if a real inbox exists

Do not use:

1. `hello@future-client-domain.com` before that domain exists and is verified

### B4 - What To Test Before The Real Domain Exists

You can still live-test all of the following:

1. tenant creation
2. owner creation and invite tracking
3. onboarding presets and permissions
4. site settings and built-in page editing
5. booking and lead flows
6. email profile save behavior using a platform sender
7. reliability and alerting flows

Expected temporary email behavior:

1. notification sends can fall back to the platform sender safely
2. reply-to can still point at a real tenant inbox when configured
3. branded sender validation must wait for the real verified tenant sending domain

What you cannot fully certify yet:

1. final custom-domain routing
2. branded Resend domain verification for that tenant's own domain

### B5 - When The Client Later Buys A Domain

When the domain becomes available:

1. add the website domain in Vercel
2. add the domain in app
3. create the Resend sending subdomain
4. update the app email profile from temporary platform sender values to tenant-branded values
5. re-run domain and SPF/DKIM verification

### B6 - Pause-State Workflow When Providers Are Blocked

Use this workflow when external provider setup is not ready yet, such as:

1. Resend access is blocked
2. Google Workspace inboxes are not verified yet
3. DNS ownership or DNS changes are still pending
4. hosted backend rollout is not complete in the target environment

Operational rule:

1. Do not mark the tenant as final-launch ready.
2. Do not claim tenant-branded outbound email is live.
3. Keep the tenant in `temporary_launch` mode until the blockers are cleared.

What to do in the app:

1. In `Global Site Settings`, save launch mode as `temporary_launch`.
2. Keep the tenant on the RC-controlled temporary hostname.
3. Use `platform_sender` email mode unless a real tenant-branded sender is fully verified.
4. Save real reply-to and lead-routing inboxes only if they actually exist and are monitored.
5. Do not switch to `final_domain` launch mode just to reflect intent.

What work can continue safely:

1. tenant creation
2. onboarding preset and permission setup
3. built-in page editing
4. branding and asset uploads
5. services, team, and shop content population
6. booking and lead form testing
7. reliability and alerting checks

What work must remain blocked:

1. final custom-domain certification
2. branded sender go-live claims
3. final-launch sign-off
4. any statement that customer-facing email is verified when SPF or DKIM is still pending

Required handoff note while paused:

1. record the exact blocker
2. record what was already validated
3. record what still depends on provider completion
4. record the next external action owner

Exit criteria from pause state:

1. final website domain is active
2. tenant sending domain is verified
3. sender profile is saved with real final values
4. a successful outbound test confirms the expected sender identity
5. launch mode can be changed from `temporary_launch` to `final_domain` without failing the launch gate

## Answer To The Preview Question

Question:

1. can we do this on a free Vercel preview and will it affect Resend for that tenant?

Answer:

1. Yes, you can use a Vercel preview deployment for basic website testing
2. No, the preview deployment itself does not directly break Resend
3. But you should not use a temporary `vercel.app` preview URL as the tenant's real website domain or as the basis for their branded sending identity

Why:

1. Resend cares about verified sending domains, not about whether the website is deployed from preview or production
2. Branded sending still requires a real verified domain or subdomain such as `mg.clientdomain.com`
3. A preview URL is not a substitute for a verified tenant sending domain

Practical rule:

1. preview URL is acceptable for app smoke tests
2. RC-controlled stable subdomain is better for temporary tenant launch testing
3. real client domain is required for final branded sender setup

## Go / No-Go Criteria

Use this to decide whether the live test is meaningful right now.

You are ready if:

1. admin tenant creation works
2. domain onboarding backend endpoints exist in the target environment
3. email profile backend endpoints exist in the target environment
4. Vercel access is available
5. Resend access is available

You are blocked if:

1. Vercel project/domain access is missing
2. shared Resend account access is missing
3. backend domain/email endpoints are not live in the environment under test
4. no stable temporary hostname policy exists for no-domain tenants

## Recommended Execution Order

Run the live test in this order:

1. Scenario B first
   1. proves tenant creation, onboarding, editing, and temporary sender strategy
2. Scenario A second
   1. proves the full final-domain and Resend-branded flow

Reason:

1. Scenario B removes registrar and DNS timing as the first blocker
2. Scenario A then validates the final production-grade path end to end