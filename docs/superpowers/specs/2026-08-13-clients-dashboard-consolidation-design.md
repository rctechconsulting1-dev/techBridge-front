# Clients Dashboard Consolidation

Date: 2026-08-13
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` (frontend only — no backend changes)

## Purpose

Replace the current split between `/tenants` (2,120-line operational page: two separate tenant-creation flows, edit, status change, three resend actions, and a dense always-expanded table) and `/clients` + `/clients/[id]` (a newer, thinner read-only overview added on top, duplicating most of the same data) with **one page**: a clean, scannable client list with all actions reachable through a per-row drawer. Today an admin has to know which of two pages to visit depending on whether they want to look something up or change something; this collapses that decision.

## Context: what exists today

`src/app/(admin)/(others-pages)/tenants/page.tsx` (2,120 lines) contains, all in one component:

- **Full "Create Tenant" form** (`FormState`/`handleSubmit`): tenant name/slug/timezone/currency/domain, owner name/email/password/phone, plan, asset Drive folder link, optional system pages, feature toggles (shop/reservations). Provisions an active tenant + website immediately, with a real owner password. Used when RC sets up a client directly, without the prospect self-serve flow.
- **"Invite Prospect" form** (`InviteFormState`/`handleInviteSubmit`): business name, owner name/email/phone, business type, plan. Creates a `prospect`-status tenant (no website/domain yet), mints an intake token, and sends one combined email (intake link + Stripe checkout link) via `POST /api/email/prospect-invite`.
- **Edit form** (`EditFormState`/`handleSaveEdit`): tenant name/slug/timezone/currency/domain/owner name/email/phone, plus module toggles.
- **Row actions**: `handleResendOwnerEmails` (welcome + reset-password + intake, with a `window.prompt` for a Drive folder link), `handleResendIntakeEmail`, `handleSendBillingInvite`, `handleTenantStatus` (prospect → active, etc.).
- **The table**: one row per tenant showing Tenant (name/slug/status), Owner, Plan, Domain, Seats, Modules, Invite Status (which expands inline into attempt count, last-attempted/last-sent timestamps, and a per-channel delivery-result breakdown), and an Actions cell. All of this is visible for every row regardless of whether it's relevant (e.g. delivery diagnostics show even for a paid, active tenant that was never resent anything).
- Selecting a tenant (via row click or after create/invite) calls `setSelectedClient(...)` on the global `SidebarContext` (`src/context/SidebarContext.tsx`), which persists `{ id, tenant_id, website_id, name, email, role, domain, temporaryDomainAssigned }` to `localStorage` under `selected_client`. Other pages (`Onboarding`, `Site Settings`, etc.) read this to know which tenant/website is "active." **This must keep working** — it's the cross-page tenant-selection mechanism, not something specific to the old Tenants page.

`src/app/(admin)/clients/page.tsx` and `src/app/(admin)/clients/[id]/page.tsx` are a separate, newer, read-only pair added later: a search box, a table (Name/Plan/Status/Domain/Payment/Modules/Owner/Invite), and a detail page reachable by row link. Both fetch the same `apiClient.get("/tenants")` endpoint as the Tenants page. No write actions.

Both pages import `TenantListItem`/`ClientListItem` as locally-defined, near-duplicate types.

## What's out of scope

- No backend changes. Same `GET /tenants` list endpoint, same `POST /tenant-prospects`, `POST /api/intake/token`, `POST /api/email/prospect-invite`, edit/status/resend endpoints — all reused as-is.
- No change to the Create Tenant / Invite Prospect *business logic* — both forms keep their existing fields, validation, and API calls. Only their presentation (inline JSX in a 2,120-line file → standalone modal components) changes.
- No change to `Onboarding`, `Site Settings`, or any other page that reads `selectedClient` from `SidebarContext`.
- No change to the intake-answers panel on `Onboarding` (already fixed separately, same day, to key off `selectedTenantId` instead of `selectedWebsiteId`).

## New structure

```
src/app/(admin)/clients/
  page.tsx                 -- list + filters + drawer/modal orchestration
src/components/clients/
  ClientsTable.tsx          -- table only, presentational
  ClientDrawer.tsx           -- per-row detail/edit/resend/status panel
  InviteProspectModal.tsx    -- extracted, same fields/logic as today's Invite Prospect form
  CreateTenantModal.tsx      -- extracted, same fields/logic as today's Create Tenant form
