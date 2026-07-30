# Admin-Initiated Prospect Invite Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin invite a prospect with a pre-chosen plan, get them through intake + Stripe subscription checkout, and unlock a calendar link the moment intake is done — without provisioning a live public website until the tenant is explicitly activated.

**Architecture:** Two repos. `backend-rc` (Express + Postgres) gets a new `prospect` tenant status, a new `tenantProspects` route module (create / intake-complete / payment-confirmed / activate), and two mechanical extractions of existing `tenants.js` logic into shared `lib/` modules so the new route can reuse them without duplication. `admin-dashboard-rc` (Next.js) gets a new combined invite email, a hook into the existing intake-submit route to fire a calendar-ready email, a new branch in the existing Stripe webhook for subscription-mode checkouts, and Tenants-page UI for the new action.

**Tech Stack:** Express 4, `pg` (node-postgres), `node-pg-migrate`, Next.js 15 App Router, Resend (email), Stripe REST API via raw `fetch`.

## Global Constraints

- Migrations use CommonJS `exports.up`/`exports.down` — never `export const` (ESM syntax breaks `node-pg-migrate`).
- Every migration must implement both `up` and `down`.
- Never edit `apps/web/src/sanity.types.ts`-equivalent generated files by hand — not applicable here, no codegen in these two repos.
- No automated test runner exists in either repo (`backend-rc`'s `npm test` is a placeholder that exits 1; `admin-dashboard-rc` has no `test` script at all). All verification in this plan is manual: start the dev server and use `curl` / `node -e`, matching the existing convention in `backend-rc/README.md`.
- Never delete or rename an already-applied migration file — if a migration needs fixing after being applied, write a new one.
- No em dashes, no `Co-Authored-By` lines in commits (repo convention).
- Commit messages: Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.), atomic per task.

---

## Backend (`backend-rc`)

### Task 1: Extract shared tenant helpers into `lib/tenantHelpers.js`

`routes/tenants.js` currently defines ~30 helper consts/functions at module scope (business-type sets, slug/domain normalization, invite tracking, module/feature sync) that the new prospect route also needs. This is a pure, mechanical extraction — no behavior change — so both route files can share one implementation instead of duplicating it.

**Files:**
- Create: `lib/tenantHelpers.js`
- Modify: `routes/tenants.js:1-407` (the requires + all const/function definitions before `router.get("/"`)

**Interfaces:**
- Produces (used by Task 3, 4, 5, 6 and by the refactored `routes/tenants.js`): `BUSINESS_TYPES: Set<string>`, `MODULE_KEYS: Set<string>`, `DEFAULT_MODULES: string[]`, `DEFAULT_TENANT_FEATURE_TOGGLES: {shop, reservations}`, `RC_TEMPORARY_DOMAIN_SUFFIX: string`, `INVITE_STATUSES: Set<string>`, `INVITE_EMAIL_KEYS: Set<string>`, `requireAdminRole(req,res,next)`, `slugify(value): string`, `ensureUniqueSlug(client, requestedSlug, tenantName): Promise<string>`, `ensureUniqueTenantDomain(client, baseDomain): Promise<string>`, `buildTemporaryHostname(slug): string`, `normalizeEmail(email): string`, `normalizeDomain(domain): string`, `normalizeTenantFeatureToggles(input): {shop,reservations}`, `resolveRequestedModules({enabledModules, featureToggles}): string[]`, `syncManagedModulesAndFeatures(client, tenantId, moduleKeys): Promise<{enabledModules, enabledFeatures}>`, `upsertTenantPaymentConfig(client, tenantId, featureToggles): Promise<void>`, `upsertInviteTracking(client, {tenantId, userId, email, status, lastError, incrementAttempt, deliveryResults}): Promise<void>`, `normalizeInviteDeliveryResults(input)`, `hasWebsiteTenantIdColumn(client): Promise<boolean>`.

- [ ] **Step 1: Create `lib/tenantHelpers.js` with the extracted content**

```javascript
// lib/tenantHelpers.js
// Shared tenant helpers used by routes/tenants.js and routes/tenantProspects.js.
// Extracted verbatim from routes/tenants.js — no behavior change.

const BUSINESS_TYPES = new Set([
  "lead_gen_services",
  "appointments",
  "ecommerce",
  "reservations",
  "hybrid_local",
]);

const MODULE_KEYS = new Set([
  "website_core",
  "seo_content",
  "lead_capture",
  "calendar_appointments",
  "checkout_ecommerce",
  "reservations",
  "google_business_management",
  "sms_leads_and_comms",
  "google_ads_optimization",
  "custom_ai_agent",
]);

const DEFAULT_MODULES = ["website_core", "seo_content", "lead_capture"];
const DEFAULT_TENANT_FEATURE_TOGGLES = {
  shop: false,
  reservations: false,
};
const RC_TEMPORARY_DOMAIN_SUFFIX = (
  process.env.RC_TEMPORARY_DOMAIN_SUFFIX || "rctechbridge.com"
)
  .trim()
  .toLowerCase()
  .replace(/^\.+|\.+$/g, "");

const DEFAULT_FEATURES_BY_MODULE = {
  checkout_ecommerce: ["commerce.checkout.manage"],
  google_business_management: ["integrations.google_business.sync"],
  custom_ai_agent: ["ai.agent.generate"],
};

const BILLING_REQUIRED_FEATURES = new Set([
  "commerce.checkout.manage",
  "integrations.google_business.sync",
  "ai.agent.generate",
]);

const MANAGED_FEATURE_KEYS = Array.from(
  new Set(Object.values(DEFAULT_FEATURES_BY_MODULE).flat()),
);
const INVITE_STATUSES = new Set([
  "not_sent",
  "sent",
  "partial_failure",
  "failed",
]);
const INVITE_EMAIL_KEYS = new Set([
  "welcome",
  "reset_password",
  "intake",
  "prospect_invite",
]);
let websiteTenantIdColumnAvailable = null;

const normalizeInviteDeliveryResults = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const entries = Object.entries(input)
    .filter(([key, value]) => {
      if (!INVITE_EMAIL_KEYS.has(key)) {
        return false;
      }

      return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    })
    .map(([key, value]) => {
      const delivery = value;
      const status =
        typeof delivery.status === "string" &&
        ["accepted", "failed", "skipped"].includes(delivery.status)
          ? delivery.status
          : "failed";

      return [
        key,
        {
          status,
          providerId:
            typeof delivery.providerId === "string" && delivery.providerId.trim()
              ? delivery.providerId.trim()
              : null,
          message:
            typeof delivery.message === "string" && delivery.message.trim()
              ? delivery.message.trim()
              : null,
          at:
            typeof delivery.at === "string" && delivery.at.trim()
              ? delivery.at.trim()
              : null,
        },
      ];
    });

  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const normalizeDomain = (domain = "") =>
  String(domain)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\.$/, "");

const buildTemporaryHostname = (slug) =>
  `${slug}.${RC_TEMPORARY_DOMAIN_SUFFIX}`;

const normalizeTenantFeatureToggles = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...DEFAULT_TENANT_FEATURE_TOGGLES };
  }

  return {
    shop: Boolean(input.shop),
    reservations: Boolean(input.reservations),
  };
};

const resolveRequestedModules = ({ enabledModules, featureToggles }) => {
  const requestedModules = Array.isArray(enabledModules)
    ? enabledModules.filter((moduleKey) => MODULE_KEYS.has(moduleKey))
    : [];

  if (featureToggles.shop) {
    requestedModules.push("checkout_ecommerce");
  }

  if (featureToggles.reservations) {
    requestedModules.push("reservations");
  }

  return Array.from(new Set(requestedModules));
};

const upsertTenantPaymentConfig = async (client, tenantId, featureToggles) => {
  await client.query(
    `INSERT INTO public.tenant_payment_config (
       tenant_id,
       deposit_enabled,
       deposit_type,
       deposit_value,
       estimates_enabled,
       estimate_valid_days,
       reservations_enabled,
       reservation_deposit_type,
       reservation_deposit_value,
       ecommerce_checkout_enabled
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tenant_id) DO UPDATE SET
       deposit_enabled = EXCLUDED.deposit_enabled,
       deposit_type = EXCLUDED.deposit_type,
       deposit_value = EXCLUDED.deposit_value,
       estimates_enabled = EXCLUDED.estimates_enabled,
       estimate_valid_days = EXCLUDED.estimate_valid_days,
       reservations_enabled = EXCLUDED.reservations_enabled,
       reservation_deposit_type = EXCLUDED.reservation_deposit_type,
       reservation_deposit_value = EXCLUDED.reservation_deposit_value,
       ecommerce_checkout_enabled = EXCLUDED.ecommerce_checkout_enabled,
       updated_at = NOW()`,
    [
      tenantId,
      false,
      "percentage",
      0,
      false,
      30,
      Boolean(featureToggles.reservations),
      "fixed",
      0,
      Boolean(featureToggles.shop),
    ],
  );
};

const ensureUniqueTenantDomain = async (client, baseDomain) => {
  const normalizedBaseDomain = normalizeDomain(baseDomain);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate =
      attempt === 0
        ? normalizedBaseDomain
        : normalizedBaseDomain.replace(
            new RegExp(`\\.${RC_TEMPORARY_DOMAIN_SUFFIX}$`),
            `-${attempt + 1}.${RC_TEMPORARY_DOMAIN_SUFFIX}`,
          );

    const existing = await client.query(
      "SELECT 1 FROM public.tenant_domains WHERE LOWER(domain) = LOWER($1) LIMIT 1",
      [candidate],
    );

    if (existing.rows.length === 0) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique temporary tenant domain");
};

const hasWebsiteTenantIdColumn = async (client) => {
  if (typeof websiteTenantIdColumnAvailable === "boolean") {
    return websiteTenantIdColumnAvailable;
  }

  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'website'
       AND column_name = 'tenant_id'
     LIMIT 1`,
  );

  websiteTenantIdColumnAvailable = result.rows.length > 0;
  return websiteTenantIdColumnAvailable;
};

