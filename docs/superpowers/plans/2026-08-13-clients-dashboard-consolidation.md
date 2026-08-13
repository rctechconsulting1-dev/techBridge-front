# Clients Dashboard Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `/tenants` (2,120-line operational page) + `/clients` + `/clients/[id]` (thinner read-only duplicate) split with one page at `/clients`: a clean table plus a per-row drawer for all actions.

**Architecture:** Extract the two existing tenant-creation forms (Create Tenant, Invite Prospect) and the edit/resend/status actions out of `tenants/page.tsx` into standalone components (`CreateTenantModal`, `InviteProspectModal`, `ClientDrawer`), extract a presentational `ClientsTable`, then wire all four into a rebuilt `clients/page.tsx`. Delete the old pages last, once the new page is proven working.

**Tech Stack:** Next.js App Router, React, TypeScript, existing in-house UI primitives (`Modal`, `Button`, `Input`, `Label`, `ComponentCard` from `src/components/`), `apiClient` (`src/lib/api-client.ts`), `SidebarContext` (`src/context/SidebarContext.tsx`).

**Spec:** `docs/superpowers/specs/2026-08-13-clients-dashboard-consolidation-design.md`

## Global Constraints

- No backend changes. Every API call (`GET /tenants`, `POST /tenants`, `PUT /tenants/:id`, `POST /tenants/:id/status`, `POST /tenants/:id/invite-status`, `POST /tenant-prospects` via `apiClient.post("/tenant-prospects", ...)`, `/api/intake/token`, `/api/email/prospect-invite`, `/api/email/billing-invite`, `/billing/invite`) keeps its existing request/response shape.
- No change to `Create Tenant` / `Invite Prospect` business logic — same fields, same validation, same API calls. Only presentation moves (inline JSX in one file → standalone components).
- Selecting a tenant must keep calling `setActiveTenantId` (`@/lib/auth-context`) and `setSelectedClient` (`SidebarContext`) with the exact same object shape used today: `{ id, tenant_id, website_id, name, email, role, domain, temporaryDomainAssigned }`. Other pages (`Onboarding`, `Site Settings`) depend on this.
- This codebase has no automated test runner (`package.json` has `lint`, `smoke:nav`, `smoke:blog`, `s3:cleanup:*` scripts only — no `jest`/`vitest`). Every task's verification is `npx tsc --noEmit` and `npm run lint` (both must pass with zero new errors/warnings in touched files), plus manual browser QA at the two integration points (Task 6, Task 8). This replaces the "write a failing test" step you'd otherwise expect — there is no test file to write.
- `tsconfig.json`'s `include` covers all `**/*.ts`/`**/*.tsx`, so `npx tsc --noEmit` type-checks every new file from the moment it's created, even before anything imports it.

---

## Task 1: Shared types, constants, and formatting helpers

**Files:**
- Create: `src/lib/tenant-types.ts`
- Create: `src/lib/tenant-constants.ts`
- Create: `src/lib/tenant-ui.ts`
- Modify: `src/app/(admin)/(others-pages)/tenants/page.tsx`

**Interfaces:**
- Produces: `TenantListItem`, `PlanListItem`, `InviteEmailKey`, `InviteDeliveryResultRecord`, `InviteDeliveryResult` (from `tenant-types.ts`); `MODULE_OPTIONS`, `PLAN_OPTIONS`, `PROSPECT_BUSINESS_TYPE_OPTIONS`, `OPTIONAL_TENANT_PAGE_OPTIONS`, `CORE_PAGE_LABELS`, `PLAN_OVERRIDES` (from `tenant-constants.ts`); `formatTimestamp`, `inviteEmailLabels`, `statusBadgeClasses`, `completionBadgeClasses`, `inviteBadgeClasses`, `deliveryBadgeClasses` (from `tenant-ui.ts`). Every later task imports from these three files instead of redefining.

This task is pure extraction with zero behavior change — every symbol below already exists verbatim in `tenants/page.tsx` at the cited line range.

- [ ] **Step 1: Create `src/lib/tenant-types.ts`**

```typescript
export type TenantListItem = {
  id: number;
  slug: string;
  name: string;
  business_type: string;
  status: string; // includes "prospect" alongside active/inactive/suspended
  default_currency: string;
  timezone: string;
  created_at: string;
  seat_limit: number | null;
  seat_used: number;
  plan_key: string | null;
  intake_completed_at: string | null;
  payment_completed_at: string | null;
  billing_grace_expires_at: string | null;
  website_id: number | null;
  website_domain: string | null;
  primary_domain: string | null;
  primary_domain_status: string | null;
  owner_user_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_role: string | null;
  owner_phone: string | null;
  invite_status: "not_sent" | "sent" | "partial_failure" | "failed" | null;
  invite_attempt_count: number | null;
  last_attempted_at: string | null;
  last_sent_at: string | null;
  last_error: string | null;
  delivery_results: Record<
    string,
    {
      status: "accepted" | "failed" | "skipped";
      providerId: string | null;
      message: string | null;
      at: string | null;
    }
  > | null;
  enabled_modules: string[];
};

export type PlanListItem = {
  id: number;
  plan_key: string;
  name: string;
  price_monthly_cents: number;
};

export type InviteEmailKey =
  | "welcome"
  | "reset_password"
  | "intake"
  | "prospect_invite";

export type InviteDeliveryResultRecord = NonNullable<
  TenantListItem["delivery_results"]
>;

export type InviteDeliveryResult = {
  status: "accepted" | "failed" | "skipped";
  providerId?: string | null;
  message?: string | null;
  at: string;
};
```

