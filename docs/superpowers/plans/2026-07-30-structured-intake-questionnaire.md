# Structured Intake Questionnaire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill the AI-assisted intake path entirely, make the classic `/intake` questionnaire the only client-facing form, and rework its question set to be module-aware (only ask about features a tenant actually purchased) and mostly boolean/select/multiselect instead of open textarea.

**Architecture:** `backend-rc` gains one new internal-key-protected read endpoint that computes a tenant's enabled module set (plan defaults + any add-ons). `admin-dashboard-rc`'s `createIntakeToken` fetches that once at token-creation time and embeds it in the signed token — the classic intake page never talks to backend-rc directly, it just decodes what's already in its token. `intake-questions.ts` gains two visibility mechanisms: static `requiredModules`/`excludedModules` (filtered server-side, before the page ever renders) and dynamic `showIf` (evaluated client-side against live answers, for boolean-gate-then-reveal fields).

**Tech Stack:** Next.js 15 (admin-dashboard-rc), Express + node-pg (backend-rc), no test framework in either repo — verification is manual (curl/node scripts against a real dev DB, `tsc`/`eslint`, and a live browser check), matching this codebase's existing convention.

## Global Constraints

- No `Co-Authored-By` lines, no em dashes, conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), atomic commits — same as both repos' existing history.
- No automated test suite exists in either repo (`backend-rc`'s `npm test` is a stub; `admin-dashboard-rc` has no test script at all) — "run the tests" steps below are `npx tsc --noEmit`, `pnpm run lint` (or backend equivalent), and manual curl/browser verification, not a Jest/Mocha run.
- Follow the exact module_key strings already seeded in `backend-rc`'s `plan_modules`/`addon_catalog`: `website_core`, `seo_content`, `lead_capture`, `calendar_appointments`, `google_business_management`, `sms_leads_and_comms`, `checkout_ecommerce`, `google_ads_optimization`, `reservations`, `custom_ai_agent`.
- Don't touch `/api/intake/submit`, the calendar-ready-email flow, file upload handling, or `businessType` differentiation (still an intentionally-unused parameter after this change).

---

### Task 1: Backend-rc — internal endpoint exposing a tenant's enabled modules

**Files:**
- Modify: `backend-rc/routes/tenantProspects.js` (add a new route after the existing `/:tenantId/payment-confirmed` route, ~line 330)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `GET /api/tenant-prospects/:tenantId/modules` → `{ tenantId: number, modules: string[] }`, protected by the existing `requireInternalKey` middleware (same file, already defined above the `/intake-complete` route). Task 3 depends on this exact response shape.

A tenant's real module set is the union of its plan's default modules (`plans.plan_key` → `plan_modules`) and anything layered on by `tenant_modules` (add-ons, or overrides from the `POST /:planKey/assign/:tenantId` flow in `routes/plans.js`). Freshly-created prospects (via `POST /tenant-prospects`) only ever get `tenants.plan_key` set — `tenant_modules` stays empty until an explicit plan-assign action — so the endpoint must fall back to `plan_modules` rather than assuming `tenant_modules` is always populated.

- [ ] **Step 1: Add the route**

Insert this immediately after the closing `);` of the `/:tenantId/payment-confirmed` route (the last route before `module.exports = router;`):

```js
// Called by admin-dashboard-rc's createIntakeToken at invite-creation time to
// snapshot which modules the tenant should be asked about. Falls back to the
// plan's default modules since tenant_modules is only populated once an
// explicit plan-assign action runs (POST /:planKey/assign/:tenantId in
// routes/plans.js) — a freshly-created prospect has no tenant_modules rows yet.
router.get(
  "/:tenantId/modules",
  requireInternalKey,
  asyncHandler(async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(400).json({ error: "Invalid tenant id" });
    }

    const tenantResult = await pool.query(
      "SELECT plan_key FROM public.tenants WHERE id = $1",
      [tenantId],
    );
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    const planKey = tenantResult.rows[0].plan_key;

    const planModulesResult = planKey
      ? await pool.query(
          `SELECT pm.module_key
           FROM public.plan_modules pm
           JOIN public.plans p ON p.id = pm.plan_id
           WHERE p.plan_key = $1`,
          [planKey],
        )
      : { rows: [] };

    const tenantModulesResult = await pool.query(
      `SELECT module_key FROM public.tenant_modules
       WHERE tenant_id = $1 AND enabled = true`,
      [tenantId],
    );

    const modules = Array.from(
      new Set([
        ...planModulesResult.rows.map((r) => r.module_key),
        ...tenantModulesResult.rows.map((r) => r.module_key),
      ]),
    );

    res.json({ tenantId, modules });
  }),
);

```

- [ ] **Step 2: Find a real tenant id to test against**

Run: `node -e "require('./db').query('SELECT id, plan_key FROM public.tenants ORDER BY id DESC LIMIT 5').then(r => { console.table(r.rows); process.exit(0); })"`

Note one tenant id that has a non-null `plan_key` — use it as `<TENANT_ID>` below.

- [ ] **Step 3: Start the dev server and verify the endpoint**

Run: `pnpm run dev` (or however the dev server is normally started in this repo — check `package.json`'s `dev` script), in a separate terminal.

Then run (replace `<TENANT_ID>` and read `INTERNAL_API_KEY` from `.env`):

```bash
curl -s -H "x-internal-key: $(grep '^INTERNAL_API_KEY=' .env | cut -d= -f2 | tr -d '\r')" \
  http://localhost:5000/api/tenant-prospects/<TENANT_ID>/modules
```

Expected: `200` with `{"tenantId":<TENANT_ID>,"modules":[...]}` listing that plan's modules (e.g. `starter` → `["website_core","seo_content","lead_capture"]`). Also verify the auth gate: the same curl without the `-H` header should return `401`.

- [ ] **Step 4: Commit**

```bash
git add routes/tenantProspects.js
git commit -m "feat: add internal endpoint exposing a tenant's enabled modules"
```

---

### Task 2: admin-dashboard-rc — rework the intake question schema and question set

**Files:**
- Modify: `admin-dashboard-rc/src/lib/intake-questions.ts` (full rewrite)

**Interfaces:**
- Consumes: nothing from other tasks (pure schema/data — no network calls).
- Produces: `getIntakeSections(businessType, modules)` (modules param is new, defaults to `[]`), `isQuestionCurrentlyVisible(question, answers)` (new export, used by Task 5's rendering), and the `IntakeQuestion`/`IntakeSection` types with new optional fields `requiredModules?: string[]`, `excludedModules?: string[]`, `showIf?: { questionId: string; equals?: string | boolean; includes?: string }`, and `options[].requiredModules?: string[]`. `getAllQuestionIds`/`getQuestionLabelMap` keep their existing signatures and behavior (they intentionally ignore module filtering — see rationale in Step 1's comment block — so `onboarding/page.tsx`'s existing usage is unaffected).

Replace the entire file with:

```ts
/**
 * Intake questionnaire configuration.
 *
 * Defines the questions shown to each tenant using the universal onboarding profile.
 * The email template in email-templates.ts shows a preview; this file drives
 * the actual interactive form at /intake.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "file"
  | "multifile"
  | "boolean"
  | "number";

export interface IntakeQuestionCondition {
  questionId: string;
  /** Question must currently equal this value (for select/boolean/text). */
  equals?: string | boolean;
  /** Question's array value must currently include this option (for multiselect). */
  includes?: string;
}

export interface IntakeQuestionOption {
  value: string;
  label: string;
  /** Only offered if the tenant's enabled modules include at least one of these. */
  requiredModules?: string[];
}

export interface IntakeQuestion {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: IntakeQuestionOption[];
  /** S3 upload category for file questions. */
  uploadCategory?: string;
  /** Maximum files for multifile type. */
  maxFiles?: number;
  /** Accept attribute for file inputs. */
  accept?: string;
  /** Only rendered if the tenant's enabled modules include at least one of these. */
  requiredModules?: string[];
  /** Hidden if the tenant's enabled modules include any of these (used for "neither" fallback questions). */
  excludedModules?: string[];
  /** Only rendered once another question in the same section currently matches this condition. */
  showIf?: IntakeQuestionCondition;
}

export interface IntakeSection {
  id: string;
  title: string;
  description?: string;
  questions: IntakeQuestion[];
}

export type BusinessType =
  | "universal"
  | "lead_gen_services"
  | "appointments"
  | "ecommerce"
  | "reservations"
  | "hybrid_local";

// ─── Visibility helpers ───────────────────────────────────────────────────────

function questionModulesMatch(question: IntakeQuestion, modules: string[]): boolean {
  if (question.requiredModules && question.requiredModules.length > 0) {
    if (!question.requiredModules.some((m) => modules.includes(m))) return false;
  }
  if (question.excludedModules && question.excludedModules.length > 0) {
    if (question.excludedModules.some((m) => modules.includes(m))) return false;
  }
  return true;
}

function filterOptionsForModules(
  options: IntakeQuestionOption[] | undefined,
  modules: string[],
): IntakeQuestionOption[] | undefined {
  if (!options) return options;
  return options.filter(
    (opt) => !opt.requiredModules || opt.requiredModules.length === 0 || opt.requiredModules.some((m) => modules.includes(m)),
  );
}

/** Evaluates a question's showIf against the form's current live answers. Used at render time — module filtering happens earlier, in getIntakeSections. */
export function isQuestionCurrentlyVisible(
  question: IntakeQuestion,
  answers: Record<string, string | string[] | boolean | number | null | undefined>,
): boolean {
  if (!question.showIf) return true;
  const actual = answers[question.showIf.questionId];
  if (question.showIf.equals !== undefined) {
    return actual === question.showIf.equals;
  }
  if (question.showIf.includes !== undefined) {
    return Array.isArray(actual) && actual.includes(question.showIf.includes);
  }
  return true;
}

// ─── About Your Business ──────────────────────────────────────────────────────

const UNIVERSAL_ABOUT: IntakeSection = {
  id: "about",
  title: "About Your Business",
  description: "Tell us the basics so we can get your site started.",
  questions: [
    {
      id: "business_name",
      label: "What is your full business name?",
      type: "text",
      required: true,
      placeholder: "e.g. Smith's Plumbing LLC",
    },
    {
      id: "owner_name",
      label: "What is your name, and what do you like to be called?",
      type: "text",
      required: true,
      placeholder: "e.g. John Smith — goes by John",
    },
    {
      id: "location",
      label: "What city/area are you based in?",
      type: "text",
      required: true,
      placeholder: "e.g. Sacramento, CA",
    },
    {
      id: "service_area",
      label: "Do you serve customers in-person, virtually, or both?",
      type: "select",
      required: true,
      options: [
        { value: "in_person", label: "In-person only" },
        { value: "virtual", label: "Virtual / remote only" },
        { value: "both", label: "Both in-person and virtual" },
      ],
    },
    {
      id: "years_in_business",
      label: "How long have you been in business?",
      type: "select",
      options: [
        { value: "under_1", label: "Less than 1 year" },
        { value: "1_to_3", label: "1-3 years" },
        { value: "3_to_10", label: "3-10 years" },
        { value: "over_10", label: "10+ years" },
      ],
    },
    {
      id: "has_credentials",
      label: "Any certifications, licenses, or credentials to highlight?",
      type: "boolean",
    },
    {
      id: "credentials_details",
      label: "List them out",
      type: "textarea",
      placeholder: "e.g. Licensed contractor #12345, NASM Certified",
      showIf: { questionId: "has_credentials", equals: true },
    },
    {
      id: "ideal_client",
      label: "Who is your ideal client or customer?",
      type: "textarea",
      required: true,
      placeholder: "e.g. Homeowners in need of emergency plumbing repairs",
    },
    {
      id: "tagline",
      label: "Do you have an existing slogan or tagline?",
      type: "text",
      placeholder: "e.g. \"Reliable repairs, every time\" — leave blank if you don't have one",
      hint: "If you don't have one, we can help create one based on your brand.",
    },
    {
      id: "has_topics_to_avoid",
      label: "Are there services, topics, or competitors we should NOT mention on your site?",
      type: "boolean",
    },
    {
      id: "topics_to_avoid_details",
      label: "What should we avoid?",
      type: "textarea",
      placeholder: "e.g. We no longer offer pool service, don't mention Brand X",
      showIf: { questionId: "has_topics_to_avoid", equals: true },
    },
  ],
};

// ─── Your Brand ────────────────────────────────────────────────────────────────

const UNIVERSAL_BRAND: IntakeSection = {
  id: "brand",
  title: "Your Brand",
  description: "Help us match your website to your brand identity.",
  questions: [
    {
      id: "asset_drive_link",
      label:
        "Once you've added your logo, photos, and any brand assets to the shared folder we sent you, paste the folder link here (or leave a note)",
      type: "text",
      placeholder:
        'e.g. https://drive.google.com/drive/folders/... — or "Uploaded, all set"',
      hint: "We emailed you a link to a shared folder for your logo, headshots, and any other brand assets. Drop everything there — no need to upload files in this form. If you don't have a logo yet, we can help create one.",
    },
    {
      id: "brand_color_mood",
      label: "What colors feel like 'you'?",
      type: "multiselect",
      options: [
        { value: "bold_energetic", label: "Bold & energetic" },
        { value: "earthy_natural", label: "Earthy & natural" },
        { value: "modern_minimal", label: "Modern & minimal" },
        { value: "warm_friendly", label: "Warm & friendly" },
        { value: "corporate_professional", label: "Corporate & professional" },
        { value: "custom", label: "Custom — I'll describe it" },
      ],
    },
    {
      id: "brand_colors_custom",
      label: "Describe the colors you want",
      type: "text",
      placeholder: "e.g. bold blue and white, earthy green and tan",
      showIf: { questionId: "brand_color_mood", includes: "custom" },
    },
    {
      id: "brand_words",
      label: "Three words that describe your brand or service style",
      type: "multiselect",
      required: true,
      options: [
        { value: "reliable", label: "Reliable" },
        { value: "modern", label: "Modern" },
        { value: "friendly", label: "Friendly" },
        { value: "bold", label: "Bold" },
        { value: "elegant", label: "Elegant" },
        { value: "trustworthy", label: "Trustworthy" },
        { value: "playful", label: "Playful" },
        { value: "premium", label: "Premium" },
        { value: "approachable", label: "Approachable" },
        { value: "innovative", label: "Innovative" },
        { value: "family_owned", label: "Family-owned" },
        { value: "luxury", label: "Luxury" },
        { value: "no_nonsense", label: "No-nonsense" },
        { value: "energetic", label: "Energetic" },
        { value: "calm", label: "Calm" },
        { value: "cutting_edge", label: "Cutting-edge" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "brand_words_other",
      label: "What other words describe your brand?",
      type: "text",
      showIf: { questionId: "brand_words", includes: "other" },
    },
  ],
};

// ─── Photos & Media ────────────────────────────────────────────────────────────

const UNIVERSAL_MEDIA: IntakeSection = {
  id: "media",
  title: "Photos & Media",
  description:
    "Add photos of your work to the shared folder we sent you — we'll use these on your site.",
  questions: [
    {
      id: "has_video_content",
      label: "Any video content, testimonials, or promo clips?",
      type: "boolean",
    },
    {
      id: "video_links",
      label: "Share the links",
      type: "textarea",
      placeholder: "Paste YouTube, Vimeo, or other video links here",
      showIf: { questionId: "has_video_content", equals: true },
    },
    {
      id: "has_testimonials",
      label: "Do you have any existing testimonials or reviews you'd like us to use?",
      type: "boolean",
      hint: "These can be from Google, Yelp, Facebook, or any other platform.",
    },
    {
      id: "existing_testimonials",
      label: "Share them",
      type: "textarea",
      placeholder: "Paste review text, customer quotes, or share a link to your reviews",
      showIf: { questionId: "has_testimonials", equals: true },
    },
  ],
};

// ─── Services, Products & Booking ─────────────────────────────────────────────

const UNIVERSAL_OFFERINGS: IntakeSection = {
  id: "services",
  title: "Services, Products & Booking",
  description: "Tell us what you offer and how customers buy, book, or contact you.",
  questions: [
    {
      id: "primary_offerings",
      label: "What are your main services, products, or reservation types?",
      type: "textarea",
      required: true,
      placeholder: "List the main things customers can buy, book, or hire you for.",
    },
    {
      id: "has_set_pricing",
      label: "Do you have set pricing or packages to share?",
      type: "boolean",
    },
    {
      id: "pricing_packages",
      label: "Share your pricing, packages, subscriptions, or add-ons",
      type: "textarea",
      placeholder: "Include starting prices, bundles, memberships, deposits, or special offers.",
      showIf: { questionId: "has_set_pricing", equals: true },
    },
    {
      id: "customer_action",
      label: "What is the main action you want visitors to take?",
      type: "multiselect",
      options: [
        { value: "call", label: "Call" },
        { value: "contact_form", label: "Submit contact form" },
        { value: "book_appointment", label: "Book appointment", requiredModules: ["calendar_appointments"] },
        { value: "make_reservation", label: "Make reservation", requiredModules: ["reservations"] },
        { value: "buy_online", label: "Buy online", requiredModules: ["checkout_ecommerce"] },
        { value: "visit_location", label: "Visit location" },
      ],
    },
    {
      id: "fulfillment_ecommerce",
      label: "How do you fulfill orders?",
      type: "multiselect",
      requiredModules: ["checkout_ecommerce"],
      options: [
        { value: "ship", label: "Ship products" },
        { value: "local_pickup", label: "Local pickup" },
        { value: "digital_delivery", label: "Digital delivery" },
        { value: "in_person", label: "In-person handoff" },
      ],
    },
    {
      id: "fulfillment_booking",
      label: "Describe your booking flow",
      type: "textarea",
      requiredModules: ["calendar_appointments", "reservations"],
      placeholder: "Explain how customers pick a time, what happens after they book, cancellation window, etc.",
    },
    {
      id: "fulfillment_general",
      label: "How do you deliver your work?",
      type: "select",
      excludedModules: ["checkout_ecommerce", "calendar_appointments", "reservations"],
      options: [
        { value: "we_go_to_them", label: "We go to them" },
        { value: "they_come_to_us", label: "They come to us" },
        { value: "both", label: "Both" },
      ],
    },
    {
      id: "business_hours",
      label: "What are your business hours?",
      type: "select",
      options: [
        { value: "standard", label: "Standard, Monday-Friday" },
        { value: "extended", label: "Extended hours, including weekends" },
        { value: "24_7", label: "24/7" },
        { value: "custom", label: "Custom — I'll describe it" },
      ],
    },
    {
      id: "business_hours_custom",
      label: "Describe your hours",
      type: "textarea",
      showIf: { questionId: "business_hours", equals: "custom" },
    },
    {
      id: "service_radius",
      label: "What is your service area or delivery radius?",
      type: "select",
      options: [
        { value: "5mi", label: "Within 5 miles" },
        { value: "10mi", label: "Within 10 miles" },
        { value: "25mi", label: "Within 25 miles" },
        { value: "50mi_plus", label: "Within 50+ miles" },
        { value: "statewide_national", label: "Statewide or national" },
        { value: "virtual", label: "Fully virtual, no radius" },
      ],
    },
    {
      id: "policies_guarantees_types",
      label: "Any policies or guarantees to highlight?",
      type: "multiselect",
      options: [
        { value: "money_back", label: "Money-back guarantee" },
        { value: "warranty", label: "Warranty on work" },
        { value: "free_estimates", label: "Free estimates/quotes" },
        { value: "satisfaction_guarantee", label: "Satisfaction guarantee" },
        { value: "deposit_required", label: "Deposit required" },
        { value: "cancellation_policy", label: "Cancellation policy" },
        { value: "none", label: "None of these" },
      ],
    },
    {
      id: "policies_guarantees_details",
      label: "Anything else to add about policies or guarantees?",
      type: "textarea",
      placeholder: "Optional — details on any of the above, or anything not covered",
    },
  ],
};

// ─── Online Presence & Platforms ──────────────────────────────────────────────

const UNIVERSAL_PLATFORMS: IntakeSection = {
  id: "platforms",
  title: "Online Presence & Platforms",
  description: "Help us connect and sync all your existing online accounts.",
  questions: [
    {
      id: "has_google_business",
      label: "Do you have a Google Business Profile?",
      type: "boolean",
    },
    {
      id: "google_business_url",
      label: "Paste the URL or name",
      type: "text",
      placeholder: "e.g. https://g.page/your-business or \"RnR Electric Sacramento\"",
      hint: "To connect your profile, please grant Manager access to rctechsolutions1@gmail.com in your Google Business settings. This lets us manage reviews, posts, and performance data on your behalf.",
      showIf: { questionId: "has_google_business", equals: true },
    },
    {
      id: "has_facebook",
      label: "Do you have a Facebook business page?",
      type: "boolean",
    },
    {
      id: "facebook_url",
      label: "Facebook page URL",
      type: "text",
      placeholder: "e.g. https://www.facebook.com/yourbusiness",
      showIf: { questionId: "has_facebook", equals: true },
    },
    {
      id: "has_instagram",
      label: "Do you have an Instagram profile?",
      type: "boolean",
    },
    {
      id: "instagram_url",
      label: "Instagram URL or handle",
      type: "text",
      placeholder: "e.g. https://www.instagram.com/yourbusiness or @yourbusiness",
      showIf: { questionId: "has_instagram", equals: true },
    },
    {
      id: "has_yelp",
      label: "Do you have a Yelp profile?",
      type: "boolean",
    },
    {
      id: "yelp_url",
      label: "Yelp profile URL",
      type: "text",
      placeholder: "e.g. https://www.yelp.com/biz/your-business",
      showIf: { questionId: "has_yelp", equals: true },
    },
    {
      id: "has_other_review_platforms",
      label: "Any other review or directory profiles? (Angi, Thumbtack, BBB, HomeAdvisor, etc.)",
      type: "boolean",
    },
    {
      id: "other_review_platforms",
      label: "List them",
      type: "textarea",
      placeholder: "Paste links or names of any other profiles you have",
      showIf: { questionId: "has_other_review_platforms", equals: true },
    },
    {
      id: "has_google_ads",
      label: "Are you currently running Google Ads or Local Services Ads (LSA)?",
      type: "select",
      options: [
        { value: "yes_google_ads", label: "Yes, Google Search Ads" },
        { value: "yes_lsa", label: "Yes, Local Services Ads (LSA / Google Guaranteed)" },
        { value: "yes_both", label: "Yes, both" },
        { value: "no", label: "No, not currently" },
        { value: "interested", label: "No, but I'm interested" },
      ],
      hint: "We'll use this to align your landing pages and CTAs with your ad strategy.",
    },
    {
      id: "existing_booking_software",
      label: "Do you currently use any booking, scheduling, or CRM software?",
      type: "select",
      options: [
        { value: "jobber", label: "Jobber" },
        { value: "servicetitan", label: "ServiceTitan" },
        { value: "calendly", label: "Calendly" },
        { value: "housecall_pro", label: "Housecall Pro" },
        { value: "square", label: "Square" },
        { value: "none", label: "None" },
        { value: "other", label: "Other" },
      ],
      hint: "We'll make sure our booking integration doesn't conflict with what you already use.",
    },
    {
      id: "existing_booking_software_other",
      label: "What software do you use?",
      type: "text",
      showIf: { questionId: "existing_booking_software", equals: "other" },
    },
  ],
};

// ─── Automation & Workflows ────────────────────────────────────────────────────

const UNIVERSAL_AUTOMATION: IntakeSection = {
  id: "automation",
  title: "Automation & Workflows",
  description: "Help us spot repetitive work we could take off your plate.",
  questions: [
    {
      id: "manual_workflows",
      label: "What tasks or parts of running your business feel repetitive or manual right now?",
      type: "textarea",
      placeholder:
        "e.g. manually texting customers back, re-typing the same quote every time, tracking leads in a notebook",
    },
    {
      id: "current_tools",
      label: "What software or tools do you currently use for day-to-day operations?",
      type: "multiselect",
      options: [
        { value: "invoicing", label: "Invoicing software" },
        { value: "scheduling", label: "Scheduling software" },
        { value: "crm", label: "CRM" },
        { value: "spreadsheets", label: "Spreadsheets" },
        { value: "texting_personal", label: "Texting customers from a personal phone" },
        { value: "social_manual", label: "Managing social media manually" },
        { value: "none", label: "None of these" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "current_tools_other",
      label: "What other tools do you use?",
      type: "text",
      showIf: { questionId: "current_tools", includes: "other" },
    },
    {
      id: "automation_interest",
      label: "Which of these would you be interested in automating?",
      type: "multiselect",
      options: [
        { value: "sms_followups", label: "Text message follow-ups with leads/customers" },
        { value: "ai_content_agent", label: "AI-assisted content or customer responses" },
        { value: "ads_optimization", label: "Ad campaign management/optimization" },
        { value: "none_yet", label: "Not sure yet / none of these" },
      ],
    },
    {
      id: "automation_notes",
      label: "Anything else you wish could just run itself?",
      type: "textarea",
      placeholder: "Optional — anything not covered above",
    },
  ],
};

// ─── Contact & Business Info ───────────────────────────────────────────────────

const UNIVERSAL_CONTACT: IntakeSection = {
  id: "contact",
  title: "Contact & Business Info",
  description: "A few quick details to make sure we set everything up correctly.",
  questions: [
    {
      id: "business_phone",
      label: "What is your primary business phone number?",
      type: "text",
      required: true,
      placeholder: "e.g. (916) 555-1234",
    },
    {
      id: "email_preference",
      label: "How would you like to handle your business email?",
      type: "select",
      required: true,
      options: [
        { value: "company_email", label: "I'd like a company email (e.g. john@yourbusiness.com)" },
        { value: "bring_own", label: "I'll use my own existing email" },
        { value: "undecided", label: "Not sure yet" },
      ],
    },
    {
      id: "has_insurance",
      label: "Are you licensed and insured?",
      type: "select",
      options: [
        { value: "yes_both", label: "Yes, licensed and insured" },
        { value: "insured_only", label: "Insured only" },
        { value: "licensed_only", label: "Licensed only" },
        { value: "no", label: "No" },
        { value: "not_applicable", label: "Not applicable for my business" },
      ],
      hint: "Many clients look for this — we can feature it on your site.",
    },
    {
      id: "has_physical_address",
      label: "Do you have a physical storefront or office?",
      type: "select",
      options: [
        { value: "yes", label: "Yes, we have a storefront/office" },
        { value: "no", label: "No, mobile or service-area only" },
      ],
      hint: "Used for Google Maps, schema markup, and local SEO.",
    },
    {
      id: "business_address",
      label: "What is your business address?",
      type: "text",
      placeholder: "e.g. 123 Main St, Sacramento, CA 95814",
      showIf: { questionId: "has_physical_address", equals: "yes" },
    },
    {
      id: "content_approval_contact",
      label: "Who should we contact for content approvals and edits?",
      type: "text",
      placeholder: "e.g. John Smith — john@yourbusiness.com — (916) 555-1234",
      hint: "This is the person we'll reach out to when we need sign-off on copy or design decisions.",
    },
  ],
};

// ─── Website Setup & Launch ─────────────────────────────────────────────────────

const UNIVERSAL_SETUP: IntakeSection = {
  id: "setup",
  title: "Website Setup & Launch",
  description: "A few technical details to get your site live without any delays.",
  questions: [
    {
      id: "has_existing_website",
      label: "Do you have an existing website we should reference or pull content from?",
      type: "boolean",
      hint: "If you have an existing site, we can save a lot of time by reusing approved copy and photos.",
    },
    {
      id: "existing_website_url",
      label: "What's the URL?",
      type: "text",
      placeholder: "e.g. https://www.youroldbusiness.com",
      showIf: { questionId: "has_existing_website", equals: true },
    },
    {
      id: "existing_domain_status",
      label: "Do you have a domain name you want to use for your new site?",
      type: "select",
      options: [
        { value: "already_own", label: "Yes, I already own one" },
        { value: "need_one", label: "No, I need one" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    {
      id: "existing_domain_name",
      label: "What's the domain?",
      type: "text",
      placeholder: "e.g. yourbusiness.com",
      showIf: { questionId: "existing_domain_status", equals: "already_own" },
    },
    {
      id: "domain_registrar",
      label: "Who is your domain registrar (where you bought the domain)?",
      type: "select",
      options: [
        { value: "godaddy", label: "GoDaddy" },
        { value: "namecheap", label: "Namecheap" },
        { value: "google_domains", label: "Google Domains" },
        { value: "squarespace", label: "Squarespace" },
        { value: "wix", label: "Wix" },
        { value: "not_sure", label: "Not sure" },
        { value: "other", label: "Other" },
      ],
      hint: "We'll walk you through the DNS changes needed to point your domain to your new site.",
      showIf: { questionId: "existing_domain_status", equals: "already_own" },
    },
    {
      id: "domain_registrar_other",
      label: "Which registrar?",
      type: "text",
      showIf: { questionId: "domain_registrar", equals: "other" },
    },
    {
      id: "target_go_live",
      label: "When do you want your site to go live?",
      type: "select",
      options: [
        { value: "asap", label: "ASAP" },
        { value: "two_weeks", label: "Within 2 weeks" },
        { value: "one_month", label: "Within 1 month" },
        { value: "flexible", label: "Flexible" },
        { value: "specific_date", label: "Specific date" },
      ],
    },
    {
      id: "target_go_live_date",
      label: "What date?",
      type: "text",
      placeholder: "e.g. May 1st",
      showIf: { questionId: "target_go_live", equals: "specific_date" },
    },
  ],
};

// ─── Section builder ──────────────────────────────────────────────────────────

function getOfferingsSection(_profile: BusinessType): IntakeSection {
  return UNIVERSAL_OFFERINGS;
}

function getAllSections(businessType: BusinessType): IntakeSection[] {
  return [
    UNIVERSAL_ABOUT,
    UNIVERSAL_BRAND,
    getOfferingsSection(businessType),
    UNIVERSAL_PLATFORMS,
    UNIVERSAL_AUTOMATION,
    UNIVERSAL_MEDIA,
    UNIVERSAL_CONTACT,
    UNIVERSAL_SETUP,
  ];
}

/**
 * Sections/questions filtered to what a tenant with this module list should
 * actually be asked. This is the function the live /intake page renders from.
 */
export function getIntakeSections(
  businessType: BusinessType = "universal",
  modules: string[] = [],
): IntakeSection[] {
  return getAllSections(businessType).map((section) => ({
    ...section,
    questions: section.questions
      .filter((q) => questionModulesMatch(q, modules))
      .map((q) => ({ ...q, options: filterOptionsForModules(q.options, modules) })),
  }));
}

/**
 * Flat list of every possible question ID, ignoring module filtering — used
 * for admin-side display of already-submitted answers (onboarding/page.tsx),
 * where a question's presence in the label map must not depend on whether
 * today's module list happens to include it.
 */
export function getAllQuestionIds(businessType: BusinessType): string[] {
  return getAllSections(businessType).flatMap((s) => s.questions.map((q) => q.id));
}

export function getQuestionLabelMap(
  businessType: BusinessType,
): Record<string, string> {
  return Object.fromEntries(
    getAllSections(businessType)
      .flatMap((section) => section.questions)
      .map((question) => [question.id, question.label]),
  );
}

/** Human-readable label for the intake profile. */
export function getBusinessTypeLabel(businessType: BusinessType): string {
  const labels: Record<BusinessType, string> = {
    universal: "Universal Website Intake",
    lead_gen_services: "Service Business",
    appointments: "Appointment-Based Business",
    ecommerce: "Online Store",
    reservations: "Reservation / Hospitality",
    hybrid_local: "Local Business",
  };
  return labels[businessType] ?? labels.universal;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `intake-questions.ts`. (Other pre-existing errors elsewhere in the repo, if any, are not this task's concern — only confirm nothing new points at this file.)

- [ ] **Step 3: Lint**

Run: `pnpm run lint`
Expected: no new errors in `src/lib/intake-questions.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/intake-questions.ts
git commit -m "feat: rework intake questions to be module-aware and boolean/select-driven"
```

---

### Task 3: admin-dashboard-rc — embed modules in the intake token, kill the AI routing branch

**Files:**
- Modify: `admin-dashboard-rc/src/lib/email.ts`

**Interfaces:**
- Consumes: Task 1's `GET /api/tenant-prospects/:tenantId/modules` (`{ tenantId, modules: string[] }`).
- Produces: `createIntakeToken(email, tenantId, businessType, websiteId, tenantName)` now returns a token whose decoded payload additionally contains `modules: string[]`. Task 4 depends on this.

- [ ] **Step 1: Update `createIntakeToken` to fetch and embed modules**

Find (around line 461):

```ts
/** Build a 7-day intake questionnaire token for a tenant owner. */
export async function createIntakeToken(
  email: string,
  tenantId: number,
  businessType = "universal",
  websiteId?: number,
  tenantName?: string,
): Promise<string> {
  return createSignedToken(
    INTAKE_TOKEN_SECRET,
    { email, tenantId, businessType, websiteId, tenantName },
    60 * 60 * 24 * 7, // 7 days
  );
}
```

Replace with:

```ts
/** Fetches the tenant's currently enabled modules from backend-rc. Throws if the call fails — an intake invite must not silently go out with an empty (all-questions-hidden) module list. */
async function fetchTenantModules(tenantId: number): Promise<string[]> {
  const internalKey = process.env.INTERNAL_API_KEY;
  const response = await fetch(
    `${BACKEND_API_BASE}/tenant-prospects/${tenantId}/modules`,
    {
      headers: internalKey ? { "x-internal-key": internalKey } : {},
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch tenant modules for tenant ${tenantId} (${response.status})`,
    );
  }
  const body = (await response.json()) as { modules: string[] };
  return body.modules ?? [];
}

/** Build a 7-day intake questionnaire token for a tenant owner. */
export async function createIntakeToken(
  email: string,
  tenantId: number,
  businessType = "universal",
  websiteId?: number,
  tenantName?: string,
): Promise<string> {
  const modules = await fetchTenantModules(tenantId);
  return createSignedToken(
    INTAKE_TOKEN_SECRET,
    { email, tenantId, businessType, websiteId, tenantName, modules },
    60 * 60 * 24 * 7, // 7 days
  );
}
```

- [ ] **Step 2: Remove the AI routing branch in `sendIntakeEmail`**

Find (around line 508):

```ts
  // Use the AI-assisted intake form when OpenAI is configured; fall back to
  // the classic form if the key is absent (AI unavailable).
  const intakePath = process.env.OPENAI_API_KEY ? "/intake/ai" : "/intake";
  const intakeUrl = `${APP_URL}${intakePath}?token=${encodeURIComponent(token)}`;
```

Replace with:

```ts
  const intakeUrl = `${APP_URL}/intake?token=${encodeURIComponent(token)}`;
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit` then `pnpm run lint`
Expected: no errors in `src/lib/email.ts`.

- [ ] **Step 4: Verify end-to-end via the real API route**

With the dev server running (`pnpm dev`) and Task 1's endpoint reachable, mint a token for a real tenant id (same one used in Task 1's Step 2, or another with a known `plan_key`):

```bash
curl -s -X POST http://localhost:3000/api/intake/token \
  -H "Content-Type: application/json" \
  -d '{"tenantId": <TENANT_ID>, "ownerEmail": "test@example.com", "businessType": "universal", "tenantName": "Test Co"}'
```

Expected: `200` with `{"token": "..."}`. Save this token string — Task 4 verifies against it. If this instead throws/500s, check that `admin-dashboard-rc/.env`'s `INTERNAL_API_KEY` matches `backend-rc/.env`'s value and that backend-rc's dev server is running.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: embed tenant modules in intake token, always link to classic intake"
```

---

### Task 4: admin-dashboard-rc — return modules from `/api/intake/verify`

**Files:**
- Modify: `admin-dashboard-rc/src/app/api/intake/verify/route.ts`

**Interfaces:**
- Consumes: the token payload shape produced by Task 3 (`modules: string[]` now present).
- Produces: `POST /api/intake/verify` response gains a `modules: string[]` field (defaults to `[]` for tokens minted before this change). Task 5 depends on this.

- [ ] **Step 1: Update the route**

Find:

```ts
  const { email, tenantId, businessType, websiteId, tenantName } = payload as unknown as {
    email: string;
    tenantId: number;
    businessType?: string;
    websiteId?: number;
    tenantName?: string;
  };

  return NextResponse.json({
    email,
    tenantId,
    businessType: businessType ?? "universal",
    websiteId,
    tenantName,
  });
```

Replace with:

```ts
  const { email, tenantId, businessType, websiteId, tenantName, modules } = payload as unknown as {
    email: string;
    tenantId: number;
    businessType?: string;
    websiteId?: number;
    tenantName?: string;
    modules?: string[];
  };

  return NextResponse.json({
    email,
    tenantId,
    businessType: businessType ?? "universal",
    websiteId,
    tenantName,
    modules: modules ?? [],
  });
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in this file.

- [ ] **Step 3: Verify against the token from Task 3**

```bash
curl -s -X POST http://localhost:3000/api/intake/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "<TOKEN_FROM_TASK_3>"}'
```

Expected: `200` with a body that includes `"modules":[...]` matching what Task 1's endpoint returned for that tenant.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/intake/verify/route.ts
git commit -m "feat: return tenant modules from intake token verification"
```

---

### Task 5: admin-dashboard-rc — render module- and showIf-aware questions on `/intake`

**Files:**
- Modify: `admin-dashboard-rc/src/app/intake/page.tsx`

**Interfaces:**
- Consumes: `modules: string[]` from `/api/intake/verify` (Task 4), `getIntakeSections(businessType, modules)` and `isQuestionCurrentlyVisible(question, answers)` from Task 2.
- Produces: nothing consumed by later tasks — this is the final consumer in the chain.

- [ ] **Step 1: Import the new helper and update the `TokenPayload` type**

Find:

```ts
import {
  getIntakeSections,
  getBusinessTypeLabel,
  type BusinessType,
  type IntakeQuestion,
  type IntakeSection,
} from "@/lib/intake-questions";

// ─── Token verification hook ──────────────────────────────────────────────────

interface TokenPayload {
  email: string;
  tenantId: number;
  businessType?: BusinessType;
  websiteId?: number;
  tenantName?: string;
}
```

Replace with:

```ts
import {
  getIntakeSections,
  getBusinessTypeLabel,
  isQuestionCurrentlyVisible,
  type BusinessType,
  type IntakeQuestion,
  type IntakeSection,
} from "@/lib/intake-questions";

// ─── Token verification hook ──────────────────────────────────────────────────

interface TokenPayload {
  email: string;
  tenantId: number;
  businessType?: BusinessType;
  websiteId?: number;
  tenantName?: string;
  modules?: string[];
}
```

- [ ] **Step 2: Pass modules into `getIntakeSections` and skip hidden questions in `Section`**

Find:

```ts
  const businessType = payload?.businessType ?? "universal";
  const sections = useMemo(
    () => (payload ? getIntakeSections(businessType) : []),
    [businessType, payload],
  );
```

Replace with:

```ts
  const businessType = payload?.businessType ?? "universal";
  const modules = payload?.modules ?? [];
  const sections = useMemo(
    () => (payload ? getIntakeSections(businessType, modules) : []),
    [businessType, modules, payload],
  );
```

Find the `Section` component's render body:

```ts
      <div className="space-y-5">
        {section.questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id] ?? null}
            onChange={onChange}
            onFileUpload={onFileUpload}
            uploadedFiles={uploadedFiles}
            uploading={uploading}
          />
        ))}
      </div>
```

Replace with:

```ts
      <div className="space-y-5">
        {section.questions
          .filter((q) => isQuestionCurrentlyVisible(q, answers))
          .map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id] ?? null}
              onChange={onChange}
              onFileUpload={onFileUpload}
              uploadedFiles={uploadedFiles}
              uploading={uploading}
            />
          ))}
      </div>
