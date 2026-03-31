# Tenant Onboarding Runbook

Date: 2026-03-29
Audience: Internal admin employees
Status: Active

## Companion Playbooks

Use this runbook for the overall sequence, then use the companion playbooks for feature-specific execution:

1. `TENANT_FEATURE_PLAYBOOK_WEBSITE.md`
2. `TENANT_FEATURE_PLAYBOOK_DOMAINS_EMAIL.md`
3. `TENANT_FEATURE_PLAYBOOK_GOOGLE_BUSINESS.md`
4. `TENANT_FEATURE_PLAYBOOK_ASSETS.md`
5. `TENANT_FEATURE_PLAYBOOK_BOOKINGS.md`
6. `TENANT_FEATURE_PLAYBOOK_BILLING_OPS.md`
7. `TENANT_FEATURE_PLAYBOOK_EMAIL_DLQ.md`
8. `TENANT_FEATURE_PLAYBOOK_RELIABILITY.md`
9. `docs/operations/TENANT_LIVE_TEST_RUNBOOK.md`
10. Printify (print-on-demand ecommerce) – feature playbook TBD

## Purpose

Use this runbook when onboarding a new tenant from the admin dashboard.

This process covers:

1. Creating a tenant
2. Creating the tenant owner
3. Enabling purchased modules and add-ons
4. Running onboarding
5. Configuring content and settings
6. Verifying invite delivery and tenant access
7. Handing the tenant off for normal operations

## What The Platform Supports

The admin dashboard now supports:

1. Admin-only tenant creation
2. Tenant owner creation during provisioning
3. Module and add-on assignment during provisioning
4. Tenant list and management UI
5. Tenant search, filter, and sorting
6. Tenant suspend/reactivate actions
7. Owner invite tracking and resend actions
8. Tenant onboarding presets and content permissions
9. Tenant site configuration and feature setup

## Who Should Use This

Only internal users with the `admin` role should use this process.

Tenant-side users should not create tenants.

## Domain Architecture

Every tenant gets a working website URL immediately, with or without a custom domain.

### Automatic Preview URL (No Custom Domain Needed)

When a tenant is created without a domain, the platform auto-assigns:

```
https://{tenant-slug}.rctechbridge.com
```

This works because:

1. Vercel has a verified wildcard domain `*.rctechbridge.com` on the project.
2. The backend auto-generates `{slug}.rctechbridge.com` as the tenant's primary domain with status `active`.
3. The frontend middleware resolves the hostname via `POST /api/public/site/context` to the correct `websiteId`.
4. The tenant site renders at that URL immediately after creation.

The preview URL is a real, publicly accessible URL. It is not a draft or a Vercel deployment preview. Tenants can operate on it indefinitely.

### Custom Domain (When The Client Has One)

When the client provides a custom domain:

1. Add it in `Global Site Settings` under the Domains section.
2. The app sends it to Vercel via the backend and shows required DNS records.
3. The tenant or their DNS admin adds the records.
4. Click `Verify` in the app to confirm DNS propagation.
5. Once verified, the domain status becomes `active`.

For apex domains (e.g. `acmeelectric.com`), the backend also adds a `www` redirect variant automatically.

### Domain Transition (Preview To Custom)

When a tenant upgrades from the preview URL to a custom domain:

1. Add the custom domain in the Domains section.
2. Complete DNS setup and verification.
3. The custom domain becomes the new primary.
4. The old `{slug}.rctechbridge.com` URL continues to work but is no longer primary.
5. If canonical redirects are enabled, requests to the old URL redirect to the custom domain.

## Pre-Flight Checks

Before starting, confirm all of the following:

1. Backend is running with the latest migrations applied.
2. Frontend is running.
3. You can sign in as an internal admin.
4. The `Tenants` page is visible in the admin sidebar.
5. Email configuration is working if owner invite emails must be delivered.
6. If domain, email, bookings, or payments are included, the related backend integrations are available.

