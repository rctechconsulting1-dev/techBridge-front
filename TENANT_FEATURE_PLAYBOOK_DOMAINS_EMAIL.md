# Tenant Feature Playbook - Domains, Email, And Payments

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook when the tenant package includes:

1. Custom domain onboarding
2. Sender email profile setup
3. Stripe Connect onboarding

These tasks are managed from `Global Site Settings` for the selected tenant website.

This SOP assumes:

1. The tenant website domain is bought from Vercel or imported into Vercel-managed DNS.
2. RD Tech Bridge uses one shared Resend account.
3. Each tenant gets its own verified Resend sending subdomain, usually `mg.clientdomain.com`.
4. You do not create a separate Resend account or separate Resend login per tenant.

## Preconditions

Before starting, confirm all of the following:

1. The tenant has already been created.
2. You clicked `Select` on the tenant from `Tenants`.
3. The correct client is selected in the sidebar.
4. You have the tenant's final domain decision.
5. You have access to the client's DNS records or a DNS contact.

For live launch testing, also confirm all of the following:

1. RC Vercel access is available.
2. Shared Resend access is available.
3. The environment under test has working backend support for:
   1. domain onboarding
   2. domain status
   3. email profile load and save
   4. SPF/DKIM verification

Permission rule:

1. Internal `admin` and `platform_admin` users can complete these steps even if tenant content permissions are more restrictive.
2. Tenant-side users remain subject to the saved permission profile from onboarding.

## Architecture Rule

Use this separation every time:

1. Website domain:
   1. Example: `acmeelectric.com`
   2. Used for the tenant website in Vercel.
2. Sending subdomain:
   1. Example: `mg.acmeelectric.com`
   2. Used for Resend SPF/DKIM and outbound email.

Do not treat the website domain and the sending subdomain as the same thing.

## Temporary Launch Mode For No-Domain Tenants

If the client does not have a final domain yet, use a temporary launch mode instead of blocking onboarding.

Website rule:

1. Use a stable RC-controlled subdomain on the main Vercel project.
2. Example: `tenant-slug.rdtechbridge.com`
3. Do not use a one-off `vercel.app` preview URL as the tenant's durable public hostname.

Email rule:

1. Use a platform-owned verified sender domain temporarily.
2. Example: `hello@mg.rdtechbridge-mail.com`
3. If the client has a real inbox already, use that as reply-to where appropriate.
4. Do not configure a fake future branded sender before the real client domain exists and is verified.

When the real client domain becomes available:

1. Add the website domain in Vercel.
2. Add the website domain in the app.
3. Create the tenant's Resend sending subdomain, usually `mg.clientdomain.com`.
4. Update the saved tenant email profile in the app.
5. Re-run domain verification and SPF/DKIM verification.

## Current Implementation Check

Before claiming branded email is fully live, confirm the environment is actually using the saved tenant sender profile for outbound notifications.

Reason:

1. The current app stores tenant email profile values in the site settings flow.
2. Lead and notification emails now attempt tenant-specific sender resolution first.
3. If the tenant sender profile is incomplete or unverified, the system falls back to the shared platform sender configuration.

Operational rule:

1. Treat the saved profile as configuration state.
2. Treat actual branded send behavior as verified only after a real outbound email test confirms the expected sender identity.
3. Tenant-branded sending should be considered active only when the tenant sender profile is present and SPF plus DKIM are verified.
4. Platform onboarding emails such as shared welcome or reset-password flows may still use the shared platform sender by design.

## Step 1 - Confirm The Final Domain Plan

Before touching Vercel or Resend, confirm all of the following:

1. Final website domain
   1. Example: `acmeelectric.com`
2. Whether RC will buy the domain in Vercel or the client will keep the registrar elsewhere
3. Whether RC will manage DNS in Vercel
4. The real inboxes the client wants to use for:
   1. visible sender address
   2. reply-to address
   3. lead notifications

Required outputs before proceeding:

1. Website domain name
2. Chosen sender email
3. Chosen reply-to email
4. Lead recipient emails

## Step 2 - Add Or Import The Domain Into Vercel

If RC is buying the domain:

1. Buy the domain in Vercel.
2. Confirm the domain appears in the correct RC Vercel team/account.

If the client already owns the domain:

1. Add the domain to the correct Vercel project or shared domain management surface.
2. If DNS will be moved to Vercel, follow the Vercel nameserver migration process.
3. If DNS stays external, collect the DNS records Vercel requires and send them to the DNS owner.

Expected result:

1. The tenant website domain is present in Vercel.
2. You know whether DNS is managed in Vercel or externally.

## Step 3 - Attach The Website Domain To The Tenant Site

In Vercel:

1. Connect the final website domain to the tenant website/project.
2. Configure the primary website hostname.
3. Add any required redirect hostname such as `www` if the project needs it.

Common pattern:

1. Primary website domain: `acmeelectric.com`
2. Redirect domain: `www.acmeelectric.com`

Expected result:

1. The tenant site has its public web domain assigned.

## Step 4 - Add The Tenant Website Domain In The App

In `Global Site Settings`:

1. Open the `Domains (Phase 5)` section.
2. Enter the bare website domain, such as `acmeelectric.com`.
3. Turn on primary if this should be the main tenant domain.
4. Click `Add Domain`.

Expected result:

1. The app accepts the domain record.
2. The domain appears in the status list.
3. The page tells you to complete DNS and then verify.

## Step 5 - Complete Website DNS In Vercel

If DNS is managed in Vercel:

