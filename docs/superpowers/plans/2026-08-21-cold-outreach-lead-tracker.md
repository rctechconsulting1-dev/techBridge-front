# Cold Outreach Lead Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let RD Tech Bridge track cold-outreach leads (pasted from Craigslist/Facebook/Instagram/Google Maps, or CSLB license lookups) in the admin dashboard, without duplicating outreach or ever cold-emailing an existing tenant or prospect, and send the first-touch email through the existing Resend integration.

**Architecture:** Two new tables in `backend-rc` (`outreach_leads`, `outreach_lead_touches`) behind a new admin-only Express router. A new admin-dashboard-rc page provides paste-and-parse capture (one AI parsing endpoint handles all five sources), a tracker list, and send/log actions. Sending reuses the existing `getResendClient()` singleton as plain text (not the branded HTML layout used by transactional email), gated by a live status check against the backend before every send.

**Tech Stack:** Express + `pg` + `node-pg-migrate` (backend-rc), Next.js API routes + React + Zod + the `openai` SDK (admin-dashboard-rc), Resend.

**Spec:** `docs/superpowers/specs/2026-08-21-cold-outreach-lead-tracker-design.md`

## Global Constraints

- Two repos involved. Tasks 1-3 run in `backend-rc` at `C:\Users\cesar\Code\backend-rc`. Tasks 4-9 run in `admin-dashboard-rc` at `C:\Users\cesar\Code\admin-dashboard-rc`. Each task's Files section states which repo root its paths are relative to.
- No test runner in either repo. Verification is `npx tsc --noEmit` (admin-dashboard-rc only — backend-rc is plain JS) plus manual curl/browser checks, matching the pattern used by every existing plan in this directory.
- `outreach_leads`/`outreach_lead_touches` are a **distinct concept** from the existing `ai_leads` table (`backend-rc/migrations/1782700000000_add-ai-leads-table.js`) — `ai_leads` is a per-tenant add-on that captures a tenant's own website visitors via a chat widget. This feature is platform-only (RD Tech Bridge's own sales pipeline), not tenant-scoped, and never touches `ai_leads` or its `/api/ai-agent/*` routes.
- No automated scraping anywhere — every lead originates from text a person copy-pasted by hand. There is no scraper task in this plan.
- No `large` tier and no CSV/Excel file upload — both explicitly out of scope per the spec.
- Every outreach email sent through this feature must include the compliance footer (physical mailing address + opt-out line) from `src/lib/outreach-templates.ts` — never send without it. This requires the `OUTREACH_COMPLIANCE_ADDRESS` env var to be set (RD Tech Bridge's real mailing address) before Task 6's send route can succeed — set it in the local `.env` before testing Task 6 Step 4.
- The tenant/prospect cross-check (never cold-email an existing tenant or prospect) is checked both at lead-creation time (Task 2) and again immediately before every send (Task 6) — the second check is the one that actually matters for safety and must not be skipped or cached.

---

### Task 1: Migration — `outreach_leads` and `outreach_lead_touches` tables (backend-rc)

**Repo root:** `C:\Users\cesar\Code\backend-rc`

**Files:**
- Create: `migrations/1783700000000_add-outreach-leads-tables.js`

**Interfaces:**
- Produces: `public.outreach_leads` (columns: `id uuid`, `business_name text`, `contact_name text`, `email text`, `phone text`, `website_url text`, `license_number text`, `source text`, `trade text`, `city text`, `tier text`, `rating numeric`, `review_count integer`, `status text`, `notes text`, `raw_source_text text`, `created_at timestamptz`, `updated_at timestamptz`) and `public.outreach_lead_touches` (columns: `id uuid`, `lead_id uuid`, `channel text`, `template_opener text`, `template_tier text`, `resend_message_id text`, `outcome_notes text`, `created_at timestamptz`). Task 2 queries both directly.

- [ ] **Step 1: Write the migration**

```js
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable(
    { schema: "public", name: "outreach_leads" },
    {
      id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      business_name: { type: "TEXT", notNull: true },
      contact_name: { type: "TEXT" },
      email: { type: "TEXT" },
      phone: { type: "TEXT" },
      website_url: { type: "TEXT" },
      license_number: { type: "TEXT" },
      source: {
        type: "TEXT",
        notNull: true,
        check:
          "source IN ('google_maps','facebook','instagram','craigslist','cslb')",
      },
      trade: { type: "TEXT" },
      city: { type: "TEXT" },
      tier: {
        type: "TEXT",
        notNull: true,
        check: "tier IN ('small','medium')",
      },
      rating: { type: "NUMERIC" },
      review_count: { type: "INTEGER" },
      status: {
        type: "TEXT",
        notNull: true,
        default: "new",
        check:
          "status IN ('new','needs_email_lookup','ready_to_send','contacted','responded','not_interested','converted','do_not_contact')",
      },
      notes: { type: "TEXT" },
      raw_source_text: { type: "TEXT" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("now()"),
      },
      updated_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("now()"),
      },
    },
  );

  pgm.addIndex("outreach_leads", ["status"], {
    name: "idx_outreach_leads_status",
  });
  pgm.addIndex("outreach_leads", ["source"], {
    name: "idx_outreach_leads_source",
  });
  pgm.addIndex("outreach_leads", ["tier"], {
    name: "idx_outreach_leads_tier",
  });
  pgm.addIndex("outreach_leads", ["email"], {
    name: "idx_outreach_leads_email_unique",
    unique: true,
    where: "email IS NOT NULL",
  });
  pgm.addIndex("outreach_leads", ["license_number"], {
    name: "idx_outreach_leads_license_number_unique",
    unique: true,
    where: "license_number IS NOT NULL",
  });

  pgm.createTable(
    { schema: "public", name: "outreach_lead_touches" },
    {
      id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      lead_id: {
        type: "UUID",
        notNull: true,
        references: "public.outreach_leads(id)",
        onDelete: "CASCADE",
      },
      channel: {
        type: "TEXT",
        notNull: true,
        check: "channel IN ('email','call','text')",
      },
      template_opener: { type: "TEXT" },
      template_tier: { type: "TEXT" },
      resend_message_id: { type: "TEXT" },
      outcome_notes: { type: "TEXT" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("now()"),
      },
    },
  );

  pgm.addIndex("outreach_lead_touches", ["lead_id"], {
    name: "idx_outreach_lead_touches_lead_id",
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: "public", name: "outreach_lead_touches" });
  pgm.dropTable({ schema: "public", name: "outreach_leads" });
};
```

- [ ] **Step 2: Run the migration up**

Run: `npm run migrate:up`
Expected: output lists `1783700000000_add-outreach-leads-tables` as migrated, no errors.

- [ ] **Step 3: Verify the tables exist with the right shape**

Run: `node -e "const pool=require('./db'); pool.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('outreach_leads','outreach_lead_touches') ORDER BY table_name, ordinal_position\").then(r=>{console.log(r.rows); pool.end();})"`
Expected: prints every column listed in Step 1 for both tables, no error.

- [ ] **Step 4: Verify reversibility**

Run: `npm run migrate:down` then `npm run migrate:up` again.
Expected: both commands succeed with no errors; re-running Step 3's query afterward shows the tables are back.

- [ ] **Step 5: Commit**

```bash
cd backend-rc
git add migrations/1783700000000_add-outreach-leads-tables.js
git commit -m "feat: add outreach_leads and outreach_lead_touches tables"
```

---

### Task 2: Dedup/cross-check helpers + create/list/get routes (backend-rc)

**Repo root:** `C:\Users\cesar\Code\backend-rc`

**Files:**
- Create: `lib/outreachLeadHelpers.js`
- Create: `routes/outreachLeads.js`
- Modify: `server.js` (mount the new router)

**Interfaces:**
- Consumes: `outreach_leads`/`outreach_lead_touches` tables (Task 1); `normalizeEmail` from `lib/tenantHelpers.js`; `pool` from `db.js`; `authMiddleware` from `middleware/authMiddleware.js`; `asyncHandler` from `routes/routeUtils.js`.
- Produces: `findExistingTenantOrProspect(client, normalizedEmail)` → `Promise<boolean>` and `findDuplicateLead(client, { email, licenseNumber, businessName, city })` → `Promise<{ id: string, source: string, created_at: string } | null>`, both exported from `lib/outreachLeadHelpers.js` — Task 3 reuses both. `POST /api/outreach-leads` (bulk create) → `201 { created: OutreachLead[] }`; `GET /api/outreach-leads?status=&source=&tier=` → `200 OutreachLead[]`; `GET /api/outreach-leads/:id` → `200 OutreachLead`. All three require `authMiddleware, requireAdminRole`. Task 3 adds more routes to this same file; Task 6 (admin-dashboard-rc) calls `GET /:id` as its pre-send gate.

- [ ] **Step 1: Write the dedup/cross-check helper module**

```js
const { normalizeEmail } = require("./tenantHelpers");

// True if `normalizedEmail` already belongs to a real tenant (any status) or
// an existing tenant_prospect owner — i.e. someone who has already agreed to
// a plan or is already a customer. A cold lead matching this must never be
// sent a cold email.
const findExistingTenantOrProspect = async (client, normalizedEmail) => {
  if (!normalizedEmail) return false;

  const result = await client.query(
    `SELECT 1
     FROM public.user_tenant_roles utr
     JOIN public."user" u ON u.id = utr.user_id
     WHERE u.email = $1
     LIMIT 1`,
    [normalizedEmail],
  );
  return result.rows.length > 0;
};

// Finds a likely-duplicate existing outreach_leads row: exact match on email
// or license_number when present, otherwise a case-insensitive exact match
// on business_name + city. Returns the matching row (id/source/created_at)
// or null. This is advisory (callers still create the row; the caller
// decides whether to surface the match as a warning).
const findDuplicateLead = async (
  client,
  { email, licenseNumber, businessName, city },
) => {
  if (email) {
    const byEmail = await client.query(
      `SELECT id, source, created_at FROM public.outreach_leads WHERE email = $1 LIMIT 1`,
      [normalizeEmail(email)],
    );
    if (byEmail.rows.length > 0) return byEmail.rows[0];
  }

  if (licenseNumber) {
    const byLicense = await client.query(
      `SELECT id, source, created_at FROM public.outreach_leads WHERE license_number = $1 LIMIT 1`,
      [licenseNumber],
    );
    if (byLicense.rows.length > 0) return byLicense.rows[0];
  }

  if (businessName && city) {
    const byNameCity = await client.query(
      `SELECT id, source, created_at FROM public.outreach_leads
       WHERE lower(trim(business_name)) = lower(trim($1))
         AND lower(trim(city)) = lower(trim($2))
       LIMIT 1`,
      [businessName, city],
    );
    if (byNameCity.rows.length > 0) return byNameCity.rows[0];
  }

  return null;
};

module.exports = {
  findExistingTenantOrProspect,
  findDuplicateLead,
};
```

- [ ] **Step 2: Write the route file**

```js
const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("./routeUtils");
const { normalizeEmail, requireAdminRole } = require("../lib/tenantHelpers");
const {
  findExistingTenantOrProspect,
  findDuplicateLead,
} = require("../lib/outreachLeadHelpers");

const router = express.Router();

const SOURCES = new Set([
  "google_maps",
  "facebook",
  "instagram",
  "craigslist",
  "cslb",
]);
const TIERS = new Set(["small", "medium"]);
const STATUSES = new Set([
  "new",
  "needs_email_lookup",
  "ready_to_send",
  "contacted",
  "responded",
  "not_interested",
  "converted",
  "do_not_contact",
]);

router.post(
  "/",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const { leads } = req.body ?? {};
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        error: "leads must be a non-empty array",
        code: "MISSING_LEADS",
      });
    }

    const created = [];

    for (const raw of leads) {
      const businessName =
        typeof raw?.businessName === "string" ? raw.businessName.trim() : "";
      const source = raw?.source;
      const tier = raw?.tier;

      if (!businessName || !SOURCES.has(source) || !TIERS.has(tier)) {
        return res.status(400).json({
          error:
            "Each lead requires businessName, a valid source, and a valid tier",
          code: "INVALID_LEAD",
          lead: raw,
        });
      }

      const email = raw?.email ? normalizeEmail(raw.email) : null;
      const client = await pool.connect();
      let leadRow;
      let isExistingCustomer = false;
      let duplicate = null;

      try {
        if (email) {
          isExistingCustomer = await findExistingTenantOrProspect(client, email);
        }
        duplicate = await findDuplicateLead(client, {
          email,
          licenseNumber: raw?.licenseNumber || null,
          businessName,
          city: raw?.city || null,
        });

        const status = isExistingCustomer
          ? "do_not_contact"
          : email
            ? "ready_to_send"
            : "needs_email_lookup";

        const insertResult = await client.query(
          `INSERT INTO public.outreach_leads (
            business_name, contact_name, email, phone, website_url,
            license_number, source, trade, city, tier, rating,
            review_count, status, notes, raw_source_text
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          RETURNING *`,
          [
            businessName,
            raw?.contactName || null,
            email,
            raw?.phone || null,
            raw?.websiteUrl || null,
            raw?.licenseNumber || null,
            source,
            raw?.trade || null,
            raw?.city || null,
            tier,
            raw?.rating ?? null,
            raw?.reviewCount ?? null,
            status,
            isExistingCustomer
              ? "Auto-flagged do_not_contact: email matches an existing tenant or prospect."
              : raw?.notes || null,
            raw?.rawSourceText || null,
          ],
        );
        leadRow = insertResult.rows[0];
      } finally {
        client.release();
      }

      created.push({ ...leadRow, duplicateWarning: duplicate });
    }

    return res.status(201).json({ created });
  }),
);

router.get(
  "/",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const { status, source, tier } = req.query;
    const conditions = [];
    const values = [];

    if (status) {
      if (!STATUSES.has(status)) {
        return res.status(400).json({ error: "Invalid status", code: "INVALID_STATUS" });
      }
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    if (source) {
      if (!SOURCES.has(source)) {
        return res.status(400).json({ error: "Invalid source", code: "INVALID_SOURCE" });
      }
      values.push(source);
      conditions.push(`source = $${values.length}`);
    }
    if (tier) {
      if (!TIERS.has(tier)) {
        return res.status(400).json({ error: "Invalid tier", code: "INVALID_TIER" });
      }
      values.push(tier);
      conditions.push(`tier = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM public.outreach_leads ${where} ORDER BY created_at DESC`,
      values,
    );

    return res.json(result.rows);
  }),
);

router.get(
  "/:id",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT * FROM public.outreach_leads WHERE id = $1",
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found", code: "LEAD_NOT_FOUND" });
    }
    return res.json(result.rows[0]);
  }),
);

module.exports = router;
```

- [ ] **Step 3: Mount the router**

In `server.js`, add near the other route requires (after `const aiAgentPublicRoutes = require("./routes/aiAgentPublic");`):

```js
const outreachLeadsRoutes = require("./routes/outreachLeads");
```

And near `app.use("/api/tenant-prospects", tenantProspectsRoutes);`, add:

```js
app.use("/api/outreach-leads", outreachLeadsRoutes);
```

- [ ] **Step 4: Syntax-check and exercise the routes**

Run: `node -e "require('./routes/outreachLeads.js')"` — expected: no output, no error.

With a local backend-rc dev server running and a valid admin JWT:

```bash
curl -X POST http://localhost:5000/api/outreach-leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"leads":[{"businessName":"Test Painting Co","source":"google_maps","tier":"small","city":"Los Angeles","trade":"Painting","phone":"555-1234"}]}'
```

Expected: `201` with `{ "created": [ { ...lead fields..., "status": "needs_email_lookup", "duplicateWarning": null } ] }` (no email was given, so `needs_email_lookup`).

```bash
curl http://localhost:5000/api/outreach-leads?status=needs_email_lookup \
  -H "Authorization: Bearer $ADMIN_JWT"
```

Expected: `200` array containing the lead just created.

Re-run the same POST a second time with the same `businessName`/`city`. Expected: `201` again (not blocked), but this time `duplicateWarning` is populated with the first lead's `id`/`source`/`created_at`.

- [ ] **Step 5: Commit**

```bash
cd backend-rc
git add lib/outreachLeadHelpers.js routes/outreachLeads.js server.js
git commit -m "feat: add outreach leads create/list/get routes with dedup checks"
```

---

### Task 3: Status update + touch-logging routes (backend-rc)

**Repo root:** `C:\Users\cesar\Code\backend-rc`

**Files:**
- Modify: `routes/outreachLeads.js`

**Interfaces:**
- Consumes: `findExistingTenantOrProspect` (Task 2).
- Produces: `PATCH /api/outreach-leads/:id` (body: any of `status`, `email`, `phone`, `websiteUrl`, `notes`) → `200 OutreachLead`; `POST /api/outreach-leads/:id/touches` (body: `{ channel: "email"|"call"|"text", templateOpener?, templateTier?, resendMessageId?, outcomeNotes? }`) → `201 { touch, lead }` — inserting an `email` touch requires the lead's current `status` not be `do_not_contact` (checked fresh at insert time) and advances `status` to `contacted` unless the caller's lead is already past that (e.g. already `responded`); `GET /api/outreach-leads/:id/touches` → `200 OutreachLeadTouch[]`. All three require `authMiddleware, requireAdminRole`. Task 6 (admin-dashboard-rc) calls the touches POST route after a successful Resend send.

- [ ] **Step 1: Add the PATCH route**

Add to `routes/outreachLeads.js`, after the existing `GET /:id` handler, before `module.exports = router;`:

```js
router.patch(
  "/:id",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const { status, email, phone, websiteUrl, notes } = req.body ?? {};

    if (status !== undefined && !STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid status", code: "INVALID_STATUS" });
    }

    const existing = await pool.query(
      "SELECT * FROM public.outreach_leads WHERE id = $1",
      [req.params.id],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found", code: "LEAD_NOT_FOUND" });
    }
    const lead = existing.rows[0];

    const normalizedEmail = email !== undefined
      ? (email ? normalizeEmail(email) : null)
      : lead.email;

    // If an email is being added/changed, re-run the tenant/prospect check —
    // a lead captured with no email must not silently become sendable to an
    // existing customer once an email is filled in.
    let resolvedStatus = status !== undefined ? status : lead.status;
    if (email !== undefined && normalizedEmail && normalizedEmail !== lead.email) {
      const isExistingCustomer = await findExistingTenantOrProspect(pool, normalizedEmail);
      if (isExistingCustomer) {
        resolvedStatus = "do_not_contact";
      } else if (status === undefined && lead.status === "needs_email_lookup") {
        resolvedStatus = "ready_to_send";
      }
    }

    const result = await pool.query(
      `UPDATE public.outreach_leads
       SET status = $1,
           email = $2,
           phone = COALESCE($3, phone),
           website_url = COALESCE($4, website_url),
           notes = COALESCE($5, notes),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        resolvedStatus,
        normalizedEmail,
        phone !== undefined ? phone : null,
        websiteUrl !== undefined ? websiteUrl : null,
        notes !== undefined ? notes : null,
        req.params.id,
      ],
    );

    return res.json(result.rows[0]);
  }),
);
```

- [ ] **Step 2: Add the touch-logging routes**

Add immediately after the PATCH route:

```js
router.post(
  "/:id/touches",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const { channel, templateOpener, templateTier, resendMessageId, outcomeNotes } =
      req.body ?? {};

    if (!["email", "call", "text"].includes(channel)) {
      return res.status(400).json({ error: "Invalid channel", code: "INVALID_CHANNEL" });
    }

    const leadResult = await pool.query(
      "SELECT * FROM public.outreach_leads WHERE id = $1",
      [req.params.id],
    );
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found", code: "LEAD_NOT_FOUND" });
    }
    const lead = leadResult.rows[0];

    if (channel === "email" && lead.status === "do_not_contact") {
      return res.status(409).json({
        error: "This lead is flagged do_not_contact and cannot be emailed",
        code: "LEAD_DO_NOT_CONTACT",
      });
    }

    const touchResult = await pool.query(
      `INSERT INTO public.outreach_lead_touches (
        lead_id, channel, template_opener, template_tier, resend_message_id, outcome_notes
      ) VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        req.params.id,
        channel,
        templateOpener || null,
        templateTier || null,
        resendMessageId || null,
        outcomeNotes || null,
      ],
    );

    const advanceableStatuses = new Set(["new", "needs_email_lookup", "ready_to_send"]);
    const nextStatus = advanceableStatuses.has(lead.status) ? "contacted" : lead.status;

    const updatedLeadResult = await pool.query(
      `UPDATE public.outreach_leads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [nextStatus, req.params.id],
    );

    return res.status(201).json({
      touch: touchResult.rows[0],
      lead: updatedLeadResult.rows[0],
    });
  }),
);

