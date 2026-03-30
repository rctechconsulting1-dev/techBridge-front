# Tenant Feature Playbook - Domains, Email, And Payments

Date: 2026-03-29
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

1. Every tenant automatically receives a stable RC-controlled subdomain.
2. Format: `{tenant-slug}.rctechbridge.com`
3. This is auto-assigned during tenant creation and works immediately because Vercel has `*.rctechbridge.com` as a verified wildcard.
4. Do not use a one-off `vercel.app` preview URL as the tenant's durable public hostname.
5. Do not manually create the temporary domain. The backend handles this automatically.

Email rule:

1. Use a platform-owned verified sender domain temporarily.
2. Example: `hello@mg.rctechbridge-mail.com`
3. If the client has a real inbox already, use that as reply-to where appropriate.
4. Do not configure a fake future branded sender before the real client domain exists and is verified.

When the real client domain becomes available:

1. Add the custom domain in `Global Site Settings` under the Domains section.
2. The app sends the domain to Vercel automatically via the backend.
3. Expand `DNS Records` on the new domain card to see required A/CNAME and verification records.
4. Send the DNS records to the client or their DNS admin.
5. After propagation, click `Verify` in the app.
6. Once active, the custom domain becomes the new primary.
7. Create the tenant's Resend sending subdomain, usually `mg.clientdomain.com`.
8. Update the saved tenant email profile in the app.
9. Re-run SPF/DKIM verification.

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

## Step 2 - Add The Domain Via The App

The app now handles Vercel domain management directly. You do not need to add domains in the Vercel dashboard manually.

In `Global Site Settings` under the Domains section:

1. Enter the bare website domain, such as `acmeelectric.com`.
2. Turn on primary if this should be the main tenant domain.
3. Click `Add Domain`.

What happens automatically:

1. The backend adds the domain to the Vercel project.
2. For apex domains, the backend also adds a `www` redirect variant (308 redirect).
3. The app displays the required DNS records inline.

Expected result:

1. The domain appears in the domain list with status `pending`.
2. DNS records are shown in the expandable panel.
3. You can see the exact Type, Name, and Value for each record.

If the domain was previously added to Vercel manually, the backend handles the `domain_already_in_use` case gracefully and proceeds with the DB insert.

## Step 3 - Complete Website DNS

Using the DNS records shown in the app:

1. If DNS is managed in Vercel:
   1. Open the domain DNS settings in Vercel.
   2. Add the A or CNAME records shown in the app.
   3. Add any TXT verification records shown in the app.

2. If DNS is external:
   1. Copy the DNS records from the app (click `DNS Records` to expand).
   2. Send them to the client or their DNS admin.
   3. Wait for propagation.

Common DNS records the app will show:

1. For apex domains: `A` record pointing to `76.76.21.21`
2. For subdomains: `CNAME` record pointing to `cname.vercel-dns.com`
3. For unverified domains: `TXT` verification record

Expected result:

1. The website domain resolves to the tenant site.

## Step 4 - Verify The Domain In The App

In the Domains section of `Global Site Settings`:

1. Click `Verify` on the domain card.
2. The app calls the Vercel verification API via the backend.
3. If DNS is propagated, the status badge turns green (`active`).
4. If not yet propagated, the app shows a message to try again later.

To refresh DNS info at any time:

1. Click `DNS Records` on the domain card.
2. The app fetches the latest required records from Vercel.

Expected result:

1. The domain status is `active`.
2. The tenant site is accessible at the custom domain.

## Step 5 - Remove A Domain If Needed

To remove a domain that was added in error or is no longer needed:

1. Click `Remove` on the domain card.
2. Confirm the removal in the dialog.

What happens:

1. The domain is removed from both Vercel and the database.
2. The `www` redirect variant is also removed if it exists.
3. The domain is available for reassignment.

Do not remove the temporary `{slug}.rctechbridge.com` domain unless a verified custom domain is already active.

## Step 6 - Setup The Resend Sending Subdomain (Automated)

The app now creates the Resend sending subdomain automatically.

In `Global Site Settings` under `Domains`:

1. Once a custom domain is added and the domain card appears, click `Setup Sending Domain` on the domain card.
2. The app creates `mg.{domain}` in Resend automatically and displays all required DNS records.
3. Expand `DNS Records` to see the Resend mail records (SPF, DKIM, etc.).

