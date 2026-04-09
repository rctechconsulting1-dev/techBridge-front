-- =============================================================================
-- Delete all non-admin users and tenant data while keeping admin accounts.
-- =============================================================================
-- Keeps users with role 'admin' or 'platform_admin' and keeps any websites
-- attached to those admin users.
--
-- Deletes non-admin users plus associated tenant/site data such as:
--   - tenants and tenant billing/payment rows
--   - websites not owned by admins
--   - pages, posts, services, listings, assets, images, SEO metadata
--   - Stripe customer/subscription/charge rows linked to deleted websites
--   - Google Business related rows linked to deleted websites
--
-- Usage example:psql -U postgres -h localhost -p 5433 -d postgres_copy_rc -f scripts/truncate-all-except-admin.sql
--
-- Warning:
--   Destructive and irreversible. Run on a local/dev copy unless you intend a
--   permanent reset.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Safety check
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."user"
    WHERE role IN ('admin', 'platform_admin')
  ) THEN
    RAISE EXCEPTION 'No admin user found. Aborting.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Optional dry-run queries
-- -----------------------------------------------------------------------------
-- Uncomment before running if you want a preview first.
--
-- SELECT 'admin users kept' AS label, COUNT(*)
-- FROM public."user"
-- WHERE role IN ('admin', 'platform_admin');
--
-- SELECT 'non-admin users deleted' AS label, COUNT(*)
-- FROM public."user"
-- WHERE role NOT IN ('admin', 'platform_admin');
--
-- SELECT 'websites deleted' AS label, COUNT(*)
-- FROM public.website
-- WHERE id NOT IN (
--   SELECT website_id
--   FROM public."user"
--   WHERE role IN ('admin', 'platform_admin')
--     AND website_id IS NOT NULL
-- );
--
-- SELECT 'tenants deleted' AS label, COUNT(*)
-- FROM public.tenants
-- WHERE legacy_website_id IN (
--   SELECT id
--   FROM public.website
--   WHERE id NOT IN (
--     SELECT website_id
--     FROM public."user"
--     WHERE role IN ('admin', 'platform_admin')
--       AND website_id IS NOT NULL
--   )
-- )
-- OR legacy_website_id IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Build keep/delete sets
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _keep_admin_users AS
SELECT id, website_id
FROM public."user"
WHERE role IN ('admin', 'platform_admin');

CREATE TEMP TABLE _keep_admin_websites AS
SELECT DISTINCT website_id AS id
FROM _keep_admin_users
WHERE website_id IS NOT NULL;

CREATE TEMP TABLE _del_users AS
SELECT id
FROM public."user"
WHERE role NOT IN ('admin', 'platform_admin');

CREATE TEMP TABLE _del_websites AS
SELECT id
FROM public.website
WHERE id NOT IN (SELECT id FROM _keep_admin_websites);

CREATE TEMP TABLE _del_tenants AS
SELECT id
FROM public.tenants
WHERE legacy_website_id IN (SELECT id FROM _del_websites)
   OR legacy_website_id IS NULL;

CREATE OR REPLACE FUNCTION pg_temp.exec_if_relation_exists(
  relation_name text,
  statement text
) RETURNS void AS $$
BEGIN
  IF to_regclass(relation_name) IS NOT NULL THEN
    EXECUTE statement;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Delete dependent rows first
-- -----------------------------------------------------------------------------

-- Tenant / billing / payments
SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_booking_payments',
  'DELETE FROM public.tenant_booking_payments WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_order_payments',
  'DELETE FROM public.tenant_order_payments WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_entitlement_overrides',
  'DELETE FROM public.tenant_entitlement_overrides WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_entitlement_snapshots',
  'DELETE FROM public.tenant_entitlement_snapshots WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_payment_accounts',
  'DELETE FROM public.tenant_payment_accounts WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_billing_addons',
  'DELETE FROM public.tenant_billing_addons WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_billing_profiles',
  'DELETE FROM public.tenant_billing_profiles WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.billing_events',
  'DELETE FROM public.billing_events WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_features',
  'DELETE FROM public.tenant_features WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_modules',
  'DELETE FROM public.tenant_modules WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.user_tenant_roles',
  'DELETE FROM public.user_tenant_roles WHERE tenant_id IN (SELECT id FROM _del_tenants) OR user_id IN (SELECT id FROM _del_users)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_domains',
  'DELETE FROM public.tenant_domains WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

-- Stripe rows linked to deleted websites
SELECT pg_temp.exec_if_relation_exists(
  'public.stripe_charge',
  'DELETE FROM public.stripe_charge WHERE stripe_customer_id IN (SELECT id FROM public.stripe_customer WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.stripe_subscription',
  'DELETE FROM public.stripe_subscription WHERE stripe_customer_id IN (SELECT id FROM public.stripe_customer WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.stripe_customer',
  'DELETE FROM public.stripe_customer WHERE website_id IN (SELECT id FROM _del_websites)'
);