const slugify = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const ensureUniqueSlug = async (client, requestedSlug, tenantName) => {
  const baseSlug = slugify(requestedSlug || tenantName) || "tenant";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await client.query(
      "SELECT 1 FROM public.tenants WHERE slug = $1 LIMIT 1",
      [candidate],
    );

    if (existing.rows.length === 0) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique tenant slug");
};

const requireAdminRole = (req, res, next) => {
  const role = req.auth?.role;
  if (role === "admin" || role === "platform_admin") {
    return next();
  }

  return res.status(403).json({
    error: "Admin role required",
    code: "ADMIN_ROLE_REQUIRED",
  });
};

const getManagedFeaturesForModules = (moduleKeys) =>
  Array.from(
    new Set(
      moduleKeys.flatMap(
        (moduleKey) => DEFAULT_FEATURES_BY_MODULE[moduleKey] || [],
      ),
    ),
  );

const syncManagedModulesAndFeatures = async (client, tenantId, moduleKeys) => {
  const finalModules = Array.from(new Set([...DEFAULT_MODULES, ...moduleKeys]));
  const finalFeatures = getManagedFeaturesForModules(finalModules);

  await client.query(
    `UPDATE public.tenant_modules
     SET enabled = false, updated_at = NOW()
     WHERE tenant_id = $1
       AND module_key = ANY($2::text[])
       AND module_key <> ALL($3::text[])`,
    [tenantId, Array.from(MODULE_KEYS), finalModules],
  );

  await client.query(
    `INSERT INTO public.tenant_modules (tenant_id, module_key, enabled, source)
     SELECT $1, module_key, true, 'manual_override'
     FROM UNNEST($2::text[]) AS module_key
     ON CONFLICT (tenant_id, module_key)
     DO UPDATE SET enabled = true, source = 'manual_override', updated_at = NOW()`,
    [tenantId, finalModules],
  );

  if (MANAGED_FEATURE_KEYS.length > 0) {
    const featuresToDisable = MANAGED_FEATURE_KEYS.filter(
      (featureKey) => !finalFeatures.includes(featureKey),
    );

    if (featuresToDisable.length > 0) {
      await client.query(
        `UPDATE public.tenant_features
         SET enabled = false, updated_at = NOW()
         WHERE tenant_id = $1
           AND feature_key = ANY($2::text[])`,
        [tenantId, featuresToDisable],
      );
    }

    if (finalFeatures.length > 0) {
      for (const featureKey of finalFeatures) {
        const billingRequired = BILLING_REQUIRED_FEATURES.has(featureKey);
        await client.query(
          `INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, config, billing_required)
           VALUES ($1, $2, true, '{}'::jsonb, $3)
           ON CONFLICT (tenant_id, feature_key)
           DO UPDATE SET enabled = true, billing_required = $3, updated_at = NOW()`,
          [tenantId, featureKey, billingRequired],
        );
      }
    }
  }

  return {
    enabledModules: finalModules,
    enabledFeatures: finalFeatures,
  };
};

const upsertInviteTracking = async (
  client,
  {
    tenantId,
    userId,
    email,
    status = "not_sent",
    lastError = null,
    incrementAttempt = false,
    deliveryResults = null,
  },
) => {
  const normalizedStatus = INVITE_STATUSES.has(status) ? status : "not_sent";
  const shouldMarkSent =
    normalizedStatus === "sent" || normalizedStatus === "partial_failure";
  const normalizedDeliveryResults = normalizeInviteDeliveryResults(deliveryResults);

  await client.query(
    `INSERT INTO public.tenant_owner_invites (
       tenant_id,
       user_id,
       email,
       status,
       attempt_count,
       last_attempted_at,
       last_sent_at,
       last_error,
       delivery_results,
       updated_at
     ) VALUES (
       $1,
       $2,
       $3,
       $4,
       CASE WHEN $6 THEN 1 ELSE 0 END,
       CASE WHEN $6 THEN NOW() ELSE NULL END,
       CASE WHEN $5 THEN NOW() ELSE NULL END,
       $7,
       COALESCE($8::jsonb, '{}'::jsonb),
       NOW()
     )
     ON CONFLICT (tenant_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       email = EXCLUDED.email,
       status = EXCLUDED.status,
       attempt_count = CASE WHEN $6 THEN public.tenant_owner_invites.attempt_count + 1 ELSE public.tenant_owner_invites.attempt_count END,
       last_attempted_at = CASE WHEN $6 THEN NOW() ELSE public.tenant_owner_invites.last_attempted_at END,
       last_sent_at = CASE WHEN $5 THEN NOW() ELSE public.tenant_owner_invites.last_sent_at END,
       last_error = $7,
       delivery_results = CASE WHEN $8::jsonb IS NULL THEN public.tenant_owner_invites.delivery_results ELSE $8::jsonb END,
       updated_at = NOW()`,
    [
      tenantId,
      userId ?? null,
      email,
      normalizedStatus,
      shouldMarkSent,
      incrementAttempt,
      lastError,
      normalizedDeliveryResults ? JSON.stringify(normalizedDeliveryResults) : null,
    ],
  );
};

module.exports = {
  BUSINESS_TYPES,
  MODULE_KEYS,
  DEFAULT_MODULES,
  DEFAULT_TENANT_FEATURE_TOGGLES,
  RC_TEMPORARY_DOMAIN_SUFFIX,
  DEFAULT_FEATURES_BY_MODULE,
  BILLING_REQUIRED_FEATURES,
  MANAGED_FEATURE_KEYS,
  INVITE_STATUSES,
  INVITE_EMAIL_KEYS,
  normalizeInviteDeliveryResults,
  normalizeEmail,
  normalizeDomain,
  buildTemporaryHostname,
  normalizeTenantFeatureToggles,
  resolveRequestedModules,
  upsertTenantPaymentConfig,
  ensureUniqueTenantDomain,
  hasWebsiteTenantIdColumn,
  slugify,
  ensureUniqueSlug,
  requireAdminRole,
  getManagedFeaturesForModules,
  syncManagedModulesAndFeatures,
  upsertInviteTracking,
};
```

- [ ] **Step 2: Replace the top of `routes/tenants.js` (lines 1-407) with a shorter requires block**

Delete lines 1-407 (everything from the top of the file through the closing `};` of `upsertInviteTracking`, i.e. everything before `router.get(\n  "/",`) and replace with:

```javascript
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("./routeUtils");
const { removeDomain: vercelRemoveDomain } = require("../lib/vercelDomains");
const {
  buildUniversalFooterNavLinks,
  buildUniversalHeaderNavLinks,
  normalizeManagedPageSlugs,
  syncManagedFooterPages,
  syncManagedHeaderPages,
} = require("../lib/pageSystem");
const {
  BUSINESS_TYPES,
  RC_TEMPORARY_DOMAIN_SUFFIX,
  normalizeEmail,
  normalizeDomain,
  buildTemporaryHostname,
  normalizeTenantFeatureToggles,
  resolveRequestedModules,
  upsertTenantPaymentConfig,
  ensureUniqueTenantDomain,
  hasWebsiteTenantIdColumn,
  slugify,
  ensureUniqueSlug,
  requireAdminRole,
  syncManagedModulesAndFeatures,
  upsertInviteTracking,
  normalizeInviteDeliveryResults,
  INVITE_STATUSES,
} = require("../lib/tenantHelpers");

const router = express.Router();
```

Every reference further down the file (`BUSINESS_TYPES.has(...)`, `slugify(...)`, `ensureUniqueSlug(...)`, `upsertInviteTracking(...)`, etc.) stays exactly as-is — only the definitions move, not the call sites. `MODULE_KEYS`, `DEFAULT_MODULES`, `DEFAULT_TENANT_FEATURE_TOGGLES`, `DEFAULT_FEATURES_BY_MODULE`, `BILLING_REQUIRED_FEATURES`, `MANAGED_FEATURE_KEYS`, `INVITE_EMAIL_KEYS`, `getManagedFeaturesForModules` are used only inside `syncManagedModulesAndFeatures`, which is now imported as a whole — they do not need to be imported into `tenants.js` separately.

- [ ] **Step 3: Verify no regression — start the server and re-run the existing tenant creation flow**

```bash
npm run dev
```

In another terminal, confirm the server boots without a "not defined" error, then exercise the unchanged `POST /api/tenants` flow exactly as documented in `README.md` (login as admin first, capture the JWT, then):

```bash
curl -s -X POST http://localhost:5000/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Refactor Check Co",
    "ownerName": "Test Owner",
    "ownerEmail": "refactor-check@example.com",
    "ownerPassword": "TempPass123!"
  }' | node -e "process.stdin.resume(); process.stdin.setEncoding('utf8'); let d=''; process.stdin.on('data', c => d+=c); process.stdin.on('end', () => { const j = JSON.parse(d); console.log(j.tenant ? 'PASS: tenant created, id=' + j.tenant.id : 'FAIL: ' + d); });"
