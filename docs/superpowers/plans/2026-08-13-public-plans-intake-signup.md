# Public Plans Page — Intake-First Self-Serve Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a public website visitor pick a plan on a new `/plans` page, submit a short form, and immediately (no payment) get a prospect tenant created and the intake questionnaire emailed to them — closing the gap where only an admin can currently trigger that email.

**Architecture:** A new unauthenticated backend-rc route creates the prospect tenant (reusing extracted tenant/owner-creation logic shared with the existing admin route, but skipping Stripe entirely). A new admin-dashboard-rc API route calls it, then sends the intake email in-process via the existing `sendIntakeEmail`. A new public page and Navbar link expose this to visitors. Everything downstream (questionnaire, calendar booking, post-call Stripe invite) is existing, unchanged infrastructure.

**Tech Stack:** Next.js API routes + React (admin-dashboard-rc), Express + `pg` (backend-rc), Zod validation, existing Resend email integration.

**Spec:** `docs/superpowers/specs/2026-08-13-public-plans-intake-signup-design.md`

## Global Constraints

- Two repos involved. Tasks 1-2 run in `backend-rc` at `C:\Users\cesar\Code\backend-rc`. Tasks 3-5 run in `admin-dashboard-rc` at `C:\Users\cesar\Code\admin-dashboard-rc`. Each task's Files section states which repo root its paths are relative to.
- No test runner in either repo. Verification is `npx tsc --noEmit` (admin-dashboard-rc only — backend-rc is plain JS) plus manual curl/browser checks, matching the pattern already used by this codebase's other plans (e.g. `docs/superpowers/plans/2026-07-31-google-calendar-kickoff-booking.md`).
- Public signup always uses `businessType = "lead_gen_services"` — no business-type picker on the form.
- No Stripe interaction anywhere in this feature. Payment happens later via the existing, untouched `POST /api/billing/invite` flow.
- Public-facing routes (`/api/public/signup`, `POST /tenant-prospects/public`) must never let an HTTP status code or response shape reveal whether an email address was already known to the system.
- `PricingSection.tsx` (Task 5) is currently commented out of `src/app/page.tsx` (`{/* <PricingSection /> */}`) — it renders nowhere today. Task 5's changes to it are for consistency (so it doesn't reintroduce the old pay-first flow if ever re-enabled), not a live UX change.

---

### Task 1: Extract shared tenant/owner-creation helper (backend-rc)

**Repo root:** `C:\Users\cesar\Code\backend-rc`

**Files:**
- Modify: `lib/tenantHelpers.js`
- Modify: `routes/tenantProspects.js:31-256` (the `POST /` handler)

**Interfaces:**
- Produces: `createProspectTenantAndOwner(client, { businessName, ownerName, ownerEmail, ownerPhone, businessType, planKey, seatLimit, invitedByAdminId })` → `Promise<{ tenant: object | null, ownerUser: object | null, duplicate: "prospect" | "user" | null, existingTenantId: number | null }>`. Exported from `lib/tenantHelpers.js`. Used by Task 1's own refactor and by Task 2.

This is a pure refactor — the admin route's external behavior (request/response shape, status codes, error codes) must not change. It only moves the SQL that already exists at `routes/tenantProspects.js:93-186` into a reusable function.

- [ ] **Step 1: Add the helper to `lib/tenantHelpers.js`**

Add near the bottom of the file, just before the `module.exports` block. Needs `crypto` and `bcryptjs` — `tenantHelpers.js` doesn't currently import either, so add both requires at the top of the file alongside the existing ones:

```js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
```

Then add the function itself (place it right after `upsertInviteTracking`, before `module.exports`):

```js
const createProspectTenantAndOwner = async (
  client,
  { businessName, ownerName, ownerEmail, ownerPhone, businessType, planKey, seatLimit, invitedByAdminId },
) => {
  const normalizedEmail = normalizeEmail(ownerEmail);

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
    return {
      tenant: null,
      ownerUser: null,
      duplicate: "prospect",
      existingTenantId: existingProspect.rows[0].id,
    };
  }

  const existingUser = await client.query(
    'SELECT id FROM public."user" WHERE email = $1 LIMIT 1',
    [normalizedEmail],
  );
  if (existingUser.rows.length > 0) {
    return { tenant: null, ownerUser: null, duplicate: "user", existingTenantId: null };
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
    [slug, businessName.trim(), businessType, planKey, seatLimit ?? 1, invitedByAdminId ?? null],
  );
  const tenant = tenantResult.rows[0];

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
    [ownerName.trim(), normalizedEmail, hashedPassword, "tenant_owner", tenant.id, ownerPhone || null],
  );
  const ownerUser = ownerResult.rows[0];

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

  return { tenant, ownerUser, duplicate: null, existingTenantId: null };
};
```

