Backend-rc patch bundle — Update Stripe price mappings

Purpose

This folder contains ready-to-apply patches and SQL for `backend-rc` to:
- add `stripe_price_id` to the `plans` table (optional DB-driven mapping)
- add `resolveStripePriceId()` helper that prefers DB values then falls back to env vars
- update `tenantProspects` route to create subscription-mode Stripe Checkout Sessions and attach metadata

How to use

1. Copy files to the `backend-rc` repo root (or apply manually).
2. Run the migration SQL in `0001-add-stripe_price_id.sql` against your database.
3. Add the new env vars to your `.env` (examples provided below).
4. Add `lib/stripePriceResolver.js` (or integrate into existing `stripeProviderSync.js`).
5. Patch `routes/tenantProspects.js` using the example in `patch-tenantProspects.js`.
6. Run tests and smoke-check as described in `SMOKE.md`.

Env var examples (add to `.env`):

STRIPE_PRICE_STARTER=price_XXX_STARTER
STRIPE_PRICE_PROFESSIONAL=price_XXX_PROFESSIONAL
STRIPE_PRICE_BUSINESS=price_XXX_BUSINESS

Notes
- The provided code is CommonJS-style and assumes `stripe` is the official stripe package initialized in your project.
- If your codebase uses TypeScript, adapt types accordingly.