This is `tenants/page.tsx` lines 104-160 (`TenantListItem` through `InviteDeliveryResult`), copied verbatim with `export` added to each declaration and comments trimmed to what's above.

- [ ] **Step 2: Create `src/lib/tenant-constants.ts`**

Copy these five declarations verbatim from `tenants/page.tsx`, adding `export` to each:
- `MODULE_OPTIONS` — lines 19-28
- `PLAN_OPTIONS` — lines 30-35
- `PROSPECT_BUSINESS_TYPE_OPTIONS` — lines 40-46 (keep the comment above it, lines 37-39, about staying in sync with `backend-rc`'s `BUSINESS_TYPES`)
- `OPTIONAL_TENANT_PAGE_OPTIONS` — lines 48-50 (needs `import { OPTIONAL_SYSTEM_PAGE_CONFIGS, type OptionalSystemPageSlug } from "@/lib/page-management";` at the top of the new file)
- `CORE_PAGE_LABELS` — line 52

Also move `PLAN_OVERRIDES` — currently defined inline inside the component body at lines 545-553 (it's a plain object literal with no dependency on component state, so it can become a module-level export):

```typescript
// Local canonical overrides in case backend /plans is out-of-date.
export const PLAN_OVERRIDES: Record<
  string,
  { name?: string; price_monthly_cents?: number }
> = {
  starter: { name: "Starter", price_monthly_cents: 14900 },
  professional: { name: "Professional", price_monthly_cents: 34900 },
  business: { name: "Business", price_monthly_cents: 79900 },
  enterprise: { name: "Enterprise", price_monthly_cents: null as unknown as number },
};
```

- [ ] **Step 3: Create `src/lib/tenant-ui.ts`**

```typescript
import type { InviteDeliveryResult, InviteEmailKey, TenantListItem } from "@/lib/tenant-types";

export const formatTimestamp = (value: string | null) => {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export const inviteEmailLabels: Record<InviteEmailKey, string> = {
  welcome: "Welcome",
  reset_password: "Reset",
  intake: "Intake",
  prospect_invite: "Prospect Invite",
};

export const statusBadgeClasses = (status: string) => {
  if (status === "prospect")
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
  if (status === "active")
    return "border-green-300 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300";
  if (status === "suspended")
    return "border-red-300 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300";
  return "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

export const completionBadgeClasses = (completedAt: string | null) =>
  completedAt
    ? "border-green-300 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300"
    : "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

export const inviteBadgeClasses = (status: TenantListItem["invite_status"]) => {
  switch (status) {
    case "sent":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300";
    case "partial_failure":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300";
    case "not_sent":
    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

export const deliveryBadgeClasses = (status: InviteDeliveryResult["status"]) => {
  switch (status) {
    case "accepted":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300";
    case "skipped":
    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};
```

This mirrors `tenants/page.tsx` lines 368-420 and 422-427 verbatim (`formatTimestamp`, `inviteBadgeClasses`, `statusBadgeClasses`, `completionBadgeClasses`, `deliveryBadgeClasses`, `inviteEmailLabels`), turned into standalone exported functions/constants (they had no closure dependency on component state — they only take arguments — so this is a mechanical move).

- [ ] **Step 4: Update `tenants/page.tsx` to import from the three new files instead of defining locally**

Remove lines 19-52 (the six constants now in `tenant-constants.ts`), remove the type declarations at lines 104-160 (now in `tenant-types.ts`), remove the `PLAN_OVERRIDES` object at lines 545-553, and remove the five function/constant declarations now in `tenant-ui.ts` (lines 368-427). Add near the top of the file, alongside the existing imports:

```typescript
import type {
  TenantListItem,
  PlanListItem,
  InviteEmailKey,
  InviteDeliveryResultRecord,
  InviteDeliveryResult,
} from "@/lib/tenant-types";
import {
  MODULE_OPTIONS,
  PLAN_OPTIONS,
  PROSPECT_BUSINESS_TYPE_OPTIONS,
  OPTIONAL_TENANT_PAGE_OPTIONS,
  CORE_PAGE_LABELS,
  PLAN_OVERRIDES,
} from "@/lib/tenant-constants";
import {
  formatTimestamp,
  inviteEmailLabels,
  statusBadgeClasses,
  completionBadgeClasses,
  inviteBadgeClasses,
  deliveryBadgeClasses,
} from "@/lib/tenant-ui";
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors/warnings.

Manually load `/tenants` in the browser (or trust the type-check plus a visual diff of the JSX, which is untouched) — the page must look and behave identically to before this task, since nothing outside imports changed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tenant-types.ts src/lib/tenant-constants.ts src/lib/tenant-ui.ts "src/app/(admin)/(others-pages)/tenants/page.tsx"
git commit -m "refactor: extract tenant types, constants, and UI helpers to src/lib"
```

---

## Task 2: `CreateTenantModal` component

**Files:**
- Create: `src/components/clients/CreateTenantModal.tsx`

**Interfaces:**
- Consumes: `MODULE_OPTIONS`, `PLAN_OPTIONS`, `OPTIONAL_TENANT_PAGE_OPTIONS`, `CORE_PAGE_LABELS` from `@/lib/tenant-constants`; `apiClient` from `@/lib/api-client`; `setActiveTenantId` from `@/lib/auth-context`; `useSidebar` from `@/context/SidebarContext`; `Modal`, `Button`, `Input`, `Label` from existing `@/components/*`. Note: the original Create Tenant form's plan `<select>` (`tenants/page.tsx` lines 1190-1203) maps only over the static `PLAN_OPTIONS` constant — it never reads the fetched `PlanListItem[]` state (that only happens in the Invite Prospect form, lines 2085-2096). So this component does **not** need a `plans` prop.
- Produces: `CreateTenantModal` component with this exact prop signature (later consumed by Task 6):

```typescript
export type CreatedTenant = {
  id: number;
  name: string;
  website_id: number | null;
  owner_user_id: number;
  owner_email: string;
  owner_role: string;
  domain: string | null;
  temporaryDomainAssigned: boolean;
};

export interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (tenant: CreatedTenant) => void;
}
```

This is today's always-visible "Create Tenant" `ComponentCard` (`tenants/page.tsx` lines 1135-1467) plus its supporting state and handlers, moved into a modal (it currently has no open/close state — the whole card is always on the page — so this task also changes its presentation from "inline card" to "modal", matching the approved design).

- [ ] **Step 1: Create the component shell with state and handlers**

The component owns everything the original page owned for this form. Port these verbatim from `tenants/page.tsx`, adjusting only as noted:

- `FormState` type — lines 63-75 (keep local to this file, not shared; nothing else needs it)
- `ProvisionResponse` type — lines 77-95 (keep local)
- `TenantFeatureToggleKey`, `TenantFeatureToggles`, `initialFeatureToggles` — lines 54-61 (keep local)
- `initialState: FormState` — lines 183-195 (keep local)
- State: `form`, `selectedAdditionalPages`, `featureToggles`, `enabledModules`, `isSubmitting`, `error`, `successMessage` — from the `useState` declarations at lines 209, 210-212, 213-215, 216-220, 223, 238, 240
- `slugPreview`, `temporaryHostnamePreview` — lines 555-570
- `handleChange` — lines 572-574
- `handleSubmit` — lines 607-726, with two adjustments:
  1. Replace the `router.push("/onboarding")` navigation (line 693) — this component doesn't own navigation; instead call the new `onCreated` prop with the shaped response, and let the caller (Task 6's `page.tsx`) decide whether to navigate. Remove the `window.setTimeout(() => { router.push("/onboarding"); }, 600);` block and the `useRouter` import/usage entirely from this file.
  2. Replace the `setSelectedClient({...})` call (lines 623-632) — call it exactly as-is (this component still owns the "creation moment" selection side effect), then additionally call `onCreated({ id: response.tenant.id, name: response.tenant.name, website_id: response.website.id, owner_user_id: response.ownerUser.id, owner_email: response.ownerUser.email, owner_role: response.ownerUser.role, domain: response.website.domain, temporaryDomainAssigned: response.temporaryDomainAssigned ?? false })` right after `await loadTenants();` is removed (this component has no `loadTenants` — that's the list page's job; the `onCreated` callback is what tells the parent to refetch). Remove the `await loadTenants();` line (line 681) entirely — Task 6's page.tsx will refetch inside its `onCreated` handler instead.

  Keep everything else in `handleSubmit` (the `apiClient.post("/tenants", ...)` call, the three-email `Promise.allSettled` block via `recordInviteAttempt`, the 409-conflict error-code branching) unchanged.

- `recordInviteAttempt` and `buildInviteDeliveryResults` — lines 429-504. These are used by `handleSubmit`'s email-tracking step. Keep both local to this file (Task 3's `InviteProspectModal` does not send three emails and does not need them; nothing else in the app calls them).

