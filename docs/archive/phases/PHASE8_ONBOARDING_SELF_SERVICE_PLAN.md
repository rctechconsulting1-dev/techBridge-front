# Phase 8 Onboarding and Controlled Self-Service Plan

Date: 2026-03-24
Status: Completed
Owner: RC Tech Bridge

Purpose: operationalize repeatable tenant onboarding and safe client self-service controls.

## 1) Scope

- Internal tenant onboarding wizard
- Business-type presets
- Controlled client content editing permissions
- Support/escalation runbook per feature module
- Launch checklist for each new tenant

## 2) Kickoff Implementation (Current)

- Internal onboarding console page added at `src/app/(admin)/(others-pages)/onboarding/page.tsx`.
- Sidebar navigation entry added at `src/layout/AppSidebar.tsx` (`/onboarding`).
- Business preset model added at `src/lib/onboarding-presets.ts`.
- Persisted tenant content permission profiles added:
	- backend migration `backend-rc/migrations/1779500000000_add-tenant-content-permissions.js`
	- backend route `backend-rc/routes/contentPermissions.js` mounted at `/api/content-permissions`
	- onboarding UI now loads/saves via API for selected tenant website.
- Enforcement integrated for content writes:
	- `backend-rc/routes/pages.js` (`edit_homepage`)
	- `backend-rc/routes/siteSettings.js` (`edit_branding`)
	- `backend-rc/routes/services.js` (`edit_services`)
	- `backend-rc/routes/teamMembers.js` (`edit_team`)
	- `backend-rc/routes/faq.js` (`edit_faq`)
- Admin Site Editor UI now applies permission lock states before write actions:
	- `src/app/(admin)/(others-pages)/site-settings/page.tsx`
- Initial support escalation artifact: `../../operations/PHASE8_SUPPORT_ESCALATION_RUNBOOK.md`.
- Initial tenant launch artifact: `../../operations/PHASE8_TENANT_LAUNCH_CHECKLIST.md`.

## 3) Execution Backlog

1. Persist onboarding template and checklist state per tenant (backend API + DB model).
2. Bind permission matrix to existing role/membership controls.
3. Add preset-driven content seed flow for common business types.
4. Build launch approval gate (owner sign-off + timestamp + operator).
5. Add audit trail for onboarding and self-service changes.

## 4) Exit Criteria

- Internal team can execute onboarding end-to-end from one flow.
- Client editing is constrained to allowed sections.
- Escalation ownership and SLA targets are documented and used in support operations.
- Every launched tenant has a completed launch checklist artifact.

Phase 8 completion note:

- Core onboarding and controlled self-service scope for this phase is implemented and documented.
