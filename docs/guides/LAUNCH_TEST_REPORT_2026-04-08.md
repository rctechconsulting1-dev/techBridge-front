# Launch Test Report

Date: April 8, 2026

This report captures a real backend/API-first launch test run against the local stack.

## Test Scope

Goal: validate the shortest launch-critical path without relying on the admin UI walkthrough.

Stack under test:

1. Frontend: `http://localhost:3000`
2. Backend: `http://localhost:5000`
3. Database: local PostgreSQL already connected by the running backend

## Initial State

Before testing, `GET /api/tenants` returned an empty array.

That means previously discussed tenant IDs were stale and could not be used for current readiness testing.

## Fresh Tenant Provisioning Test

Admin auth: pass

Observed:

1. `POST /api/auth/signin` returned `200`
2. Admin token was issued successfully

Tenant creation: pass

Observed:

1. `POST /api/tenants` returned a new active tenant
2. Created tenant ID: `11`
3. Created website ID: `8`
4. Temporary domain assigned: `launch-test-1775684063.rctechbridge.com`

Provisioning result confirms:

1. tenant row created
2. website row created
3. owner user created
4. starter plan + default module setup applied
5. temporary RC-controlled hostname assigned automatically

## Backend Route Verification

### Site Settings

Result: pass

Request:

1. `GET /api/site-settings/8`

Observed:

1. Returned `200`
2. Returned seeded site-settings row for website `8`
3. Default colors and CTA defaults were present
4. Contact fields were still null, which is expected for a fresh tenant before intake review

### Payment Config

Result: pass

Request:

1. `GET /api/payment-config` with tenant context headers

Observed:

1. Returned `200`
2. Returned persisted config for tenant `11`
3. Deposits, reservations, and ecommerce were disabled by default

### Built-in Page Editor Content

Result: pass

Requests:

1. `GET /api/built-in-page-content/editor/home?website_id=8`
2. `GET /api/built-in-page-content/editor/services?website_id=8`
3. `GET /api/built-in-page-content/editor/about?website_id=8`

Observed:

1. All returned `200`
2. All returned seeded editor content for tenant `11`
3. Returned records had `id: null`, meaning generated defaults exist but are not yet explicitly persisted workflow records

Interpretation:

The app can provision draft-ready built-in page content, but a fresh tenant still needs admin review/persist/publish steps before this should be considered launch-ready content.

### Domain Status

Result: pass

Request:

1. `GET /api/domains/status?website_id=8`

Observed:

1. Returned `200`
2. Returned one active primary domain
3. Domain was `launch-test-1775684063.rctechbridge.com`

### Billing Entitlements

Result: pass

Request:

1. `GET /api/billing/entitlements/11`

Observed:

1. Returned `200`
2. `enabledModules` included `website_core`, `seo_content`, and `lead_capture`
3. `accessStatus.allowed` was `true`
4. Billing summary showed `available: false` and `NO_SUBSCRIPTION`, which is expected before subscription checkout

Interpretation:

Tenant access is not blocked before subscription sync, but billing still needs to be completed for a real client account.

### Stripe Connect Status

Result: pass for optional capability, not connected yet

Request:

1. `GET /api/stripe/connect/status?website_id=8`

Observed:

1. Returned `200`
2. Returned disconnected state
3. `chargesEnabled`, `payoutsEnabled`, and `onboardingComplete` were all `false`

Interpretation:

This is acceptable for launch one only if payments are not part of the initial offer.

### Public Site Context

Result: pass

Request:

1. `GET /api/public/site/context` with `x-tenant-domain: launch-test-1775684063.rctechbridge.com`

Observed:

1. Returned `200`
2. Correctly resolved tenant `11`
3. Correctly resolved website `8`
4. Returned canonical domain `launch-test-1775684063.rctechbridge.com`

Interpretation:

Backend domain resolution for public-site routing is working.

## Public Route Verification

### Internal Rewritten Site Paths

Result: pass

Requests:

1. `GET /sites/8`
2. `GET /sites/8/services`
3. `GET /sites/8/about`

Observed:

1. All returned `200`

Interpretation:

The tenant site pages themselves render when addressed directly by internal path.

### Temporary Domain Host Routing

Result: partial / blocker

Requests:

1. `GET /` with host-routing headers for `launch-test-1775684063.rctechbridge.com`
2. `GET /services` with host-routing headers for `launch-test-1775684063.rctechbridge.com`
3. `GET /about` with host-routing headers for `launch-test-1775684063.rctechbridge.com`
4. `GET /contact` with host-routing headers for `launch-test-1775684063.rctechbridge.com`

Observed:

1. `/` returned `200`
2. `/services` returned `404`
3. `/about` returned `404`
4. `/contact` returned `404`

Interpretation:

This is the current launch blocker discovered by the test.

The important nuance is:

1. backend domain resolution works
2. internal tenant page routes work
3. nested public paths on the tenant hostname are not resolving correctly in local host-routed testing

That means the likely problem is in host-based rewrite behavior or nested public-path routing under tenant-domain mode, not in the core page components themselves.

## Current Verdict

### Passed

1. Admin authentication
2. Tenant provisioning
3. Temporary domain assignment
4. Site settings bootstrap
5. Payment-config bootstrap
6. Built-in page editor bootstrap
7. Domain status lookup
8. Billing entitlement lookup
9. Stripe Connect status lookup
10. Backend public-site context resolution
11. Internal tenant page rendering

### Failed Or Blocked

1. Public nested-path routing on the temporary tenant domain for `/services`
2. Public nested-path routing on the temporary tenant domain for `/about`
3. Public nested-path routing on the temporary tenant domain for `/contact`

## Launch Impact

Go/no-go result: no-go for first-client public launch until host-routed nested pages work consistently.

Reason:

The homepage is not enough. Client one needs at minimum:

1. homepage
2. services page
3. about page
4. contact path

Right now only the homepage passed under tenant-domain routing.

## Most Likely Next Debug Target

Investigate the host-routed public request path between:

1. [middleware.ts](middleware.ts)
2. [src/lib/public-site-routing.ts](src/lib/public-site-routing.ts)
3. [src/lib/cms-api.ts](src/lib/cms-api.ts)
4. [src/app/sites/[websiteId]/services/page.tsx](src/app/sites/[websiteId]/services/page.tsx)
5. [src/app/sites/[websiteId]/about/page.tsx](src/app/sites/[websiteId]/about/page.tsx)
6. [src/app/sites/[websiteId]/[slug]/page.tsx](src/app/sites/[websiteId]/[slug]/page.tsx)

The evidence so far suggests the failure is not tenant provisioning and not direct site rendering. It is specifically the hostname-based public route path for nested pages.