```

(`Section` already receives `answers` as a prop — no signature change needed.)

- [ ] **Step 3: Exclude hidden questions from required-field validation**

Find, in `handleSubmit`:

```ts
    // Validate required fields
    const requiredQuestions = sections
      .flatMap((s) => s.questions)
      .filter((q) => q.required);
```

Replace with:

```ts
    // Validate required fields — skip anything currently hidden by showIf
    const requiredQuestions = sections
      .flatMap((s) => s.questions)
      .filter((q) => q.required && isQuestionCurrentlyVisible(q, answers));
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` then `pnpm run lint`
Expected: no errors in `src/app/intake/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "feat: render module- and condition-aware questions on the classic intake form"
```

---

### Task 6: admin-dashboard-rc — point the admin Invite Prospect flow at the classic form

**Files:**
- Modify: `admin-dashboard-rc/src/app/(admin)/(others-pages)/tenants/page.tsx`

**Interfaces:** none.

- [ ] **Step 1: Fix the hardcoded link**

Find (around line 775):

```ts
      const intakeUrl = `${window.location.origin}/intake/ai?token=${encodeURIComponent(intakeToken.token)}`;
```

Replace with:

```ts
      const intakeUrl = `${window.location.origin}/intake?token=${encodeURIComponent(intakeToken.token)}`;
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit` then `pnpm run lint`
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(admin)/(others-pages)/tenants/page.tsx"
git commit -m "fix: send prospect invites to the classic intake form"
```