```

Expected: `PASS: tenant created, id=<number>` — proves the extraction didn't change behavior.

- [ ] **Step 4: Commit**

```bash
git add lib/tenantHelpers.js routes/tenants.js
git commit -m "refactor: extract shared tenant helpers into lib/tenantHelpers.js"
```

---

### Task 2: Migration — prospect tenant lifecycle columns

**Files:**
- Create: `migrations/1783300000000_add-prospect-tenant-lifecycle.js`

Note: the latest migration in the repo at plan-writing time is `1783200000000_add-tenant-business-profile.js` — confirm with `ls migrations | sort | tail -3` before creating this file and bump the timestamp prefix above the actual latest if newer migrations have landed since.

**Interfaces:**
- Produces: `tenants.status` now allows `'prospect'` in addition to `'active' | 'inactive' | 'suspended'`; new nullable columns `tenants.intake_completed_at`, `tenants.invited_by_admin_id`, `tenants.payment_completed_at`, `tenants.stripe_subscription_id`, `tenants.stripe_customer_id`.

- [ ] **Step 1: Write the migration**

```javascript
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE public.tenants
      DROP CONSTRAINT IF EXISTS tenants_status_check;
  `);
  pgm.sql(`
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_status_check
      CHECK (status IN ('active', 'inactive', 'suspended', 'prospect'));
  `);
  pgm.sql(`
    ALTER TABLE public.tenants
      ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz,
      ADD COLUMN IF NOT EXISTS invited_by_admin_id integer REFERENCES public."user"(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
      ADD COLUMN IF NOT EXISTS stripe_customer_id text;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE public.tenants
      DROP COLUMN IF EXISTS intake_completed_at,
      DROP COLUMN IF EXISTS invited_by_admin_id,
      DROP COLUMN IF EXISTS payment_completed_at,
      DROP COLUMN IF EXISTS stripe_subscription_id,
      DROP COLUMN IF EXISTS stripe_customer_id;
  `);
  pgm.sql(`
    ALTER TABLE public.tenants
      DROP CONSTRAINT IF EXISTS tenants_status_check;
  `);
  pgm.sql(`
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_status_check
      CHECK (status IN ('active', 'inactive', 'suspended'));
  `);
};
```

Note: if `\d public.tenants` in `psql` shows the existing check constraint under a different name than `tenants_status_check`, update the `DROP CONSTRAINT IF EXISTS` line to match before running — the `IF EXISTS` guard means a name mismatch will not error, it will just leave the old constraint in place alongside the new one, so confirm the actual name first with:

```bash
psql "$DATABASE_URL" -c "\d public.tenants" | grep -i check
```

- [ ] **Step 2: Run the migration**

```bash
npm run migrate:up
```

Expected output includes `1783300000000_add-prospect-tenant-lifecycle` (or whatever timestamp you used per the Files note above).

- [ ] **Step 3: Verify the constraint and columns**

```bash
psql "$DATABASE_URL" -c "\d public.tenants" | grep -E "status_check|intake_completed_at|payment_completed_at|stripe_subscription_id|stripe_customer_id|invited_by_admin_id"
```

Expected: the new check constraint text includes `'prospect'`, and all five new columns are listed.

- [ ] **Step 4: Commit**

```bash
git add migrations/1783300000000_add-prospect-tenant-lifecycle.js
git commit -m "feat: add prospect tenant status and lifecycle tracking columns"
```

---

### Task 3: Extract website provisioning into `lib/tenantWebsiteProvisioning.js`

The existing `POST /` tenant-creation route in `tenants.js` provisions a website, primary domain, `site_settings`, `tenant_payment_config`, and header/footer nav in one inline block. The new "Activate Tenant" endpoint (Task 6) needs the same provisioning logic when an admin opts a prospect into the platform's own site engine. Extract it into a helper so there is exactly one implementation.

**Files:**
- Create: `lib/tenantWebsiteProvisioning.js`
- Modify: `routes/tenants.js` (the `POST /` handler, replacing the inline block with a call to the new helper)

**Interfaces:**
- Consumes: `slugify`, `ensureUniqueTenantDomain`, `buildTemporaryHostname`, `hasWebsiteTenantIdColumn`, `upsertTenantPaymentConfig` from `lib/tenantHelpers.js` (Task 1); `buildUniversalHeaderNavLinks`, `buildUniversalFooterNavLinks`, `syncManagedHeaderPages`, `syncManagedFooterPages` from `lib/pageSystem.js` (unchanged, already exists).
- Produces (used by Task 6): `provisionTenantWebsite(client, { tenant, ownerUserId, actorRole, effectiveFeatureToggles, pageSlugs, normalizedDomain }): Promise<{ website, effectiveDomain, temporaryDomainAssigned }>`.

- [ ] **Step 1: Create `lib/tenantWebsiteProvisioning.js`**

```javascript
// lib/tenantWebsiteProvisioning.js
// Provisions the website + domain + site_settings + nav for a tenant that is
// going to use the platform's own built-in site engine. Extracted from the
// inline block in routes/tenants.js POST / so routes/tenantProspects.js can
// reuse it for the "Activate Tenant" (prospect -> active) transition.
const {
  buildTemporaryHostname,
  ensureUniqueTenantDomain,
  hasWebsiteTenantIdColumn,
  upsertTenantPaymentConfig,
} = require("./tenantHelpers");
const {
  buildUniversalFooterNavLinks,
  buildUniversalHeaderNavLinks,
  syncManagedFooterPages,
  syncManagedHeaderPages,
} = require("./pageSystem");

/**
 * @param {import('pg').PoolClient} client - must be inside an open transaction
 * @param {object} params
 * @param {{id:number,name:string,slug:string}} params.tenant
 * @param {number} params.ownerUserId - tenant_owner user id, used for nav-sync attribution
 * @param {string} params.actorRole - role recorded against the nav sync (e.g. req.auth?.role || "system")
 * @param {{shop:boolean,reservations:boolean}} params.effectiveFeatureToggles
 * @param {string[]} params.pageSlugs - normalized additional page slugs
 * @param {string} params.normalizedDomain - custom domain, or "" to auto-assign the temporary preview domain
 * @returns {Promise<{website: object, effectiveDomain: string, temporaryDomainAssigned: boolean}>}
 */
async function provisionTenantWebsite(
  client,
  { tenant, ownerUserId, actorRole, effectiveFeatureToggles, pageSlugs, normalizedDomain },
) {
  const effectiveDomain = normalizedDomain
    ? normalizedDomain
    : await ensureUniqueTenantDomain(client, buildTemporaryHostname(tenant.slug));

  const websiteResult = await client.query(
    "INSERT INTO public.website (name, domain) VALUES ($1, $2) RETURNING *",
    [tenant.name, effectiveDomain],
  );
  const website = websiteResult.rows[0];

  if (await hasWebsiteTenantIdColumn(client)) {
    await client.query(
      "UPDATE public.website SET tenant_id = $1 WHERE id = $2",
      [tenant.id, website.id],
    );
  }

  await client.query(
    "UPDATE public.tenants SET legacy_website_id = $1, updated_at = NOW() WHERE id = $2",
    [website.id, tenant.id],
  );

  await client.query(
    `INSERT INTO public.tenant_domains (
      tenant_id,
      domain,
      is_primary,
      status
    ) VALUES ($1, $2, true, $3)`,
    [tenant.id, effectiveDomain, normalizedDomain ? "pending" : "active"],
  );

  const defaultHeaderNavLinks = buildUniversalHeaderNavLinks({
    pageSlugs,
    featureToggles: effectiveFeatureToggles,
  });
  const defaultFooterNavLinks = buildUniversalFooterNavLinks({
    pageSlugs,
    featureToggles: effectiveFeatureToggles,
  });

  await client.query(
    `INSERT INTO public.site_settings (
       website_id,
       tenant_id,
       ecommerce_enabled,
       header_nav_links,
       footer_nav_links,
       hero_cta_text,
       hero_cta_url,
       cta_button_url
     ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
     ON CONFLICT (website_id) DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       ecommerce_enabled = EXCLUDED.ecommerce_enabled,
       header_nav_links = CASE
         WHEN COALESCE(jsonb_array_length(public.site_settings.header_nav_links), 0) = 0
           THEN EXCLUDED.header_nav_links
         ELSE public.site_settings.header_nav_links
       END,
       footer_nav_links = CASE
         WHEN COALESCE(jsonb_array_length(public.site_settings.footer_nav_links), 0) = 0
           THEN EXCLUDED.footer_nav_links
         ELSE public.site_settings.footer_nav_links
       END,
       hero_cta_text = COALESCE(public.site_settings.hero_cta_text, EXCLUDED.hero_cta_text),
       hero_cta_url = COALESCE(public.site_settings.hero_cta_url, EXCLUDED.hero_cta_url),
       cta_button_url = COALESCE(public.site_settings.cta_button_url, EXCLUDED.cta_button_url),
       updated_at = NOW()`,
    [
      website.id,
      tenant.id,
      effectiveFeatureToggles.shop,
      JSON.stringify(defaultHeaderNavLinks),
      JSON.stringify(defaultFooterNavLinks),
      "Get Started",
      "/contact",
      "/contact",
    ],
  );

  await upsertTenantPaymentConfig(client, tenant.id, effectiveFeatureToggles);

  await syncManagedHeaderPages({
    client,
    tenantId: tenant.id,
    websiteId: website.id,
    headerNavLinks: defaultHeaderNavLinks,
    actorUserId: ownerUserId,
    actorRole,
  });

  await syncManagedFooterPages({
    client,
    tenantId: tenant.id,
    websiteId: website.id,
    footerNavLinks: defaultFooterNavLinks,
    excludedLinks: defaultHeaderNavLinks,
    actorUserId: ownerUserId,
    actorRole,
  });

  return {
    website,
    effectiveDomain,
    temporaryDomainAssigned: !normalizedDomain,
  };
}

module.exports = { provisionTenantWebsite };
```

- [ ] **Step 2: Refactor `routes/tenants.js` `POST /` to call the helper**

In `routes/tenants.js`, the `POST /` handler currently does (in order): resolve plan, begin transaction, check owner email/domain conflicts, `ensureUniqueSlug`, then inline website/domain/site_settings/nav-sync logic, then owner user creation, then invite tracking, then `syncManagedModulesAndFeatures`.

Reorder so the tenant + slug are resolved first (needed by the helper), then owner user creation happens exactly as before, then call the helper in place of the inline block. Replace the block that currently reads (from `const effectiveDomain = normalizedDomain` through the `syncManagedFooterPages({...})` call, i.e. everything the inline website/domain/nav-sync logic covers) with:

```javascript
      const { enabledModules: finalModules, enabledFeatures: finalFeatures } =
        await syncManagedModulesAndFeatures(
          client,
          tenant.id,
          requestedModules,
        );

      const effectiveFeatureToggles = {
        shop: finalModules.includes("checkout_ecommerce"),
        reservations:
          normalizedFeatureToggles.reservations ||
          finalModules.includes("reservations"),
      };

      const { website, effectiveDomain, temporaryDomainAssigned } =
        await provisionTenantWebsite(client, {
          tenant,
          ownerUserId: ownerUser.id,
          actorRole: "system",
          effectiveFeatureToggles,
          pageSlugs: normalizedPageSlugs,
          normalizedDomain,
        });
```

And add the import at the top of `routes/tenants.js`:

```javascript
const { provisionTenantWebsite } = require("../lib/tenantWebsiteProvisioning");
```

Remove the old standalone `const websiteResult = await client.query("INSERT INTO public.website...` block and the `const tenantResult = await client.query(\`INSERT INTO public.tenants (\n  legacy_website_id,\n  ...` insert must now happen BEFORE calling the helper (with `legacy_website_id` left `NULL` initially — the helper's `UPDATE public.tenants SET legacy_website_id = ...` sets it once the website exists). Update the tenant INSERT to omit `legacy_website_id` from the column list and drop the corresponding `website.id` bind value, since the helper backfills it.

The final `return res.status(201).json({...})` payload keys (`tenant`, `website`, `ownerUser`, `enabledModules`, `enabledFeatures`, `pageSlugs`, `featureToggles`, `temporaryDomainAssigned`) are unchanged — only where `website`/`effectiveDomain`/`temporaryDomainAssigned` come from changes (helper return value instead of inline locals).

- [ ] **Step 3: Verify no regression — repeat the Task 1 Step 3 curl check**

```bash
npm run dev
```

```bash
curl -s -X POST http://localhost:5000/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Provisioning Check Co",
    "ownerName": "Test Owner",
    "ownerEmail": "provisioning-check@example.com",
    "ownerPassword": "TempPass123!"
  }'
```

Expected: `201` with a `website.domain` ending in `.rctechbridge.com` (or your configured `RC_TEMPORARY_DOMAIN_SUFFIX`), matching pre-refactor behavior.

- [ ] **Step 4: Commit**

```bash
git add lib/tenantWebsiteProvisioning.js routes/tenants.js
git commit -m "refactor: extract website provisioning into lib/tenantWebsiteProvisioning.js"
```

---

### Task 4: `routes/tenantProspects.js` — create prospect endpoint

**Files:**
- Create: `routes/tenantProspects.js`
- Modify: `server.js` (mount the new router)

**Interfaces:**
- Consumes: `pool` (`../db`), `authMiddleware`, `asyncHandler`, everything exported from `lib/tenantHelpers.js` (Task 1), `resolveStripePriceId` + `stripeApiRequest` from `lib/stripeProviderSync.js` (existing, unchanged).
- Produces: `POST /api/tenant-prospects` — request `{ businessName, ownerName, ownerEmail, ownerPhone?, businessType, planKey }`, response `201 { tenant, checkoutUrl }` or `409 { error, code: "PROSPECT_EMAIL_IN_USE", tenantId }`.

- [ ] **Step 0: Confirm `public."user".website_id` is nullable**

No migration file in this repo creates the `user` table (it predates the `migrations/` folder), so its constraints cannot be confirmed by reading migrations. The Step 2 code below inserts a `user` row without a `website_id` (prospects have no website yet). Verify this is safe before writing that code:

```bash
psql "$DATABASE_URL" -c "\d public.\"user\"" | grep -i website_id
```

If the output shows `not null`, add a small migration first to relax it (`ALTER TABLE public."user" ALTER COLUMN website_id DROP NOT NULL;`, with the reverse in `down`) before proceeding with Step 2 — do not work around it by inventing a placeholder `website_id`.

- [ ] **Step 1: Write the failing manual check (there is no test runner, so this is the "before" check)**

```bash
curl -s -X POST http://localhost:5000/api/tenant-prospects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Prospect Co","ownerName":"Jane Prospect","ownerEmail":"jane@prospectco.example","businessType":"lead_gen_services","planKey":"starter"}'
```

Expected right now: `404` (route does not exist yet).

- [ ] **Step 2: Create `routes/tenantProspects.js`**

```javascript
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("./routeUtils");
const {
  resolveStripePriceId,
  stripeApiRequest,
} = require("../lib/stripeProviderSync");
const {
  BUSINESS_TYPES,
  normalizeEmail,
  slugify,
  ensureUniqueSlug,
  requireAdminRole,
  upsertInviteTracking,
} = require("../lib/tenantHelpers");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  "/",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const { businessName, ownerName, ownerEmail, ownerPhone, businessType, planKey } =
      req.body ?? {};

    if (!businessName || !ownerName || !ownerEmail || !planKey) {
      return res.status(400).json({
        error: "businessName, ownerName, ownerEmail, and planKey are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }
    if (typeof ownerEmail !== "string" || !EMAIL_RE.test(ownerEmail)) {
      return res.status(400).json({ error: "A valid ownerEmail is required", code: "INVALID_EMAIL" });
    }

    const normalizedBusinessType = BUSINESS_TYPES.has(businessType)
      ? businessType
      : "lead_gen_services";
    const normalizedEmail = normalizeEmail(ownerEmail);

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({ error: "Stripe is not configured", code: "STRIPE_NOT_CONFIGURED" });
    }

    const planResult = await pool.query(
      `SELECT id, plan_key, name, stripe_product_id, price_monthly_cents, default_seat_limit
       FROM public.plans
       WHERE plan_key = $1 AND is_active = true
       LIMIT 1`,
      [planKey],
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found", code: "PLAN_NOT_FOUND" });
    }
    const plan = planResult.rows[0];
    if (!plan.stripe_product_id) {
      return res.status(409).json({ error: "Plan is not linked to Stripe", code: "PLAN_NOT_LINKED" });
    }

    const { stripePriceId } = await resolveStripePriceId({
      pool,
      nextStripeProductId: plan.stripe_product_id,
      secretKey,
    });
    if (!stripePriceId) {
      return res.status(409).json({ error: "No active Stripe price for this plan", code: "PRICE_NOT_FOUND" });
    }

    const client = await pool.connect();
    let tenant;
    let ownerUser;

    try {
      await client.query("BEGIN");

      const existingUser = await client.query(
        'SELECT id FROM public."user" WHERE email = $1 LIMIT 1',
        [normalizedEmail],
      );
      if (existingUser.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Owner email is already in use",
          code: "OWNER_EMAIL_IN_USE",
        });
      }

      const existingProspect = await client.query(
        `SELECT t.id
         FROM public.tenants t
         JOIN public.user_tenant_roles utr ON utr.tenant_id = t.id AND utr.role = 'tenant_owner'
         JOIN public."user" u ON u.id = utr.user_id
         WHERE t.status = 'prospect' AND u.email = $1
         LIMIT 1`,
        [normalizedEmail],
      );
      if (existingProspect.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "A prospect with this email already exists",
          code: "PROSPECT_EMAIL_IN_USE",
          tenantId: existingProspect.rows[0].id,
        });
      }

      const slug = await ensureUniqueSlug(client, slugify(businessName), businessName);

      const tenantResult = await client.query(
        `INSERT INTO public.tenants (
          slug,
          name,
          business_type,
          status,
          default_currency,
          timezone,
          plan_key,
          seat_limit,
          invited_by_admin_id
        ) VALUES ($1, $2, $3, 'prospect', 'USD', 'America/Chicago', $4, $5, $6)
        RETURNING *`,
        [slug, businessName.trim(), normalizedBusinessType, plan.plan_key, plan.default_seat_limit ?? 1, req.auth?.id ?? null],
      );
      tenant = tenantResult.rows[0];

      // Random temporary password: the prospect has not chosen one yet.
      // They set a real password later via the existing reset-password flow
      // once the tenant is activated.
      const temporaryPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const ownerResult = await client.query(
        `INSERT INTO public."user" (
          name,
          email,
          password,
          role,
          tenant_id,
          phone
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at, name, email, role, tenant_id, phone`,
        [
          ownerName.trim(),
          normalizedEmail,
          hashedPassword,
          "tenant_owner",
          tenant.id,
          ownerPhone || null,
        ],
      );
      ownerUser = ownerResult.rows[0];

      await client.query(
        `INSERT INTO public.user_tenant_roles (
          tenant_id,
          user_id,
          role,
          status
        ) VALUES ($1, $2, 'tenant_owner', 'active')`,
        [tenant.id, ownerUser.id],
      );

      await upsertInviteTracking(client, {
        tenantId: tenant.id,
        userId: ownerUser.id,
        email: ownerUser.email,
        status: "not_sent",
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Stripe session creation happens outside the DB transaction. If it fails,
    // roll back the tenant we just committed so no orphaned prospect remains.
    let session;
    try {
      const corsOrigins = (
        process.env.CORS_ORIGIN ||
        process.env.CORS_ORIGINS ||
        "http://localhost:3000"
      ).split(",")[0].trim();
      const baseUrl = process.env.FRONTEND_URL || corsOrigins;

      session = await stripeApiRequest({
        path: "/checkout/sessions",
        method: "POST",
        form: {
          mode: "subscription",
          customer_email: ownerUser.email,
          "line_items[0][price]": stripePriceId,
          "line_items[0][quantity]": "1",
          success_url: `${baseUrl}/onboarding/welcome?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/#pricing`,
          "metadata[tenantId]": String(tenant.id),
          "metadata[source]": "admin_invite",
          "metadata[planKey]": plan.plan_key,
        },
        secretKey,
      });
    } catch (stripeError) {
      await pool.query('DELETE FROM public.user_tenant_roles WHERE tenant_id = $1', [tenant.id]);
      await pool.query('DELETE FROM public."user" WHERE id = $1', [ownerUser.id]);
      await pool.query('DELETE FROM public.tenant_owner_invites WHERE tenant_id = $1', [tenant.id]);
      await pool.query('DELETE FROM public.tenants WHERE id = $1', [tenant.id]);
      throw stripeError;
    }

    return res.status(201).json({
      tenant,
      ownerUser: { id: ownerUser.id, email: ownerUser.email, name: ownerUser.name },
      checkoutUrl: session.url,
    });
  }),
);

