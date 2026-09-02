# Cold Calling Lead Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the email-first cold outreach tracker into a call-first pipeline: a `stage` machine, structured call outcomes, callback scheduling with an in-app "due" surface, CSV import for extension-sourced lead lists, a per-lead call script, and a call-history timeline in the lead modal.

**Architecture:** Two repos. `backend-rc` gets one migration (replace `status` with `stage`, add scheduling columns, add `call_outcome` to touches) and route changes in `routes/outreachLeads.js` plus one new helper module. `admin-dashboard-rc` gets a new CSV import modal, a rewritten lead-actions modal, leads-page filter/column/sort changes, a call-script builder in `outreach-templates.ts`, an API-client update, a sidebar badge, and a one-line change to the email send route. The frontend only ever talks to the backend through `src/lib/api-client.ts` and the existing `/api/email/lead-outreach` route.

**Tech Stack:** Node + Express + `pg` + `node-pg-migrate` (backend); Next.js App Router + React + TypeScript + Tailwind + `zod` (frontend). No test runner in either repo — verification is `node scripts/verify-*.js` DB-level scripts (backend, pattern: `scripts/verify-phase1-marketing.js`) and `npx tsc --noEmit` + `npm run lint` + manual exercise (frontend).

**Spec:** `docs/superpowers/specs/2026-09-01-cold-calling-lead-workflow-design.md`

## Global Constraints

- **No new runtime dependencies** in either repo. CSV parsing is hand-rolled. Backend deps are exactly: `bcryptjs, cors, dotenv, express, jsonwebtoken, morgan, pg`.
- **Migration filename:** `1784000000000_add-outreach-lead-calling.js`. The `1783800000000` / `1783900000000` slots are taken by an unmerged `data-deletion-compliance` branch — do not reuse them.
- **`stage` values (exact, 10):** `new`, `qualified`, `disqualified`, `attempting`, `callback_scheduled`, `interested`, `examples_sent`, `won`, `lost`, `do_not_contact`.
- **`call_outcome` values (exact, 7):** `no_answer`, `voicemail`, `gatekeeper`, `wrong_number`, `interested`, `callback`, `not_interested`.
- **`source` values (exact, 6):** `google_maps`, `facebook`, `instagram`, `craigslist`, `cslb`, `csv_import`.
- **`do_not_contact` is server-only.** No client input (`POST`, `PATCH`, manual override) may set or clear it.
- **`MIN_QUALIFYING_REVIEWS = 10`** (from the article).
- **CSV import cap:** 500 rows; refuse above.
- All `outreach-leads` routes stay `authMiddleware, requireAdminRole`.
- Both repos: work on a branch named `cold-calling-lead-workflow`. Commit after every task. Never commit to `main`.
- Frontend copy rules (repo `CLAUDE.md`): no emojis, no em-dashes.

---

## File Structure

### backend-rc

| File | Action | Responsibility |
|---|---|---|
| `migrations/1784000000000_add-outreach-lead-calling.js` | create | schema change: `status`→`stage`, scheduling columns, `call_outcome`, `csv_import` source |
| `lib/outreachLeadStage.js` | create | pure stage logic: `MIN_QUALIFYING_REVIEWS`, `computeInitialStage`, `applyCallOutcome`, the value sets |
| `routes/outreachLeads.js` | modify | consume the new module; `dueOnly`/`sort` on `GET /`; new `GET /due-count`; `PATCH` scheduling fields; `POST /:id/touches` transitions |
| `scripts/verify-outreach-calling.js` | create | DB-level verification of the migration + route behaviour |

### admin-dashboard-rc

| File | Action | Responsibility |
|---|---|---|
| `src/lib/csv/parse-delimited.ts` | create | dependency-free CSV parser (quoted fields, embedded commas/newlines, header row) |
| `src/lib/outreach-templates.ts` | modify | add `buildCallScript` (pure, no network) |
| `src/lib/api-client.ts` | modify | retype outreach methods for `stage`/`dueOnly`/`sort`/`callOutcome`/`nextActionAt`; add `getOutreachDueCount` |
| `src/components/leads/LeadCsvImportModal.tsx` | create | upload -> column-map -> batch fields -> preview -> bulk save |
| `src/components/leads/LeadActionsModal.tsx` | modify | call script, call-history timeline, log-call-with-outcome, reschedule, stage-gated email, stage override |
| `src/app/(admin)/(others-pages)/leads/page.tsx` | modify | `stage` filter, `csv_import` source, "Follow-ups due" toggle, Phone/Next action/Attempts columns, "Import CSV" button, default sort |
| `src/app/api/email/lead-outreach/route.ts` | modify | read `lead.stage` not `lead.status`; 409 unless stage in `interested`/`examples_sent` |
| `src/layout/AppSidebar.tsx` | modify | numeric badge on the flat "Leads" nav item from `getOutreachDueCount` |

---

## Task 1: Migration — stage machine, scheduling columns, call_outcome

**Files:**
- Create: `backend-rc/migrations/1784000000000_add-outreach-lead-calling.js`
- Create: `backend-rc/scripts/verify-outreach-calling.js` (migration section only in this task)
- Reference: `backend-rc/migrations/1783700000000_add-outreach-leads-tables.js` (current schema, constraint names)

**Interfaces:**
- Consumes: nothing.
- Produces: `outreach_leads.stage` (TEXT NOT NULL, default `'new'`, CHECK against the 10 values), `outreach_leads.next_action_at` (TIMESTAMPTZ NULL), `outreach_leads.next_action_note` (TEXT NULL), `outreach_leads.attempt_count` (INTEGER NOT NULL default 0); `outreach_leads.status` column **dropped**; `outreach_leads.source` CHECK now allows `csv_import`; `outreach_lead_touches.call_outcome` (TEXT NULL, CHECK: NULL or one of the 7 values). Indexes `idx_outreach_leads_stage`, `idx_outreach_leads_next_action_at` (partial).

- [ ] **Step 1: Confirm the current constraint names**

Run: `cd backend-rc && npm run migrate:up` (ensure baseline is current), then
`psql "$DATABASE_URL" -c "\d public.outreach_leads"` (or use any DB client).
Expected: a `status` column with a CHECK constraint, a `source` CHECK constraint. Note their exact names (node-pg-migrate names inline column checks `<table>_<column>_check`, so expect `outreach_leads_status_check` and `outreach_leads_source_check`). If the names differ, use the real names in Step 2.

- [ ] **Step 2: Write the migration**

Create `backend-rc/migrations/1784000000000_add-outreach-lead-calling.js`:

```js
exports.shorthands = undefined;

const STAGE_CHECK =
  "stage IN ('new','qualified','disqualified','attempting','callback_scheduled','interested','examples_sent','won','lost','do_not_contact')";
const SOURCE_CHECK_NEW =
  "source IN ('google_maps','facebook','instagram','craigslist','cslb','csv_import')";
const SOURCE_CHECK_OLD =
  "source IN ('google_maps','facebook','instagram','craigslist','cslb')";
const STATUS_CHECK_OLD =
  "status IN ('new','needs_email_lookup','ready_to_send','contacted','responded','not_interested','converted','do_not_contact')";
const CALL_OUTCOME_CHECK =
  "call_outcome IS NULL OR call_outcome IN ('no_answer','voicemail','gatekeeper','wrong_number','interested','callback','not_interested')";

exports.up = (pgm) => {
  pgm.addColumns(
    { schema: "public", name: "outreach_leads" },
    {
      stage: { type: "TEXT" }, // nullable during backfill
      next_action_at: { type: "TIMESTAMPTZ" },
      next_action_note: { type: "TEXT" },
      attempt_count: { type: "INTEGER", notNull: true, default: 0 },
    },
  );

  pgm.sql(`
    UPDATE public.outreach_leads SET stage = CASE status
      WHEN 'new' THEN 'new'
      WHEN 'needs_email_lookup' THEN 'new'
      WHEN 'ready_to_send' THEN 'qualified'
      WHEN 'contacted' THEN 'attempting'
      WHEN 'responded' THEN 'interested'
      WHEN 'not_interested' THEN 'lost'
      WHEN 'converted' THEN 'won'
      WHEN 'do_not_contact' THEN 'do_not_contact'
      ELSE 'new'
    END;
  `);

  pgm.alterColumn(
    { schema: "public", name: "outreach_leads" },
    "stage",
    { notNull: true, default: "new" },
  );
  pgm.addConstraint(
    { schema: "public", name: "outreach_leads" },
    "outreach_leads_stage_check",
    `CHECK (${STAGE_CHECK})`,
  );

  pgm.dropIndex("outreach_leads", ["status"], {
    name: "idx_outreach_leads_status",
    ifExists: true,
  });
  pgm.dropColumns({ schema: "public", name: "outreach_leads" }, ["status"]);

  pgm.createIndex("outreach_leads", ["stage"], {
    name: "idx_outreach_leads_stage",
  });
  pgm.createIndex("outreach_leads", ["next_action_at"], {
    name: "idx_outreach_leads_next_action_at",
    where: "next_action_at IS NOT NULL",
  });

  // Swap the source CHECK to include csv_import.
  pgm.dropConstraint(
    { schema: "public", name: "outreach_leads" },
    "outreach_leads_source_check",
    { ifExists: true },
  );
  pgm.addConstraint(
    { schema: "public", name: "outreach_leads" },
    "outreach_leads_source_check",
    `CHECK (${SOURCE_CHECK_NEW})`,
  );

  pgm.addColumns(
    { schema: "public", name: "outreach_lead_touches" },
    { call_outcome: { type: "TEXT" } },
  );
  pgm.addConstraint(
    { schema: "public", name: "outreach_lead_touches" },
    "outreach_lead_touches_call_outcome_check",
    `CHECK (${CALL_OUTCOME_CHECK})`,
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    { schema: "public", name: "outreach_lead_touches" },
    "outreach_lead_touches_call_outcome_check",
    { ifExists: true },
  );
  pgm.dropColumns({ schema: "public", name: "outreach_lead_touches" }, [
    "call_outcome",
  ]);

  pgm.dropConstraint(
    { schema: "public", name: "outreach_leads" },
    "outreach_leads_source_check",
    { ifExists: true },
  );
  pgm.addConstraint(
    { schema: "public", name: "outreach_leads" },
    "outreach_leads_source_check",
    `CHECK (${SOURCE_CHECK_OLD})`,
  );

  pgm.addColumns(
    { schema: "public", name: "outreach_leads" },
    { status: { type: "TEXT" } },
  );
  // Lossy reverse: callback_scheduled and disqualified have no status equivalent.
  pgm.sql(`
    UPDATE public.outreach_leads SET status = CASE stage
      WHEN 'new' THEN 'new'
      WHEN 'qualified' THEN 'ready_to_send'
      WHEN 'disqualified' THEN 'new'
      WHEN 'attempting' THEN 'contacted'
      WHEN 'callback_scheduled' THEN 'contacted'
      WHEN 'interested' THEN 'responded'
      WHEN 'examples_sent' THEN 'contacted'
      WHEN 'won' THEN 'converted'
      WHEN 'lost' THEN 'not_interested'
      WHEN 'do_not_contact' THEN 'do_not_contact'
      ELSE 'new'
    END;
  `);
  pgm.alterColumn({ schema: "public", name: "outreach_leads" }, "status", {
    notNull: true,
    default: "new",
  });
  pgm.addConstraint(
    { schema: "public", name: "outreach_leads" },
    "outreach_leads_status_check",
    `CHECK (${STATUS_CHECK_OLD})`,
  );
  pgm.createIndex("outreach_leads", ["status"], {
    name: "idx_outreach_leads_status",
  });

  pgm.dropIndex("outreach_leads", ["next_action_at"], {
    name: "idx_outreach_leads_next_action_at",
    ifExists: true,
  });
  pgm.dropIndex("outreach_leads", ["stage"], {
    name: "idx_outreach_leads_stage",
    ifExists: true,
  });
  pgm.dropConstraint(
    { schema: "public", name: "outreach_leads" },
    "outreach_leads_stage_check",
    { ifExists: true },
  );
  pgm.dropColumns({ schema: "public", name: "outreach_leads" }, [
    "stage",
    "next_action_at",
    "next_action_note",
    "attempt_count",
  ]);
};
```