router.get(
  "/:id/touches",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT * FROM public.outreach_lead_touches WHERE lead_id = $1 ORDER BY created_at ASC",
      [req.params.id],
    );
    return res.json(result.rows);
  }),
);
```

- [ ] **Step 3: Verify**

Run: `node -e "require('./routes/outreachLeads.js')"` — expected: no error.

Using the lead created in Task 2 Step 4 (capture its `id` from that response):

```bash
curl -X POST http://localhost:5000/api/outreach-leads/$LEAD_ID/touches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"channel":"call","outcomeNotes":"Left a voicemail"}'
```

Expected: `201` with `touch.channel = "call"` and `lead.status = "contacted"`.

```bash
curl -X PATCH http://localhost:5000/api/outreach-leads/$LEAD_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"status":"do_not_contact"}'
```

Then attempt an email touch:

```bash
curl -X POST http://localhost:5000/api/outreach-leads/$LEAD_ID/touches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"channel":"email","templateOpener":"google_maps","templateTier":"small"}'
```

Expected: `409 LEAD_DO_NOT_CONTACT`.

- [ ] **Step 4: Commit**

```bash
cd backend-rc
git add routes/outreachLeads.js
git commit -m "feat: add outreach lead status update and touch-logging routes"
```

---

### Task 4: Plain-text outreach templates (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/lib/outreach-templates.ts`