module.exports = router;
```

- [ ] **Step 3: Mount the router in `server.js`**

Find the existing tenant router mount:

```javascript
app.use("/api/tenants", tenantsRoutes);
```

Add immediately after it:

```javascript
const tenantProspectsRoutes = require("./routes/tenantProspects");
app.use("/api/tenant-prospects", tenantProspectsRoutes);
```

(Add the `const tenantProspectsRoutes = require(...)` line next to the existing `const tenantsRoutes = require("./routes/tenants");` line near the top of `server.js`, not inline — keep the file's existing require-block-then-mount-block structure.)

- [ ] **Step 4: Run the check from Step 1 again and verify it passes**

```bash
npm run dev
```

```bash
curl -s -X POST http://localhost:5000/api/tenant-prospects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Prospect Co","ownerName":"Jane Prospect","ownerEmail":"jane@prospectco.example","businessType":"lead_gen_services","planKey":"starter"}'
```

Expected: `201` with `{ tenant: { id, status: "prospect", ... }, ownerUser: {...}, checkoutUrl: "https://checkout.stripe.com/..." }`.

Then verify no website was provisioned:

```bash
psql "$DATABASE_URL" -c "SELECT legacy_website_id FROM public.tenants WHERE id = <tenant_id_from_response>;"
```

Expected: `NULL`.

Re-run the same curl with the same email — expected: `409 PROSPECT_EMAIL_IN_USE` with the existing `tenantId`.

- [ ] **Step 5: Commit**

```bash
git add routes/tenantProspects.js server.js
git commit -m "feat: add admin-initiated prospect creation endpoint"
```

---

### Task 5: `intake-complete` and `payment-confirmed` endpoints

**Files:**
- Modify: `routes/tenantProspects.js`

**Interfaces:**
- Produces: `POST /api/tenant-prospects/:tenantId/intake-complete` (admin-authenticated OR internal-key — called from the Next.js intake-submit route, which has no admin JWT) — response `200 { tenantId, intakeCompletedAt, firstCompletion: boolean }`.
- Produces: `POST /api/tenant-prospects/:tenantId/payment-confirmed` (internal-key only, called from the Stripe webhook) — response `200 { tenantId, paymentCompletedAt }`.

- [ ] **Step 1: Add both routes to `routes/tenantProspects.js`**

Append before `module.exports = router;`:

```javascript
const requireInternalKey = (req, res, next) => {
  const internalKey = process.env.INTERNAL_API_KEY;
  const providedKey = req.headers["x-internal-key"];
  const isInternalCall =
    internalKey &&
    typeof providedKey === "string" &&
    providedKey.length === internalKey.length &&
    crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(internalKey));

  if (!isInternalCall) {
    return res.status(401).json({ error: "Invalid or missing internal key" });
  }
  return next();
};