- [ ] **Step 3: Write the migration-section verification script**

Create `backend-rc/scripts/verify-outreach-calling.js`:

```js
"use strict";
require("dotenv").config({ path: ".env.local" });
const pool = require("../db");

let passed = 0;
let failed = 0;
const ok = (l) => { console.log(`  ✓  ${l}`); passed++; };
const fail = (l, d) => { console.error(`  ✗  ${l}`); if (d) console.error(`       ${d}`); failed++; };

async function main() {
  // --- Migration shape ---
  const cols = await pool.query(
    `SELECT column_name, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name='outreach_leads'`,
  );
  const byName = Object.fromEntries(cols.rows.map((r) => [r.column_name, r]));
  byName.stage ? ok("outreach_leads.stage exists") : fail("outreach_leads.stage missing");
  !byName.status ? ok("outreach_leads.status dropped") : fail("outreach_leads.status still present");
  byName.next_action_at ? ok("next_action_at exists") : fail("next_action_at missing");
  byName.next_action_note ? ok("next_action_note exists") : fail("next_action_note missing");
  byName.attempt_count && byName.attempt_count.is_nullable === "NO"
    ? ok("attempt_count NOT NULL") : fail("attempt_count wrong");

  const tcols = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='outreach_lead_touches' AND column_name='call_outcome'`,
  );
  tcols.rows.length === 1 ? ok("outreach_lead_touches.call_outcome exists") : fail("call_outcome missing");

  // --- CHECK constraints enforce the enums ---
  const badStage = await pool
    .query(
      `INSERT INTO public.outreach_leads (business_name, source, tier, stage)
       VALUES ('verify-bad-stage','csv_import','small','bogus') RETURNING id`,
    )
    .then(() => "inserted")
    .catch((e) => e.code);
  badStage === "23514" ? ok("stage CHECK rejects unknown value") : fail("stage CHECK not enforced", String(badStage));

  const csvSource = await pool
    .query(
      `INSERT INTO public.outreach_leads (business_name, source, tier, stage)
       VALUES ('verify-csv-source','csv_import','small','new') RETURNING id`,
    )
    .then((r) => r.rows[0].id)
    .catch((e) => { fail("source CHECK rejects csv_import", e.message); return null; });
  if (csvSource) {
    ok("source CHECK allows csv_import");
    await pool.query(`DELETE FROM public.outreach_leads WHERE id=$1`, [csvSource]);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed ? 1 : 0);
}
main();
```

- [ ] **Step 4: Run the migration and the verification script**

Run:
```bash
cd backend-rc
npm run migrate:up
node scripts/verify-outreach-calling.js
```
Expected: migration applies with no error; verify script prints all migration-section checks passing, `0 failed`.

- [ ] **Step 5: Test the down migration, then re-apply**

Run:
```bash
cd backend-rc
npm run migrate:down
psql "$DATABASE_URL" -c "\d public.outreach_leads" | grep -E "status|stage"
npm run migrate:up
```
Expected: after `down`, `status` is back and `stage` is gone; after `up`, `stage` is back. No errors either direction.

- [ ] **Step 6: Commit**

```bash
cd backend-rc
git checkout -b cold-calling-lead-workflow
git add migrations/1784000000000_add-outreach-lead-calling.js scripts/verify-outreach-calling.js
git commit -m "feat: migrate outreach leads to call-first stage machine

Replace status with a 10-value stage enum, add next_action_at /
next_action_note / attempt_count, add call_outcome to touches, allow
csv_import source.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Stage logic module

**Files:**
- Create: `backend-rc/lib/outreachLeadStage.js`
- Modify: `backend-rc/scripts/verify-outreach-calling.js` (add a stage-logic section)

**Interfaces:**
- Consumes: nothing (pure module).
- Produces:
  - `MIN_QUALIFYING_REVIEWS` = `10`
  - `STAGES: Set<string>` (the 10 values)
  - `CALL_OUTCOMES: Set<string>` (the 7 values)
  - `SELF_HEAL_STAGES: Set<string>` = `{ 'new', 'qualified', 'attempting', 'callback_scheduled' }`
  - `TERMINAL_STAGES: Set<string>` = `{ 'won', 'lost', 'disqualified', 'do_not_contact' }`
  - `computeInitialStage({ isExistingCustomer, websiteUrl, reviewCount }): string`
  - `applyCallOutcome(currentStage, callOutcome): { stage: string, incrementAttempt: boolean, clearNextAction: boolean }`

- [ ] **Step 1: Write the stage-logic verification section**

Append to `main()` in `backend-rc/scripts/verify-outreach-calling.js`, before the `console.log` summary line:

```js
  // --- Stage logic (lib/outreachLeadStage.js) ---
  const stageLib = require("../lib/outreachLeadStage");

  stageLib.computeInitialStage({ isExistingCustomer: true, websiteUrl: null, reviewCount: 99 }) === "do_not_contact"
    ? ok("computeInitialStage: tenant match -> do_not_contact")
    : fail("computeInitialStage: tenant match");
  stageLib.computeInitialStage({ isExistingCustomer: false, websiteUrl: "http://x.com", reviewCount: 99 }) === "disqualified"
    ? ok("computeInitialStage: has website -> disqualified")
    : fail("computeInitialStage: has website");
  stageLib.computeInitialStage({ isExistingCustomer: false, websiteUrl: "", reviewCount: 10 }) === "qualified"
    ? ok("computeInitialStage: >=10 reviews, no site -> qualified")
    : fail("computeInitialStage: qualified boundary");
  stageLib.computeInitialStage({ isExistingCustomer: false, websiteUrl: null, reviewCount: 9 }) === "new"
    ? ok("computeInitialStage: <10 reviews -> new")
    : fail("computeInitialStage: new fallback");
  stageLib.computeInitialStage({ isExistingCustomer: false, websiteUrl: null, reviewCount: null }) === "new"
    ? ok("computeInitialStage: null reviews -> new")
    : fail("computeInitialStage: null reviews");

  const t1 = stageLib.applyCallOutcome("qualified", "no_answer");
  t1.stage === "attempting" && t1.incrementAttempt === true && t1.clearNextAction === false
    ? ok("applyCallOutcome: no_answer -> attempting, +attempt")
    : fail("applyCallOutcome: no_answer", JSON.stringify(t1));
  const t2 = stageLib.applyCallOutcome("attempting", "callback");
  t2.stage === "callback_scheduled"
    ? ok("applyCallOutcome: callback -> callback_scheduled")
    : fail("applyCallOutcome: callback", JSON.stringify(t2));
  const t3 = stageLib.applyCallOutcome("callback_scheduled", "interested");
  t3.stage === "interested" && t3.clearNextAction === true
    ? ok("applyCallOutcome: interested -> interested, clears next action")
    : fail("applyCallOutcome: interested", JSON.stringify(t3));
  const t4 = stageLib.applyCallOutcome("attempting", "not_interested");
  t4.stage === "lost" ? ok("applyCallOutcome: not_interested -> lost") : fail("applyCallOutcome: not_interested", JSON.stringify(t4));
  const t5 = stageLib.applyCallOutcome("qualified", "wrong_number");
  t5.stage === "disqualified" ? ok("applyCallOutcome: wrong_number -> disqualified") : fail("applyCallOutcome: wrong_number", JSON.stringify(t5));
  const t6 = stageLib.applyCallOutcome("won", "no_answer");
  t6.stage === "won" ? ok("applyCallOutcome: terminal stage unchanged") : fail("applyCallOutcome: terminal guard", JSON.stringify(t6));
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd backend-rc && node scripts/verify-outreach-calling.js`
Expected: FAIL — `Cannot find module '../lib/outreachLeadStage'`.

- [ ] **Step 3: Write the module**

Create `backend-rc/lib/outreachLeadStage.js`:

```js
"use strict";

const MIN_QUALIFYING_REVIEWS = 10;

const STAGES = new Set([
  "new",
  "qualified",
  "disqualified",
  "attempting",
  "callback_scheduled",
  "interested",
  "examples_sent",
  "won",
  "lost",
  "do_not_contact",
]);

const CALL_OUTCOMES = new Set([
  "no_answer",
  "voicemail",
  "gatekeeper",
  "wrong_number",
  "interested",
  "callback",
  "not_interested",
]);

// Stages the GET /:id self-heal may overwrite with do_not_contact — those where
// no real conversation has happened yet. Excludes interested/examples_sent/won/
// lost so a real funnel outcome is never silently discarded.
const SELF_HEAL_STAGES = new Set([
  "new",
  "qualified",
  "attempting",
  "callback_scheduled",
]);

// Stages the auto-advance machine leaves alone.
const TERMINAL_STAGES = new Set(["won", "lost", "disqualified", "do_not_contact"]);

// Initial stage for a freshly inserted lead (any source).
function computeInitialStage({ isExistingCustomer, websiteUrl, reviewCount }) {
  if (isExistingCustomer) return "do_not_contact";
  if (typeof websiteUrl === "string" && websiteUrl.trim() !== "") return "disqualified";
  if (typeof reviewCount === "number" && reviewCount >= MIN_QUALIFYING_REVIEWS) return "qualified";
  return "new";
}

// Given the lead's current stage and a logged call outcome, return the resulting
// stage and side-effect flags. Never moves a terminal lead.
function applyCallOutcome(currentStage, callOutcome) {
  if (TERMINAL_STAGES.has(currentStage)) {
    return { stage: currentStage, incrementAttempt: false, clearNextAction: false };
  }
  switch (callOutcome) {
    case "no_answer":
    case "voicemail":
    case "gatekeeper":
      return { stage: "attempting", incrementAttempt: true, clearNextAction: false };
    case "wrong_number":
      return { stage: "disqualified", incrementAttempt: false, clearNextAction: true };
    case "callback":
      return { stage: "callback_scheduled", incrementAttempt: false, clearNextAction: false };
    case "interested":
      return { stage: "interested", incrementAttempt: false, clearNextAction: true };
    case "not_interested":
      return { stage: "lost", incrementAttempt: false, clearNextAction: true };
    default:
      return { stage: currentStage, incrementAttempt: false, clearNextAction: false };
  }
}

module.exports = {
  MIN_QUALIFYING_REVIEWS,
  STAGES,
  CALL_OUTCOMES,
  SELF_HEAL_STAGES,
  TERMINAL_STAGES,
  computeInitialStage,
  applyCallOutcome,
};
```