**Interfaces:**
- Produces: `LeadSource`, `LeadTier` types; `buildOutreachEmail({ source, tier, businessName, contactName, city, trade, rating, reviewCount, senderName }): { subject: string; body: string }`. Task 6 and Task 9 both import this.

- [ ] **Step 1: Write the template module**

```ts
/**
 * Plain-text cold outreach templates. Deliberately not part of
 * email-templates.ts's branded HTML layout() — cold outreach needs to read
 * as a real person's email, not a marketing blast.
 */

export type LeadSource = "google_maps" | "facebook" | "instagram" | "craigslist" | "cslb";
export type LeadTier = "small" | "medium";

export interface OutreachMergeFields {
  source: LeadSource;
  tier: LeadTier;
  businessName: string;
  contactName?: string | null;
  city?: string | null;
  trade?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  senderName: string;
}

const OPENERS: Record<LeadSource, (f: OutreachMergeFields) => string> = {
  google_maps: (f) =>
    `I came across ${f.businessName} on Google Maps${
      f.rating && f.reviewCount ? ` — ${f.rating} stars across ${f.reviewCount} reviews is no small thing` : ""
    }.`,
  facebook: (f) => `I saw the ad ${f.businessName} is running on Facebook.`,
  instagram: (f) => `I saw the ad ${f.businessName} is running on Instagram.`,
  craigslist: (f) =>
    `I saw your ${f.trade ? `${f.trade} ` : ""}listing for ${f.businessName} on Craigslist.`,
  cslb: (f) => `Congrats on the new ${f.trade ? `${f.trade} ` : ""}license for ${f.businessName}.`,
};

const BODIES: Record<LeadTier, (f: OutreachMergeFields) => string> = {
  small: (f) =>
    `Starting out, it's easy for the website to fall to the bottom of the list — and that usually means people searching for ${
      f.trade || "your services"
    }${f.city ? ` in ${f.city}` : ""} can't find you, or land somewhere that doesn't look finished. I put together a quick mockup of what a real site could look like for ${f.businessName} — happy to send it over.`,
  medium: (f) =>
    `A lot of the day-to-day for a business like ${f.businessName} — missed calls, following up on quotes, getting back to people — ends up eating time that should go toward the work itself. I put together a mockup of a site for ${f.businessName}, plus an idea for a simple automation (following up on missed calls automatically, for example) that could save real time. Happy to send both over.`,
};

const CLOSE = (f: OutreachMergeFields) =>
  `Just reply to this email if you'd like to see it — no pressure either way.\n\n${f.senderName}`;

