// patch-tenantProspects.js
// Example changes to tenantProspects route to create a subscription Checkout Session

// Import resolver and stripe client at top of file
const { resolveStripePriceId } = require('../lib/stripePriceResolver'); // adjust path
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

// ... inside your POST /tenant-prospects handler, after creating the tenant and owner records:
async function createTenantProspect(req, res) {
  const { businessName, ownerName, ownerEmail, businessType, planKey } = req.body;

  // create tenant row first (example)
  const tenant = await db.createTenant({ name: businessName, status: 'prospect', plan_key: planKey, invited_by_admin_id: req.user?.id });

  // resolve Stripe price id
  const priceId = await resolveStripePriceId(planKey);
  if (!priceId) {
    // Rollback tenant creation if you created a row and do not have a price configured
    await db.deleteTenant(tenant.id);
    return res.status(500).json({ error: 'No Stripe price configured for plan', code: 'NO_PRICE_CONFIG' });
  }

  // Create Checkout Session (subscription)
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          tenant_id: tenant.id,
          plan_key: planKey,
        },
      },
      customer_email: ownerEmail,
      success_url: `${process.env.FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/tenants`,
    });

    // Return checkout URL to frontend so admin can include in invite
    return res.status(201).json({ tenant, ownerUser: { id: /*owner id*/ tenant.owner_user_id }, checkoutUrl: session.url });
  } catch (err) {
    // Rollback tenant if session creation fails
    await db.deleteTenant(tenant.id);
    console.error('Stripe Checkout creation failed', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