For live tests that include custom domains or branded sending, also confirm all of the following before promising end-to-end readiness:

1. RC Vercel access is available for the target project/team.
2. Shared Resend access is available.
3. Domain onboarding endpoints are live in the environment under test.
4. Tenant email profile endpoints are live in the environment under test.
5. SPF/DKIM verification endpoint is live in the environment under test.
6. The Vercel wildcard `*.rctechbridge.com` is verified on the project.
7. Backend env `RC_TEMPORARY_DOMAIN_SUFFIX` is set to `rctechbridge.com`.
8. A temporary sender strategy exists for no-domain tenants.

## High-Level Sequence

Follow this order every time:

1. Search for an existing tenant
2. Create the tenant if it does not exist
3. Verify tenant record and invite tracking
4. Select the tenant context
5. Run onboarding
6. Configure permissions
7. Configure global site settings
8. Configure built-in pages and branding
9. Add custom pages only if needed
10. Configure purchased add-ons only
11. Verify owner invite delivery
12. Complete final QA and handoff

## Step 1 - Sign In As Admin

1. Open the admin sign-in page.
2. Sign in with an internal admin account.
3. Confirm the sidebar includes `Tenants`.

Expected result:

1. You can access the tenant management console.

## Step 2 - Search Before Creating

1. Open the `Tenants` page.
2. Use the search field to look up the customer by:
   1. tenant name
   2. slug
   3. owner email
   4. domain
3. Use filters if needed:
   1. status
   2. business type
   3. invite status

If the tenant already exists:

1. Do not create a duplicate.
2. Use `Select`, `Onboard`, `Edit`, or `Global Site Settings` instead.

## Step 3 - Create The Tenant

In the `Create Tenant` form, complete the following:

1. Tenant Name
   Example: `Acme Electric`
2. Tenant Slug
   Example: `acme-electric`
   If blank, the system generates one.
3. Business Type
   Choose the closest fit:
   1. Lead Gen Services
   2. Appointments
   3. Ecommerce
   4. Reservations
   5. Hybrid Local
4. Domain
   Optional at creation time.
   If left blank, the system auto-assigns `{slug}.rctechbridge.com` as the tenant's preview URL.
   The tenant site is immediately accessible at that URL.
5. Timezone
   Example: `America/Chicago`
6. Default Currency
   Usually `USD`
7. Owner Name
8. Owner Email
9. Temporary Password
10. Owner Phone
11. Enabled Modules / Add-Ons

Select only the modules included in the customer package.

Common modules:

1. Website Core
2. SEO Content
3. Lead Capture
4. Calendar / Appointments
5. Checkout / Ecommerce
6. Reservations
7. Google Business
8. SMS Leads and Comms
9. Google Ads Optimization
10. Custom AI Agent

Then:

1. Click `Create Tenant`.
2. Wait for the success message.
3. Confirm the app redirects into onboarding.

Expected result:

1. Tenant is created.
2. Tenant owner is created.
3. Modules are assigned.
4. Invite tracking is recorded.

## Step 4 - Verify The Tenant Record

Return to the `Tenants` page and confirm:

1. Tenant appears in the list.
2. Name and slug are correct.
3. Owner name and email are correct.
4. Domain is correct if provided.
5. Enabled modules match the sold package.
6. Invite status is visible.
7. Invite attempts and timestamps are visible.

If invite status is not acceptable:

1. Use `Resend Invite`.
2. Check the updated status.
3. Escalate if delivery still fails.

## Step 5 - Select The Tenant Context

In the tenant row:

1. Click `Select`.

This sets the active tenant context for the admin session.

Expected result:

1. Subsequent onboarding and settings work against the selected tenant.

## Step 6 - Run Onboarding

From the tenant row:

1. Click `Onboard`.

On the onboarding screen, complete the following:

1. Confirm the active tenant context is correct.
2. Select the correct business preset.
3. Save controlled content editing permissions.
4. Review the launch checklist for the tenant.