// Called by admin-dashboard-rc's /api/intake/submit route once the intake
// token's owner submits the questionnaire. No admin JWT exists at that point
// (the caller is the prospect, via a signed intake token verified upstream),
// so this is protected by the internal key instead.
router.post(
  "/:tenantId/intake-complete",
  requireInternalKey,
  asyncHandler(async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(400).json({ error: "Invalid tenant id" });
    }

    const result = await pool.query(
      `UPDATE public.tenants
       SET intake_completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND intake_completed_at IS NULL
       RETURNING intake_completed_at`,
      [tenantId],
    );

    if (result.rows.length > 0) {
      return res.json({
        tenantId,
        intakeCompletedAt: result.rows[0].intake_completed_at,
        firstCompletion: true,
      });
    }

    const existing = await pool.query(
      "SELECT intake_completed_at FROM public.tenants WHERE id = $1",
      [tenantId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    return res.json({
      tenantId,
      intakeCompletedAt: existing.rows[0].intake_completed_at,
      firstCompletion: false,
    });
  }),
);

// Called by admin-dashboard-rc's Stripe webhook route when a
// subscription-mode checkout session completes with a tenantId in metadata.
router.post(
  "/:tenantId/payment-confirmed",
  requireInternalKey,
  asyncHandler(async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    const { stripeSubscriptionId, stripeCustomerId } = req.body ?? {};
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(400).json({ error: "Invalid tenant id" });
    }

    const result = await pool.query(
      `UPDATE public.tenants
       SET payment_completed_at = COALESCE(payment_completed_at, NOW()),
           stripe_subscription_id = COALESCE($2, stripe_subscription_id),
           stripe_customer_id = COALESCE($3, stripe_customer_id),
           updated_at = NOW()
       WHERE id = $1
       RETURNING payment_completed_at`,
      [tenantId, stripeSubscriptionId || null, stripeCustomerId || null],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    return res.json({ tenantId, paymentCompletedAt: result.rows[0].payment_completed_at });
  }),
);
```

- [ ] **Step 2: Set `INTERNAL_API_KEY` locally if not already set**

```bash
grep INTERNAL_API_KEY .env || echo "INTERNAL_API_KEY=$(openssl rand -hex 32)" >> .env
```

- [ ] **Step 3: Verify both endpoints manually**

```bash
npm run dev
```

```bash
source .env
curl -s -X POST http://localhost:5000/api/tenant-prospects/<tenant_id>/intake-complete \
  -H "x-internal-key: $INTERNAL_API_KEY"
```

Expected first call: `{ "tenantId": <id>, "intakeCompletedAt": "<timestamp>", "firstCompletion": true }`.
Run the exact same command again — expected: `"firstCompletion": false`, same timestamp as before (idempotent).

```bash
curl -s -X POST http://localhost:5000/api/tenant-prospects/<tenant_id>/payment-confirmed \
  -H "x-internal-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"stripeSubscriptionId":"sub_test123","stripeCustomerId":"cus_test123"}'
```

Expected: `{ "tenantId": <id>, "paymentCompletedAt": "<timestamp>" }`.

Without the header:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/tenant-prospects/<tenant_id>/payment-confirmed
```

Expected: `401`.

- [ ] **Step 4: Commit**

```bash
git add routes/tenantProspects.js .env.example 2>/dev/null; git add routes/tenantProspects.js
git commit -m "feat: add intake-complete and payment-confirmed prospect endpoints"
```

---

### Task 6: `activate` endpoint (prospect -> active)

**Files:**
- Modify: `routes/tenantProspects.js`

**Interfaces:**
- Consumes: `provisionTenantWebsite` from `lib/tenantWebsiteProvisioning.js` (Task 3), `syncManagedModulesAndFeatures`, `normalizeTenantFeatureToggles`, `resolveRequestedModules` from `lib/tenantHelpers.js` (Task 1), `normalizeManagedPageSlugs` from `lib/pageSystem.js`.
- Produces: `POST /api/tenant-prospects/:tenantId/activate` — request `{ enabledModules?, featureToggles?, pageSlugs?, provisionWebsite?: boolean, domain?: string }`, response `200 { tenant, website: object | null }`.

- [ ] **Step 1: Add the route**

Add the import at the top of `routes/tenantProspects.js`:

```javascript
const { provisionTenantWebsite } = require("../lib/tenantWebsiteProvisioning");
const {
  normalizeManagedPageSlugs,
} = require("../lib/pageSystem");
const {
  syncManagedModulesAndFeatures,
  normalizeTenantFeatureToggles,
  resolveRequestedModules,
  normalizeDomain,
} = require("../lib/tenantHelpers");
```

(Merge these into the single existing `require("../lib/tenantHelpers")` destructure from Task 4 Step 2 rather than adding a second require of the same module.)

Append before `module.exports = router;`:

```javascript
router.post(
  "/:tenantId/activate",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(400).json({ error: "Invalid tenant id" });
    }

    const {
      enabledModules,
      featureToggles,
      pageSlugs,
      provisionWebsite,
      domain,
    } = req.body ?? {};

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const tenantLookup = await client.query(
        "SELECT * FROM public.tenants WHERE id = $1 LIMIT 1",
        [tenantId],
      );
      if (tenantLookup.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Tenant not found" });
      }
      const tenant = tenantLookup.rows[0];
      if (tenant.status !== "prospect") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Only a prospect tenant can be activated",
          code: "TENANT_NOT_PROSPECT",
        });
      }

      const ownerLookup = await client.query(
        `SELECT u.id
         FROM public.user_tenant_roles utr
         JOIN public."user" u ON u.id = utr.user_id
         WHERE utr.tenant_id = $1 AND utr.role = 'tenant_owner' AND utr.status = 'active'
         ORDER BY utr.id ASC
         LIMIT 1`,
        [tenantId],
      );
      if (ownerLookup.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Tenant owner not found" });
      }
      const ownerUserId = ownerLookup.rows[0].id;

      const normalizedFeatureToggles = normalizeTenantFeatureToggles(featureToggles);
      const normalizedPageSlugs = normalizeManagedPageSlugs(pageSlugs);
      const requestedModules = resolveRequestedModules({
        enabledModules,
        featureToggles: normalizedFeatureToggles,
      });

      const { enabledModules: finalModules, enabledFeatures: finalFeatures } =
        await syncManagedModulesAndFeatures(client, tenantId, requestedModules);

      const effectiveFeatureToggles = {
        shop: finalModules.includes("checkout_ecommerce"),
        reservations:
          normalizedFeatureToggles.reservations ||
          finalModules.includes("reservations"),
      };

      let website = null;
      if (provisionWebsite) {
        const normalizedDomain = typeof domain === "string" ? normalizeDomain(domain) : "";
        const provisioned = await provisionTenantWebsite(client, {
          tenant,
          ownerUserId,
          actorRole: req.auth?.role || "system",
          effectiveFeatureToggles,
          pageSlugs: normalizedPageSlugs,
          normalizedDomain,
        });
        website = provisioned.website;
      }

      const tenantResult = await client.query(
        `UPDATE public.tenants
         SET status = 'active', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [tenantId],
      );

      await client.query("COMMIT");

      return res.json({
        tenant: tenantResult.rows[0],
        website,
        enabledModules: finalModules,
        enabledFeatures: finalFeatures,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);
```

- [ ] **Step 2: Verify — activate without provisioning a website**

```bash
curl -s -X POST http://localhost:5000/api/tenant-prospects/<tenant_id>/activate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `200`, `tenant.status === "active"`, `website === null`.

```bash
psql "$DATABASE_URL" -c "SELECT status, legacy_website_id FROM public.tenants WHERE id = <tenant_id>;"
```

Expected: `active`, `legacy_website_id` still `NULL`.

- [ ] **Step 3: Verify — activate a second prospect WITH website provisioning**

Create a fresh prospect (Task 4 Step 4's curl, with a new email), then:

```bash
curl -s -X POST http://localhost:5000/api/tenant-prospects/<new_tenant_id>/activate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provisionWebsite": true}'
```

Expected: `200`, `website.domain` ending in `.rctechbridge.com`.

Re-run activate on the already-active tenant:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/tenant-prospects/<tenant_id>/activate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
```

Expected: `409 TENANT_NOT_PROSPECT`.

- [ ] **Step 4: Commit**

```bash
git add routes/tenantProspects.js
git commit -m "feat: add prospect activation endpoint with optional website provisioning"
```

---

## Frontend (`admin-dashboard-rc`)

### Task 7: Prospect invite email template

**Files:**
- Modify: `src/lib/email-templates.ts`
- Modify: `src/lib/email.ts`

**Interfaces:**
- Produces: `buildProspectInviteHtml({ firstName?, tenantName, planName, priceFormatted, checkoutUrl, intakeUrl }): string`, `sendProspectInviteEmail({ to, firstName?, tenantName, planName, priceFormatted, checkoutUrl, intakeUrl }): Promise<ResendSendResult>`.

- [ ] **Step 1: Add `buildProspectInviteHtml` to `src/lib/email-templates.ts`**

Add after the existing `buildBillingInviteHtml` function:

```typescript
// ─── Prospect invite (combined intake + billing) ──────────────────────────────

export interface ProspectInviteTemplateOptions {
  firstName?: string;
  tenantName: string;
  planName: string;
  priceFormatted: string;
  checkoutUrl: string;
  intakeUrl: string;
}

export function buildProspectInviteHtml({
  firstName,
  tenantName,
  planName,
  priceFormatted,
  checkoutUrl,
  intakeUrl,
}: ProspectInviteTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";

  return layout(
    `Let's get ${tenantName} started`,
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
      We're ready to get started on <strong>${tenantName}</strong> on the <strong>${planName}</strong> plan (${priceFormatted}/month). There are two quick things to take care of:
    </p>
    <h2 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#CD7F32;">1. Answer a few questions</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      This takes about 10-15 minutes and helps us build your site to match your business.
    </p>
    ${primaryButton(intakeUrl, "Start Your Questionnaire")}
    <h2 style="margin:32px 0 8px;font-size:17px;font-weight:700;color:#CD7F32;">2. Activate your plan</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Set up billing for the ${planName} plan whenever is convenient for you.
    </p>
    ${primaryButton(checkoutUrl, "Activate Your Plan")}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Once you've completed the questionnaire, we'll send you a link to book your kickoff call.
    </p>
    <p style="margin:24px 0 0;font-size:15px;color:#374151;">
      — The RD Tech Bridge Team
    </p>`,
  );
}
```

(This reuses the `layout` and `primaryButton` helpers already defined at the top of `email-templates.ts` and used by every other template in the file — check the existing `buildBillingInviteHtml`/`buildTenantIntakeHtml` implementations directly above this addition to confirm the exact helper names and signatures before pasting, since they are file-local, not exported.)

- [ ] **Step 2: Add `sendProspectInviteEmail` to `src/lib/email.ts`**

Add near the existing `sendBillingInviteEmail` function:

```typescript
export interface SendProspectInviteEmailOptions {
  to: string;
  firstName?: string;
  tenantName: string;
  planName: string;
  priceFormatted: string;
  checkoutUrl: string;
  intakeUrl: string;
}

export async function sendProspectInviteEmail({
  to,
  firstName,
  tenantName,
  planName,
  priceFormatted,
  checkoutUrl,
  intakeUrl,
}: SendProspectInviteEmailOptions) {
  return getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Let's get ${tenantName} started - RC TechBridge`,
    html: buildProspectInviteHtml({
      firstName,
      tenantName,
      planName,
      priceFormatted,
      checkoutUrl,
      intakeUrl,
    }),
  });
}
```

Add `buildProspectInviteHtml` to the existing import from `./email-templates` at the top of the file (next to `buildBillingInviteHtml`, `buildTenantIntakeHtml`).

- [ ] **Step 3: Verify with a one-off script**

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { sendProspectInviteEmail } = require('./src/lib/email.ts');
" 2>&1 | head -5
```

This will fail directly under plain `node` since the file is TypeScript — instead verify by starting the dev server and hitting the route built in Task 8 Step 2, which exercises this function end-to-end. Skip a standalone check here; Task 8 Step 3 covers it.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email-templates.ts src/lib/email.ts
git commit -m "feat: add combined prospect invite email template"
```

---

### Task 8: `/api/email/prospect-invite` route + api-client wrapper

**Files:**
- Create: `src/app/api/email/prospect-invite/route.ts`
- Modify: `src/lib/api-client.ts`

**Interfaces:**
- Produces: `POST /api/email/prospect-invite` (Next.js route, body validated with `zod`) — mirrors the existing `/api/email/billing-invite/route.ts` pattern exactly.
- Produces: `apiClient.sendProspectInviteEmail(to, tenantName, planName, priceFormatted, checkoutUrl, intakeUrl, firstName?): Promise<{ id: string }>`.

- [ ] **Step 1: Create `src/app/api/email/prospect-invite/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendProspectInviteEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email(),
  firstName: z.string().nullish(),
  tenantName: z.string().min(1),
  planName: z.string().min(1),
  priceFormatted: z.string().min(1),
  checkoutUrl: z.string().url(),
  intakeUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { to, firstName, tenantName, planName, priceFormatted, checkoutUrl, intakeUrl } =
    parsed.data;

  const { data, error } = await sendProspectInviteEmail({
    to,
    firstName: firstName ?? undefined,
    tenantName,
    planName,
    priceFormatted,
    checkoutUrl,
    intakeUrl,
  });

  if (error) {
    console.error("[email/prospect-invite] Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
```

- [ ] **Step 2: Add the api-client wrapper**

Add to `src/lib/api-client.ts`, near `sendIntakeEmail`:

```typescript
  async sendProspectInviteEmail(
    to: string,
    tenantName: string,
    planName: string,
    priceFormatted: string,
    checkoutUrl: string,
    intakeUrl: string,
    firstName?: string,
  ): Promise<{ id: string }> {
    const response = await fetch('/api/email/prospect-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        firstName: firstName ?? undefined,
        tenantName,
        planName,
        priceFormatted,
        checkoutUrl,
        intakeUrl,
      }),
    });
    return this.handleResponse(response);
  }
```

- [ ] **Step 3: Verify end to end**

```bash
npm run dev
```

```bash
curl -s -X POST http://localhost:3000/api/email/prospect-invite \
  -H "Content-Type: application/json" \
  -d '{
    "to": "you@example.com",
    "tenantName": "Prospect Co",
    "planName": "Starter",
    "priceFormatted": "$99.00",
    "checkoutUrl": "https://checkout.stripe.com/test",
    "intakeUrl": "http://localhost:3000/intake?token=test"
  }'
```

Expected: `200 { "id": "<resend-message-id>" }` and the email arrives with both CTA buttons rendering correctly (verify in the Resend dashboard or your test inbox).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/email/prospect-invite/route.ts src/lib/api-client.ts
git commit -m "feat: add prospect invite email route and api-client wrapper"
```

---

### Task 9: Intake completion hook + calendar-ready email

**Files:**
- Modify: `src/lib/email-templates.ts`
- Modify: `src/lib/email.ts`
- Modify: `src/app/api/intake/submit/route.ts`

**Interfaces:**
- Produces: `sendCalendarReadyEmail({ to, firstName?, tenantName? }): Promise<ResendSendResult>` (reuses the existing generic `buildNotificationHtml` template — no new HTML template needed since this is a simple one-CTA message).
- Modifies: `POST /api/intake/submit` response gains `calendarUrl?: string` when this is the tenant's first intake completion.

- [ ] **Step 1: Add `sendCalendarReadyEmail` to `src/lib/email.ts`**

Add near `sendNotificationEmail`:

```typescript
export interface SendCalendarReadyEmailOptions {
  to: string;
  firstName?: string;
  tenantName?: string;
}

export async function sendCalendarReadyEmail({
  to,
  firstName,
  tenantName,
}: SendCalendarReadyEmailOptions) {
  const calendarUrl = process.env.CALENDAR_BOOKING_URL;
  if (!calendarUrl) {
    throw new Error("CALENDAR_BOOKING_URL is not configured");
  }

  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  const tenantLabel = tenantName?.trim() ? tenantName.trim() : "your business";

  return getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "You're ready to book your kickoff call",
    html: buildNotificationHtml({
      subject: "You're ready to book your kickoff call",
      heading: "Thanks for completing your questionnaire!",
      body: `<p>${greeting}</p><p>We've received your answers for <strong>${tenantLabel}</strong>. The next step is to book your kickoff call so we can walk through next steps together.</p>`,
      cta: { label: "Book Your Kickoff Call", href: calendarUrl },
    }),
  });
}
```

Add `CALENDAR_BOOKING_URL` to `.env.local.example` (or the repo's equivalent env template file) with a comment: `# Shared scheduling link (Calendly or equivalent) sent once a prospect completes intake`.

- [ ] **Step 2: Hook `src/app/api/intake/submit/route.ts` to call `intake-complete` and conditionally send the calendar email**

After the existing "Send notification to admin" block (the `try { await sendNotificationEmail(...) } catch {...}` block) and before the final `return NextResponse.json({...})`, add:

```typescript
  let calendarUrl: string | undefined;
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    const completeResponse = await fetch(
      `${getApiBaseUrl()}/tenant-prospects/${tenantId}/intake-complete`,
      {
        method: "POST",
        headers: internalKey ? { "x-internal-key": internalKey } : {},
      },
    );

    if (completeResponse.ok) {
      const completeBody = (await completeResponse.json()) as {
        firstCompletion: boolean;
      };

      if (completeBody.firstCompletion && process.env.CALENDAR_BOOKING_URL) {
        calendarUrl = process.env.CALENDAR_BOOKING_URL;
        try {
          await sendCalendarReadyEmail({ to: email, tenantName: undefined });
        } catch (calendarEmailError) {
          console.error(
            "[intake/submit] Failed to send calendar-ready email:",
            calendarEmailError,
          );
        }
      }
    } else {
      console.error(
        "[intake/submit] intake-complete call failed:",
        completeResponse.status,
      );
    }
  } catch (error) {
    console.error("[intake/submit] Failed to mark intake complete:", error);
  }

  return NextResponse.json({
    success: true,
    message: assetIndexWarning
      ? "Thank you! Your questionnaire has been submitted successfully. Uploaded files may take a little longer to appear in admin."
      : "Thank you! Your questionnaire has been submitted successfully.",
    tenantId,
    calendarUrl,
    ...(assetIndexWarning ? { warning: assetIndexWarning } : {}),
  });
}
```

This replaces the existing final `return NextResponse.json({...})` block — delete the old one, since the new one above is a strict superset (same fields plus `calendarUrl`).

Add the import at the top of the file:

```typescript
import { sendCalendarReadyEmail } from "@/lib/email";
```

Note: `tenantId`, `email`, `assetIndexWarning`, and `getApiBaseUrl` are all already in scope in this file from the existing code above this addition — no other imports needed.

- [ ] **Step 3: Show the calendar CTA on the intake thank-you screen**

In `src/app/intake/ai/page.tsx` (and the classic `/intake` form if it renders its own success message rather than sharing this component — check both files for a "submitted successfully" or `phase === "done"` render block), find where the submit response's `message` is displayed and add, conditionally:

```typescript
{calendarUrl && (
  <div style={{ marginTop: 16 }}>
    <p>You&apos;re ready to book your kickoff call.</p>
    <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
      Book Your Kickoff Call
    </a>
  </div>
)}
```

Store `calendarUrl` from the `/api/intake/submit` response in the existing submit-handling state (wherever the "done" phase is set, alongside however `message` is currently stored) and read it back here.

- [ ] **Step 4: Verify end to end**

```bash
grep CALENDAR_BOOKING_URL .env.local || echo "CALENDAR_BOOKING_URL=https://calendly.com/your-team/kickoff" >> .env.local
npm run dev
```

Using a real intake token (generate one via the prospect flow in Task 4, or an existing tenant's intake link), submit the intake form through the UI and confirm:
1. The response includes `calendarUrl`.
2. The thank-you screen shows the "Book Your Kickoff Call" link.
3. A calendar-ready email arrives.

Submit the same token a second time (if the form allows it) and confirm no second calendar email is sent (check `firstCompletion: false` in server logs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/app/api/intake/submit/route.ts src/app/intake/ai/page.tsx
git commit -m "feat: send calendar-ready email and CTA on first intake completion"
```

---

### Task 10: Tenants page — Invite Prospect form + status badges

**Files:**
- Modify: `src/app/(admin)/(others-pages)/tenants/page.tsx`

**Interfaces:**
- Consumes: `apiClient.post`, `apiClient.sendProspectInviteEmail` (Task 8), `apiClient.get<PlanListItem[]>("/plans")`.
- Modifies: `TenantListItem` type gains `intake_completed_at: string | null`, `payment_completed_at: string | null`; `status` typing widens to include `"prospect"`.

- [ ] **Step 1: Widen `TenantListItem` and add a `PlanListItem` type**

In `src/app/(admin)/(others-pages)/tenants/page.tsx`, update the `TenantListItem` type (around line 86) adding two fields:

```typescript
type TenantListItem = {
  id: number;
  slug: string;
  name: string;
  business_type: string;
  status: string; // now includes "prospect" alongside active/inactive/suspended
  intake_completed_at: string | null;
  payment_completed_at: string | null;
  // ...(rest of existing fields unchanged)
};
```

Add near the top of the file (with the other type definitions):

```typescript
type PlanListItem = {
  id: number;
  plan_key: string;
  name: string;
  price_monthly_cents: number;
};
```

Update the `GET /tenants` query in `routes/tenants.js` (`SELECT` list at the top of the `router.get("/", ...)` handler) to include `t.intake_completed_at, t.payment_completed_at` in both the `SELECT` and `GROUP BY` clauses so the new fields are actually returned — otherwise the frontend type change has no backing data. Add `t.intake_completed_at,` and `t.payment_completed_at,` right after the existing `t.plan_key,` line in both the `SELECT` list and the `GROUP BY` list.

- [ ] **Step 2: Add prospect state + plan list loading**

Near the other `useState` declarations (around line 179-198), add:

```typescript
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    businessName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    businessType: "lead_gen_services",
    planKey: "starter",
  });
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
```

In the existing `useEffect` that calls `loadTenants()` on session load (around line 442), also load plans:

```typescript
    const loadSession = async () => {
      try {
        const user = await apiClient.getSession();
        const role = user?.role;
        if (role === "admin" || role === "platform_admin") {
          setIsAuthorized(true);
          await loadTenants();
          const planList = await apiClient.get<PlanListItem[]>("/plans", false);
          setPlans(planList);
        }
      } finally {
        setLoadingSession(false);
      }
    };
```

- [ ] **Step 3: Add the "Invite Prospect" submit handler**

Add near `handleSubmit` (the existing full Create Tenant handler):

```typescript
  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSendingInvite(true);
    setInviteError(null);

    try {
      const selectedPlan = plans.find((p) => p.plan_key === inviteForm.planKey);
      const response = await apiClient.post<{
        tenant: { id: number; name: string };
        ownerUser: { id: number; email: string; name: string };
        checkoutUrl: string;
      }>("/tenant-prospects", inviteForm);

      const firstName = inviteForm.ownerName.trim().split(/\s+/)[0] || undefined;
      const intakeToken = await apiClient.post<{ token: string }>(
        "/intake/token",
        { tenantId: response.tenant.id, businessType: inviteForm.businessType },
      );
      const intakeUrl = `${window.location.origin}/intake/ai?token=${encodeURIComponent(intakeToken.token)}`;

      const priceFormatted = selectedPlan
        ? `$${(selectedPlan.price_monthly_cents / 100).toFixed(2)}`
        : "N/A";

      let sendStatus: "sent" | "failed" = "sent";
      let sendError: string | undefined;
      try {
        await apiClient.sendProspectInviteEmail(
          response.ownerUser.email,
          response.tenant.name,
          selectedPlan?.name ?? inviteForm.planKey,
          priceFormatted,
          response.checkoutUrl,
          intakeUrl,
          firstName,
        );
      } catch (emailError) {
        sendStatus = "failed";
        sendError = emailError instanceof Error ? emailError.message : String(emailError);
      }

      await apiClient.post(`/tenants/${response.tenant.id}/invite-status`, {
        status: sendStatus,
        lastError: sendError,
        deliveryResults: { prospect_invite: { status: sendStatus === "sent" ? "accepted" : "failed", at: new Date().toISOString() } },
      });

      await loadTenants();
      setIsInviteOpen(false);
      setInviteForm({
        businessName: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        businessType: "lead_gen_services",
        planKey: "starter",
      });
      setSuccessMessage(
        sendStatus === "sent"
          ? `Prospect ${response.tenant.name} invited successfully.`
          : `Prospect ${response.tenant.name} created, but the invite email failed to send. Use Resend Invite to retry.`,
      );
    } catch (submitError) {
      const err = submitError as { message?: string; code?: string };
      setInviteError(err.message ?? "Failed to invite prospect.");
    } finally {
      setIsSendingInvite(false);
    }
  };
