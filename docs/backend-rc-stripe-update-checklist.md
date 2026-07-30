Backend-rc Stripe price update — short patch/PR checklist

Goal
- Update backend mappings so `plan_key` values (`starter`, `professional`, `business`, `enterprise`) resolve to the correct Stripe Price IDs and create subscription Checkout Sessions using those Price IDs.

Quick checklist (apply in a single branch / PR)

1. Add new Stripe Price IDs to environment or config
   - Add vars to the backend `.env` or config (examples):
     - STRIPE_PRICE_STARTER=price_XXXXXXXXXXXX
     - STRIPE_PRICE_PROFESSIONAL=price_XXXXXXXXXXXX
     - STRIPE_PRICE_BUSINESS=price_XXXXXXXXXXXX
     - STRIPE_PRICE_ENTERPRISE=null (Enterprise uses custom flow)
   - Commit a small README note documenting these env vars.

2. Update the stripe provider / resolver
   - File: `backend-rc/lib/stripeProviderSync.js` (or `lib/stripeProviderSync.ts`)
   - Change/verify the function that resolves a plan -> Stripe price id, e.g. `resolveStripePriceId(plan)`.
   - Preferred approach: first check a `plans` table/record for `stripe_price_id`; if not present fall back to env var mapping above.
   - Ensure it returns `null` or throws an explicit error when no price is available for the plan.

3. Update tenant-prospects route (admin-initiated invite)
   - File: `backend-rc/routes/tenantProspects.js` (or `routes/tenantProspects.ts`)
   - When creating the prospect tenant row, call `resolveStripePriceId(planKey)` and create a Stripe Checkout Session in `mode: 'subscription'` with `line_items: [{ price: <resolved_price>, quantity: 1 }]`.
   - Include `subscription_data.metadata = { tenant_id: <tenantId>, plan_key: <planKey> }` so the webhook can reconcile subscriptions to tenants.
   - If Checkout creation fails, roll back the tenant row and return a proper error (HTTP 500 or 422) so nothing is orphaned.

4. Update self-service billing route
   - File: `backend-rc/routes/billingPublic.js` (or similar `billingPublic.js` referenced in docs)
   - Ensure `POST /billing/public/checkout/self-service` accepts `plan_key` and maps it to the Stripe Price ID using the same resolver.
   - Create a Checkout Session with `mode: 'subscription'` and `customer_email` set to the request email (or create a customer first if you need to attach metadata).

5. Webhook handling
   - File: `backend-rc/routes/stripeWebhook.js` (or existing webhook route)
   - Verify the webhook code handles `checkout.session.completed` where `mode === 'subscription'` and updates tenant rows:
     - Set `tenants.stripe_subscription_id = session.subscription`
     - Set `tenants.stripe_customer_id = session.customer`
     - Mark `tenants.payment_completed_at` (timestamp)
   - Make sure webhook verifies signatures and logs helpful debug info on failures.

6. Database migrations (if needed)
   - If you want `plans` table to own Stripe price ids, add migration:
     - `plans.stripe_price_id text NULL` (or not null if you will populate immediately)
   - If adding values to `plans` table, create a migration that inserts/updates `stripe_price_id` for each plan_key.

7. Tests
   - Add unit tests for `resolveStripePriceId()` and integration tests for `tenantProspects` flow simulating Stripe responses (mock fetch/stripe client).
   - Add an end-to-end smoke test (curl) in the docs similar to existing examples:
     - `POST /api/tenant-prospects { businessName, ownerName, ownerEmail, businessType, planKey }` and assert returned `checkoutUrl` contains `checkout.stripe.com`.

8. PR notes
   - Explain the env vars added and any migration run.
   - Include a short demo curl command and expected response.
   - Confirm webhook verification secret and endpoint are configured in the live environment.

Exact code pointers (likely locations)
- `backend-rc/lib/stripeProviderSync.js` — price resolution helpers (search for `resolveStripePriceId` or `stripePriceId`).
- `backend-rc/routes/tenantProspects.js` or `backend-rc/routes/tenants.js` — new prospect create flow (search for `tenant-prospects` in docs or router registrations).
- `backend-rc/routes/billingPublic.js` (or `routes/billingPublic/index.js`) — public checkout route used by the frontend `billing/public/checkout/self-service`.
- `backend-rc/routes/webhooks/stripe.js` or `routes/stripeWebhook.js` — webhook handler that marks subscription/payment confirmed.
- `backend-rc/migrations/` — add migration to populate `plans.stripe_price_id` if you prefer DB-driven mapping.

Recommended minimal code snippet (pseudo-JS)

// resolve price id (lib/stripeProviderSync.js)
async function resolveStripePriceId(planKey) {
  // prefer DB-backed plans table if available
  const plan = await db.query('select stripe_price_id from plans where plan_key = $1', [planKey]);
  if (plan && plan.stripe_price_id) return plan.stripe_price_id;

  // fallback to env mapping
  const map = {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    business: process.env.STRIPE_PRICE_BUSINESS,
  };
  return map[planKey] || null;
}

// create Checkout Session (routes/tenantProspects.js)
const priceId = await resolveStripePriceId(planKey);
if (!priceId) throw new Error('No price configured for plan');
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: { metadata: { tenant_id: tenantId, plan_key: planKey } },
  success_url: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${FRONTEND_URL}/onboarding/cancel`,
});

Follow-up
- If you want, provide the `backend-rc` repo (or a branch/PR) and I can draft the exact patch/PR including migration and small tests.
- I can also prepare a sample seeding SQL file to insert Stripe price IDs into a `plans` table if you prefer DB-driven mapping.