Use onboarding to define what tenant-side editors can update.

Permission rule:

1. Internal `admin` and `platform_admin` users can still configure tenant settings during onboarding and launch work.
2. The saved content permission profile is intended to restrict tenant-side users such as tenant owners, managers, and editors.
3. Do not interpret a disabled tenant content permission as an admin lockout.

Examples of controlled areas:

1. branding
2. homepage copy
3. services
4. team
5. FAQ
6. settings-related content

Expected result:

1. The tenant has an appropriate preset.
2. The permissions profile is saved.

## Step 7 - Configure Global Site Settings

After onboarding, configure the tenant-wide website settings first.

In `Global Site Settings`, configure:

1. business name
2. contact email
3. contact phone
4. address
5. shared CTA copy
6. footer content
7. social links
8. maps URL
9. navigation structure
10. domains, email delivery, and integrations if included

Expected result:

1. The tenant has correct site-wide business configuration before page-level editing starts.

## Step 8 - Configure Built-In Pages And Branding

After onboarding, configure the tenant in this order:

1. Global Site Settings
2. Built-in Pages
3. Branding
4. Public preview

Use `Built-in Pages` to manage the platform routes separately from custom pages:

1. Home (`/`)
2. Services (`/services`)
3. About (`/about`)
4. Shop (`/shop`) when ecommerce is enabled

In Branding, configure:

1. logo
2. colors
3. brand assets

Built-in pages are powered by the current platform editors:

1. Home uses the dedicated `Home` editor for page copy plus built-in sections like services, testimonials, team, FAQ, booking, shared CTA, and footer
2. Services uses the dedicated `Services` built-in page editor for page intro copy and the `Services` tab in `Global Site Settings` for service records
3. About uses the dedicated `About` built-in page editor for story and mission copy plus the `Team` tab for team profiles
4. Shop uses the dedicated `Shop` built-in page editor for page messaging and the `Shop` tab in `Global Site Settings` for products and ecommerce setup

Expected result:

1. The tenant has a usable branded website configuration across the default MVP page set.

## Step 9 - Add Custom Pages Only When Needed

Open `Custom Pages` only for extra routes beyond the built-in page set.

Examples:

1. `/why-us`
2. `/financing`
3. `/service-area`
4. `/commercial`
5. `/returns`

Do not create custom pages for these built-in routes:

1. `/`
2. `/services`
3. `/about`
4. `/shop`

Expected result:

1. Custom pages are used only for client-specific expansion, not for the platform default routes.

## Step 10 - Configure Purchased Add-Ons Only

Only configure the modules the tenant purchased.

Examples:

1. Calendar / Appointments
   Set up booking-related flows.
2. Google Business
   Configure Google Business integration if included.
3. Checkout / Ecommerce
   Configure product and checkout-related settings if included.
4. Printify (Print-On-Demand)
   Configure Printify integration if included. See the Printify section below.
5. AI
   Only available if AI module/features are enabled.

If a feature page is not visible:

1. Check the tenant's enabled modules in the `Tenants` page.
2. Update the tenant if the sold package changed.

## Printify Integration Setup

Use this section when the tenant's package includes print-on-demand fulfillment via Printify.

### Overview

Printify handles order creation and fulfillment automatically when a customer purchases a product with `fulfillment_type = printify`. After a successful Stripe checkout, the platform webhook creates an order in Printify using the tenant's connected shop and the real shipping address the customer entered at checkout.

### Prerequisites

Before configuring Printify for a tenant:

1. Tenant has the `Checkout / Ecommerce` module enabled.
2. Tenant has a Printify account and at least one published product in their Printify shop.
3. The Printify product(s) they want to sell are already created and published in Printify — the platform does **not** create Printify products; it only syncs and fulfills them.

### Step 1 — Connect Printify In Site Settings