-- Google Business / listing rows linked to deleted websites
SELECT pg_temp.exec_if_relation_exists(
  'public.gmb_posts',
  'DELETE FROM public.gmb_posts WHERE client_id IN (SELECT id FROM public.business_listing WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.google_auth_tokens',
  'DELETE FROM public.google_auth_tokens WHERE client_id IN (SELECT id FROM public.business_listing WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.business_listing',
  'DELETE FROM public.business_listing WHERE website_id IN (SELECT id FROM _del_websites)'
);

-- Join / media tables
SELECT pg_temp.exec_if_relation_exists(
  'public.blog_post_image',
  'DELETE FROM public.blog_post_image WHERE blog_post_id IN (SELECT id FROM public.blog_post WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.page_image',
  'DELETE FROM public.page_image WHERE page_id IN (SELECT id FROM public.page WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.service_image',
  'DELETE FROM public.service_image WHERE service_id IN (SELECT id FROM public.service WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.page_page_category',
  'DELETE FROM public.page_page_category WHERE page_id IN (SELECT id FROM public.page WHERE website_id IN (SELECT id FROM _del_websites))'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.seo_metadata',
  'DELETE FROM public.seo_metadata WHERE page_id IN (SELECT id FROM public.page WHERE website_id IN (SELECT id FROM _del_websites)) OR blog_post_id IN (SELECT id FROM public.blog_post WHERE website_id IN (SELECT id FROM _del_websites))'
);

-- Site content linked to deleted websites
SELECT pg_temp.exec_if_relation_exists(
  'public.blog_post',
  'DELETE FROM public.blog_post WHERE website_id IN (SELECT id FROM _del_websites)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.detail_slug',
  'DELETE FROM public.detail_slug WHERE website_id IN (SELECT id FROM _del_websites)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.page',
  'DELETE FROM public.page WHERE website_id IN (SELECT id FROM _del_websites)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.page_category',
  'DELETE FROM public.page_category WHERE website_id IN (SELECT id FROM _del_websites)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.service',
  'DELETE FROM public.service WHERE website_id IN (SELECT id FROM _del_websites)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.location_local',
  'DELETE FROM public.location_local WHERE website_id IN (SELECT id FROM _del_websites)'
);

-- Assets / images
SELECT pg_temp.exec_if_relation_exists(
  'public.asset',
  'DELETE FROM public.asset WHERE website_id IN (SELECT id FROM _del_websites)'
);

SELECT pg_temp.exec_if_relation_exists(
  'public.image',
  'DELETE FROM public.image WHERE tenant_id IN (SELECT id FROM _del_tenants)'
);

-- -----------------------------------------------------------------------------
-- 4. Delete tenants, users, then websites
-- -----------------------------------------------------------------------------
SELECT pg_temp.exec_if_relation_exists(
  'public.tenant_entitlement_overrides',
  'UPDATE public.tenant_entitlement_overrides SET created_by = NULL WHERE created_by IN (SELECT id FROM _del_users)'
);

DELETE FROM public.tenants
WHERE id IN (SELECT id FROM _del_tenants);

DELETE FROM public."user"
WHERE id IN (SELECT id FROM _del_users);

DELETE FROM public.website
WHERE id IN (SELECT id FROM _del_websites);

-- Optional orphan-image cleanup after website/page deletions.
SELECT pg_temp.exec_if_relation_exists(
  'public.image',
  'DELETE FROM public.image WHERE id NOT IN (SELECT image_id FROM public.page_image WHERE image_id IS NOT NULL) AND id NOT IN (SELECT image_id FROM public.blog_post_image WHERE image_id IS NOT NULL) AND id NOT IN (SELECT image_id FROM public.service_image WHERE image_id IS NOT NULL) AND id NOT IN (SELECT image_id FROM public.asset WHERE image_id IS NOT NULL)'
);

-- -----------------------------------------------------------------------------
-- 5. Cleanup temp tables and show what remains
-- -----------------------------------------------------------------------------
DROP TABLE _keep_admin_users;
DROP TABLE _keep_admin_websites;
DROP TABLE _del_users;
DROP TABLE _del_websites;
DROP TABLE _del_tenants;

COMMIT;

SELECT '--- Remaining users ---' AS info;
SELECT id, email, role, website_id
FROM public."user"
ORDER BY id;

SELECT '--- Remaining websites ---' AS info;
SELECT id, domain, name
FROM public.website
ORDER BY id;

SELECT '--- Remaining tenants ---' AS info;
SELECT id, slug, name, status
FROM public.tenants
ORDER BY id;