- [ ] **Step 2: Port the JSX**

Move `tenants/page.tsx` lines 1139-1466 (the `<form>` body, from `onSubmit={handleSubmit}` to the closing `</form>`) verbatim into this component's return statement, wrapped as:

```tsx
<Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-[900px]">
  <div className="max-h-[85vh] overflow-y-auto p-6">
    <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
      Create Tenant
    </h2>
    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
      Provision a tenant, owner account, website, default site structure, and
      initial add-on entitlements in one admin-only workflow.
    </p>
    {/* lines 1140-1466 from tenants/page.tsx go here unchanged */}
  </div>
</Modal>
```

(The heading/description text above is copied from the original `ComponentCard title="Create Tenant" desc="..."` at lines 1136-1137, since `ComponentCard` itself isn't used inside a `Modal` elsewhere in this codebase — the existing Edit and Invite modals both use a plain `<h2>`/`<p>` header instead, so this matches established in-modal convention.) The plan `<select>` inside these lines keeps mapping over `PLAN_OPTIONS` (imported from `@/lib/tenant-constants`) exactly as today — no prop needed for it.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (This file isn't imported anywhere yet, but per the Global Constraints note, `tsc` still checks it.)

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/clients/CreateTenantModal.tsx
git commit -m "feat: extract CreateTenantModal from tenants page"
```

---

## Task 3: `InviteProspectModal` component

**Files:**
- Create: `src/components/clients/InviteProspectModal.tsx`

**Interfaces:**
- Consumes: `PlanListItem` from `@/lib/tenant-types`; `PLAN_OPTIONS`, `PROSPECT_BUSINESS_TYPE_OPTIONS` from `@/lib/tenant-constants`; `apiClient` from `@/lib/api-client`.
- Produces:

```typescript
export interface InviteProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: PlanListItem[];
  onInvited: () => void;
}
```

`onInvited` takes no arguments — unlike `CreateTenantModal`, the caller only needs to know "refetch the list and close," not receive the created tenant's shape (this form already calls `setSelectedClient` itself, matching today's behavior at `tenants/page.tsx` lines 623-632/inline in `handleInviteSubmit`, so there's nothing further for the parent to act on besides refetching).

This is `tenants/page.tsx`'s `handleInviteSubmit`/`handleInviteChange` logic (lines 728-826) plus the Invite Prospect modal JSX (lines 1984-2118).

- [ ] **Step 1: Create the component shell with state and handlers**

Port from `tenants/page.tsx`:

- `InviteFormState` type — lines 174-181 (keep local)
- `initialInviteForm` — lines 197-204 (keep local)
- State: `inviteForm`, `isSendingInvite`, `inviteError` — from lines 242, 245, 246 (note: `isInviteOpen` becomes the `isOpen` prop, owned by the parent, not local state)
- `handleInviteChange` — lines 728-730, unchanged
- `handleInviteSubmit` — lines 743-826, with these adjustments:
  1. Remove the final `setIsInviteOpen(false); setInviteForm(initialInviteForm);` (these were part of the original `closeInviteModal`, lines 737-741, called at the end of a successful submit in the original flow via `setIsInviteOpen(false)` inside `handleInviteSubmit` at line 813 `setIsInviteOpen(false);`) — instead call `onClose()` and reset `setInviteForm(initialInviteForm)` locally, then call `onInvited()`.
  2. Replace the `await loadTenants();` call (line 812) — remove it; the parent's `onInvited` callback triggers the refetch instead.
  3. Keep the `apiClient.createIntakeToken(...)` call, the `intakeUrl` construction (`${window.location.origin}/intake?token=...`), the `apiClient.sendProspectInviteEmail(...)` call, and the `apiClient.post(`/tenants/${response.tenant.id}/invite-status`, ...)` call exactly as-is — none of that changes.

- [ ] **Step 2: Port the JSX**

Move `tenants/page.tsx` lines 1985-2118 (the full `<Modal isOpen={isInviteOpen} onClose={closeInviteModal} ...>` block) verbatim, renaming:
- `isInviteOpen` → the `isOpen` prop
- `closeInviteModal` references → a local function that does `setInviteForm(initialInviteForm); setInviteError(null); onClose();`
- Any reference to the static `plans` component state → the `plans` prop

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/clients/InviteProspectModal.tsx
git commit -m "feat: extract InviteProspectModal from tenants page"
```