---

### Task 7: admin-dashboard-rc — delete the AI intake code

**Files:**
- Delete: `src/app/intake/ai/page.tsx`
- Delete: `src/app/api/intake/agent/route.ts`
- Delete: `src/app/api/intake/prefill/route.ts`
- Delete: `src/lib/intake-ai-schema.ts`

**Interfaces:** none — nothing else imports from these files (verified in Step 1).

- [ ] **Step 1: Confirm nothing else references these files**

Run: `grep -rn "intake/ai\|intake-ai-schema\|api/intake/agent\|api/intake/prefill" src --include="*.ts" --include="*.tsx"`

Expected: only matches inside the four files being deleted. If anything else shows up, stop and investigate before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/app/intake/ai/page.tsx src/app/api/intake/agent/route.ts src/app/api/intake/prefill/route.ts src/lib/intake-ai-schema.ts
```

- [ ] **Step 3: Full build**

Run: `pnpm run build`
Expected: build completes with no errors (this also catches any stray reference the grep in Step 1 might have missed, since Next.js will fail to compile on a broken import).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove AI-assisted intake path"
```

---

### Task 8: Full end-to-end verification

**Files:** none — verification only.

- [ ] **Step 1: Start both dev servers**

`backend-rc`: `pnpm run dev` (or repo's dev script)
`admin-dashboard-rc`: `pnpm dev`

- [ ] **Step 2: Find two tenants with different module sets**

Run against backend-rc: `node -e "require('./db').query(\"SELECT id, plan_key FROM public.tenants WHERE plan_key IN ('starter','business') ORDER BY plan_key LIMIT 5\").then(r => { console.table(r.rows); process.exit(0); })"`

Pick one `starter` tenant id (no `checkout_ecommerce`/`calendar_appointments`/`reservations`) and one `business` tenant id (has all three, per the seeded `plan_modules`).

- [ ] **Step 3: Mint and verify a token for each, in the browser**

For each tenant id, repeat Task 3 Step 4's curl to mint a token, then open `http://localhost:3000/intake?token=<TOKEN>` in a browser.

Expected for the `starter` tenant: no "How do you fulfill orders?" (ecommerce) question, no ecommerce option under "customer action," `fulfillment_general`'s select ("We go to them / They come to us / Both") shown instead.

Expected for the `business` tenant: ecommerce fulfillment multiselect shown, "Buy online" available under "customer action," `fulfillment_general` NOT shown (excluded since ecommerce/booking modules are present).

- [ ] **Step 4: Verify showIf behavior live**

On either tenant's form: confirm "Any certifications, licenses, or credentials to highlight?" starts as just a Yes/No toggle with no textarea below it; toggling it to "Yes" reveals the details textarea immediately. Repeat for at least one multiselect-gated field (e.g. select "Custom" under brand colors and confirm the custom-description text field appears).

- [ ] **Step 5: Verify submission still works**

Fill out all required fields on one of the two forms and submit. Expected: same "Thank You!" screen and calendar-booking CTA behavior as before this change (this flow is unmodified — confirms nothing broke it).

- [ ] **Step 6: Final full check on admin-dashboard-rc**

Run: `pnpm run build` then `pnpm run lint`
Expected: both pass clean.

- [ ] **Step 7: No commit needed** — this task is verification-only. If any step surfaces a bug, fix it in the relevant task's file and amend that task's existing commit... actually, per this repo's git conventions, create a new fix commit instead of amending (see Global Constraints).