// Exported (not folded into buildOutreachEmail's returned body) so the send
// route can append it server-side right before sending, regardless of what
// the client's editable composer contains — this is what makes it actually
// non-removable rather than just deletable text in a textarea.
export function complianceFooter(): string {
  const address = process.env.OUTREACH_COMPLIANCE_ADDRESS;
  if (!address) {
    throw new Error(
      "OUTREACH_COMPLIANCE_ADDRESS is not configured. Set it to RD Tech Bridge's mailing address before sending outreach email (CAN-SPAM requires it).",
    );
  }
  return `\n\n---\n${address}\nDon't want to hear from us again? Just reply and let me know.`;
}

export function buildOutreachEmail(fields: OutreachMergeFields): { subject: string; body: string } {
  const greeting = fields.contactName ? `Hi ${fields.contactName},` : "Hi there,";
  const opener = OPENERS[fields.source](fields);
  const body = BODIES[fields.tier](fields);
  const close = CLOSE(fields);

  return {
    subject: `Quick idea for ${fields.businessName}`,
    body: `${greeting}\n\n${opener} ${body}\n\n${close}`,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors attributable to `src/lib/outreach-templates.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/outreach-templates.ts
git commit -m "feat: add plain-text cold outreach email templates"
```

---

### Task 5: AI lead-parsing endpoint (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/app/api/leads/parse/route.ts`

**Interfaces:**
- Consumes: `checkRateLimit` from `@/lib/ai/rate-limit`; `decodeJwtPayload` from `@/lib/auth-context` (already used by `src/lib/api-client.ts`).
- Produces: `POST /api/leads/parse` — request `{ source: LeadSource, rawText: string }`, response `200 { leads: DraftLead[] }` where `DraftLead = { businessName, contactName, email, phone, websiteUrl, licenseNumber, rating: number|null, reviewCount: number|null, notes }` (empty string for any field the model couldn't find, never fabricated). Task 8 (capture UI) calls this.

- [ ] **Step 1: Write the route**

```ts
import OpenAI from "openai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { decodeJwtPayload } from "@/lib/auth-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_MODEL = process.env.OPENAI_MODEL_CONTENT_AGENT || "gpt-4o-mini";
const AI_TIMEOUT_MS = Number(process.env.AI_AGENT_TIMEOUT_MS || 60000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 20);
const MAX_RAW_TEXT_CHARS = 20000;

const RequestSchema = z.object({
  source: z.enum(["google_maps", "facebook", "instagram", "craigslist", "cslb"]),
  rawText: z.string().min(1).max(MAX_RAW_TEXT_CHARS),
});

const DraftLead = z.object({
  businessName: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  websiteUrl: z.string(),
  licenseNumber: z.string(),
  rating: z.number().nullable(),
  reviewCount: z.number().nullable(),
  notes: z.string(),
});
const ParsedLeads = z.object({ leads: z.array(DraftLead) });

const SOURCE_GUIDANCE: Record<string, string> = {
  google_maps:
    "Google Maps search results text. It repeats per business: name (often twice), a rating like '5.0(88)' or 'No reviews', a category and street address separated by '·', open/closed status and hours, a phone number, and sometimes the word 'Website' (this only means a website link exists — the actual URL is never in the copied text, so leave websiteUrl empty even when you see 'Website'). Sometimes a customer review quote follows in quotes — put a short version of it in notes. Extract every distinct business listed once (duplicates can appear twice in the same paste — extract each occurrence, the caller deduplicates).",
  facebook:
    "Facebook ad or page text. Usually just ad copy and a page/business name. Phone, address, and email are rarely present — leave those fields empty rather than guessing.",
  instagram:
    "Instagram ad or profile text. Usually just ad copy and a page/business name. Phone, address, and email are rarely present — leave those fields empty rather than guessing.",
  craigslist:
    "A Craigslist listing. Usually a service description, sometimes a phone number or email. Extract whatever is actually present.",
  cslb:
    "CSLB (California contractor license board) search results, one business per line, columns in order: license number, business name, street address, city, zip, phone. There is never an email or trade/category per row in this data. Put the license number in licenseNumber, the city in a note if you can't find a dedicated field for it (there isn't one on this schema — leave it out), and the phone in phone.",
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set." }),
        { status: 500 },
      );
    }

    const authorizationHeader = request.headers.get("authorization");
    const token = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length).trim()
      : null;
    const payload = token ? decodeJwtPayload(token) : null;
    const role = typeof payload?.role === "string" ? payload.role : null;
    if (role !== "admin" && role !== "platform_admin") {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
    const ipKey = forwardedFor.split(",")[0]?.trim() || "unknown";
    const limiter = await checkRateLimit({
      namespace: "leads-parse",
      key: ipKey,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
    });
    if (!limiter.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", details: `Retry in ${limiter.retryAfter}s.` }),
        { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } },
      );
    }

    const { source, rawText } = RequestSchema.parse(await request.json());

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timed out after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS);
    });

    const completion = await Promise.race([
      client.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You extract structured business-lead records from raw copy-pasted text for a cold-outreach tool. Never fabricate a field you cannot see in the text — leave it as an empty string (or null for rating/reviewCount). " +
              SOURCE_GUIDANCE[source],
          },
          { role: "user", content: rawText },
        ],
        max_completion_tokens: 3000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "parsed_leads",
            schema: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      businessName: { type: "string" },
                      contactName: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      websiteUrl: { type: "string" },
                      licenseNumber: { type: "string" },
                      rating: { type: ["number", "null"] },
                      reviewCount: { type: ["number", "null"] },
                      notes: { type: "string" },
                    },
                    required: [
                      "businessName",
                      "contactName",
                      "email",
                      "phone",
                      "websiteUrl",
                      "licenseNumber",
                      "rating",
                      "reviewCount",
                      "notes",
                    ],
                  },
                },
              },
              required: ["leads"],
            },
          },
        },
      }),
      timeoutPromise,
    ]);

    const content = completion.choices[0]?.message?.content || '{"leads":[]}';
    const parsed = ParsedLeads.parse(JSON.parse(content));

    return new Response(JSON.stringify(parsed), { status: 200 });
  } catch (error) {
    console.error("[leads/parse] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = error instanceof Error && /timed out/i.test(error.message);
    return new Response(
      JSON.stringify({ error: isTimeout ? "AI gateway timeout" : "Internal server error", details: message }),
      { status: isTimeout ? 504 : 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors attributable to this file.

- [ ] **Step 3: Manual exercise**

With the dev server running (`npm run dev`) and a valid admin JWT:

```bash
curl -X POST http://localhost:3000/api/leads/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"source":"cslb","rawText":"1040735    MORALES ELECTRICAL SERVICES INC    2037 BROWNING BLVD    LOS ANGELES    90062    (213) 804-7170"}'
```

Expected: `200` with `leads: [{ businessName: "MORALES ELECTRICAL SERVICES INC", licenseNumber: "1040735", phone: "(213) 804-7170", email: "", ... }]`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/leads/parse/route.ts
git commit -m "feat: add AI lead-parsing endpoint for cold outreach capture"
```

---

### Task 6: Send endpoint + api-client methods (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/app/api/email/lead-outreach/route.ts`
- Modify: `src/lib/api-client.ts`

**Interfaces:**
- Consumes: `complianceFooter` (Task 4 — the send route appends it server-side right before calling Resend, so the client's editable `body` can never omit it); `getResendClient` from `@/lib/resend-client`; backend `GET /api/outreach-leads/:id` and `POST /api/outreach-leads/:id/touches` (Task 2/3).
- Produces: `POST /api/email/lead-outreach` — request `{ leadId, to, subject, body, source, tier }` where `body` is the editable message only (no footer), response `200 { id: string }` on success, `409` if the backend gate rejects the send. `apiClient.getOutreachLeads(filters?)`, `apiClient.getOutreachLead(id)`, `apiClient.createOutreachLeads(leads)`, `apiClient.updateOutreachLead(id, patch)`, `apiClient.logOutreachTouch(id, touch)`, `apiClient.getOutreachLeadTouches(id)`, `apiClient.sendLeadOutreachEmail(payload)` — Tasks 7-9 (UI) call all of these.

- [ ] **Step 1: Write the send route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getResendClient } from "@/lib/resend-client";
import { getApiBaseUrl } from "@/lib/api";
import { complianceFooter } from "@/lib/outreach-templates";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "RD TechBridge <noreply@rdtechbridge.com>";
const BACKEND_API_BASE = getApiBaseUrl();

const RequestSchema = z.object({
  leadId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  source: z.string().min(1),
  tier: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const authorizationHeader = req.headers.get("authorization");
  if (!authorizationHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { leadId, to, subject, body: emailBody, source, tier } = parsed.data;

  // Gate check: re-fetch the lead's current status right before sending.
  // This is the real safety check — creation-time flagging (backend-rc
  // Task 2) can be stale if the lead was captured before it matched an
  // existing tenant/prospect.
  const leadResponse = await fetch(`${BACKEND_API_BASE}/outreach-leads/${leadId}`, {
    headers: { Authorization: authorizationHeader },
    cache: "no-store",
  });
  if (!leadResponse.ok) {
    return NextResponse.json({ error: "Could not verify lead status" }, { status: 502 });
  }
  const lead = await leadResponse.json();
  if (lead.status === "do_not_contact") {
    return NextResponse.json(
      { error: "This lead is flagged do_not_contact and cannot be emailed", code: "LEAD_DO_NOT_CONTACT" },
      { status: 409 },
    );
  }

  // The compliance footer is appended here, server-side, unconditionally —
  // never trust the client's editable `emailBody` to include it, since the
  // composer UI (Task 9) intentionally lets the sender edit everything else.
  let footer: string;
  try {
    footer = complianceFooter();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Compliance footer not configured" },
      { status: 500 },
    );
  }

  const { data, error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    text: `${emailBody}${footer}`,
  });
  if (error) {
    console.error("[email/lead-outreach] Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 });
  }

  const touchResponse = await fetch(`${BACKEND_API_BASE}/outreach-leads/${leadId}/touches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorizationHeader },
    body: JSON.stringify({
      channel: "email",
      templateOpener: source,
      templateTier: tier,
      resendMessageId: data?.id,
    }),
  });
  if (!touchResponse.ok) {
    console.error("[email/lead-outreach] failed to log touch after successful send", await touchResponse.text());
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
```

- [ ] **Step 2: Add api-client methods**

In `src/lib/api-client.ts`, add this block right before the closing `}` of the `ApiClient` class (after the existing `// ─── AI Lead Agent ───` section):

```ts
  // ─── Outreach Leads (cold-outreach tracker) ──────────────────────────────────

  async getOutreachLeads(params?: { status?: string; source?: string; tier?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.source) qs.set('source', params.source);
    if (params?.tier) qs.set('tier', params.tier);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.get(`/outreach-leads${query}`);
  }

  async getOutreachLead(id: string) {
    return this.get(`/outreach-leads/${id}`);
  }

  async createOutreachLeads(leads: Record<string, unknown>[]) {
    return this.post(`/outreach-leads`, { leads });
  }

  async updateOutreachLead(id: string, patch: Record<string, unknown>) {
    return this.patch(`/outreach-leads/${id}`, patch);
  }

  async logOutreachTouch(
    id: string,
    touch: { channel: 'call' | 'text'; outcomeNotes: string },
  ) {
    return this.post(`/outreach-leads/${id}/touches`, touch);
  }

  async getOutreachLeadTouches(id: string) {
    return this.get(`/outreach-leads/${id}/touches`);
  }

  async sendLeadOutreachEmail(payload: {
    leadId: string;
    to: string;
    subject: string;
    body: string;
    source: string;
    tier: string;
  }): Promise<{ id: string }> {
    const response = await fetch('/api/email/lead-outreach', {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual exercise**

With the dev server running and a lead at `status: "ready_to_send"` (its `id` as `$LEAD_ID`) with a valid `to` address you control:

```bash
curl -X POST http://localhost:3000/api/email/lead-outreach \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d "{\"leadId\":\"$LEAD_ID\",\"to\":\"you@example.com\",\"subject\":\"Quick idea for Test Painting Co\",\"body\":\"Hi there,\n\nTest message.\",\"source\":\"google_maps\",\"tier\":\"small\"}"
```

Expected: `200 { id: "<resend message id>" }`. Then `GET /api/outreach-leads/$LEAD_ID` via `curl` (backend) and confirm `status` is now `contacted`. Then set the lead's status to `do_not_contact` via `PATCH` and repeat the send — expected `409 LEAD_DO_NOT_CONTACT`, and confirm via Resend's dashboard (or logs) that no second email actually went out.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/email/lead-outreach/route.ts src/lib/api-client.ts
git commit -m "feat: add cold outreach send endpoint with pre-send do-not-contact gate"
```

---

### Task 7: Leads tracker page — list + filters (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/app/(admin)/(others-pages)/leads/page.tsx`
- Modify: `src/layout/AppSidebar.tsx`

**Interfaces:**
- Consumes: `apiClient.getSession`, `apiClient.getOutreachLeads` (Task 6).
- Produces: the `LeadsPage` component and its `OutreachLead` type — Tasks 8 and 9 add the capture modal and row-action modals into this same file/page.

- [ ] **Step 1: Write the page**

```tsx
"use client";
import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import { apiClient } from "@/lib/api-client";

export interface OutreachLead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  license_number: string | null;
  source: string;
  trade: string | null;
  city: string | null;
  tier: string;
  rating: number | null;
  review_count: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "needs_email_lookup", label: "Needs email lookup" },
  { value: "ready_to_send", label: "Ready to send" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "not_interested", label: "Not interested" },
  { value: "converted", label: "Converted" },
  { value: "do_not_contact", label: "Do not contact" },
];

const SOURCE_OPTIONS = [
  { value: "google_maps", label: "Google Maps" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "craigslist", label: "Craigslist" },
  { value: "cslb", label: "CSLB" },
];

const TIER_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

export default function LeadsPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [actionLead, setActionLead] = useState<OutreachLead | null>(null);

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    setListError(null);
    try {
      const response = await apiClient.getOutreachLeads({
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        tier: tierFilter || undefined,
      });
      setLeads(Array.isArray(response) ? (response as OutreachLead[]) : []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const user = await apiClient.getSession();
        const role = user?.role;
        if (role === "admin" || role === "platform_admin") {
          setIsAuthorized(true);
        }
      } finally {
        setLoadingSession(false);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      loadLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, statusFilter, sourceFilter, tierFilter]);

  if (loadingSession) {
    return <div className="text-sm text-gray-500 dark:text-gray-300">Loading leads...</div>;
  }

  if (!isAuthorized) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Leads" />
        <ComponentCard title="Access Restricted" desc="Only admin roles can view the leads tracker.">
          <p className="text-sm text-red-600 dark:text-red-400">You do not have permission to view this page.</p>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Leads" />
      <ComponentCard title="Cold Outreach Leads" desc="Capture, track, and follow up on cold outreach leads.">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Select options={STATUS_OPTIONS} placeholder="All statuses" onChange={setStatusFilter} />
          </div>
          <div className="w-48">
            <Select options={SOURCE_OPTIONS} placeholder="All sources" onChange={setSourceFilter} />
          </div>
          <div className="w-40">
            <Select options={TIER_OPTIONS} placeholder="All tiers" onChange={setTierFilter} />
          </div>
          <Button onClick={() => setIsCaptureOpen(true)}>Capture leads</Button>
        </div>

        {listError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{listError}</p>}
        {isLoadingLeads && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2 pr-4">Business</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Rating</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4">{lead.business_name}</td>
                  <td className="py-2 pr-4">
                    {lead.email || lead.phone || "—"}
                  </td>
                  <td className="py-2 pr-4">{lead.source}</td>
                  <td className="py-2 pr-4">{lead.tier}</td>
                  <td className="py-2 pr-4">{lead.status}</td>
                  <td className="py-2 pr-4">
                    {lead.rating ? `${lead.rating} (${lead.review_count ?? 0})` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Button size="sm" variant="outline" onClick={() => setActionLead(lead)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !isLoadingLeads && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No leads yet. Click &quot;Capture leads&quot; to add some.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ComponentCard>
      {/* Task 8 wires isCaptureOpen/setIsCaptureOpen/loadLeads into a capture modal here. */}
      {/* Task 9 wires actionLead/setActionLead/loadLeads into row-action modals here. */}
    </div>
  );
}
```

- [ ] **Step 2: Add the nav entry**

In `src/layout/AppSidebar.tsx`, add this object into the same nav array as the existing `"Tenants"` entry, right after it:

```tsx
  {
    icon: <ListIcon />,
    name: "Leads",
    path: "/leads",
    requiredRoles: ["admin", "platform_admin"],
  },
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (`isCaptureOpen`/`setIsCaptureOpen` and `actionLead`/`setActionLead` are used only in the comments right now, not real JSX — Tasks 8/9 consume them. If `tsc`/`eslint` flags them as unused before then, that's expected and resolves once Tasks 8/9 land; don't suppress it, just proceed — this task's own verification is that the page renders and lists leads, below.)

- [ ] **Step 4: Manual verification**

Run the dev server, sign in as an admin, navigate to `/leads`. Expected: page loads, "Leads" appears in the sidebar nav, the status/source/tier filters are present, and any leads created in earlier tasks' curl tests appear in the table.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/(others-pages)/leads/page.tsx" src/layout/AppSidebar.tsx
git commit -m "feat: add leads tracker page with filters"
```

---

### Task 8: Capture modal — paste, parse, preview, save (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/components/leads/LeadCaptureModal.tsx`
- Modify: `src/app/(admin)/(others-pages)/leads/page.tsx`

**Interfaces:**
- Consumes: `apiClient.createOutreachLeads` (Task 6), the `/api/leads/parse` endpoint (Task 5, called directly via `fetch` with the stored auth token since it's not wrapped in `apiClient`), `OutreachLead` type (Task 7).
- Produces: `LeadCaptureModal` component with props `{ isOpen: boolean; onClose: () => void; onSaved: () => void }` — Task 7's page (already scaffolded with `isCaptureOpen`/`setIsCaptureOpen`) renders it.

- [ ] **Step 1: Write the capture modal**

```tsx
"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import { apiClient } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth-context";

const SOURCE_OPTIONS = [
  { value: "google_maps", label: "Google Maps" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "craigslist", label: "Craigslist" },
  { value: "cslb", label: "CSLB" },
];

const TIER_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

interface DraftLead {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  websiteUrl: string;
  licenseNumber: string;
  rating: number | null;
  reviewCount: number | null;
  notes: string;
}

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function LeadCaptureModal({ isOpen, onClose, onSaved }: LeadCaptureModalProps) {
  const [source, setSource] = useState("google_maps");
  const [tier, setTier] = useState("small");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [rawText, setRawText] = useState("");
  const [drafts, setDrafts] = useState<DraftLead[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setRawText("");
    setDrafts([]);
    setError(null);
  };

  const handleParse = async () => {
    setIsParsing(true);
    setError(null);
    try {
      const token = getStoredAuthToken();
      const response = await fetch("/api/leads/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ source, rawText }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to parse text");
      }
      setDrafts(data.leads as DraftLead[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse text");
    } finally {
      setIsParsing(false);
    }
  };

  const updateDraft = (index: number, patch: Partial<DraftLead>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (drafts.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.createOutreachLeads(
        drafts.map((d) => ({
          businessName: d.businessName,
          contactName: d.contactName || undefined,
          email: d.email || undefined,
          phone: d.phone || undefined,
          websiteUrl: d.websiteUrl || undefined,
          licenseNumber: d.licenseNumber || undefined,
          source,
          trade: trade || undefined,
          city: city || undefined,
          tier,
          rating: d.rating ?? undefined,
          reviewCount: d.reviewCount ?? undefined,
          notes: d.notes || undefined,
          rawSourceText: rawText,
        })),
      );
      reset();
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save leads");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Capture leads</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Source</Label>
          <Select options={SOURCE_OPTIONS} defaultValue={source} onChange={setSource} />
        </div>
        <div>
          <Label>Tier</Label>
          <Select options={TIER_OPTIONS} defaultValue={tier} onChange={setTier} />
        </div>
        <div>
          <Label>Trade</Label>
          <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Electrical" />
        </div>
      </div>

      <div className="mt-4">
        <Label>City</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Los Angeles" />
      </div>

      <div className="mt-4">
        <Label>Pasted text</Label>
        <TextArea rows={8} value={rawText} onChange={setRawText} placeholder="Paste the copied listing(s) here" />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleParse} disabled={isParsing || !rawText.trim()}>
          {isParsing ? "Parsing..." : "Parse"}
        </Button>
      </div>

      {drafts.length > 0 && (
        <div className="mt-6 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2 pr-2">Business</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft, index) => {
                // In-batch duplicate flag: Google Maps result pages can list the
                // same business twice in one paste. Compares against every other
                // row's businessName (case/whitespace-insensitive), not just
                // adjacent rows.
                const isDuplicate = drafts.some(
                  (other, otherIndex) =>
                    otherIndex !== index &&
                    other.businessName.trim().toLowerCase() === draft.businessName.trim().toLowerCase() &&
                    draft.businessName.trim() !== "",
                );
                return (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      isDuplicate ? "bg-yellow-50 dark:bg-yellow-500/10" : ""
                    }`}
                  >
                    <td className="py-1 pr-2">
                      <Input
                        value={draft.businessName}
                        onChange={(e) => updateDraft(index, { businessName: e.target.value })}
                      />
                      {isDuplicate && (
                        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-500">
                          Looks like a duplicate of another row below — remove one.
                        </p>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <Input value={draft.email} onChange={(e) => updateDraft(index, { email: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input value={draft.phone} onChange={(e) => updateDraft(index, { phone: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <Button size="sm" variant="outline" onClick={() => removeDraft(index)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || drafts.length === 0}>
          {isSaving ? "Saving..." : `Save ${drafts.length} lead${drafts.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Wire the modal into the leads page**

In `src/app/(admin)/(others-pages)/leads/page.tsx`, add the import at the top:

```tsx
import LeadCaptureModal from "@/components/leads/LeadCaptureModal";
```

Replace the line `{/* Task 8 wires isCaptureOpen/setIsCaptureOpen/loadLeads into a capture modal here. */}` with:

```tsx
      <LeadCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onSaved={loadLeads}
      />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

On `/leads`, click "Capture leads", select source `cslb`, paste one CSLB line (e.g. `1040735    MORALES ELECTRICAL SERVICES INC    2037 BROWNING BLVD    LOS ANGELES    90062    (213) 804-7170`), click Parse. Expected: one editable draft row appears with the business name, license number folded into notes or a visible field, and phone populated, email blank. Edit a field, click Save. Expected: modal closes, the lead appears in the tracker table with `status: needs_email_lookup`.

- [ ] **Step 5: Commit**

```bash
git add src/components/leads/LeadCaptureModal.tsx "src/app/(admin)/(others-pages)/leads/page.tsx"
git commit -m "feat: add lead capture modal with paste-and-parse preview"
```

---

### Task 9: Row actions — send email, log call/text, update status (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/components/leads/LeadActionsModal.tsx`
- Modify: `src/app/(admin)/(others-pages)/leads/page.tsx`

**Interfaces:**
- Consumes: `buildOutreachEmail` (Task 4), `apiClient.sendLeadOutreachEmail`, `apiClient.logOutreachTouch`, `apiClient.updateOutreachLead`, `apiClient.getOutreachLeadTouches` (Task 6), `OutreachLead` type (Task 7).
- Produces: `LeadActionsModal` component with props `{ lead: OutreachLead; onClose: () => void; onUpdated: () => void }`.

- [ ] **Step 1: Write the actions modal**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import { apiClient } from "@/lib/api-client";
import { buildOutreachEmail, type LeadSource, type LeadTier } from "@/lib/outreach-templates";
import type { OutreachLead } from "@/app/(admin)/(others-pages)/leads/page";

interface LeadActionsModalProps {
  lead: OutreachLead;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = [
  { value: "responded", label: "Responded" },
  { value: "not_interested", label: "Not interested" },
  { value: "converted", label: "Converted" },
  { value: "do_not_contact", label: "Do not contact" },
];

export default function LeadActionsModal({ lead, onClose, onUpdated }: LeadActionsModalProps) {
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [callChannel, setCallChannel] = useState<"call" | "text">("call");
  const [isLogging, setIsLogging] = useState(false);
  const [statusChoice, setStatusChoice] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = buildOutreachEmail({
      source: lead.source as LeadSource,
      tier: lead.tier as LeadTier,
      businessName: lead.business_name,
      contactName: lead.contact_name,
      city: lead.city,
      trade: lead.trade,
      rating: lead.rating,
      reviewCount: lead.review_count,
      senderName: "Cesar",
    });
    setSubject(draft.subject);
    setEmailBody(draft.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const handleSend = async () => {
    if (!lead.email) return;
    setIsSending(true);
    setError(null);
    try {
      await apiClient.sendLeadOutreachEmail({
        leadId: lead.id,
        to: lead.email,
        subject,
        body: emailBody,
        source: lead.source,
        tier: lead.tier,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const handleLogTouch = async () => {
    if (!callNotes.trim()) return;
    setIsLogging(true);
    setError(null);
    try {
      await apiClient.logOutreachTouch(lead.id, { channel: callChannel, outcomeNotes: callNotes });
      setCallNotes("");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log touch");
    } finally {
      setIsLogging(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusChoice) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await apiClient.updateOutreachLead(lead.id, { status: statusChoice });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-2xl p-6">
      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">{lead.business_name}</h3>
      <p className="mb-4 text-sm text-gray-500">Status: {lead.status}</p>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {lead.status === "do_not_contact" ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          This lead is flagged do not contact and cannot be emailed.
        </p>
      ) : lead.email ? (
        <div className="mb-6">
          <Label>Subject</Label>
          <input
            className="mb-3 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Label>Body</Label>
          <TextArea rows={8} value={emailBody} onChange={setEmailBody} />
          <p className="mt-2 text-xs text-gray-400">
            A mailing address and opt-out line are appended automatically before sending — not shown here, not editable.
          </p>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? "Sending..." : `Send to ${lead.email}`}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-500">
          No email on file yet — look one up (e.g. via the listed website) and add it via status update below before you can send.
        </p>
      )}

      <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Log a call or text</Label>
        <div className="flex gap-3">
          <div className="w-32">
            <Select
              options={[
                { value: "call", label: "Call" },
                { value: "text", label: "Text" },
              ]}
              defaultValue={callChannel}
              onChange={(v) => setCallChannel(v as "call" | "text")}
            />
          </div>
          <div className="flex-1">
            <TextArea rows={2} value={callNotes} onChange={setCallNotes} placeholder="Outcome notes" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={handleLogTouch} disabled={isLogging || !callNotes.trim()}>
            {isLogging ? "Logging..." : "Log"}
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Update status</Label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Select options={STATUS_OPTIONS} onChange={setStatusChoice} />
          </div>
          <Button variant="outline" onClick={handleStatusUpdate} disabled={isUpdatingStatus || !statusChoice}>
            {isUpdatingStatus ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Wire the modal into the leads page**

In `src/app/(admin)/(others-pages)/leads/page.tsx`, add the import:

```tsx
import LeadActionsModal from "@/components/leads/LeadActionsModal";
```

Replace `{/* Task 9 wires actionLead/setActionLead/loadLeads into row-action modals here. */}` with:

```tsx
      {actionLead && (
        <LeadActionsModal
          lead={actionLead}
          onClose={() => setActionLead(null)}
          onUpdated={loadLeads}
        />
      )}
```

Also export the `OutreachLead` type from this file if it isn't already exported (it is, from Task 7's `export interface OutreachLead`) so `LeadActionsModal`'s import resolves.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in `src/components/leads/` or `src/app/(admin)/(others-pages)/leads/`.

- [ ] **Step 4: Manual verification**

On `/leads`, click "Manage" on a lead with an email. Expected: subject/body are pre-filled from `buildOutreachEmail` and editable; clicking Send calls the send endpoint and the lead's status updates to `contacted` in the table after the modal closes. On a lead without an email, expected: the send form is replaced with the "look one up" message and only the call/text/status sections are usable. Log a call, confirm the modal stays open and the tracker list (after closing) shows the updated status/last-touch info.

- [ ] **Step 5: Commit**

```bash
git add src/components/leads/LeadActionsModal.tsx "src/app/(admin)/(others-pages)/leads/page.tsx"
git commit -m "feat: add lead send/call/status row actions"
```