1. In the admin dashboard, select the tenant context.
2. Open `Global Site Settings` → `Integrations` (or `Shop` tab depending on page layout).
3. Find the `Printify` section.
4. Enter the tenant's Printify API key.
   - The tenant can generate this from their Printify account under `My Profile → Connections → API Access`.
5. Click `Connect`.
6. Confirm the status shows `Connected`.

Expected result:

1. Printify integration is saved and the API key is encrypted at rest.
2. The `Sync Products` button becomes available.

### Step 2 — Sync Products From Printify

After connecting, import the tenant's published Printify products into the platform product catalog:

1. Click `Sync Products` next to the Printify connection.
2. Wait for the sync to complete.
3. Confirm the success message shows how many products were created or updated.

What happens during sync:

1. The platform fetches all published products from the tenant's Printify shop (up to 50 per page, paginates automatically).
2. Each product is upserted into the platform `product` table keyed on `printify_product_id`.
3. `fulfillment_type` is set to `printify` on each synced product.
4. The product is published (visible in the shop) automatically.

Expected result:

1. Products from Printify appear in the platform shop for the tenant.
2. Each product has a `printify_product_id` matching the Printify shop product.

### Step 3 — Verify Product Configuration

After syncing, verify each product that will go live:

1. Open the `Shop` tab in `Global Site Settings`.
2. Confirm each Printify product appears in the list.
3. Confirm `fulfillment_type` is `printify`.
4. Confirm `printify_product_id` is populated (not null).
5. Confirm `printify_variant_id` is set — this is the specific SKU (size/color) the customer will receive.
   - If variant is missing, the order will be blocked at checkout with a guard error.
6. Confirm the product has a price, title, and image set so the storefront renders correctly.

Important: the platform sends orders using the `printify_product_id` and `printify_variant_id` directly to Printify. The customer does not choose a variant at checkout in the current implementation — the variant is fixed at the product level. If the tenant sells multiple variants (e.g., sizes), each should be a separate platform product.

### Step 4 — Verify Shipping Is Collected At Checkout

Printify orders require a real shipping address. The platform Stripe checkout session is created with `shipping_address_collection` enabled when `fulfillment_type = printify`. Confirm this is working:

1. Open the tenant's shop page on their public site.
2. Add a Printify product to the cart and proceed to checkout.
3. Confirm the Stripe checkout form shows a `Shipping address` section.

If the shipping form does not appear, the product's `fulfillment_type` may not be set to `printify` correctly.

### Step 5 — Verify End-To-End Order Flow (Staging Only)

Before going live, do a test order in the Stripe test environment:

1. Complete a checkout using a Stripe test card (e.g., `4242 4242 4242 4242`).
2. Enter a real US address — Printify validates addresses and will reject obviously fake ones.
3. After checkout, observe the success page.
4. The `FulfillmentStatus` component on the success page should poll and eventually show the order was submitted to Printify.
5. In the backend DB (`stripe_order_payment`), confirm:
   - `fulfillment_status = 'submitted'`
   - `printify_order_id` is populated
   - `shipping_name`, `shipping_address_line1`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country` are all populated

If `fulfillment_status = 'failed'`, check `fulfillment_error` in the same table row for the Printify error message.

### Common Printify Errors

| Error                                               | Cause                                                                  | Fix                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `print_areas required`                              | Product was sent using `blueprint_id` instead of `product_id`          | Ensure `printify_product_id` is set on the product; sync fills this in                                   |
| `Validation failed` on address                      | Address is not valid or missing fields                                 | Use a real US address during test                                                                        |
| Order guard blocked — `printify_variant_id` missing | Variant not set on the product record                                  | Update the product in the DB or via the admin UI                                                         |
| `fulfillment_status` stays blank                    | Webhook was not received (backend was down or signature mismatch)      | Resend the Stripe event via `stripe events resend <evt_id>` after confirming the backend is running      |
| Shipping fields null in DB                          | Stripe API version ≥ 2025-01 moved shipping to `collected_information` | Webhook handler reads from `collected_information.shipping_details` — confirm it is the deployed version |

### What Does Not Require Admin Setup

The following happen automatically and do not require manual steps per tenant:

1. Printify order creation when a checkout completes (handled by webhook → backend).
2. Shipping address capture (enabled automatically when product is `fulfillment_type = printify`).
3. Fulfillment status polling on the success page (`FulfillmentStatus` component handles this for the customer).

### Escalation

Escalate to engineering if:

1. Sync returns an error or imports 0 products when products exist in Printify.
2. Printify API key is valid but `Connect` fails.
3. Orders are placed but `fulfillment_status` is stuck at `null` or `failed` with an unexpected error.
4. Printify reports the order as created but the platform DB shows `failed`.

## Step 11 - Configure Domain, Email, And Payments If Included

If the customer package includes launch setup, complete the following:

1. Domain
   1. If no custom domain yet, confirm the preview URL works:
      Open `https://{slug}.rctechbridge.com` in a browser and verify the tenant site loads.
   2. If a custom domain is provided:
      1. Open `Global Site Settings` and go to the Domains section.
      2. Enter the domain and click `Add Domain`.
      3. Expand `DNS Records` for the new domain to see required records.
      4. Send the DNS records to the client or their DNS admin.
      5. After DNS propagation, click `Verify`.
      6. Confirm the status badge turns green (`active`).
   3. To remove a domain, click `Remove` on the domain card.
2. Email
   1. If a custom domain was added, click `Setup Sending Domain` on the domain card to auto-create the Resend sending subdomain (`mg.{domain}`).
   2. Expand `DNS Records` and ensure all Resend mail records are added in DNS.
   3. Click `Verify Mail DNS` on the domain card after DNS propagation.
   4. In the `Email Delivery` section, enter From Name, From Email, Reply-To, Sending Domain (the `mg.` subdomain), and Lead Notification Recipients.
   5. Save the email profile.
   6. Click `Verify SPF/DKIM` and confirm verification passes.
3. Payments
   1. configure payment-related setup
   2. verify Stripe-related status if applicable

Expected result:

1. Every tenant has a working public URL, either the auto-assigned preview or a custom domain.
2. Optional operational systems are configured only where sold.

## Step 12 - Verify Owner Invite Status

On the `Tenants` page, review the invite tracking area for the owner.

Confirm:

1. invite status is visible
2. attempt count is visible
3. last attempted timestamp is visible
4. last sent timestamp is visible if delivery succeeded
5. any last error message is understandable if delivery failed

Invite statuses:

1. `not_sent`
2. `sent`
3. `partial_failure`
4. `failed`

If needed:

1. Click `Resend Invite`.

Expected result:

1. Tenant owner receives welcome and reset-password emails.

## Step 13 - Verify Access Rules

Before handoff, confirm the tenant follows the correct model:

1. Tenant users can edit only what their role and permission profile allow.
2. Tenant can access only the modules and add-ons they purchased.
3. Restricted features remain blocked.

Important rule:

1. Role controls what a user can do.
2. Add-ons control what the tenant has access to at all.

## Step 14 - Final QA Before Handoff

Before marking onboarding complete, confirm:

1. Tenant appears correctly in `Tenants`.
2. Owner info is correct.
3. Invite tracking looks acceptable.
4. Preset was applied.
5. Permissions were saved.
6. Global Site Settings and Built-in Pages load correctly.
7. Branding is configured.
8. Main pages are configured.
9. Purchased add-ons are available.
10. Unpurchased features are not available.
11. Public site loads at the tenant URL:
    1. If no custom domain: `https://{slug}.rctechbridge.com`
    2. If custom domain: `https://clientdomain.com`
12. Public site content is correct.

## Step 15 - Use Status Actions When Needed

The `Tenants` page supports tenant lifecycle actions.

Use `Suspend` when:

1. Service must be paused
2. Billing or compliance requires restriction
3. Access should be temporarily blocked