Add `createProspectTenantAndOwner` to the `module.exports` block at the end of the file.

- [ ] **Step 2: Refactor `routes/tenantProspects.js`'s `POST /` handler to use the helper**

Replace the block from the `const client = await pool.connect();` line through the `client.release();` line (currently `routes/tenantProspects.js:83-193`) with:

```js
    const client = await pool.connect();
    let created;

    try {
      await client.query("BEGIN");

      created = await createProspectTenantAndOwner(client, {
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone,
        businessType: normalizedBusinessType,
        planKey: plan.plan_key,
        seatLimit: plan.default_seat_limit ?? 1,
        invitedByAdminId: req.auth?.id ?? null,
      });

      if (created.duplicate === "prospect") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "A prospect with this email already exists",
          code: "PROSPECT_EMAIL_IN_USE",
          tenantId: created.existingTenantId,
        });
      }
      if (created.duplicate === "user") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Owner email is already in use",
          code: "OWNER_EMAIL_IN_USE",
        });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const { tenant, ownerUser } = created;
```

This is identical in behavior to the code it replaces — same duplicate checks, same 409 responses, same transaction shape. Everything after this block (the Stripe Checkout Session creation starting at the `// Stripe session creation happens outside the DB transaction.` comment) stays exactly as-is; it already refers to `tenant` and `ownerUser`, which the replacement block still defines.

Add `createProspectTenantAndOwner` to the destructured `require("../lib/tenantHelpers")` import list at the top of `routes/tenantProspects.js` (it currently imports `BUSINESS_TYPES`, `normalizeEmail`, `slugify`, `ensureUniqueSlug`, `requireAdminRole`, `syncManagedModulesAndFeatures`, `normalizeTenantFeatureToggles`, `resolveRequestedModules`, `normalizeDomain`).

- [ ] **Step 3: Regression-check the admin route still behaves identically**

Run: `cd backend-rc && node -e "require('./routes/tenantProspects.js')"` to confirm the file still loads without syntax/reference errors.

With a local backend-rc dev server running (`npm run dev` or equivalent) and a valid admin JWT, run the same request this route already supported before the refactor:

```bash
curl -X POST http://localhost:5000/api/tenant-prospects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"businessName":"Regression Test Co","ownerName":"Test Owner","ownerEmail":"regression-test@example.com","planKey":"starter"}'
```

Expected: `201` with `{ tenant, ownerUser, checkoutUrl }`, same shape as before. Re-run the same command a second time and confirm it now returns `409 PROSPECT_EMAIL_IN_USE` with the `tenantId` from the first call.

- [ ] **Step 4: Commit**

```bash
cd backend-rc
git add lib/tenantHelpers.js routes/tenantProspects.js
git commit -m "refactor: extract createProspectTenantAndOwner shared helper"
```

---

### Task 2: Public tenant-creation route + internal failure-logging route (backend-rc)

**Repo root:** `C:\Users\cesar\Code\backend-rc`

**Files:**
- Modify: `routes/tenantProspects.js`

**Interfaces:**
- Consumes: `createProspectTenantAndOwner` (Task 1).
- Produces: `POST /api/tenant-prospects/public` → `201 { tenantId: number | null, businessName: string, ownerEmail: string }`; `POST /api/tenant-prospects/:tenantId/signup-email-failed` (internal-only, `x-internal-key` header) → `204`.

This adds two new routes to the existing `tenantProspects.js` router rather than a new file/mount. The router already applies auth per-route (not globally — see the existing mix of `authMiddleware`-guarded and `requireInternalKey`-guarded routes in this same file), so a new unauthenticated route here is no less visible than a separate file would be, and avoids a real footgun: mounting a second `app.use("/api/tenant-prospects/public", ...)` alongside the existing `app.use("/api/tenant-prospects", tenantProspectsRoutes)` in `server.js` would create two overlapping path-prefix mounts, which is fragile and unnecessary here.