- [ ] **Step 4: Run the verification script**

Run: `cd backend-rc && node scripts/verify-outreach-calling.js`
Expected: PASS — every migration-section and stage-logic check passes, `0 failed`.

- [ ] **Step 5: Commit**

```bash
cd backend-rc
git add lib/outreachLeadStage.js scripts/verify-outreach-calling.js
git commit -m "feat: add outreach lead stage-logic module

computeInitialStage (qualification) and applyCallOutcome (call-outcome
transition table), plus the shared value sets.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: POST /outreach-leads initial stage + GET filters/sort + GET /due-count

**Files:**
- Modify: `backend-rc/routes/outreachLeads.js`
- Modify: `backend-rc/scripts/verify-outreach-calling.js` (add a routes section)

**Interfaces:**
- Consumes: `lib/outreachLeadStage.js` (`STAGES`, `computeInitialStage`, `TERMINAL_STAGES`, `MIN_QUALIFYING_REVIEWS`), `lib/outreachLeadHelpers.js` (`findExistingTenantOrProspect`, `findDuplicateLead`).
- Produces:
  - `POST /outreach-leads` writes `stage` (via `computeInitialStage`) instead of `status`.
  - `GET /outreach-leads` accepts `stage` (validated), `dueOnly` (`"true"`), `sort` (`"reviews_desc"` default | `"next_action_asc"`), plus existing `source`/`tier`/`page`/`limit`. Response rows carry `stage`, `next_action_at`, `next_action_note`, `attempt_count`.
  - `GET /outreach-leads/due-count` -> `{ count: number }`.

- [ ] **Step 1: Add the routes verification section**

Append to `main()` in `verify-outreach-calling.js`, before the summary line. This talks to the DB directly (no running server needed) and also exercises the route module via a lightweight in-process Express app using the built-in `http` module is overkill — instead assert the SQL-shaped behaviour through helper calls and direct inserts:

```js
  // --- POST initial stage wiring (integration via a real insert path) ---
  // Simulate what POST / does: compute stage then insert.
  const { computeInitialStage } = require("../lib/outreachLeadStage");
  const insId = (
    await pool.query(
      `INSERT INTO public.outreach_leads (business_name, source, tier, stage, website_url, review_count)
       VALUES ('verify-qualify','csv_import','small',$1,$2,$3) RETURNING id`,
      [
        computeInitialStage({ isExistingCustomer: false, websiteUrl: null, reviewCount: 25 }),
        null,
        25,
      ],
    )
  ).rows[0].id;
  const insRow = (await pool.query(`SELECT stage FROM public.outreach_leads WHERE id=$1`, [insId])).rows[0];
  insRow.stage === "qualified" ? ok("insert path: 25 reviews, no site -> qualified") : fail("insert path stage", insRow.stage);
  await pool.query(`DELETE FROM public.outreach_leads WHERE id=$1`, [insId]);

  // --- dueOnly predicate ---
  const dueId = (
    await pool.query(
      `INSERT INTO public.outreach_leads (business_name, source, tier, stage, next_action_at)
       VALUES ('verify-due','csv_import','small','callback_scheduled', NOW() - INTERVAL '1 hour') RETURNING id`,
    )
  ).rows[0].id;
  const notDueId = (
    await pool.query(
      `INSERT INTO public.outreach_leads (business_name, source, tier, stage, next_action_at)
       VALUES ('verify-notdue','csv_import','small','won', NOW() - INTERVAL '1 hour') RETURNING id`,
    )
  ).rows[0].id;
  const dueCount = (
    await pool.query(
      `SELECT COUNT(*)::int AS c FROM public.outreach_leads
        WHERE next_action_at IS NOT NULL AND next_action_at <= NOW()
          AND stage NOT IN ('won','lost','disqualified','do_not_contact')
          AND business_name LIKE 'verify-%'`,
    )
  ).rows[0].c;
  dueCount === 1 ? ok("dueOnly predicate: counts overdue non-terminal only") : fail("dueOnly predicate", String(dueCount));
  await pool.query(`DELETE FROM public.outreach_leads WHERE id = ANY($1)`, [[dueId, notDueId]]);
```

- [ ] **Step 2: Run it, confirm the new section fails**

Run: `cd backend-rc && node scripts/verify-outreach-calling.js`
Expected: FAIL on "insert path: ... -> qualified" only if the earlier tasks' code is missing; if Task 2 is done this section should already PASS because it exercises the DB + `computeInitialStage` directly. That is fine — the section is a regression guard. Proceed to wire the route.

- [ ] **Step 3: Rewire `POST /` and the constants in `routes/outreachLeads.js`**

At the top, replace the local `SOURCES`/`TIERS`/`STATUSES`/`SELF_HEAL_STATUSES` block. Keep `SOURCES` and `TIERS` but add `csv_import`; import the rest:

```js
const {
  STAGES,
  SELF_HEAL_STAGES,
  computeInitialStage,
  applyCallOutcome,
  CALL_OUTCOMES,
} = require("../lib/outreachLeadStage");

const SOURCES = new Set([
  "google_maps",
  "facebook",
  "instagram",
  "craigslist",
  "cslb",
  "csv_import",
]);
const TIERS = new Set(["small", "medium"]);
```

Delete the old `STATUSES` and `SELF_HEAL_STATUSES` constants.

In the `POST /` per-lead loop, replace the `status` derivation and the INSERT:

```js
        } else {
          const stage = computeInitialStage({
            isExistingCustomer,
            websiteUrl: raw?.websiteUrl || null,
            reviewCount: typeof raw?.reviewCount === "number" ? raw.reviewCount : null,
          });

          const insertResult = await client.query(
            `INSERT INTO public.outreach_leads (
              business_name, contact_name, email, phone, website_url,
              license_number, source, trade, city, tier, rating,
              review_count, stage, notes, raw_source_text
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
              stage,
              isExistingCustomer
                ? "Auto-flagged do_not_contact: email matches an existing tenant or prospect."
                : raw?.notes || null,
              raw?.rawSourceText || null,
            ],
          );
          leadRow = insertResult.rows[0];
          created.push({ ...leadRow, duplicateWarning: duplicate });
        }
```

- [ ] **Step 4: Rewire `GET /` (filter + sort + dueOnly)**

Replace the `status` filter block with `stage`, and add `dueOnly` + `sort`:

```js
    const { stage, source, tier, dueOnly, sort, page: pageRaw, limit: limitRaw } = req.query;
    const conditions = [];
    const values = [];

    if (stage) {
      if (!STAGES.has(stage)) {
        return res.status(400).json({ error: "Invalid stage", code: "INVALID_STAGE" });
      }
      values.push(stage);
      conditions.push(`stage = $${values.length}`);
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
    if (dueOnly === "true") {
      conditions.push(
        `next_action_at IS NOT NULL AND next_action_at <= NOW() AND stage NOT IN ('won','lost','disqualified','do_not_contact')`,
      );
    }

    const orderBy =
      sort === "next_action_asc"
        ? "next_action_at ASC NULLS LAST, created_at DESC"
        : "(stage = 'qualified') DESC, review_count DESC NULLS LAST, created_at DESC";
```

Then use `` `ORDER BY ${orderBy}` `` in place of the current `ORDER BY created_at DESC` in the paged query. The count query is unchanged except it uses the same `where`.

- [ ] **Step 5: Add `GET /due-count`**

Add above `router.get("/:id", ...)` so the literal path is matched before the `:id` param route:

```js
router.get(
  "/due-count",
  authMiddleware,
  requireAdminRole,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM public.outreach_leads
        WHERE next_action_at IS NOT NULL AND next_action_at <= NOW()
          AND stage NOT IN ('won','lost','disqualified','do_not_contact')`,
    );
    return res.json({ count: result.rows[0].count });
  }),
);
```

- [ ] **Step 6: Update the `GET /:id` self-heal**

In the `GET /:id` handler, change `SELF_HEAL_STATUSES.has(lead.status)` to `SELF_HEAL_STAGES.has(lead.stage)` and the UPDATE `SET status = 'do_not_contact'` to `SET stage = 'do_not_contact'`.

- [ ] **Step 7: Run verification + a manual server check**

Run:
```bash
cd backend-rc
node scripts/verify-outreach-calling.js
npm run dev   # in another shell
```
Then with a valid admin JWT (`TOKEN`):
```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/outreach-leads?stage=qualified&sort=reviews_desc" | head -c 400
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/outreach-leads/due-count"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/outreach-leads?stage=bogus" -o /dev/null -w "%{http_code}\n"
```
Expected: first returns `{ "leads": [...], "total": ... }`; second returns `{ "count": <int> }`; third prints `400`.

- [ ] **Step 8: Commit**

```bash
cd backend-rc
git add routes/outreachLeads.js scripts/verify-outreach-calling.js
git commit -m "feat: stage-aware POST/GET on outreach-leads + due-count

POST computes initial stage via computeInitialStage; GET filters by
stage, supports dueOnly + sort; new GET /due-count; self-heal retargeted
to stage.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: PATCH scheduling fields + POST /:id/touches transitions

**Files:**
- Modify: `backend-rc/routes/outreachLeads.js`
- Modify: `backend-rc/scripts/verify-outreach-calling.js` (add a touches section)