Naming convention (handled automatically):

1. Website domain: `acmeelectric.com`
2. Resend sending domain: `mg.acmeelectric.com`

You do not need to:

1. Log into the Resend dashboard manually
2. Create a new Resend account per tenant
3. Create a new Resend login per tenant

Note: If the domain was added via `Add Domain`, the Resend sending subdomain may have been auto-created during onboarding. Check the domain card for a Resend status badge before clicking `Setup Sending Domain`.

Expected result:

1. The domain card shows a Resend status badge (e.g. `mg.acmeelectric.com: not_started`).
2. DNS Records panel shows all required Resend mail records.

## Step 7 - Add Resend DNS Records

DNS records are now shown directly in the app after clicking `Setup Sending Domain`.

If DNS is in Vercel:

1. Expand `DNS Records` on the domain card in site-settings.
2. Copy each Resend-provided record and add it in Vercel DNS.
3. Save the records.

If DNS is external:

1. Copy the full record set from the DNS Records panel.
2. Send to the DNS owner.
3. Wait for propagation.

Important rule:

1. Website DNS records and Resend mail DNS records are separate.
2. Do not remove working website records while adding mail records.
3. The DNS Records panel shows both Vercel and Resend records merged together.

Expected result:

1. The Resend sending subdomain can be verified.

## Step 8 - Verify The Sending Subdomain (Automated)

In `Global Site Settings` under `Domains`:

1. On the domain card, click `Verify Mail DNS`.
2. The app triggers Resend verification automatically.
3. Wait for DNS propagation (usually minutes to hours).
4. Refresh the DNS Records panel to see updated SPF/DKIM verification status.
5. Do not continue using placeholder values after verification is available.

You do not need to log into the Resend dashboard to verify manually.

Expected result:

1. The domain card Resend status badge updates to `verified`.
2. SPF and DKIM records show as verified in the DNS Records panel.

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

Back in the Domains section:

1. Click `Verify` on the domain card.
2. If already verified, the status badge will show `active` in green.
3. If not yet verified, check the DNS records panel and confirm records were entered correctly.
4. Retry after DNS propagation time if needed.

Expected result:

1. The domain status moves to `active`.

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

1. Tenant site loads at the preview URL `{slug}.rctechbridge.com`.
2. If a custom domain was added, the domain appears in the app with status `active`.
3. Website domain is attached to the correct Vercel project (verified via the app, not the Vercel dashboard).
4. DNS Records panel in the app shows the expected A/CNAME and TXT records.
5. Resend sending subdomain exists in the shared RC Resend account.
6. Resend DNS records were added.
7. SPF and DKIM are verified or clearly documented as pending propagation.
8. Email profile values in the app use real tenant values, not placeholders.
9. Lead notification recipients are real inboxes.
10. Stripe status is recorded if payments were sold.
11. All pending external dependencies are documented.

## Common Problems

1. Domain rejected as duplicate.
   Fix: search `Tenants` first and confirm the domain is not already attached elsewhere.
2. Website works but email verification fails.
   Fix: confirm you added Resend mail records for the sending subdomain, not just the website records.
3. Verify keeps failing immediately.
   Fix: wait for DNS propagation and confirm the DNS records were entered exactly as shown in the app.
4. Team asks whether a new Resend account is needed.
   Fix: no; use the shared RC Resend account and add one sending subdomain per tenant.
5. Email profile endpoint unavailable.
   Fix: escalate to backend work rather than re-entering the same data.
6. Stripe onboarding does not start.
   Fix: confirm environment configuration and retry from the same tenant website context.
7. Preview URL `{slug}.rctechbridge.com` shows `Unknown tenant domain`.
   Fix: confirm the `tenant_domains` table has a row with the correct domain and status `active`. Check that `RC_TEMPORARY_DOMAIN_SUFFIX` is set to `rctechbridge.com` in the backend `.env`.
8. Domain add returns `502` or `VERCEL_API_ERROR`.
   Fix: confirm `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID` are set correctly in the backend `.env`. Run `node scripts/verify-vercel-config.js` to test.
9. DNS Records panel shows no records.
   Fix: the domain may not be on Vercel yet. Re-add it or check the Vercel dashboard.

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
