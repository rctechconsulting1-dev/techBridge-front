// patch-resolveStripePriceId.js
// Drop-in helper for backend-rc (CommonJS). Integrate into your existing stripe helper.

const { pool } = require('../db'); // adjust path to your db helper

async function resolveStripePriceId(planKey) {
  if (!planKey) return null;

  try {
    // Try DB first (if plans table exists and has stripe_price_id)
    const res = await pool.query('SELECT stripe_price_id FROM plans WHERE plan_key = $1 LIMIT 1', [planKey]);
    if (res.rows && res.rows[0] && res.rows[0].stripe_price_id) {
      return res.rows[0].stripe_price_id;
    }
  } catch (err) {
    // DB might not have plans table yet; ignore and fallback
    console.warn('resolveStripePriceId: DB lookup failed, falling back to env mapping', err?.message || err);
  }

  // Fallback to env mapping
  const map = {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    business: process.env.STRIPE_PRICE_BUSINESS,
    // enterprise typically uses custom flow - leave undefined
  };

  return map[planKey] || null;
}

module.exports = { resolveStripePriceId };
