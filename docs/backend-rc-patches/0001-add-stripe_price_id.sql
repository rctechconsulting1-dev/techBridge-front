-- Migration: add stripe_price_id to plans
-- Run with your migration tool (node-pg-migrate or psql)

ALTER TABLE IF EXISTS plans
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Optional: populate from env-like seed (run manually)
-- UPDATE plans SET stripe_price_id = 'price_...' WHERE plan_key = 'starter';