- [ ] **Step 1: Add the public signup route**

Add this immediately after the closing `);` of the existing `POST /` handler (i.e. right before the `const requireInternalKey = ...` block, `routes/tenantProspects.js:258` after Task 1's refactor):

```js
// ─────────────────────────────────────────────────────────────────────────────
// POST /public — PUBLIC, NO AUTH.
// Called by admin-dashboard-rc's /api/public/signup route when a visitor
// submits the public /plans page. Creates a prospect tenant with no Stripe
// session — payment is collected later via POST /api/billing/invite after a
// kickoff call. Never reveals whether ownerEmail was already known: an
// existing prospect's real tenant is returned (so the caller resends the
// intake email); any other existing account returns tenantId: null (so the
// caller sends nothing). Both cases return 201 with the same response shape.
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/public",
  asyncHandler(async (req, res) => {
    const { businessName, ownerName, ownerEmail, planKey } = req.body ?? {};

    if (!businessName || !ownerName || !ownerEmail || !planKey) {
      return res.status(400).json({
        error: "businessName, ownerName, ownerEmail, and planKey are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }
    if (typeof ownerEmail !== "string" || !EMAIL_RE.test(ownerEmail)) {
      return res.status(400).json({ error: "A valid ownerEmail is required", code: "INVALID_EMAIL" });
    }

    const planResult = await pool.query(
      `SELECT plan_key, default_seat_limit
       FROM public.plans
       WHERE plan_key = $1 AND is_active = true
       LIMIT 1`,
      [planKey],
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found", code: "PLAN_NOT_FOUND" });
    }
    const plan = planResult.rows[0];

    const client = await pool.connect();
    let created;
    try {
      await client.query("BEGIN");
      created = await createProspectTenantAndOwner(client, {
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone: null,
        businessType: "lead_gen_services",
        planKey: plan.plan_key,
        seatLimit: plan.default_seat_limit ?? 1,
        invitedByAdminId: null,
      });

      if (created.duplicate === "user") {
        await client.query("ROLLBACK");
        return res.status(201).json({
          tenantId: null,
          businessName,
          ownerEmail: normalizeEmail(ownerEmail),
        });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const tenantId =
      created.duplicate === "prospect" ? created.existingTenantId : created.tenant.id;

    return res.status(201).json({
      tenantId,
      businessName,
      ownerEmail: normalizeEmail(ownerEmail),
    });
  }),
);
```

- [ ] **Step 2: Add the internal failure-logging route**

Add this after the existing `GET /:tenantId/modules` handler (after `routes/tenantProspects.js`'s modules route, before `POST /:tenantId/activate`):

```js
// Called by admin-dashboard-rc's /api/public/signup route when sendIntakeEmail
// throws after a public signup created (or resolved) a tenant, so the
// failure is visible in the admin dashboard instead of only a server log line.
router.post(
  "/:tenantId/signup-email-failed",
  requireInternalKey,
  asyncHandler(async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(400).json({ error: "Invalid tenant id" });
    }
    const { email } = req.body ?? {};

    await pool.query(
      `INSERT INTO public.billing_events
         (tenant_id, event_type, status, payload, processed_at)
       VALUES ($1, 'platform.public_signup.intake_email_failed', 'error', $2::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, JSON.stringify({ email: email || null })],
    );

    return res.status(204).end();
  }),
);
```

- [ ] **Step 3: Verify with curl**

With backend-rc's dev server running:

```bash
# Fresh signup — expect 201 with a real tenantId
curl -X POST http://localhost:5000/api/tenant-prospects/public \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Public Signup Test","ownerName":"Jane Prospect","ownerEmail":"public-signup-test@example.com","planKey":"starter"}'

# Same email again — expect 201 with the SAME tenantId (resend case, not a new tenant)
curl -X POST http://localhost:5000/api/tenant-prospects/public \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Public Signup Test","ownerName":"Jane Prospect","ownerEmail":"public-signup-test@example.com","planKey":"starter"}'