```

Note: `apiClient.post<{ token: string }>("/intake/token", ...)` assumes a small backend endpoint that mints an intake token server-side for a tenant that has no `websiteId` yet (the existing `sendIntakeEmail` Next.js route mints the token itself via `createIntakeToken`, but that route sends the email directly — here we need the raw token to embed in our own combined email instead). Add this endpoint as part of this task rather than Task 8, since it is purely an admin-UI concern:

Create `src/app/api/intake/token/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createIntakeToken } from "@/lib/email";

const schema = z.object({
  tenantId: z.number(),
  businessType: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // NOTE: this route has no admin-session check of its own. It is only
  // reachable from the authenticated Tenants admin page today; if it is
  // ever called from elsewhere, add an admin-session check here first.
  const token = await createIntakeToken(
    "",
    parsed.data.tenantId,
    parsed.data.businessType ?? "universal",
  );

  return NextResponse.json({ token });
}
```

`createIntakeToken(email, tenantId, businessType, websiteId?, tenantName?)` is already defined in `src/lib/email.ts` (Task's existing code, unchanged) — the `email` argument is embedded in the token payload for logging/display purposes only and is not used for auth, so passing `""` here (email is fetched fresh at intake-submit time from the tenant record, not trusted from the token) is acceptable; confirm this against the current `verifyIntakeToken` usage in `/api/intake/submit/route.ts` before shipping, since that route currently destructures `email` straight off the token payload for its own admin-notification email. If it relies on that field being a real address, pass the actual owner email into `createIntakeToken` here instead of `""`.

- [ ] **Step 4: Add the "Invite Prospect" button and modal to the JSX**

Near the existing "Create Tenant" form/button in the page's render output, add a secondary button that opens `isInviteOpen`, and a modal form bound to `inviteForm`/`handleInviteChange`/`handleInviteSubmit` with fields: Business Name, Owner Name, Owner Email, Owner Phone, Business Type (`<select>` over the same `BUSINESS_TYPES`-equivalent list already used elsewhere in this file for the full form), Plan (`<select>` populated from `plans`). Follow the exact modal/form markup conventions already used for the existing "Edit Tenant" modal in this same file (same wrapper classes, same error/success message placement) rather than introducing new modal styling.

- [ ] **Step 5: Add status/intake/payment badges to the tenant table rows**

Near the existing `inviteBadgeClasses` function (around line 333), add:

```typescript
  const statusBadgeClasses = (status: string) => {
    if (status === "prospect") return "border-amber-300 bg-amber-50 text-amber-700";
    if (status === "active") return "border-green-300 bg-green-50 text-green-700";
    if (status === "suspended") return "border-red-300 bg-red-50 text-red-700";
    return "border-gray-300 bg-gray-50 text-gray-700";
  };

  const completionBadgeClasses = (completedAt: string | null) =>
    completedAt
      ? "border-green-300 bg-green-50 text-green-700"
      : "border-gray-300 bg-gray-50 text-gray-700";
```

In the table row rendering (near the existing invite-status badge at line ~1433), add two more badges for prospect rows:

```typescript
{tenant.status === "prospect" && (
  <>
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${completionBadgeClasses(tenant.intake_completed_at)}`}>
      Intake: {tenant.intake_completed_at ? "done" : "pending"}
    </span>
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${completionBadgeClasses(tenant.payment_completed_at)}`}>
      Payment: {tenant.payment_completed_at ? "done" : "pending"}
    </span>
  </>
)}
```

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev
```

Sign in as an admin, open `/tenants`, click "Invite Prospect", fill the form, submit. Confirm:
1. A new row appears with status `prospect` and both new badges showing "pending".
2. The invite email arrives with working intake and checkout links.
3. Submitting the intake form for that prospect flips the "Intake" badge to "done" after a page refresh.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(admin)/(others-pages)/tenants/page.tsx" src/app/api/intake/token/route.ts routes/tenants.js
git commit -m "feat: add Invite Prospect form and status badges to Tenants page"
```

---

### Task 11: "Activate Tenant" row action

**Files:**
- Modify: `src/app/(admin)/(others-pages)/tenants/page.tsx`

**Interfaces:**
- Consumes: `POST /api/tenant-prospects/:tenantId/activate` (Task 6).

- [ ] **Step 1: Add the activate handler**

Near the existing `handleSaveEdit`/status-change handlers:

```typescript
  const handleActivate = async (tenant: TenantListItem) => {
    setRowActionTenantId(tenant.id);
    setRowActionMessage(null);
    try {
      await apiClient.post(`/tenant-prospects/${tenant.id}/activate`, {
        provisionWebsite: false,
      });
      await loadTenants();
      setRowActionMessage(`${tenant.name} activated.`);
    } catch (activateError) {
      const err = activateError as { message?: string };
      setRowActionMessage(err.message ?? "Failed to activate tenant.");
    } finally {
      setRowActionTenantId(null);
    }
  };
```

- [ ] **Step 2: Add the row action button**

Next to the existing `Suspend`/`Reactivate` row-action buttons, conditionally render for `tenant.status === "prospect"`:

```typescript
{tenant.status === "prospect" && (
  <button
    type="button"
    onClick={() => handleActivate(tenant)}
    disabled={rowActionTenantId === tenant.id}
  >
    {rowActionTenantId === tenant.id ? "Activating..." : "Activate"}
  </button>
)}
```

- [ ] **Step 3: Verify in the browser**

Invite a prospect (Task 10), complete their intake (submit the form via the link in the invite email), then click "Activate" on their row. Confirm the status badge changes to `active` and the intake/payment badges disappear (since they only render for `status === "prospect"`).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/(others-pages)/tenants/page.tsx"
git commit -m "feat: add Activate Tenant row action for prospect tenants"
```

---

## Self-Review Notes

- **Spec coverage:** Data model changes -> Task 2. New endpoint + orchestration -> Tasks 4-6. Admin UI -> Tasks 10-11. Intake completion -> calendar reveal -> Task 9. Payment webhook change -> Task 12 below (added during self-review, see note). Error handling (rollback, duplicate invite, idempotent intake) -> Tasks 4-6 inline. Testing -> manual verification steps in every task.
- **Gap found during self-review:** the spec's "Payment webhook change" section was not yet a task — Task 5 built the `payment-confirmed` endpoint the webhook calls, but nothing in this plan actually modified `src/app/api/stripe/webhook/route.ts`. Added as Task 12 below.

### Task 12: Stripe webhook subscription branch

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `POST /api/tenant-prospects/:tenantId/payment-confirmed` (Task 5).

- [ ] **Step 1: Add the subscription-mode branch**

In `src/app/api/stripe/webhook/route.ts`, the `if (event.type === "checkout.session.completed")` block currently only proceeds past `else if (session.payment_intent)` — subscription-mode sessions have `session.subscription` instead and fall through silently today. Add a new branch right after that `else if` block closes (after the ecommerce charge-recording logic, still inside the `if (event.type === "checkout.session.completed")` block):

```typescript
    } else if (session.mode === "subscription" && session.metadata?.tenantId) {
      const tenantId = session.metadata.tenantId;
      metricTenantId = tenantId;
      const internalKey = process.env.INTERNAL_API_KEY;

      if (!apiUrl || !internalKey) {
        console.error(
          "[stripe/webhook] Missing NEXT_PUBLIC_API_URL or INTERNAL_API_KEY; subscription payment not recorded",
        );
        hadProcessingFailure = true;
        failureCode = "MISSING_CONFIG_FOR_SUBSCRIPTION";
      } else {
        try {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          const customerId =
            typeof session.customer === "string" ? session.customer : session.customer?.id;

          const confirmResponse = await fetch(
            `${apiUrl}/tenant-prospects/${tenantId}/payment-confirmed`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-key": internalKey,
              },
              body: JSON.stringify({
                stripeSubscriptionId: subscriptionId ?? null,
                stripeCustomerId: customerId ?? null,
              }),
            },
          );

          if (!confirmResponse.ok) {
            console.error(
              "[stripe/webhook] payment-confirmed call failed:",
              confirmResponse.status,
            );
            hadProcessingFailure = true;
            failureCode = "PAYMENT_CONFIRMED_CALL_FAILED";
          }
        } catch (confirmError) {
          console.error(
            "[stripe/webhook] payment-confirmed call threw:",
            confirmError,
          );
          hadProcessingFailure = true;
          failureCode = "PAYMENT_CONFIRMED_CALL_ERROR";
        }
      }
    }
```

This is an `else if` chained onto the existing `if (!apiUrl) {...} else if (session.payment_intent) {...}` structure — add it as the final `else if` in that same chain, right before whatever closing brace currently ends that `if/else if` sequence.

- [ ] **Step 2: Verify with the Stripe CLI**

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

In another terminal, trigger a real subscription checkout by visiting the `checkoutUrl` returned from Task 4's prospect-creation curl call (use test card `4242 4242 4242 4242`). After completing checkout, confirm in the `stripe listen` terminal that `checkout.session.completed` fired, and confirm in the database:

```bash
psql "$DATABASE_URL" -c "SELECT payment_completed_at, stripe_subscription_id, stripe_customer_id FROM public.tenants WHERE id = <tenant_id>;"
```

Expected: all three columns populated.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: attach admin-invite subscription checkouts to their prospect tenant"
```

---

## Final Manual End-to-End Check

After all 12 tasks are complete, run through the full flow once, start to finish, as a smoke test:

1. As admin, open `/tenants`, click "Invite Prospect", submit the form for a fresh test email.
2. Confirm the combined invite email arrives with working intake and checkout links.
3. Complete the intake form via the emailed link. Confirm the calendar CTA appears on-screen and the calendar-ready email arrives.
4. Complete the Stripe checkout with the test card. Confirm the Payment badge flips to "done" on the Tenants page (refresh).
5. Click "Activate" on the tenant row. Confirm status flips to `active`.
6. Confirm no `website` row was created (`legacy_website_id IS NULL`) unless "provision built-in website" was explicitly used.