---

## Task 4: `ClientDrawer` component

**Files:**
- Create: `src/components/clients/ClientDrawer.tsx`

**Interfaces:**
- Consumes: `TenantListItem`, `PlanListItem`, `InviteEmailKey` from `@/lib/tenant-types`; `MODULE_OPTIONS` from `@/lib/tenant-constants`; `formatTimestamp`, `inviteEmailLabels`, `statusBadgeClasses`, `completionBadgeClasses`, `deliveryBadgeClasses` from `@/lib/tenant-ui`; `apiClient` from `@/lib/api-client`; `useRouter` from `next/navigation`.
- Produces:

```typescript
export interface ClientDrawerProps {
  tenant: TenantListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}
```

`onUpdated` is called after any successful edit/resend/status action, telling the parent to refetch the list (the drawer keeps showing the *previous* snapshot of `tenant` until the parent passes a fresh one down — that's fine, since every action already shows its own inline success/error message).

This consolidates: the Edit modal (`tenants/page.tsx` lines 1834-1983, `EditFormState`/`handleEditChange`/`handleSaveEdit`), the four remaining row actions (`handleResendOwnerEmails` lines 871-950, `handleResendIntakeEmail` lines 952-1000, `handleSendBillingInvite` lines 1002-1060, `handleTenantStatus` lines 1062-1089), the delivery-diagnostics block that was inline in the table (lines 1684-1719), and a new read-only "Overview" section built from fields that were previously bare table cells (seats, domain status, business type, timezone, currency, created date — see Step 3).

- [ ] **Step 1: Create the component shell with state and handlers**

Port from `tenants/page.tsx` (all become local state/functions in this component; `tenant` arrives as a prop instead of being looked up from a list):

- `EditFormState` type — lines 162-172 (keep local)
- State: `editForm`, `editModules`, `isSavingEdit`, `tenantListError` (rename to `actionError` for clarity — this drawer isn't "the tenant list", it's per-tenant actions), `rowActionMessage` (rename to `actionMessage`), `rowActionTenantId` → replace with a simple `isWorking: boolean` (the drawer only ever acts on one tenant — the one it's showing — so the "which tenant id is busy" tracking from the old shared table becomes unnecessary; this is a real simplification, not a placeholder, since the drawer's own `isOpen`/`tenant` props already scope it to one tenant)
- `handleEditChange` — lines 828-832, unchanged
- `handleSaveEdit` — lines 834-868, adjusted: replace `await loadTenants();` with a call to `onUpdated()`, replace `closeEditModal()` with clearing local edit state (the drawer doesn't close itself after a plan edit — only "Manage" → drawer open/close is controlled by the parent's `onClose`/row click, so after saving, stay open and show the success message, matching how a settings panel behaves)
- `handleResendOwnerEmails` — lines 871-950, adjusted: replace `await loadTenants();` (there's a call inside `recordInviteAttempt`'s caller — check the exact line) with `onUpdated()`, drop the `setRowActionTenantId(tenant.id)`/`setRowActionTenantId(null)` pair in favor of `setIsWorking(true)`/`setIsWorking(false)`
- `handleResendIntakeEmail` — lines 952-1000, same adjustment pattern
- `handleSendBillingInvite` — lines 1002-1060, same adjustment pattern
- `handleTenantStatus` — lines 1062-1089, same adjustment pattern (replace `await loadTenants();` with `onUpdated()`)
- `recordInviteAttempt`/`buildInviteDeliveryResults` — lines 429-504 are already being duplicated into `CreateTenantModal` (Task 2); duplicate them here too rather than sharing, since `CreateTenantModal` sends 3 emails at tenant-creation time and this drawer sends invites at arbitrary later times — same function bodies, different call sites, and neither the spec nor this plan calls for a fourth shared file just for these two helpers. (If a third consumer needs them later, extracting to `tenant-constants.ts`-adjacent helpers becomes worth it — YAGNI for now.)

- [ ] **Step 2: Build the Overview section (new JSX, not a straight port)**

The old table showed Seats, Modules count, and Domain in bare cells (lines 1609-1638), with Business type/timezone/currency/created-date never shown in the table at all — the Edit modal was the only place an admin could see them (via the edit form's pre-filled input values). This step makes them visible read-only, before editing:

```tsx
<section className="mb-6">
  <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
    Overview
  </h3>
  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
    <dt className="text-gray-500 dark:text-gray-400">Status</dt>
    <dd className="text-right">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClasses(tenant.status)}`}>
        {tenant.status}
      </span>
    </dd>
    <dt className="text-gray-500 dark:text-gray-400">Business type</dt>
    <dd className="text-right text-gray-800 dark:text-gray-100">{tenant.business_type}</dd>
    <dt className="text-gray-500 dark:text-gray-400">Domain</dt>
    <dd className="text-right text-gray-800 dark:text-gray-100">
      {tenant.primary_domain ?? tenant.website_domain ?? "No domain"}
      {tenant.primary_domain_status ? ` (${tenant.primary_domain_status})` : ""}
    </dd>
    <dt className="text-gray-500 dark:text-gray-400">Seats</dt>
    <dd className="text-right text-gray-800 dark:text-gray-100">
      {tenant.seat_used}{tenant.seat_limit != null ? ` / ${tenant.seat_limit}` : " (unlimited)"}
    </dd>
    <dt className="text-gray-500 dark:text-gray-400">Timezone</dt>
    <dd className="text-right text-gray-800 dark:text-gray-100">{tenant.timezone}</dd>
    <dt className="text-gray-500 dark:text-gray-400">Currency</dt>
    <dd className="text-right text-gray-800 dark:text-gray-100">{tenant.default_currency}</dd>
    <dt className="text-gray-500 dark:text-gray-400">Created</dt>
    <dd className="text-right text-gray-800 dark:text-gray-100">{formatTimestamp(tenant.created_at)}</dd>
    <dt className="text-gray-500 dark:text-gray-400">Intake</dt>
    <dd className="text-right">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${completionBadgeClasses(tenant.intake_completed_at)}`}>
        {tenant.intake_completed_at ? "Done" : "Pending"}
      </span>
    </dd>
    <dt className="text-gray-500 dark:text-gray-400">Payment</dt>
    <dd className="text-right">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${completionBadgeClasses(tenant.payment_completed_at)}`}>
        {tenant.payment_completed_at ? "Paid" : "Pending"}
      </span>
    </dd>
  </dl>
  <div className="mt-4 flex flex-wrap gap-2">
    <Button type="button" size="sm" variant="outline" onClick={() => router.push("/onboarding")}>
      Onboard
    </Button>
    <Button type="button" size="sm" variant="outline" onClick={() => router.push("/site-settings")} disabled={!tenant.website_id}>
      Site Settings
    </Button>
  </div>