# Bad plan_key — expect 404 PLAN_NOT_FOUND
curl -X POST http://localhost:5000/api/tenant-prospects/public \
  -H "Content-Type: application/json" \
  -d '{"businessName":"X","ownerName":"Y","ownerEmail":"z@example.com","planKey":"not-a-real-plan"}'

# Internal route without the key — expect 401
curl -X POST http://localhost:5000/api/tenant-prospects/1/signup-email-failed \
  -H "Content-Type: application/json" \
  -d '{"email":"z@example.com"}'

# Internal route with the key — expect 204 (use the tenantId from the first curl above, and the real INTERNAL_API_KEY value from backend-rc's .env)
curl -X POST http://localhost:5000/api/tenant-prospects/<tenantId>/signup-email-failed \
  -H "Content-Type: application/json" \
  -H "x-internal-key: $INTERNAL_API_KEY" \
  -d '{"email":"z@example.com"}'
```

- [ ] **Step 4: Commit**

```bash
cd backend-rc
git add routes/tenantProspects.js
git commit -m "feat: add public tenant-prospect signup and email-failure logging routes"
```

---

### Task 3: Public signup API route (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/app/api/public/signup/route.ts`

**Interfaces:**
- Consumes: `sendIntakeEmail` (`src/lib/email.ts`, existing); `getApiBaseUrl` (`src/lib/api.ts`, existing); `POST {API_BASE}/tenant-prospects/public` and `POST {API_BASE}/tenant-prospects/:tenantId/signup-email-failed` (Task 2).
- Produces: `POST /api/public/signup` → always `200 { ok: true }` on any non-malformed-JSON, non-validation-error input; `400` only for real input validation failures. Used by Task 4's `PlansSection`.

- [ ] **Step 1: Write the route**