**Interfaces:**
- Consumes: `applyCallOutcome`, `CALL_OUTCOMES`, `STAGES`, `TERMINAL_STAGES` from `lib/outreachLeadStage.js`.
- Produces:
  - `PATCH /outreach-leads/:id` accepts `stage` (rejects `do_not_contact` from client), `nextActionAt` (ISO string or `null`), `nextActionNote` (string or `null`), plus existing `email`/`phone`/`websiteUrl`/`notes`. Adding an email that matches a tenant/prospect still forces `stage = 'do_not_contact'`.
  - `POST /outreach-leads/:id/touches` accepts `callOutcome`, `nextActionAt`, `nextActionNote` in addition to the existing fields. For `channel: 'call'`: validates `callOutcome`, applies `applyCallOutcome`, bumps `attempt_count`, sets/clears `next_action_*`. `callOutcome: 'callback'` without `nextActionAt` -> 400 `MISSING_CALLBACK_TIME`. For `channel: 'email'`: advances `interested` -> `examples_sent` (and leaves `examples_sent` as-is), no `call_outcome` stored. For `channel: 'text'`: advances `new` -> `attempting` only.

- [ ] **Step 1: Add the touches verification section**

Append to `verify-outreach-calling.js` `main()` before the summary. This drives the real SQL that the route will run, via `applyCallOutcome`:

```js
  // --- touches transitions (drives applyCallOutcome + the UPDATE the route runs) ---
  const { applyCallOutcome: apply } = require("../lib/outreachLeadStage");
  const leadT = (
    await pool.query(
      `INSERT INTO public.outreach_leads (business_name, source, tier, stage)
       VALUES ('verify-touch','csv_import','small','qualified') RETURNING id`,
    )
  ).rows[0].id;

  async function logCall(outcome, nextActionAt) {
    const cur = (await pool.query(`SELECT stage, attempt_count FROM public.outreach_leads WHERE id=$1`, [leadT])).rows[0];
    const t = apply(cur.stage, outcome);
    await pool.query(
      `INSERT INTO public.outreach_lead_touches (lead_id, channel, call_outcome, outcome_notes)
       VALUES ($1,'call',$2,'verify')`,
      [leadT, outcome],
    );
    await pool.query(
      `UPDATE public.outreach_leads
          SET stage = $1,
              attempt_count = attempt_count + $2,
              next_action_at = CASE WHEN $3::boolean THEN NULL WHEN $4::timestamptz IS NOT NULL THEN $4 ELSE next_action_at END,
              next_action_note = CASE WHEN $3::boolean THEN NULL ELSE next_action_note END,
              updated_at = NOW()
        WHERE id = $5`,
      [t.stage, t.incrementAttempt ? 1 : 0, t.clearNextAction, nextActionAt || null, leadT],
    );
    return (await pool.query(`SELECT stage, attempt_count, next_action_at FROM public.outreach_leads WHERE id=$1`, [leadT])).rows[0];
  }

  let r = await logCall("no_answer");
  r.stage === "attempting" && Number(r.attempt_count) === 1 ? ok("touch: no_answer -> attempting, attempt_count 1") : fail("touch no_answer", JSON.stringify(r));
  r = await logCall("voicemail");
  Number(r.attempt_count) === 2 ? ok("touch: voicemail increments attempt_count to 2") : fail("touch voicemail", JSON.stringify(r));
  r = await logCall("callback", new Date(Date.now() + 86400000).toISOString());
  r.stage === "callback_scheduled" && r.next_action_at ? ok("touch: callback -> callback_scheduled with next_action_at") : fail("touch callback", JSON.stringify(r));
  r = await logCall("interested");
  r.stage === "interested" && r.next_action_at === null ? ok("touch: interested -> interested, next_action_at cleared") : fail("touch interested", JSON.stringify(r));

  await pool.query(`DELETE FROM public.outreach_lead_touches WHERE lead_id=$1`, [leadT]);
  await pool.query(`DELETE FROM public.outreach_leads WHERE id=$1`, [leadT]);
```

- [ ] **Step 2: Run it — confirm the touches section passes as a spec of the intended SQL**

Run: `cd backend-rc && node scripts/verify-outreach-calling.js`
Expected: the touches section PASSES (it runs the intended SQL inline). It is the executable spec for Step 3's route code — the route must run equivalent SQL.

- [ ] **Step 3: Rewrite `PATCH /:id`**

Replace the handler body with:

```js
    const { stage, email, phone, websiteUrl, notes, nextActionAt, nextActionNote } =
      req.body ?? {};

    if (stage !== undefined) {
      if (!STAGES.has(stage)) {
        return res.status(400).json({ error: "Invalid stage", code: "INVALID_STAGE" });
      }
      if (stage === "do_not_contact") {
        return res.status(400).json({
          error: "do_not_contact is set automatically and cannot be set from the client",
          code: "STAGE_NOT_CLIENT_SETTABLE",
        });
      }
    }

    const existing = await pool.query(
      "SELECT * FROM public.outreach_leads WHERE id = $1",
      [req.params.id],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found", code: "LEAD_NOT_FOUND" });
    }
    const lead = existing.rows[0];

    const normalizedEmail =
      email !== undefined ? (email ? normalizeEmail(email) : null) : lead.email;

    let resolvedStage = stage !== undefined ? stage : lead.stage;
    if (email !== undefined && normalizedEmail && normalizedEmail !== lead.email) {
      const isExistingCustomer = await findExistingTenantOrProspect(pool, normalizedEmail);
      if (isExistingCustomer) resolvedStage = "do_not_contact";
    }

    const result = await pool.query(
      `UPDATE public.outreach_leads
       SET stage = $1,
           email = $2,
           phone = COALESCE($3, phone),
           website_url = COALESCE($4, website_url),
           notes = COALESCE($5, notes),
           next_action_at = CASE WHEN $6::text IS NULL THEN next_action_at
                                 WHEN $6 = '__CLEAR__' THEN NULL
                                 ELSE $6::timestamptz END,
           next_action_note = CASE WHEN $7::text IS NULL THEN next_action_note
                                   WHEN $7 = '__CLEAR__' THEN NULL
                                   ELSE $7 END,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        resolvedStage,
        normalizedEmail,
        phone !== undefined ? phone : null,
        websiteUrl !== undefined ? websiteUrl : null,
        notes !== undefined ? notes : null,
        nextActionAt === undefined ? null : nextActionAt === null ? "__CLEAR__" : nextActionAt,
        nextActionNote === undefined ? null : nextActionNote === null ? "__CLEAR__" : nextActionNote,
        req.params.id,
      ],
    );

    return res.json(result.rows[0]);