</section>
```

(`router` here is `useRouter()` from `next/navigation`, imported at the top of this file. Per the Global Constraints note, the parent — Task 6's `page.tsx` — already calls `setSelectedClient`/`setActiveTenantId` when it opens this drawer for a given tenant, so by the time these two buttons are clickable, the sidebar context is already correct; these buttons only need to navigate.)

- [ ] **Step 3: Port the Details & Modules section**

Move `tenants/page.tsx` lines 1834-1979 (the Edit modal's form body, minus the outer `<Modal>`/`<form onSubmit={handleSaveEdit}>` wrapper tags, which this drawer already provides once at the top level) into a `<section>` titled "Details & Modules", reusing `MODULE_OPTIONS` from `@/lib/tenant-constants` for the module checkboxes exactly as the original did at line 1946.

Note: despite the spec calling this section "Plan & Modules", the underlying `EditFormState` (lines 162-172) and `handleSaveEdit`'s `PUT /tenants/:id` body (lines 845-855) have never included `plan_key` — only `tenantName`, `tenantSlug`, `timezone`, `defaultCurrency`, `domain`, `ownerName`, `ownerEmail`, `ownerPhone`, and `enabledModules`. There is no existing UI for changing a tenant's plan after creation (it's only set at Create Tenant or Invite Prospect time). Per the Global Constraints ("no change to business logic"), this task does not add plan editing — it only carries over what `handleSaveEdit` already does. Name the section "Details & Modules", not "Plan & Modules", so the UI doesn't promise a capability that doesn't exist.

- [ ] **Step 4: Port the Invite & Emails section**

Combine, into one `<section>` titled "Invite & Emails":
- The delivery-diagnostics block, `tenants/page.tsx` lines 1684-1719 (per-channel accepted/failed/skipped badges via `deliveryBadgeClasses`, using `tenant.delivery_results`, `inviteEmailLabels`, and `tenant.last_error`)
- The attempt-count/last-attempted/last-sent lines, originally lines 1674-1683, shown above the delivery-diagnostics block
- Three buttons wired to the three resend handlers from Step 1 (matching the original buttons at lines 1763-1805: "Resend Invite" → `handleResendOwnerEmails`, "Resend Questionnaire" → `handleResendIntakeEmail`, "Billing Invite" → `handleSendBillingInvite`, each `disabled={!tenant.owner_email || isWorking}` per the original's guard conditions, with "Billing Invite" additionally requiring `tenant.plan_key`)

- [ ] **Step 5: Port the Status section**

Add a separate `<section>` titled "Status", containing just the status toggle button from `tenants/page.tsx` lines 1806-1823 ("Suspend"/"Reactivate" calling `handleTenantStatus`, `disabled={isWorking}`). No description text — the original button had none, and this plan doesn't add new copy beyond what's specified elsewhere in it.

- [ ] **Step 6: Wrap everything in the Modal**

```tsx
export function ClientDrawer({ tenant, isOpen, onClose, onUpdated }: ClientDrawerProps) {
  // ...all state/handlers from Steps 1-4...

  if (!tenant) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-[840px]">
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
          {tenant.name}
        </h2>
        <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
          slug: {tenant.slug}
        </p>
        {actionError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {actionError}
          </div>
        ) : null}
        {actionMessage ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
            {actionMessage}
          </div>
        ) : null}
        {/* Overview section (Step 2) */}
        {/* Details & Modules section (Step 3) */}
        {/* Invite & Emails section (Step 4) */}
        {/* Status section (Step 5) */}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 8: Commit**