1. Open the domain DNS settings in Vercel.
2. Add or confirm the A/CNAME records required for the website.
3. Confirm the apex and `www` behavior matches the intended routing.

If DNS is external:

1. Copy the required website DNS records from Vercel.
2. Send them to the DNS owner.
3. Wait for propagation.

Expected result:

1. The website domain resolves to the tenant site.

## Step 6 - Create The Resend Sending Subdomain

In the shared RD Tech Bridge Resend account:

1. Add a new sending domain for the tenant.
2. Use a subdomain, not the root domain.

Preferred naming convention:

1. `mg.clientdomain.com`

Example:

1. Website domain: `acmeelectric.com`
2. Resend sending domain: `mg.acmeelectric.com`

Do not create:

1. A new Resend account per tenant
2. A new Resend login per tenant

Expected result:

1. Resend gives you the required DNS records for SPF/DKIM and verification.

## Step 7 - Add Resend DNS Records

If DNS is in Vercel:

1. Open the DNS panel for the tenant domain in Vercel.
2. Add every Resend-provided DNS record exactly as shown.
3. Save the records.

If DNS is external:

1. Send the full record set to the DNS owner.
2. Wait for propagation.

Important rule:

1. Website DNS records and Resend mail DNS records are separate.
2. Do not remove working website records while adding mail records.

Expected result:

1. The Resend sending subdomain can be verified.

## Step 8 - Verify The Sending Subdomain In Resend

In Resend:

1. Refresh the domain verification status.
2. Wait until SPF and DKIM show verified.
3. Do not continue using placeholder values after verification is available.

Expected result:

1. Resend shows the tenant sending subdomain as verified.

## Step 9 - Choose The Four Email Values For The App

Use these rules:

1. `From Email`
   1. The branded sender customers will see.
   2. Example: `hello@acmeelectric.com`
2. `Reply-To`
   1. The real monitored inbox for customer replies.
   2. Example: `office@acmeelectric.com`
3. `Sending Domain`
   1. The verified Resend subdomain.
   2. Example: `mg.acmeelectric.com`
4. `Lead Notification Recipients`
   1. The internal inboxes that should receive lead alerts.
   2. Example: `owner@acmeelectric.com, office@acmeelectric.com`

Do not use placeholder examples like:

1. `hello@yourdomain.com`
2. `support@yourdomain.com`
3. `mg.yourdomain.com`
4. `sales@yourdomain.com`

## Step 10 - Enter Email Delivery Values In The App

In `Global Site Settings` under `Email Delivery (Phase 5)`:

1. Enter `From Name`
   1. Example: `Acme Electric`
2. Enter `From Email`
   1. Example: `hello@acmeelectric.com`
3. Enter `Reply-To`
   1. Example: `office@acmeelectric.com`
4. Enter `Sending Domain`
   1. Example: `mg.acmeelectric.com`
5. Enter `Lead Notification Recipients`
   1. Example: `owner@acmeelectric.com, office@acmeelectric.com`
6. Click `Save Email Profile`
7. Click `Verify SPF/DKIM`

Expected result:

1. The app saves the sender profile.
2. SPF and DKIM verification status can be checked from the UI.

## Step 11 - Verify The Website Domain In The App

Back in the `Domains (Phase 5)` section:

1. Click `Refresh`.
2. Click `Verify` on the onboarded website domain.
3. Repeat only after DNS propagation time if needed.

Expected result:

1. The domain status moves toward `active`.

## Step 12 - Start Stripe Connect If Included

If the tenant package includes payments:

1. In `Global Site Settings`, go to the Stripe Connect section.
2. Start onboarding.
3. Complete the hosted Stripe flow.
4. Return to the app.
5. Reload the Stripe status section.

Expected result:

1. The app can read Stripe onboarding status for the selected website.
2. Any refresh or return flow lands back in `Global Site Settings`.

## QA Checks

Complete these checks before handoff:

1. Website domain exists in Vercel.
2. Website domain is attached to the correct tenant site.
3. App domain record exists in `Global Site Settings`.
4. Resend sending subdomain exists in the shared RC Resend account.
5. Resend DNS records were added.
6. SPF and DKIM are verified or clearly documented as pending propagation.
7. Email profile values in the app use real tenant values, not placeholders.
8. Lead notification recipients are real inboxes.
9. Stripe status is recorded if payments were sold.
10. All pending external dependencies are documented.

## Common Problems

1. Domain rejected as duplicate.
   Fix: search `Tenants` first and confirm the domain is not already attached elsewhere.
2. Website works but email verification fails.
   Fix: confirm you added Resend mail records for the sending subdomain, not just the website records.
3. Verify keeps failing immediately.
   Fix: wait for DNS propagation and confirm the DNS records were entered exactly.
4. Team asks whether a new Resend account is needed.
   Fix: no; use the shared RC Resend account and add one sending subdomain per tenant.
5. Email profile endpoint unavailable.
   Fix: escalate to backend work rather than re-entering the same data.
6. Stripe onboarding does not start.
   Fix: confirm environment configuration and retry from the same tenant website context.

## Completion Checklist

Mark this playbook complete only when all applicable items are true:

1. Website domain has been bought or imported into Vercel.
2. Website domain is attached to the tenant site.
3. Website DNS is complete.
4. Resend sending subdomain has been created.
5. Resend DNS records have been added.
6. Email profile in the app has been saved with real tenant values.
7. SPF/DKIM verification has been run.
8. App domain verification has been run.
9. Stripe Connect has been started or completed if included.
10. Remaining external dependencies are documented.