Use `Reactivate` when:

1. Tenant access should be restored

Only internal admins should use these actions.

## Step 16 - Offboard a Tenant

When a client is leaving the platform permanently:

1. **Confirm the decision** with the account owner.
2. **Export data** (if available) — pages, images, contacts. Save the export for the client.
3. **Run offboard**: `POST /api/tenants/:tenantId/offboard` (admin only).
   - This removes custom domains from Vercel so the client can point them elsewhere.
   - Marks the preview URL (`{slug}.rctechbridge.com`) as inactive.
   - Deactivates all member roles.
   - Sets the tenant to `inactive` with a 90-day data retention deadline.
4. **Inform the client** that their custom domain is now released and they can configure it elsewhere.
5. The tenant's public website will show a "site no longer active" page at the preview URL.
6. Data is retained for 90 days. After that, it will be permanently purged.

**Important:** Do NOT use `Suspend` for permanent offboarding. Use `Suspend` only for temporary pauses. Once offboarded, a tenant can only be restored by engineering — there is no self-service reactivation.

## Step 17 - Know The Main Admin Surfaces

Employees should know these pages:

1. `Tenants`
   Create, search, manage, resend invite, suspend/reactivate
2. `Onboarding`
   Presets and content permissions
3. `Global Site Settings`
   Tenant-wide website configuration, navigation, domains, email, and integrations
4. `Built-in Pages`
   Workflow hub for Home, Services, About, and Shop
5. `Branding`
   Brand assets and visual identity
6. `Custom Pages`
   Extra client-specific pages and slugs
7. `Billing Ops`
   Billing and subscription operations
8. `Email DLQ`
   Failed email replay and troubleshooting
9. `Reliability`
   Operational monitoring

## Decision Rules

Use these rules consistently:

1. If tenant does not exist, create it from `Tenants`.
2. If tenant exists but is not configured, select it and use `Onboard`.
3. If owner invite failed, use `Resend Invite`.
4. If package changes, edit tenant modules and metadata.
5. If tenant should lose access temporarily, use `Suspend`.
6. If tenant should resume service, use `Reactivate`.
7. If tenant is leaving permanently, use `Offboard` (Step 16).
7. If tenant-side users should not edit something, adjust permissions in onboarding.
8. If an internal admin needs to complete launch setup, admin access overrides tenant content restrictions.

## Common Mistakes To Avoid

1. Creating duplicate tenants for the same customer
2. Enabling add-ons that were not purchased
3. Forgetting to select the tenant before editing settings
4. Ignoring invite tracking failures
5. Leaving domain, email, or payment setup partially configured without follow-up
6. Assuming tenant-side users can edit everything by default
7. Telling the client they need a custom domain before their site can be viewed. Every tenant gets `{slug}.rctechbridge.com` automatically.
8. Using a one-off `vercel.app` preview URL as the tenant's durable public hostname. Use the `rctechbridge.com` subdomain instead.

## What To Escalate

Escalate to engineering or platform support if:

1. tenant creation fails
2. owner invite continues to fail after resend
3. domain conflicts cannot be resolved
4. payment setup fails
5. tenant sees features they should not have
6. tenant cannot access features they purchased
7. public site renders the wrong tenant content
8. `{slug}.rctechbridge.com` returns `Unknown tenant domain` instead of loading the site
9. Vercel domain onboarding returns a `502` or `VERCEL_API_ERROR`

## Daily Checklist Version

Use this short checklist for standard onboarding:

1. Sign in as admin
2. Open `Tenants`
3. Search to confirm tenant does not already exist
4. Create tenant
5. Verify invite tracking
6. Select tenant
7. Run onboarding
8. Save content permissions
9. Configure Global Site Settings And Built-in Pages
10. Configure Branding and Main Pages
11. Configure purchased add-ons only
12. Verify public and operational setup
13. Resend invite if needed
14. Hand off to tenant owner