```ts
// src/app/api/public/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendIntakeEmail } from "@/lib/email";
import { getApiBaseUrl } from "@/lib/api";

const schema = z.object({
  plan_key: z.string().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  business_name: z.string().trim().min(1),
  website_url: z.string().optional(),
});

async function logIntakeEmailFailure(tenantId: number, email: string) {
  const internalKey = process.env.INTERNAL_API_KEY;
  try {
    await fetch(`${getApiBaseUrl()}/tenant-prospects/${tenantId}/signup-email-failed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalKey ? { "x-internal-key": internalKey } : {}),
      },
      body: JSON.stringify({ email }),
    });
  } catch (notifyError) {
    console.error("[public/signup] Failed to log email failure:", notifyError);
  }
}

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

  const { plan_key, name, email, business_name, website_url } = parsed.data;

  // Honeypot: a real visitor never fills this hidden field. Absorb silently.
  if (website_url && website_url.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  let tenantId: number | null = null;
  try {
    const backendRes = await fetch(`${getApiBaseUrl()}/tenant-prospects/public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: business_name,
        ownerName: name,
        ownerEmail: email,
        planKey: plan_key,
      }),
    });

    if (!backendRes.ok) {
      console.error("[public/signup] tenant-prospects/public call failed:", backendRes.status);
      return NextResponse.json({ ok: true });
    }

    const backendBody = (await backendRes.json()) as { tenantId: number | null };
    tenantId = backendBody.tenantId;
  } catch (error) {
    console.error("[public/signup] Failed to reach backend:", error);
    return NextResponse.json({ ok: true });
  }

  // tenantId === null means an active non-prospect account already owns
  // this email (backend-rc's OWNER_EMAIL_IN_USE case) — send nothing.
  if (tenantId === null) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { error } = await sendIntakeEmail({
      to: email,
      firstName: name,
      tenantName: business_name,
      tenantId,
      businessType: "lead_gen_services",
    });
    if (error) {
      console.error("[public/signup] Resend error:", JSON.stringify(error));
      await logIntakeEmailFailure(tenantId, email);
    }
  } catch (error) {
    console.error("[public/signup] Failed to send intake email:", error);
    await logIntakeEmailFailure(tenantId, email);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in the new route.

- [ ] **Step 3: Manual verification against a running dev server**

With `npm run dev` running in admin-dashboard-rc and backend-rc's dev server also running (`NEXT_PUBLIC_API_URL` pointed at it):

```bash
# Fresh signup — expect 200 { "ok": true }, and confirm in backend-rc logs / DB
# that a prospect tenant now exists for this email and an intake email was sent.
curl -X POST http://localhost:3000/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{"plan_key":"starter","name":"Jane Prospect","email":"api-route-test@example.com","business_name":"API Route Test Co"}'

# Honeypot filled — expect 200 { "ok": true }, and confirm NO tenant was created for this email.
curl -X POST http://localhost:3000/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{"plan_key":"starter","name":"Bot","email":"bot-test@example.com","business_name":"Bot Co","website_url":"http://spam.example"}'

# Missing email — expect 400
curl -X POST http://localhost:3000/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{"plan_key":"starter","name":"No Email","business_name":"X"}'
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/public/signup/route.ts
git commit -m "feat: add public signup API route for intake-first plans page"
```

---

### Task 4: `PlansSection` component and `/plans` page (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Create: `src/components/landing/PlansSection.tsx`
- Create: `src/app/plans/page.tsx`

**Interfaces:**
- Consumes: `POST /api/public/signup` (Task 3); `Navbar`, `Footer` (`src/components/landing/`, existing, no props).
- Produces: `<PlansSection />` React component, used by this task's own page. Public route `/plans`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/landing/PlansSection.tsx
"use client";

import React, { useCallback, useState } from "react";

/* ────────────────────────────── Types ───────────────────────────── */

type PlanDef = {
  name: string;
  plan_key: string;
  price: number | null; // null = custom
  setupFee: string;
  commitment: string;
  seats: string;
  tagline: string;
  features: string[];
  popular: boolean;
  buttonText: string;
};

/* ────────────────────────────── Plan data ────────────────────────── */

const plans: PlanDef[] = [
  {
    name: "Starter",
    plan_key: "starter",
    price: 149,
    setupFee: "$299",
    commitment: "4-mo minimum",
    seats: "2 seats",
    tagline: "Core web presence",
    features: [
      "Website core + hosting",
      "SEO content basics",
      "Lead capture forms",
      "Basic metrics dashboard",
      "Custom domain",
    ],
    popular: false,
    buttonText: "Get Started",
  },
  {
    name: "Professional",
    plan_key: "professional",
    price: 349,
    setupFee: "$499",
    commitment: "4-mo minimum",
    seats: "5 seats",
    tagline: "Growth + local visibility",
    features: [
      "All Starter modules",
      "Calendar / appointments",
      "Google My Business mgmt",
      "Lead gen emails + SMS",
      "Advanced metrics",
      "LLM + Google ranking tools",
      "Custom pages",
    ],
    popular: true,
    buttonText: "Most Popular",
  },
  {
    name: "Business",
    plan_key: "business",
    price: 799,
    setupFee: "$999",
    commitment: "4-mo minimum",
    seats: "15 seats",
    tagline: "Full stack + ads + AI",
    features: [
      "All Professional modules",
      "Ecommerce + Stripe checkout",
      "Google Ads setup + mgmt",
      "Ad budget: client-controlled",
      "Custom AI agent",
      "Lead gen calls",
      "Priority support",
    ],
    popular: false,
    buttonText: "Go Business",
  },
  {
    name: "Enterprise",
    plan_key: "enterprise",
    price: null,
    setupFee: "Custom",
    commitment: "Terms negotiated",
    seats: "Unlimited seats",
    tagline: "Multi-location / high-volume",
    features: [
      "All Business modules",
      "Multi AI agents",
      "Google Ads — multi-campaign",
      "White-label option",
      "Dedicated account manager",
    ],
    popular: false,
    buttonText: "Contact Us",
  },
];

/* ────────────────────────────── Component ───────────────────────── */

const PlansSection = () => {
  const [modalPlan, setModalPlan] = useState<PlanDef | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBusiness, setFormBusiness] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const openModal = useCallback((plan: PlanDef) => {
    setModalPlan(plan);
    setFormName("");
    setFormEmail("");
    setFormBusiness("");
    setHoneypot("");
    setFormError("");
    setSubmitted(false);
  }, []);

  const closeModal = useCallback(() => {
    if (!submitting) setModalPlan(null);
  }, [submitting]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!modalPlan?.plan_key) return;

      const email = formEmail.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError("Please enter a valid email address.");
        return;
      }
      if (!formName.trim()) {
        setFormError("Please enter your name.");
        return;
      }
      if (!formBusiness.trim()) {
        setFormError("Please enter your business name.");
        return;
      }

      setSubmitting(true);
      setFormError("");

      try {
        const res = await fetch("/api/public/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_key: modalPlan.plan_key,
            name: formName.trim(),
            email,
            business_name: formBusiness.trim(),
            website_url: honeypot,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Something went wrong. Please try again.");
        }

        setSubmitted(true);
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    },
    [modalPlan, formName, formEmail, formBusiness, honeypot],
  );

  const handlePlanClick = useCallback(
    (plan: PlanDef) => {
      if (plan.plan_key !== "enterprise") {
        openModal(plan);
      } else {
        document.getElementById("plans-cta")?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [openModal],
  );

  return (
    <section id="plans" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Choose Your <span className="text-[#CD7F32]">Plan</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tell us about your business and we&apos;ll send you a short questionnaire,
            then get a kickoff call on the calendar — pricing is confirmed on that call.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 transform hover:-translate-y-2 flex flex-col ${
                plan.popular
                  ? "border-[#CD7F32] scale-[1.03]"
                  : "border-gray-200 hover:border-[#CD7F32]/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] text-white px-5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
                    Most popular
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{plan.tagline}</p>

                <div className="mb-4">
                  {plan.price !== null ? (
                    <>
                      <span className="block text-sm text-gray-500">Starting at</span>
                      <span className="text-4xl font-bold text-[#CD7F32]">${plan.price}</span>
                      <span className="text-gray-500 ml-1">/mo</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-[#CD7F32]">Custom</span>
                  )}
                </div>

                <div className="text-xs text-gray-500 space-y-0.5 mb-5">
                  <p>Setup: {plan.setupFee}</p>
                  <p>{plan.commitment}</p>
                  <p>{plan.seats}</p>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start">
                      <svg
                        className="w-4 h-4 text-[#C41E3A] mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanClick(plan)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] text-white hover:shadow-xl"
                      : "bg-gray-100 text-[#CD7F32] hover:bg-[#CD7F32] hover:text-white"
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div id="plans-cta" className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need a Custom Solution?</h3>
            <p className="text-lg text-gray-600 mb-6">
              Every business is unique. Let&apos;s discuss your specific needs and create a
              tailored solution that fits your goals and budget.
            </p>
            <a
              href="/#contact"
              className="inline-block bg-[#CD7F32] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#8B4513] transition-colors duration-300"
            >
              Schedule Consultation
            </a>
          </div>
        </div>
      </div>

      {modalPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>

            {submitted ? (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Check your email</h3>
                <p className="text-gray-500">
                  We&apos;ve sent a short questionnaire to <strong>{formEmail}</strong>. Complete
                  it and you&apos;ll be able to book a kickoff call — we&apos;ll go over pricing
                  then.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Get Started with {modalPlan.name}
                </h3>
                <p className="text-gray-500 mb-6">
                  Starting at ${modalPlan.price ?? "—"}/mo &mdash; Setup: {modalPlan.setupFee}
                  &mdash; {modalPlan.commitment}. Tell us a bit about your business.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="ps-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ps-name"
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ps-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ps-email"
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ps-business" className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ps-business"
                      type="text"
                      required
                      value={formBusiness}
                      onChange={(e) => setFormBusiness(e.target.value)}
                      placeholder="Acme Plumbing LLC"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                    />
                  </div>

                  {/* Honeypot: hidden from real visitors, most bots fill every field. */}
                  <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor="ps-website">Website</label>
                    <input
                      id="ps-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Sending…" : "Send Me the Questionnaire"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PlansSection;
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/plans/page.tsx
import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import PlansSection from "@/components/landing/PlansSection";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Plans — RC Tech Bridge",
  description:
    "See RC Tech Bridge's plans, tell us about your business, and get your onboarding questionnaire by email.",
};

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <PlansSection />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in either new file.

- [ ] **Step 4: Manual browser verification**

Run `npm run dev`, visit `/plans`, confirm all 4 plan cards render with "Starting at $X/mo" pricing (Enterprise shows "Custom"). Click a non-Enterprise plan's CTA, fill the form, submit, and confirm the modal switches to the "Check your email" confirmation state. Click Enterprise's CTA and confirm it scrolls to the "Need a Custom Solution?" block instead of opening the form.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/PlansSection.tsx src/app/plans/page.tsx
git commit -m "feat: add public /plans page with intake-first signup form"
```

---

### Task 5: Nav link and homepage pricing cleanup (admin-dashboard-rc)

**Repo root:** `C:\Users\cesar\Code\admin-dashboard-rc`

**Files:**
- Modify: `src/components/landing/Navbar.tsx`
- Modify: `src/components/landing/PricingSection.tsx`

**Interfaces:**
- Consumes: `/plans` (Task 4).

- [ ] **Step 1: Add the Plans nav link**

In `src/components/landing/Navbar.tsx`, add a new entry to the `NAV_LINKS` array (currently `Home`, `Services`, `About`, `Contact`):

```ts
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
  { label: "Plans", href: "/plans" },
];
```

- [ ] **Step 2: Point `PricingSection.tsx`'s cards at `/plans` and remove the old self-service checkout modal**

`PricingSection.tsx` is currently commented out of `src/app/page.tsx` (`{/* <PricingSection /> */}`), so this step has no live-site effect today — it prevents the old pay-first modal from reappearing if the section is ever re-enabled.

Delete these from `src/components/landing/PricingSection.tsx`:
- The `"use client"` directive's associated modal state: `modalPlan`, `formEmail`, `formName`, `formBusiness`, `submitting`, `formError` (all `useState` calls), plus `openModal`, `closeModal`, `handleSubmit`, and the `API_BASE` constant.
- The entire `{/* ─── Self-Service Checkout Modal ─── */}` JSX block at the end of the component (the `{modalPlan && (...)}` block).

Change `handlePlanClick` from opening the modal to a no-op wrapper that's no longer needed — replace the CTA `<button onClick={() => handlePlanClick(plan)}>` with a plain link:

```tsx
<Link
  href="/plans"
  className={`block w-full py-3 text-center rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
    plan.popular
      ? "bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] text-white hover:shadow-xl"
      : "bg-gray-100 text-[#CD7F32] hover:bg-[#CD7F32] hover:text-white"
  }`}
>
  {plan.buttonText}
</Link>
```

(The `Link` import from `next/link` already exists at the top of this file — no new import needed.) Remove the now-unused `handlePlanClick` function and the `useCallback`/`useState` import members that are no longer referenced (keep `React` and whatever `useCallback`/`useState` usages remain, if any — after this change none of `PricingSection`'s remaining code uses local state, so the `import React, { useCallback, useState } from "react";` line becomes `import React from "react";`).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors — confirms no leftover references to the deleted modal state.

- [ ] **Step 4: Manual browser verification**

Run `npm run dev`. Confirm `/plans` now appears in the navbar (desktop and mobile menu) and links correctly. `PricingSection` has no live route to check (still commented out of the homepage) — this step is just the tsc pass plus a quick visual scan of the navbar.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Navbar.tsx src/components/landing/PricingSection.tsx
git commit -m "feat: add Plans nav link, point pricing cards at /plans"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-08-13-public-plans-intake-signup-design.md` maps to a task — shared-logic extraction (Task 1), public backend route + internal failure route (Task 2), admin-dashboard-rc signup route (Task 3), public page (Task 4), nav/homepage cleanup (Task 5). The spec's "Website provisioning" out-of-scope note is confirmed accurate by reading the actual admin route: it does not provision a website at tenant-creation time either (that happens later via the separate `POST /:tenantId/activate` route), so `createProspectTenantAndOwner` correctly does none.
- **Type/interface consistency:** `createProspectTenantAndOwner`'s return shape (`{ tenant, ownerUser, duplicate, existingTenantId }`) is used identically in both Task 1's refactor and Task 2's new route. `tenantId: number | null` is consistent from Task 2's backend response through Task 3's route logic. `sendIntakeEmail`'s actual return shape (`{ data, error }` from Resend, not a thrown exception) was verified against `src/lib/email.ts:511-550` and `src/app/api/email/intake/route.ts` before writing Task 3 — both the throw path (`createIntakeToken`/`fetchTenantModules` can throw) and the returned-error path (Resend's own send failures) are handled.
- **No placeholders:** all five tasks contain complete, verified code — no TBDs.