```bash
git add src/components/clients/ClientDrawer.tsx
git commit -m "feat: extract ClientDrawer combining tenant overview, edit, resend, and status actions"
```

---

## Task 5: `ClientsTable` component

**Files:**
- Create: `src/components/clients/ClientsTable.tsx`

**Interfaces:**
- Consumes: `TenantListItem` from `@/lib/tenant-types`; `statusBadgeClasses`, `completionBadgeClasses` from `@/lib/tenant-ui`.
- Produces:

```typescript
export interface ClientsTableProps {
  clients: TenantListItem[];
  loading: boolean;
  onManage: (tenant: TenantListItem) => void;
}
```

This is a fresh, focused presentational component — not an extraction. It replaces both the old `tenants/page.tsx` table (lines 1558-1830, which showed 8 columns including always-on invite diagnostics) and the old `clients/page.tsx` table (which had Domain/Payment added earlier today but no `PLAN_LABELS` alignment with real plan names).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import type { TenantListItem } from "@/lib/tenant-types";
import { completionBadgeClasses, statusBadgeClasses } from "@/lib/tenant-ui";
import Button from "@/components/ui/button/Button";

export interface ClientsTableProps {
  clients: TenantListItem[];
  loading: boolean;
  onManage: (tenant: TenantListItem) => void;
}