```

Note: the `__CLEAR__` sentinel distinguishes "field omitted, leave alone" (`null` param) from "explicitly clear this field" (client sent `null`). The API client (Task 7) sends `null` to clear and omits the key to leave alone.

- [ ] **Step 4: Rewrite `POST /:id/touches`**

Replace the handler body with:

```js
    const {
      channel,
      templateOpener,
      templateTier,
      resendMessageId,
      outcomeNotes,
      callOutcome,
      nextActionAt,
      nextActionNote,
    } = req.body ?? {};

    if (!["email", "call", "text"].includes(channel)) {
      return res.status(400).json({ error: "Invalid channel", code: "INVALID_CHANNEL" });
    }

    if (channel === "call") {
      if (!callOutcome || !CALL_OUTCOMES.has(callOutcome)) {
        return res.status(400).json({ error: "Invalid call outcome", code: "INVALID_CALL_OUTCOME" });
      }
      if (callOutcome === "callback" && !nextActionAt) {
        return res.status(400).json({
          error: "A callback time is required when the outcome is callback",
          code: "MISSING_CALLBACK_TIME",
        });
      }
    }

    const leadResult = await pool.query(
      "SELECT * FROM public.outreach_leads WHERE id = $1",
      [req.params.id],
    );
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found", code: "LEAD_NOT_FOUND" });
    }
    const lead = leadResult.rows[0];

    if (channel === "email" && lead.stage === "do_not_contact") {
      return res.status(409).json({
        error: "This lead is flagged do_not_contact and cannot be emailed",
        code: "LEAD_DO_NOT_CONTACT",
      });
    }

    const touchResult = await pool.query(
      `INSERT INTO public.outreach_lead_touches (
        lead_id, channel, call_outcome, template_opener, template_tier, resend_message_id, outcome_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        req.params.id,
        channel,
        channel === "call" ? callOutcome : null,
        templateOpener || null,
        templateTier || null,
        resendMessageId || null,
        outcomeNotes || null,
      ],
    );

    let nextStage = lead.stage;
    let incrementAttempt = false;
    let clearNextAction = false;
    let setNextActionAt = null;

    if (channel === "call") {
      const t = applyCallOutcome(lead.stage, callOutcome);
      nextStage = t.stage;
      incrementAttempt = t.incrementAttempt;
      clearNextAction = t.clearNextAction;
      if (callOutcome === "callback") setNextActionAt = nextActionAt;
    } else if (channel === "email") {
      if (lead.stage === "interested") nextStage = "examples_sent";
    } else if (channel === "text") {
      if (lead.stage === "new") nextStage = "attempting";
    }

    const updatedLeadResult = await pool.query(
      `UPDATE public.outreach_leads
          SET stage = $1,
              attempt_count = attempt_count + $2,
              next_action_at = CASE WHEN $3::boolean THEN NULL
                                    WHEN $4::timestamptz IS NOT NULL THEN $4
                                    ELSE next_action_at END,
              next_action_note = CASE WHEN $3::boolean THEN NULL
                                      WHEN $4::timestamptz IS NOT NULL THEN $5
                                      ELSE next_action_note END,
              updated_at = NOW()
        WHERE id = $6
        RETURNING *`,
      [
        nextStage,
        incrementAttempt ? 1 : 0,
        clearNextAction,
        setNextActionAt,
        nextActionNote || null,
        req.params.id,
      ],
    );

    return res.status(201).json({
      touch: touchResult.rows[0],
      lead: updatedLeadResult.rows[0],
    });
```

- [ ] **Step 5: Run verification + manual checks**

Run:
```bash
cd backend-rc
node scripts/verify-outreach-calling.js
```
Expected: all sections pass, `0 failed`.

With the dev server running and an admin `TOKEN`, create a lead then:
```bash
LID=<id of a qualified test lead>
curl -s -XPOST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"channel":"call","callOutcome":"callback"}' \
  "http://localhost:5000/api/outreach-leads/$LID/touches" -o /dev/null -w "%{http_code}\n"   # expect 400
curl -s -XPOST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"channel\":\"call\",\"callOutcome\":\"callback\",\"nextActionAt\":\"2026-09-05T21:00:00Z\",\"nextActionNote\":\"ask for Dave\"}" \
  "http://localhost:5000/api/outreach-leads/$LID/touches" | python -m json.tool   # expect stage callback_scheduled
curl -s -XPATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"stage":"do_not_contact"}' "http://localhost:5000/api/outreach-leads/$LID" -o /dev/null -w "%{http_code}\n"   # expect 400
```

- [ ] **Step 6: Commit**

```bash
cd backend-rc
git add routes/outreachLeads.js scripts/verify-outreach-calling.js
git commit -m "feat: call-outcome transitions + scheduling on outreach-leads

POST /:id/touches applies the call-outcome stage machine, bumps
attempt_count, and books/clears callbacks; PATCH accepts stage +
next_action_at/note and refuses client-set do_not_contact.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `buildCallScript` in outreach-templates.ts

**Files:**
- Modify: `admin-dashboard-rc/src/lib/outreach-templates.ts`
- Create: `admin-dashboard-rc/src/lib/__verify__/call-script.mjs` (throwaway assertion script; deleted at end of task)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface CallScript {
    opener: string;
    pitch: string[];
    objections: { objection: string; response: string }[];
  }
  export function buildCallScript(lead: {
    businessName: string;
    trade?: string | null;
    city?: string | null;
    reviewCount?: number | null;
  }): CallScript
  ```

- [ ] **Step 1: Write the throwaway assertion script**

Create `admin-dashboard-rc/src/lib/__verify__/call-script.mjs`:

```js
import assert from "node:assert";
import { execSync } from "node:child_process";
// Compile the TS module to a temp JS file and import it.
execSync("npx tsc src/lib/outreach-templates.ts --outDir .verify-out --module es2022 --target es2022 --moduleResolution bundler --skipLibCheck", { stdio: "inherit" });
const { buildCallScript } = await import("../../../.verify-out/outreach-templates.js");

const full = buildCallScript({ businessName: "Ace Plumbing", trade: "plumbers", city: "Manchester", reviewCount: 42 });
assert.ok(full.opener.includes("Ace Plumbing"), "opener has business name");
assert.ok(full.opener.includes("42"), "opener has review count");
assert.ok(full.opener.includes("Manchester"), "opener has city");
assert.strictEqual(full.pitch.length, 3, "three pitch bullets");
assert.strictEqual(full.objections.length, 5, "five objections");

const bare = buildCallScript({ businessName: "Bob's", trade: null, city: null, reviewCount: null });
assert.ok(!bare.opener.toLowerCase().includes("null"), "no literal 'null' in opener");
assert.ok(!/\bnull\b/.test(bare.pitch.join(" ")), "no literal 'null' in pitch");
console.log("call-script assertions passed");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd admin-dashboard-rc && node src/lib/__verify__/call-script.mjs`
Expected: FAIL — `buildCallScript` is not exported yet.

- [ ] **Step 3: Add `buildCallScript` to `outreach-templates.ts`**

Append to `src/lib/outreach-templates.ts`:

```ts
export interface CallScript {
  opener: string;
  pitch: string[];
  objections: { objection: string; response: string }[];
}

// Returns a weekday name roughly two business days out, for the "can I call you
// back on X" ask. Purely cosmetic; no timezone precision needed.
function suggestedCallbackDay(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date();
  d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  return days[d.getDay()];
}

export function buildCallScript(lead: {
  businessName: string;
  trade?: string | null;
  city?: string | null;
  reviewCount?: number | null;
}): CallScript {
  const tradePlural = lead.trade?.trim() || "local businesses";
  const tradeSingular = tradePlural.replace(/s$/, "");
  const city = lead.city?.trim() || "your area";
  const reviews =
    typeof lead.reviewCount === "number" && lead.reviewCount > 0
      ? `your ${lead.reviewCount} reviews on Google Maps`
      : "your Google Maps listing";

  return {
    opener:
      `Hi, is that ${lead.businessName}? I came across ${reviews} and noticed you do not have a website yet. ` +
      `I build websites for ${tradePlural} in ${city}. Is now a bad time for a quick two-minute chat?`,
    pitch: [
      `What I do: a clean, professional site, usually live within a week, built and hosted for you.`,
      `I have done this for other ${tradePlural} nearby. It tends to pay for itself the first time someone finds you on Google instead of a competitor.`,
      `The ask: let me put together a couple of free mockups for ${lead.businessName} so you can see it. Could I call you back ${suggestedCallbackDay()} to walk through them?`,
    ],
    objections: [
      {
        objection: "I do not need a website",
        response: `Can I show you what comes up when someone searches for a ${tradeSingular} in ${city} right now? Usually it is your competitors, not you.`,
      },
      {
        objection: "I get all my work by word of mouth",
        response: `That is the best kind of work. A site is just where those referrals check you out before they call. Right now they find nothing, or an old social page.`,
      },
      {
        objection: "Someone is already building one for me",
        response: `No problem. Happy to be a second set of eyes on it before it goes live, no charge.`,
      },
      {
        objection: "How much is it?",
        response: `It depends what you need, and I would rather show you the mockups first so we are talking about something real. Can I send those over?`,
      },
      {
        objection: "Just email me the details",
        response: `Will do. What is the best address? I will send a couple of examples and a short note, then follow up in a few days.`,
      },
    ],
  };
}
```

- [ ] **Step 4: Run the assertion script**

Run: `cd admin-dashboard-rc && node src/lib/__verify__/call-script.mjs`
Expected: PASS — "call-script assertions passed".

- [ ] **Step 5: Type-check, then delete the throwaway script**

Run:
```bash
cd admin-dashboard-rc
npx tsc --noEmit
rm -rf src/lib/__verify__ .verify-out
```
Expected: `tsc --noEmit` clean.

- [ ] **Step 6: Commit**

```bash
cd admin-dashboard-rc
git add src/lib/outreach-templates.ts
git commit -m "feat: add buildCallScript for the cold-call flow

Pure function returning opener, three-bullet pitch, and the five
objection responses from the game plan, with null-safe merge fields.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Dependency-free CSV parser

**Files:**
- Create: `admin-dashboard-rc/src/lib/csv/parse-delimited.ts`
- Create: `admin-dashboard-rc/src/lib/csv/__verify__/parse.mjs` (throwaway; deleted at end)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface ParsedCsv { headers: string[]; rows: string[][]; }
  // Throws Error("CSV has no header row") on empty input.
  export function parseDelimited(text: string): ParsedCsv
  ```
  Handles: quoted fields, commas inside quotes, `""` escaped quotes, `\r\n` and `\n` line endings, a trailing newline. Blank lines are skipped.

- [ ] **Step 1: Write the throwaway assertion script**

Create `admin-dashboard-rc/src/lib/csv/__verify__/parse.mjs`:

```js
import assert from "node:assert";
import { execSync } from "node:child_process";
execSync("npx tsc src/lib/csv/parse-delimited.ts --outDir .verify-out --module es2022 --target es2022 --moduleResolution bundler --skipLibCheck", { stdio: "inherit" });
const { parseDelimited } = await import("../../../../.verify-out/parse-delimited.js");

const simple = parseDelimited("name,phone\nAce,555-1\nBob,555-2\n");
assert.deepStrictEqual(simple.headers, ["name", "phone"]);
assert.strictEqual(simple.rows.length, 2);
assert.deepStrictEqual(simple.rows[0], ["Ace", "555-1"]);

const quoted = parseDelimited('name,note\r\n"Ace, Inc.","he said ""hi"""\r\n');
assert.deepStrictEqual(quoted.rows[0], ["Ace, Inc.", 'he said "hi"']);

const embeddedNewline = parseDelimited('name,addr\n"Ace","1 Main St\nUnit 2"\n');
assert.deepStrictEqual(embeddedNewline.rows[0], ["Ace", "1 Main St\nUnit 2"]);

const blanks = parseDelimited("a,b\n\n1,2\n\n");
assert.strictEqual(blanks.rows.length, 1);

let threw = false;
try { parseDelimited("   "); } catch { threw = true; }
assert.ok(threw, "empty input throws");

console.log("csv parser assertions passed");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd admin-dashboard-rc && node src/lib/csv/__verify__/parse.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser**

Create `admin-dashboard-rc/src/lib/csv/parse-delimited.ts`:

```ts
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

// Minimal RFC-4180-ish CSV parser. Enough for browser-extension Google Maps
// exports: quoted fields, commas and newlines inside quotes, "" escapes.
export function parseDelimited(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    // Skip records that are entirely empty (blank line).
    if (!(record.length === 1 && record[0] === "")) records.push(record);
    record = [];
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      endField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRecord();
      i += 1;
      continue;
    }
    if (c === "\n") {
      endRecord();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // Flush trailing field/record if the file did not end with a newline.
  if (field !== "" || record.length > 0) endRecord();

  if (records.length === 0) throw new Error("CSV has no header row");

  const [headers, ...rows] = records;
  return { headers: headers.map((h) => h.trim()), rows };
}
```

- [ ] **Step 4: Run the assertion script**

Run: `cd admin-dashboard-rc && node src/lib/csv/__verify__/parse.mjs`
Expected: PASS — "csv parser assertions passed".

- [ ] **Step 5: Type-check and clean up**

Run:
```bash
cd admin-dashboard-rc
npx tsc --noEmit
rm -rf src/lib/csv/__verify__ .verify-out
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
cd admin-dashboard-rc
git add src/lib/csv/parse-delimited.ts
git commit -m "feat: add dependency-free CSV parser for lead import

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: API client — retype outreach methods + `getOutreachDueCount`

**Files:**
- Modify: `admin-dashboard-rc/src/lib/api-client.ts:512-568`

**Interfaces:**
- Consumes: the backend routes from Tasks 3-4.
- Produces:
  ```ts
  getOutreachLeads(params?: {
    stage?: string; source?: string; tier?: string;
    dueOnly?: boolean; sort?: "reviews_desc" | "next_action_asc";
    page?: number; limit?: number;
  }): Promise<{ leads: Record<string, unknown>[]; total: number; page: number; limit: number }>

  updateOutreachLead(id: string, patch: {
    stage?: string; email?: string | null; phone?: string | null;
    websiteUrl?: string | null; notes?: string | null;
    nextActionAt?: string | null; nextActionNote?: string | null;
  }): Promise<Record<string, unknown>>

  logOutreachTouch(id: string, touch: {
    channel: "call" | "text";
    callOutcome?: "no_answer" | "voicemail" | "gatekeeper" | "wrong_number" | "interested" | "callback" | "not_interested";
    outcomeNotes?: string;
    nextActionAt?: string;
    nextActionNote?: string;
  }): Promise<{ touch: Record<string, unknown>; lead: Record<string, unknown> }>

  getOutreachLeadTouches(id: string): Promise<Record<string, unknown>[]>

  getOutreachDueCount(): Promise<{ count: number }>
  ```

- [ ] **Step 1: Rewrite `getOutreachLeads`**

```ts
  async getOutreachLeads(params?: {
    stage?: string;
    source?: string;
    tier?: string;
    dueOnly?: boolean;
    sort?: 'reviews_desc' | 'next_action_asc';
    page?: number;
    limit?: number;
  }): Promise<{ leads: Record<string, unknown>[]; total: number; page: number; limit: number }> {
    const qs = new URLSearchParams();
    if (params?.stage) qs.set('stage', params.stage);
    if (params?.source) qs.set('source', params.source);
    if (params?.tier) qs.set('tier', params.tier);
    if (params?.dueOnly) qs.set('dueOnly', 'true');
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.get(`/outreach-leads${query}`);
  }
```

- [ ] **Step 2: Retype `updateOutreachLead` and `logOutreachTouch`, add `getOutreachDueCount`**

```ts
  async updateOutreachLead(
    id: string,
    patch: {
      stage?: string;
      email?: string | null;
      phone?: string | null;
      websiteUrl?: string | null;
      notes?: string | null;
      nextActionAt?: string | null;
      nextActionNote?: string | null;
    },
  ) {
    return this.patch(`/outreach-leads/${id}`, patch);
  }

  async logOutreachTouch(
    id: string,
    touch: {
      channel: 'call' | 'text';
      callOutcome?:
        | 'no_answer'
        | 'voicemail'
        | 'gatekeeper'
        | 'wrong_number'
        | 'interested'
        | 'callback'
        | 'not_interested';
      outcomeNotes?: string;
      nextActionAt?: string;
      nextActionNote?: string;
    },
  ) {
    return this.post(`/outreach-leads/${id}/touches`, touch);
  }

  async getOutreachDueCount(): Promise<{ count: number }> {
    return this.get(`/outreach-leads/due-count`);
  }
```

Leave `getOutreachLead`, `createOutreachLeads`, `getOutreachLeadTouches`, `sendLeadOutreachEmail` as they are.

- [ ] **Step 3: Type-check**

Run: `cd admin-dashboard-rc && npx tsc --noEmit`
Expected: errors ONLY in `leads/page.tsx` and `LeadActionsModal.tsx` (they still pass `status`) — those are fixed in Tasks 9-10. No errors in `api-client.ts` itself.

- [ ] **Step 4: Commit**

```bash
cd admin-dashboard-rc
git add src/lib/api-client.ts
git commit -m "feat: retype outreach API client for stage + scheduling + due-count

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: CSV import modal

**Files:**
- Create: `admin-dashboard-rc/src/components/leads/LeadCsvImportModal.tsx`
- Modify: `admin-dashboard-rc/src/app/(admin)/(others-pages)/leads/page.tsx` (add the "Import CSV" button + modal wiring only)

**Interfaces:**
- Consumes: `parseDelimited` (Task 6), `apiClient.createOutreachLeads`, `Modal`, `Button`, `Input`, `Label`, `Select`, `TextArea`.
- Produces: `<LeadCsvImportModal isOpen onClose onSaved />` — same prop shape as `LeadCaptureModal`.

- [ ] **Step 1: Build the modal**

Create `admin-dashboard-rc/src/components/leads/LeadCsvImportModal.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { parseDelimited } from "@/lib/csv/parse-delimited";

const MAX_ROWS = 500;

const TIER_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

type FieldKey = "businessName" | "phone" | "websiteUrl" | "rating" | "reviewCount" | "city";

const FIELD_LABELS: Record<FieldKey, string> = {
  businessName: "Business name (required)",
  phone: "Phone",
  websiteUrl: "Website",
  rating: "Rating",
  reviewCount: "Review count",
  city: "City",
};

const GUESSES: Record<FieldKey, string[]> = {
  businessName: ["name", "business", "title"],
  phone: ["phone", "telephone", "tel"],
  websiteUrl: ["website", "site", "url", "domain"],
  rating: ["rating", "stars", "score"],
  reviewCount: ["reviews", "review_count", "review count", "ratings", "user_ratings"],
  city: ["city", "town"],
};

function guessMapping(headers: string[]): Record<FieldKey, string> {
  const lower = headers.map((h) => h.toLowerCase());
  const out = {} as Record<FieldKey, string>;
  (Object.keys(GUESSES) as FieldKey[]).forEach((field) => {
    const hit = lower.findIndex((h) => GUESSES[field].some((g) => h.includes(g)));
    out[field] = hit >= 0 ? headers[hit] : "";
  });
  return out;
}

interface DraftRow {
  businessName: string;
  phone: string;
  websiteUrl: string;
  rating: number | null;
  reviewCount: number | null;
  city: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function LeadCsvImportModal({ isOpen, onClose, onSaved }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>);
  const [tier, setTier] = useState("small");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    setHeaders([]);
    setRawRows([]);
    setMapping({} as Record<FieldKey, string>);
    setDrafts([]);
    setError(null);
    setNotice(null);
  };

  const handleFile = async (file: File) => {
    setError(null);
    setDrafts([]);
    try {
      const text = await file.text();
      const parsed = parseDelimited(text);
      if (parsed.rows.length === 0) {
        setError("That CSV has a header row but no data rows.");
        return;
      }
      if (parsed.rows.length > MAX_ROWS) {
        setError(`That CSV has ${parsed.rows.length} rows. Split it into files of ${MAX_ROWS} or fewer.`);
        return;
      }
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(guessMapping(parsed.headers));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  const buildDrafts = () => {
    if (!mapping.businessName) {
      setError("Map the Business name column before continuing.");
      return;
    }
    const idx = (h: string) => headers.indexOf(h);
    const toNum = (v: string | undefined) => {
      if (!v) return null;
      const n = Number(v.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : null;
    };
    const next: DraftRow[] = rawRows
      .map((r) => ({
        businessName: (mapping.businessName ? r[idx(mapping.businessName)] : "")?.trim() || "",
        phone: (mapping.phone ? r[idx(mapping.phone)] : "")?.trim() || "",
        websiteUrl: (mapping.websiteUrl ? r[idx(mapping.websiteUrl)] : "")?.trim() || "",
        rating: mapping.rating ? toNum(r[idx(mapping.rating)]) : null,
        reviewCount: mapping.reviewCount ? toNum(r[idx(mapping.reviewCount)]) : null,
        city: (mapping.city ? r[idx(mapping.city)] : "")?.trim() || "",
      }))
      .filter((d) => d.businessName !== "");
    if (next.length === 0) {
      setError("No rows had a business name after mapping.");
      return;
    }
    setError(null);
    setDrafts(next);
  };

  const dupNames = useMemo(() => {
    const seen = new Map<string, number>();
    drafts.forEach((d) => {
      const k = d.businessName.trim().toLowerCase();
      seen.set(k, (seen.get(k) || 0) + 1);
    });
    return seen;
  }, [drafts]);

  const removeDraft = (i: number) => setDrafts((prev) => prev.filter((_, x) => x !== i));

  const handleSave = async () => {
    if (drafts.length === 0) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiClient.createOutreachLeads(
        drafts.map((d) => ({
          businessName: d.businessName,
          phone: d.phone || undefined,
          websiteUrl: d.websiteUrl || undefined,
          source: "csv_import",
          trade: trade || undefined,
          city: d.city || city || undefined,
          tier,
          rating: d.rating ?? undefined,
          reviewCount: d.reviewCount ?? undefined,
        })),
      );
      type CreatedLead = { duplicateWarning?: { matchedOn?: string } | null };
      const created = Array.isArray((response as { created?: CreatedLead[] } | null)?.created)
        ? (response as { created: CreatedLead[] }).created
        : [];
      const skipped = created.filter(
        (c) => c?.duplicateWarning?.matchedOn === "email" || c?.duplicateWarning?.matchedOn === "license_number",
      ).length;
      onSaved();
      if (skipped > 0) {
        setNotice(`${created.length - skipped} imported, ${skipped} already tracked (skipped).`);
      } else {
        reset();
        onClose();
      }
    } catch (e) {
      setError(getErrorMessage(e, "Failed to import leads"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} className="max-w-3xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Import CSV</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Tier</Label>
          <Select options={TIER_OPTIONS} defaultValue={tier} onChange={setTier} />
        </div>
        <div>
          <Label>Trade</Label>
          <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Plumbing" />
        </div>
        <div>
          <Label>City (fallback)</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="used when a row has none" />
        </div>
      </div>

      <div className="mt-4">
        <Label>CSV file</Label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm text-gray-600 dark:text-gray-300"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {notice && (
        <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-500">
          {notice}
        </p>
      )}

      {headers.length > 0 && drafts.length === 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Match your columns</p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(FIELD_LABELS) as FieldKey[]).map((field) => (
              <div key={field}>
                <Label>{FIELD_LABELS[field]}</Label>
                <Select
                  options={[{ value: "", label: "(none)" }, ...headers.map((h) => ({ value: h, label: h }))]}
                  defaultValue={mapping[field] || ""}
                  onChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={buildDrafts}>Preview {rawRows.length} rows</Button>
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-5 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2 pr-2">Business</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2">Website</th>
                <th className="py-2 pr-2">Reviews</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => {
                const isDup = (dupNames.get(d.businessName.trim().toLowerCase()) || 0) > 1;
                return (
                  <tr key={i} className={`border-b border-gray-100 dark:border-gray-800 ${isDup ? "bg-yellow-50 dark:bg-yellow-500/10" : ""}`}>
                    <td className="py-1 pr-2">
                      {d.businessName}
                      {isDup && <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-500">dup in file</span>}
                    </td>
                    <td className="py-1 pr-2">{d.phone || "-"}</td>
                    <td className="py-1 pr-2">{d.websiteUrl ? "yes" : "-"}</td>
                    <td className="py-1 pr-2">{d.reviewCount ?? "-"}</td>
                    <td className="py-1 pr-2">
                      <Button size="sm" variant="outline" onClick={() => removeDraft(i)}>Remove</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
        {drafts.length > 0 && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Importing..." : `Import ${drafts.length}`}
          </Button>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Wire the button into `leads/page.tsx`**

Add near the existing `isCaptureOpen` state:
```tsx
  const [isCsvOpen, setIsCsvOpen] = useState(false);
```
Add a button beside "Capture leads":
```tsx
          <Button variant="outline" onClick={() => setIsCsvOpen(true)}>Import CSV</Button>
```
Add the modal beside `<LeadCaptureModal ... />`:
```tsx
      <LeadCsvImportModal isOpen={isCsvOpen} onClose={() => setIsCsvOpen(false)} onSaved={loadLeads} />
```
Import it at the top:
```tsx
import LeadCsvImportModal from "@/components/leads/LeadCsvImportModal";
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
cd admin-dashboard-rc
npx tsc --noEmit
npm run lint
```
Expected: no new errors in `LeadCsvImportModal.tsx`. (`leads/page.tsx` still has pre-existing `status` errors from Task 7 — fixed in Task 9.)

- [ ] **Step 4: Manual exercise**

Run `npm run dev`, open `/leads`, click "Import CSV". Paste this into a file `test.csv` and upload:
```
Business Name,Phone,Website,Rating,Reviews,City
"Ace Plumbing, LLC",555-0100,,4.8,52,Manchester
Bob Electric,555-0111,http://bobelectric.com,4.2,11,Manchester
Cheap Fix,555-0122,,3.9,4,Salford
```
Expected: mapping auto-fills; preview shows 3 rows; save. On the leads list, Ace Plumbing is `qualified`, Bob Electric is `disqualified` (has website), Cheap Fix is `new` (4 reviews).

- [ ] **Step 5: Commit**

```bash
cd admin-dashboard-rc
git add src/components/leads/LeadCsvImportModal.tsx "src/app/(admin)/(others-pages)/leads/page.tsx"
git commit -m "feat: CSV import for extension-sourced lead lists

Upload, auto column mapping with manual correction, batch trade/tier/city,
in-file dup flag, bulk save via the existing POST /outreach-leads.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Leads page — stage filter, due toggle, columns, sort

**Files:**
- Modify: `admin-dashboard-rc/src/app/(admin)/(others-pages)/leads/page.tsx`

**Interfaces:**
- Consumes: `apiClient.getOutreachLeads` (Task 7 shape).
- Produces: `OutreachLead` type gains `stage`, `next_action_at`, `next_action_note`, `attempt_count`; loses `status`. Exported and imported by `LeadActionsModal` (Task 10).

- [ ] **Step 1: Update the `OutreachLead` interface**

Replace `status: string;` with:
```tsx
  stage: string;
  next_action_at: string | null;
  next_action_note: string | null;
  attempt_count: number;
```

- [ ] **Step 2: Replace the status options with stage options and add source `csv_import`**

```tsx
const STAGE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "disqualified", label: "Disqualified" },
  { value: "attempting", label: "Attempting" },
  { value: "callback_scheduled", label: "Callback scheduled" },
  { value: "interested", label: "Interested" },
  { value: "examples_sent", label: "Examples sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "do_not_contact", label: "Do not contact" },
];
```
Add `{ value: "csv_import", label: "CSV import" }` to `SOURCE_OPTIONS`.

- [ ] **Step 3: Swap `statusFilter` state for `stageFilter` + add `dueOnly`**

```tsx
  const [stageFilter, setStageFilter] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
```
Delete `statusFilter` / `setStatusFilter` / `handleStatusFilterChange`. Add:
```tsx
  const handleStageFilterChange = (value: string) => {
    setStageFilter(value);
    setPage(1);
  };
  const handleDueToggle = () => {
    setDueOnly((v) => !v);
    setPage(1);
  };
```

- [ ] **Step 4: Update `loadLeads` and the filter effect**

In `loadLeads`, change the params object:
```tsx
      const response = await apiClient.getOutreachLeads({
        stage: stageFilter || undefined,
        source: sourceFilter || undefined,
        tier: tierFilter || undefined,
        dueOnly: dueOnly || undefined,
        sort: dueOnly ? "next_action_asc" : "reviews_desc",
        page: targetPage,
        limit: PAGE_SIZE,
      });
```
Update the effect dependency array: replace `statusFilter` with `stageFilter, dueOnly`.

- [ ] **Step 5: Update the filter bar and table**

Filter bar: replace the status `<Select>` with:
```tsx
          <div className="w-48">
            <Select options={STAGE_OPTIONS} placeholder="All stages" onChange={handleStageFilterChange} />
          </div>
```
Add a due toggle button before "Capture leads":
```tsx
          <Button variant={dueOnly ? "primary" : "outline"} onClick={handleDueToggle}>
            {dueOnly ? "Showing follow-ups due" : "Follow-ups due"}
          </Button>
```
Table head: add `<th className="py-2 pr-4">Phone</th>` after Business, `<th className="py-2 pr-4">Next action</th>` after Status, `<th className="py-2 pr-4">Attempts</th>` after that. Rename the "Status" header to "Stage".
Table body: for each row, add:
```tsx
                  <td className="py-2 pr-4">{lead.phone || "-"}</td>
```
after the business cell; change `{lead.status}` to `{lead.stage}`; after the stage cell add:
```tsx
                  <td className="py-2 pr-4">
                    {lead.next_action_at
                      ? new Date(lead.next_action_at).toLocaleDateString() +
                        (lead.next_action_note ? ` - ${lead.next_action_note.slice(0, 30)}` : "")
                      : "-"}
                  </td>
                  <td className="py-2 pr-4">{lead.attempt_count || 0}</td>
```
Update the empty-state `colSpan={7}` to `colSpan={10}`.

- [ ] **Step 6: Type-check and lint**

Run:
```bash
cd admin-dashboard-rc
npx tsc --noEmit
npm run lint
```
Expected: `leads/page.tsx` clean. `LeadActionsModal.tsx` still errors (uses `lead.status`) — fixed next task.

- [ ] **Step 7: Manual exercise**

`npm run dev`, `/leads`: the stage dropdown filters; "Follow-ups due" toggles and (with a booked callback in the past from Task 4 testing) shows that lead; Phone / Next action / Attempts columns render.

- [ ] **Step 8: Commit**

```bash
cd admin-dashboard-rc
git add "src/app/(admin)/(others-pages)/leads/page.tsx"
git commit -m "feat: stage filter, follow-ups-due view, calling columns on leads page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Lead actions modal — call script, history, outcomes, scheduling, stage-gated email

**Files:**
- Modify: `admin-dashboard-rc/src/components/leads/LeadActionsModal.tsx`

**Interfaces:**
- Consumes: `buildCallScript` (Task 5), `apiClient.logOutreachTouch` / `updateOutreachLead` / `getOutreachLeadTouches` / `sendLeadOutreachEmail` (Task 7), `OutreachLead` (Task 9).
- Produces: no new exports; internal rewrite.

- [ ] **Step 1: Replace status references and the STATUS_OPTIONS list**

Change every `lead.status` to `lead.stage`. Replace `STATUS_OPTIONS` with:
```tsx
const STAGE_OVERRIDE_OPTIONS = [
  { value: "qualified", label: "Qualified" },
  { value: "disqualified", label: "Disqualified" },
  { value: "attempting", label: "Attempting" },
  { value: "interested", label: "Interested" },
  { value: "examples_sent", label: "Examples sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];
const CALL_OUTCOME_OPTIONS = [
  { value: "no_answer", label: "No answer" },
  { value: "voicemail", label: "Left voicemail" },
  { value: "gatekeeper", label: "Blocked by gatekeeper" },
  { value: "interested", label: "Interested" },
  { value: "callback", label: "Booked a callback" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_number", label: "Wrong number" },
];
```

- [ ] **Step 2: Add call-history state and fetch**

```tsx
  const [touches, setTouches] = useState<Record<string, unknown>[]>([]);
  const [callOutcome, setCallOutcome] = useState("no_answer");
  const [callbackAt, setCallbackAt] = useState("");
  const [callbackNote, setCallbackNote] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
```
In the existing `useEffect` keyed on `lead.id`, also load touches:
```tsx
    apiClient
      .getOutreachLeadTouches(lead.id)
      .then((rows) => setTouches(Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []))
      .catch(() => setTouches([]));
```

- [ ] **Step 3: Replace `handleLogTouch` with an outcome-aware version**

```tsx
  const handleLogCall = async () => {
    setIsLogging(true);
    setError(null);
    try {
      if (callChannel === "call") {
        if (callOutcome === "callback" && !callbackAt) {
          setError("Pick a callback date and time.");
          setIsLogging(false);
          return;
        }
        await apiClient.logOutreachTouch(lead.id, {
          channel: "call",
          callOutcome: callOutcome as
            | "no_answer" | "voicemail" | "gatekeeper" | "wrong_number"
            | "interested" | "callback" | "not_interested",
          outcomeNotes: callNotes || undefined,
          nextActionAt: callOutcome === "callback" ? new Date(callbackAt).toISOString() : undefined,
          nextActionNote: callOutcome === "callback" ? callbackNote || undefined : undefined,
        });
      } else {
        await apiClient.logOutreachTouch(lead.id, {
          channel: "text",
          outcomeNotes: callNotes || undefined,
        });
      }
      setCallNotes("");
      setCallbackAt("");
      setCallbackNote("");
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to log call"));
    } finally {
      setIsLogging(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleAt) return;
    setIsRescheduling(true);
    setError(null);
    try {
      await apiClient.updateOutreachLead(lead.id, {
        nextActionAt: new Date(rescheduleAt).toISOString(),
        nextActionNote: rescheduleNote || null,
      });
      setRescheduleAt("");
      setRescheduleNote("");
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reschedule"));
    } finally {
      setIsRescheduling(false);
    }
  };
```

- [ ] **Step 4: Update `handleStatusUpdate` -> `handleStageUpdate`**

```tsx
  const handleStageUpdate = async () => {
    if (!statusChoice) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await apiClient.updateOutreachLead(lead.id, { stage: statusChoice });
      onUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update stage"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };
```

- [ ] **Step 5: Gate the email section on stage**

Wrap the existing email entry + composer block so it renders only when:
```tsx
{lead.stage !== "do_not_contact" && (lead.stage === "interested" || lead.stage === "examples_sent") && (
  /* existing email entry + subject + body + send button */
)}
{lead.stage !== "do_not_contact" && lead.stage !== "interested" && lead.stage !== "examples_sent" && (
  <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
    Log an "Interested" call to unlock the examples email.
  </p>
)}
```
The `do_not_contact` red block stays as-is.

- [ ] **Step 6: Add the call-script and call-history render blocks**

Near the top of the modal body, after the status line:
```tsx
      {(() => {
        const script = buildCallScript({
          businessName: lead.business_name,
          trade: lead.trade,
          city: lead.city,
          reviewCount: lead.review_count,
        });
        return (
          <div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
            <p className="font-medium text-gray-700 dark:text-gray-200">Opening line</p>
            <p className="mt-1 text-gray-600 dark:text-gray-300">{script.opener}</p>
            <p className="mt-3 font-medium text-gray-700 dark:text-gray-200">Pitch</p>
            <ul className="mt-1 list-disc pl-5 text-gray-600 dark:text-gray-300">
              {script.pitch.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <p className="mt-3 font-medium text-gray-700 dark:text-gray-200">If they push back</p>
            <dl className="mt-1 space-y-1 text-gray-600 dark:text-gray-300">
              {script.objections.map((o, i) => (
                <div key={i}>
                  <dt className="italic">{o.objection}</dt>
                  <dd className="pl-3">{o.response}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })()}

      <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Call history</Label>
        {touches.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No calls or emails logged yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...touches].reverse().map((t) => (
              <li key={String(t.id)} className="border-b border-gray-100 pb-2 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(String(t.created_at)).toLocaleString()}
                </span>{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">{String(t.channel)}</span>
                {t.call_outcome ? ` - ${String(t.call_outcome).replace(/_/g, " ")}` : ""}
                {t.outcome_notes ? <div className="text-gray-600 dark:text-gray-300">{String(t.outcome_notes)}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
```

- [ ] **Step 7: Replace the "Log a call or text" block**

```tsx
      <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Log a call or text</Label>
        <div className="flex gap-3">
          <div className="w-32">
            <Select
              options={[{ value: "call", label: "Call" }, { value: "text", label: "Text" }]}
              defaultValue={callChannel}
              onChange={(v) => setCallChannel(v as "call" | "text")}
            />
          </div>
          {callChannel === "call" && (
            <div className="w-52">
              <Select options={CALL_OUTCOME_OPTIONS} defaultValue={callOutcome} onChange={setCallOutcome} />
            </div>
          )}
          <div className="flex-1">
            <TextArea rows={2} value={callNotes} onChange={setCallNotes} placeholder="Notes" />
          </div>
        </div>
        {callChannel === "call" && callOutcome === "callback" && (
          <div className="mt-3 flex gap-3">
            <input
              type="datetime-local"
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={callbackAt}
              onChange={(e) => setCallbackAt(e.target.value)}
            />
            <input
              className="h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={callbackNote}
              onChange={(e) => setCallbackNote(e.target.value)}
              placeholder="Callback note (optional)"
            />
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={handleLogCall} disabled={isLogging}>
            {isLogging ? "Logging..." : "Log"}
          </Button>
        </div>
      </div>

      {lead.stage !== "do_not_contact" && lead.stage !== "won" && lead.stage !== "lost" && (
        <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Label>Reschedule follow-up</Label>
          <div className="flex gap-3">
            <input
              type="datetime-local"
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
            />
            <input
              className="h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={rescheduleNote}
              onChange={(e) => setRescheduleNote(e.target.value)}
              placeholder="Note (optional)"
            />
            <Button variant="outline" onClick={handleReschedule} disabled={isRescheduling || !rescheduleAt}>
              {isRescheduling ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
```

Update the "Update status" block: label it "Update stage", use `STAGE_OVERRIDE_OPTIONS`, call `handleStageUpdate`.

- [ ] **Step 8: Type-check and lint**

Run:
```bash
cd admin-dashboard-rc
npx tsc --noEmit
npm run lint
```
Expected: both clean across the whole repo now (Task 7's downstream errors resolved).

- [ ] **Step 9: Manual exercise**

`npm run dev`, `/leads`, open a `qualified` lead:
- Call script renders with the business's name/reviews/trade/city.
- Log a call with "No answer" -> stage becomes `attempting`, Attempts 1, appears in call history.
- Log a call with "Booked a callback", pick a time -> stage `callback_scheduled`, shows in "Follow-ups due" when the time passes.
- Log a call with "Interested" -> stage `interested`; the examples email section appears.
- Send the examples email -> stage `examples_sent`, a new email row in call history.

- [ ] **Step 10: Commit**

```bash
cd admin-dashboard-rc
git add src/components/leads/LeadActionsModal.tsx
git commit -m "feat: calling-first lead modal - script, history, outcomes, scheduling

Adds the call script + objection card, a call-history timeline,
structured call outcomes with stage transitions, callback booking and
rescheduling, and gates the examples email on the interested stage.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Email route stage rename + sidebar due badge

**Files:**
- Modify: `admin-dashboard-rc/src/app/api/email/lead-outreach/route.ts:48-65`
- Modify: `admin-dashboard-rc/src/layout/AppSidebar.tsx`

**Interfaces:**
- Consumes: `apiClient.getOutreachDueCount` (Task 7); backend `GET /outreach-leads/:id` now returns `stage` (Task 3).
- Produces: nothing new.

- [ ] **Step 1: Update the email route gate**

In `src/app/api/email/lead-outreach/route.ts`, replace the gate block:

```ts
  const lead = await leadResponse.json();
  if (lead.stage === "do_not_contact") {
    return NextResponse.json(
      { error: "This lead is flagged do_not_contact and cannot be emailed", code: "LEAD_DO_NOT_CONTACT" },
      { status: 409 },
    );
  }
  if (lead.stage !== "interested" && lead.stage !== "examples_sent") {
    return NextResponse.json(
      { error: "The examples email is only available once a lead is interested", code: "LEAD_NOT_INTERESTED" },
      { status: 409 },
    );
  }
```

The touch POST at the bottom of this route already sends `channel: "email"`; the backend (Task 4) advances `interested` -> `examples_sent` from that. No other change needed here.

- [ ] **Step 2: Add due-count support to the sidebar flat items**

In `src/layout/AppSidebar.tsx`:

Add near the top of the component:
```tsx
  const [dueCount, setDueCount] = useState(0);
  useEffect(() => {
    apiClient
      .getOutreachDueCount()
      .then((r) => setDueCount(typeof r?.count === "number" ? r.count : 0))
      .catch(() => setDueCount(0));
  }, []);
```
(Import `apiClient` from `@/lib/api-client` and `useState`/`useEffect` if not already imported.)

Find where flat nav items (no `subItems`) render their `<Link>`. After the item label, add:
```tsx
                {nav.path === "/leads" && dueCount > 0 && (
                  <span className="ml-auto rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">
                    {dueCount}
                  </span>
                )}
```
Adjust `nav`/`item` to match the local variable name in that map. If flat items currently render label-only with no flex container, wrap the label + badge in `<span className="flex w-full items-center">`.

- [ ] **Step 3: Type-check and lint**

Run:
```bash
cd admin-dashboard-rc
npx tsc --noEmit
npm run lint
```
Expected: clean.

- [ ] **Step 4: Manual exercise**

With a lead in `callback_scheduled` whose `next_action_at` is in the past, load any admin page: the "Leads" sidebar item shows a numeric badge. Complete that callback (log an "Interested" call) and reload: badge count drops.

Also confirm: force-calling the email route for a `new`-stage lead returns 409 `LEAD_NOT_INTERESTED` (use the browser devtools or `curl` against `/api/email/lead-outreach`).

- [ ] **Step 5: Commit**

```bash
cd admin-dashboard-rc
git add src/app/api/email/lead-outreach/route.ts src/layout/AppSidebar.tsx
git commit -m "feat: stage-gate the examples email + due-count sidebar badge

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Full-flow verification pass

**Files:**
- None modified. This task runs the whole game-plan loop end to end and records the result.

- [ ] **Step 1: Backend regression**

Run:
```bash
cd backend-rc
node scripts/verify-outreach-calling.js
```
Expected: `0 failed`.

- [ ] **Step 2: Frontend gates**

Run:
```bash
cd admin-dashboard-rc
npx tsc --noEmit
npm run lint
```
Expected: both clean.

- [ ] **Step 3: End-to-end game-plan loop (both servers running)**

1. Import a CSV of ~10 businesses (mix of has-website and no-website, varying review counts).
2. Filter to `stage = qualified`, confirm the list is sorted highest-reviews-first.
3. Open the top lead, read the call script, log "No answer" -> `attempting`.
4. Same lead, log "Booked a callback" for 1 minute from now with a note.
5. Wait, toggle "Follow-ups due" -> the lead appears; sidebar badge shows 1.
6. Open it, log "Interested" -> `interested`, `next_action_at` cleared, badge back to 0.
7. Add an email, send the examples email -> `examples_sent`, call history shows call x2 + email.
8. Manually override stage to `won`.
9. Confirm a lead whose email matches an existing tenant imported as `do_not_contact` and its modal blocks the email.

- [ ] **Step 4: Record the result and merge-readiness**

Write a short note in the commit message of a final empty commit (or a PR description) summarising: verify script pass count, `tsc`/`lint` status, and which of the 9 end-to-end steps passed.

```bash
cd admin-dashboard-rc
git commit --allow-empty -m "chore: cold-calling workflow full-flow verification pass

verify-outreach-calling.js: <N> passed / 0 failed
tsc --noEmit: clean; npm run lint: clean
End-to-end loop steps 1-9: <result>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task |
|---|---|
| Data model: `stage`, `next_action_at`, `next_action_note`, `attempt_count`, drop `status`, `csv_import`, `call_outcome` | 1 |
| Backfill mapping + lossy `down` | 1 |
| `MIN_QUALIFYING_REVIEWS` constant | 2 |
| Contact-readiness now derived | 2 (not stored — `computeInitialStage` never emits `needs_email_lookup`/`ready_to_send`), 10 (email section gated on stage) |
| Stage machine (10 values) + terminal set | 2 |
| Call-outcome transition table | 2 (`applyCallOutcome`), 4 (route) |
| Email send advances to `examples_sent` | 4 (touches route), 11 (send-route gate) |
| Initial stage on insert (all sources) | 3 |
| CSV import flow (upload, map, batch fields, preview, dedupe, save) | 6 (parser), 8 (modal) |
| `buildCallScript` | 5 |
| Leads page: stage filter, due toggle, columns, sort, Import CSV button | 8 (button), 9 (rest) |
| `LeadActionsModal`: script, history, log-call+outcome, reschedule, gated email, stage override | 10 |
| Sidebar due badge | 11 |
| `api-client` retype + `getOutreachDueCount` | 7 |
| Backend routes: `GET` filter/sort/dueOnly, `GET /due-count`, `PATCH` fields, `POST /:id/touches` transitions, self-heal retarget | 3, 4 |
| Error handling table (CSV unparseable, >500 rows, unmapped required col, callback w/o time, client `do_not_contact`, email while not interested) | 6, 8, 4, 11 |
| Testing approach (verify script + tsc + manual) | every task; 12 consolidates |

No gaps.

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Every code step carries the actual code.

**3. Type consistency:**
- `computeInitialStage({ isExistingCustomer, websiteUrl, reviewCount })` — same shape in Tasks 2 and 3.
- `applyCallOutcome(currentStage, callOutcome) -> { stage, incrementAttempt, clearNextAction }` — same in Tasks 2, 4, and the Task 4 verify SQL.
- `buildCallScript(lead: { businessName, trade?, city?, reviewCount? })` — Task 5 definition matches the Task 10 call site (`businessName: lead.business_name`, etc.).
- `parseDelimited(text) -> { headers, rows }` — Task 6 definition matches Task 8 usage.
- API client method shapes in Task 7 match the call sites in Tasks 8 (`createOutreachLeads`), 9 (`getOutreachLeads`), 10 (`logOutreachTouch`, `updateOutreachLead`, `getOutreachLeadTouches`), 11 (`getOutreachDueCount`).
- `OutreachLead` gains `stage`/`next_action_at`/`next_action_note`/`attempt_count` in Task 9; Task 10 reads exactly those.
- Backend `PATCH` `__CLEAR__` sentinel: Task 7 client sends `null` to clear; Task 4 route maps `null -> "__CLEAR__"` — consistent.

Consistent throughout.