src/lib/tenant-types.ts      -- shared TenantListItem, PlanListItem, InviteEmailKey,
                                 InviteDeliveryResultRecord (single source of truth,
                                 replacing the duplicated inline types in both old pages)
```

`src/app/(admin)/(others-pages)/tenants/page.tsx` and `src/app/(admin)/clients/[id]/page.tsx` are deleted. `src/layout/AppSidebar.tsx` loses the "Tenants" nav entry; "Clients" stays, now pointing at the consolidated page.

## Page behavior

**List (`page.tsx` + `ClientsTable`)**

Columns: Client (name + status badge), Owner (name/email), Plan, Domain, Payment (Paid/Pending badge from `payment_completed_at`), Manage (button). Filters: search (name/owner, existing `filteredClients`-style logic) and a status dropdown (all/prospect/active/inactive/suspended). The invite-status filter and sort-order control from the old Tenants page are dropped — they weren't part of what either page's user-facing description asked for, and can come back if actually needed (YAGNI).

Two header buttons: **"Invite Prospect"** and **"New Tenant"**, opening their respective modals. On success, both modals' existing post-creation behavior is preserved: call `setSelectedClient(...)` on `SidebarContext` with the same shape used today, refresh the list, show a success message.

**Drawer (`ClientDrawer`)**

Opened by the row's "Manage" button. Receives the selected `TenantListItem`. Contains, as sections within one panel (not separate routes):

- **Overview** (read-only): business type, timezone, currency, seats used/limit, domain + `primary_domain_status`, created date, intake/payment completion timestamps — everything that was always-on table clutter before.
- **Plan & Modules**: the existing edit form (`EditFormState`/`handleSaveEdit`), unchanged fields.
- **Status**: the existing `handleTenantStatus` transition control.
- **Invite & Emails**: the three resend actions (`handleResendOwnerEmails`, `handleResendIntakeEmail`, `handleSendBillingInvite`) plus the delivery diagnostics (attempt count, last attempted/sent, per-channel `delivery_results`) — moved here from the table, visible only when this row is actually being managed.

Opening the drawer also calls `setSelectedClient(...)`, matching today's row-click behavior, so `Onboarding`/`Site Settings` stay in sync with "the tenant currently being managed."

## Data flow

Unchanged: `page.tsx` fetches `apiClient.get<TenantListItem[]>("/tenants")` once on mount (plus after create/invite/edit/status-change/resend, matching today's `loadTenants()` re-fetch pattern). The drawer and modals receive data/callbacks as props from `page.tsx` — no independent fetching, so there's one source of truth for the list and no risk of the drawer showing stale data after an edit.

## Error handling

Unchanged from today's per-action handling: each modal/drawer action keeps its own try/catch and inline error message (e.g. `inviteError`, `tenantListError`), matching the existing pattern already in `tenants/page.tsx`. No new error states introduced.

## Testing

- `npx tsc --noEmit` and `npm run lint` after each extraction step.
- Manual QA in the browser (this is an admin UI change): load `/clients`, confirm list/search/status-filter work; open the drawer for an existing tenant and confirm overview/edit/status/resend all behave identically to today's Tenants page; run "Invite Prospect" and "New Tenant" end to end and confirm `SidebarContext.selectedClient` updates (check `Onboarding` picks up the new tenant); confirm `/tenants` and `/clients/[id]` are gone (404 or removed nav link) and nothing else in the app still links to them.

## Migration notes for implementation planning

Suggested order (each step keeps the app in a working state):
1. Extract shared types to `src/lib/tenant-types.ts`; update both existing pages to import from there (no behavior change yet).
2. Extract `CreateTenantModal` and `InviteProspectModal` out of `tenants/page.tsx` into standalone components, still rendered from `tenants/page.tsx` (proves they work standalone before the page itself moves).
3. Build `ClientsTable` and `ClientDrawer`, wire into a rebuilt `clients/page.tsx` alongside the two extracted modals.
4. Grep the codebase for any remaining links to `/tenants` or `/clients/[id]` (e.g. `tenants/page.tsx:775`'s own self-references, other pages linking to "Tenants") and update them.
5. Delete `tenants/page.tsx`, `clients/[id]/page.tsx`; remove the "Tenants" nav entry.