export function ClientsTable({ clients, loading, onManage }: ClientsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <thead>
          <tr className="text-left text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Domain</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Manage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                Loading…
              </td>
            </tr>
          ) : clients.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No clients found.
              </td>
            </tr>
          ) : (
            clients.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-4 py-4 align-top">
                  <p className="font-medium text-gray-900 dark:text-white">{tenant.name}</p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClasses(tenant.status)}`}
                  >
                    {tenant.status}
                  </span>
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="text-gray-900 dark:text-white">{tenant.owner_name ?? "Unassigned"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tenant.owner_email ?? "No owner email"}
                  </p>
                </td>
                <td className="px-4 py-4 align-top">
                  <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-gray-700 capitalize dark:text-gray-300">
                    {tenant.plan_key ?? "none"}
                  </span>
                </td>
                <td className="px-4 py-4 align-top text-gray-600 dark:text-gray-300">
                  {tenant.primary_domain ?? tenant.website_domain ?? "—"}
                </td>
                <td className="px-4 py-4 align-top">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${completionBadgeClasses(tenant.payment_completed_at)}`}
                  >
                    {tenant.payment_completed_at ? "Paid" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-4 align-top">
                  <Button type="button" size="sm" variant="outline" onClick={() => onManage(tenant)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/ClientsTable.tsx
git commit -m "feat: add ClientsTable presentational component"
```

---

## Task 6: Rebuild `/clients` page and wire everything together

**Files:**
- Modify: `src/app/(admin)/clients/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `TenantListItem`, `PlanListItem` from `@/lib/tenant-types`; `PLAN_OVERRIDES` from `@/lib/tenant-constants`; `ClientsTable` (Task 5), `ClientDrawer` (Task 4), `CreateTenantModal` + `CreatedTenant` (Task 2), `InviteProspectModal` (Task 3); `apiClient` from `@/lib/api-client`; `setActiveTenantId` from `@/lib/auth-context`; `useSidebar` from `@/context/SidebarContext`.
- Produces: the default-exported `ClientsPage` component — nothing downstream consumes this (it's a route).

This is the first point where the whole feature becomes manually testable end-to-end in the browser.

- [ ] **Step 1: Write the page**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useSidebar } from "@/context/SidebarContext";
import { apiClient } from "@/lib/api-client";
import { setActiveTenantId } from "@/lib/auth-context";
import { PLAN_OVERRIDES } from "@/lib/tenant-constants";
import type { PlanListItem, TenantListItem } from "@/lib/tenant-types";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { ClientDrawer } from "@/components/clients/ClientDrawer";
import { CreateTenantModal, type CreatedTenant } from "@/components/clients/CreateTenantModal";
import { InviteProspectModal } from "@/components/clients/InviteProspectModal";

export default function ClientsPage() {
  const router = useRouter();
  const { setSelectedClient } = useSidebar();

  const [loadingSession, setLoadingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [clients, setClients] = useState<TenantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanListItem[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const loadClients = async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const response = await apiClient.get<TenantListItem[]>("/tenants");
      setClients(Array.isArray(response) ? response : []);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Failed to load clients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const user = await apiClient.getSession();
        const role = user?.role;
        if (role === "admin" || role === "platform_admin") {
          setIsAuthorized(true);
          await loadClients();
          try {
            const planList = await apiClient.get<PlanListItem[]>("/plans", false);
            const resolved = (Array.isArray(planList) ? planList : []).map((plan) => {
              const override = PLAN_OVERRIDES[plan.plan_key];
              if (!override) return plan;
              return {
                ...plan,
                name: override.name ?? plan.name,
                price_monthly_cents: override.price_monthly_cents ?? plan.price_monthly_cents,
              } as PlanListItem;
            });
            setPlans(resolved);
          } catch (planError) {
            console.error("Failed to load plans:", planError);
          }
        }
      } finally {
        setLoadingSession(false);
      }
    };
    loadSession();
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          client.name,
          client.owner_name ?? "",
          client.owner_email ?? "",
          client.primary_domain ?? client.website_domain ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const selectClientContext = (tenant: {
    id: number;
    name: string;
    website_id?: number | null;
    owner_user_id?: number | null;
    owner_email?: string | null;
    owner_role?: string | null;
    primary_domain?: string | null;
    website_domain?: string | null;
  }) => {
    const resolvedDomain = tenant.primary_domain ?? tenant.website_domain ?? null;
    setActiveTenantId(tenant.id);
    setSelectedClient({
      id: tenant.owner_user_id ?? tenant.id,
      tenant_id: tenant.id,
      website_id: tenant.website_id ?? null,
      name: tenant.name,
      email: tenant.owner_email ?? "",
      role: tenant.owner_role ?? "tenant_owner",
      domain: resolvedDomain,
      temporaryDomainAssigned: resolvedDomain?.endsWith(".rctechbridge.com") ?? false,
    });
  };

  const handleManage = (tenant: TenantListItem) => {
    selectClientContext(tenant);
    setSelectedTenant(tenant);
    setIsDrawerOpen(true);
  };

  // _tenant is unused: CreateTenantModal already calls setActiveTenantId/
  // setSelectedClient itself before invoking this callback (Task 2, Step 1),
  // so navigation here doesn't need the tenant id. Prefixed with `_` to
  // satisfy this repo's unused-args lint rule (eslint.config.mjs
  // argsIgnorePattern: "^_") while keeping the parameter for callers that
  // may need it later.
  const handleCreated = (_tenant: CreatedTenant) => {
    setIsCreateOpen(false);
    void loadClients();
    // Matches the original Create Tenant flow's behavior (tenants/page.tsx
    // line 692-694): give the success message a beat to be visible, then
    // continue into onboarding for the tenant just created.
    window.setTimeout(() => {
      router.push("/onboarding");
    }, 600);
  };

  const handleInvited = () => {
    setIsInviteOpen(false);
    void loadClients();
  };

  const handleUpdated = () => {
    void loadClients();
  };

  if (loadingSession) {
    return <div className="text-sm text-gray-500 dark:text-gray-300">Loading clients...</div>;
  }

  if (!isAuthorized) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Clients" />
        <ComponentCard title="Access Restricted" desc="Only admin roles can manage clients from the dashboard.">
          <p className="text-sm text-red-600 dark:text-red-400">
            Your current account does not have client management access.
          </p>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Clients" />
      <ComponentCard title={`Clients${clients.length ? ` (${clients.length})` : ""}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, owner, or domain"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All Statuses</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(true)}>
              Invite Prospect
            </Button>
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              New Tenant
            </Button>
          </div>
        </div>

        {listError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {listError}
          </div>
        ) : null}

        <ClientsTable clients={filteredClients} loading={isLoading} onManage={handleManage} />
      </ComponentCard>

      <ClientDrawer
        tenant={selectedTenant}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdated={handleUpdated}
      />
      <CreateTenantModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
      <InviteProspectModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        plans={plans}
        onInvited={handleInvited}
      />
    </div>
  );
}
```

Note on `selectedTenant` staleness: after `handleUpdated` refetches `clients`, `selectedTenant` still points at the pre-edit object (React state, not re-derived). Before wiring `ClientDrawer`'s `onUpdated` to only call `loadClients()`, also re-sync `selectedTenant` once the fetch resolves:

```typescript
const handleUpdated = async () => {
  await loadClients();
};
```

then add a small `useEffect` that keeps `selectedTenant` in sync with the latest `clients` array whenever it changes:

```typescript
useEffect(() => {
  if (!selectedTenant) return;
  const fresh = clients.find((c) => c.id === selectedTenant.id);
  if (fresh) setSelectedTenant(fresh);
}, [clients, selectedTenant?.id]);
```

(This is necessary because `ClientDrawer` reads `tenant.delivery_results`/`tenant.plan_key`/etc. directly from the prop — without this, editing the plan wouldn't visually update the drawer until it was closed and reopened.)

- [ ] **Step 2: Verify with `tsc` and `lint`**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 3: Manual QA (first real end-to-end check)**

Start the dev server (`npm run dev`) and, logged in as an admin:
1. Load `/clients` — confirm the table loads with Client/Owner/Plan/Domain/Payment/Manage columns, search and status filter both narrow the list.
2. Click "Manage" on an existing tenant — confirm the drawer opens with Overview/Details & Modules/Invite & Emails/Status sections populated correctly, and that `localStorage.selected_client` (DevTools → Application → Local Storage) updates to that tenant.
3. In the drawer, toggle a module on or off and save — confirm the success message appears, the table's data stays consistent, and the drawer's own Overview section still shows correct data without closing.
4. In the drawer, click "Resend Questionnaire" — confirm a success message appears and the delivery-diagnostics block updates.
5. Click "Invite Prospect", fill the form, submit — confirm it closes, the table refreshes with the new prospect row, and `localStorage.selected_client` reflects the new prospect.
6. Click "New Tenant", fill the form, submit — confirm the same, and that this form's three-email send behavior (welcome/reset/intake) still fires (check `rowActionMessage`-equivalent success text mentions email status).
7. Confirm the "Onboard" button inside the drawer navigates to `/onboarding` with the correct tenant already selected (matches step 2's `localStorage` check).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/clients/page.tsx"
git commit -m "feat: rebuild /clients as the consolidated tenant management page"
```

---

## Task 7: Delete the old pages and nav entry

**Files:**
- Delete: `src/app/(admin)/(others-pages)/tenants/page.tsx`
- Delete: `src/app/(admin)/clients/[id]/page.tsx`
- Modify: `src/layout/AppSidebar.tsx`

**Interfaces:** None — this task only removes dead code and a nav entry. Nothing downstream depends on these files (confirmed below).

- [ ] **Step 1: Confirm nothing else references the routes being removed**

Run: `grep -rn '"/tenants"' src --include="*.tsx" --include="*.ts"`
Expected: only matches are `apiClient` calls like `apiClient.get("/tenants")`/`apiClient.post("/tenants", ...)` (backend API paths, unaffected by this change) and the nav entry in `AppSidebar.tsx` (removed in Step 3 below) and the page file itself (deleted in Step 2). No `href="/tenants"` or `router.push("/tenants")` should appear anywhere else — if one does, stop and update it to point at `/clients` before continuing.

Run: `grep -rn "clients/\[id\]\|/clients/\${" src --include="*.tsx" --include="*.ts"`
Expected: no matches outside the file being deleted.

- [ ] **Step 2: Delete the files**

```bash
git rm "src/app/(admin)/(others-pages)/tenants/page.tsx"
git rm "src/app/(admin)/clients/[id]/page.tsx"
```

- [ ] **Step 3: Remove the "Tenants" nav entry**

In `src/layout/AppSidebar.tsx`, remove this block (currently lines 87-92):

```typescript
  {
    icon: <UserCircleIcon />,
    name: "Tenants",
    path: "/tenants",
    requiredRoles: ["admin", "platform_admin"],
  },
```

Leave the adjacent "Clients" entry (currently lines 93-98) as-is. If `UserCircleIcon` is not used anywhere else in this file after removing the block above, also remove its import — check with `grep -n "UserCircleIcon" src/layout/AppSidebar.tsx` first.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors/warnings.

Manually confirm `/tenants` now 404s and the sidebar no longer shows a "Tenants" entry, only "Clients".

- [ ] **Step 5: Commit**

```bash
git add src/layout/AppSidebar.tsx
git commit -m "chore: remove superseded Tenants page and nav entry"
```

---

## Task 8: Final manual QA pass

**Files:** None — verification only.

- [ ] **Step 1: Full regression pass on `/clients`**

Repeat every check from Task 6 Step 3 once more, now that the old pages are gone (to catch anything that only broke after deletion — e.g. a stray link elsewhere in the app that pointed at `/tenants` and is now silently broken).

- [ ] **Step 2: Confirm downstream pages still pick up tenant selection correctly**

With a tenant selected via `/clients`' "Manage" drawer, visit `/onboarding` and `/site-settings` directly (not via the drawer's own nav buttons) and confirm both still show the correct active tenant — this exercises the `SidebarContext`/`localStorage` path independent of any button inside the new components.

- [ ] **Step 3: Confirm the intake-answers fix from earlier today still works**

Select a prospect tenant with no website yet (like the `QA Prospect Flow` tenant used earlier), go to `/onboarding`, and confirm the "Latest Intake Submission" panel loads answers instead of showing "Select a tenant first" — this is unrelated to this plan's changes but shares the same `selectedTenant`/`SidebarContext` wiring, so it's worth reconfirming here.

- [ ] **Step 4: Report results**

No commit for this task — it's verification only. If any check fails, open a new task (not a silent fix) describing exactly what broke, since this plan's tasks are considered complete once committed.
