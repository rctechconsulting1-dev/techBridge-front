# Phase 6 Entitlement Enforcement Plan

Date: 2026-03-24
Status: In progress
Owner: RD Tech Bridge

Purpose: define the implementation sequence for enforcing plan/add-on entitlements consistently across backend APIs and frontend UX.

Related artifacts:

- `PHASE6_ENTITLEMENT_MATRIX_DRAFT.md`
- `PHASE6_BILLING_ENTITLEMENT_SYNC_CONTRACT.md`
- `PHASE6_PACKAGING_PRICING_LINKAGE_DRAFT.md`

## 1) Current State Snapshot

Frontend (this repo):

- Session normalization already exposes `activeTenantId`, `enabledModules`, and `enabledFeatures`.
- Initial UI module gate exists for Calendar in sidebar.
- Multiple Next.js API route handlers proxy to backend endpoints using bearer auth.

Backend (`backend-rc`):

- Tenant and role middleware foundation is already present from earlier phases.
- Billing-to-entitlement sync contract is drafted but full enforcement rollout is still pending.

## 2) Enforcement Objective

For every protected request and privileged UI action:

1. Resolve tenant context.
2. Resolve effective entitlements (modules + features + limits).
3. Enforce entitlement gate before mutating or premium reads.
4. Return deterministic denial reason for UX messaging and audit.

## 3) Frontend Rollout Plan (This Repo)

### 3.1 Completed in this slice

- Added reusable entitlement helper utilities in `src/lib/entitlements.ts`.
- Updated `src/layout/AppSidebar.tsx` to gate nav entries by required modules.
- Preserved backward-compatible fallback when entitlement payload is absent.

### 3.2 Next frontend tasks

1. Add route-level guard wrapper for premium admin pages (show upgrade/forbidden state).
2. Add CTA pattern for gated features (upgrade modal + reason text).
3. Extend nav gating coverage to feature-level checks (not only module-level).
4. Standardize entitlement payload shape in one frontend type and consumption hook.

## 4) Backend Rollout Plan (`backend-rc`)

1. Add entitlement resolver service:
   - inputs: tenant ID, billing snapshot, manual overrides
   - outputs: modules/features/limits/state
2. Add middleware:
   - `requireModule(moduleKey)`
   - `requireFeature(featureKey)`
   - `requireLimit(featureKey, increment)` where applicable
3. Apply middleware to premium/protected routes first:
   - AI content endpoints
   - Google Business endpoints
   - Ads/SMS endpoints
   - premium operational modules
4. Ensure denial responses include machine-readable reason code:
   - `ENTITLEMENT_MODULE_MISSING`
   - `ENTITLEMENT_FEATURE_MISSING`
   - `ENTITLEMENT_LIMIT_EXCEEDED`
   - `ENTITLEMENT_RESTRICTED_STATE`
5. Emit structured logs with tenant + entitlement decision context.

## 5) Next.js API Route Alignment (This Repo)

For routes under `src/app/api` that proxy protected backend APIs:

1. Forward bearer auth and active tenant context consistently.
2. Pass through backend denial codes/status to preserve entitlement semantics.
3. Avoid local bypass behavior that would mask backend entitlement denials.

Priority route groups:

- `src/app/api/content-agent/route.ts`
- `src/app/api/stripe/**/route.ts`
- `src/app/api/domains/**/route.ts`
- `src/app/api/email/profile/**/route.ts`

## 6) Testing Plan

### 6.1 Backend tests (`backend-rc`)

- Unit tests for resolver merge precedence (plan + add-on + override + suspension).
- Middleware tests for allow/deny by module and feature keys.
- Limit counter tests for threshold and reset behavior.

### 6.2 Frontend tests (this repo)

- Sidebar visibility test matrix by entitlement payload.
- Route guard behavior tests for unauthorized/gated states.
- API proxy passthrough tests for entitlement denial responses.

## 7) Milestone Exit Criteria

- API: protected premium endpoints consistently enforce module/feature gates.
- UI: users cannot access premium flows via nav or direct deep-link without entitlement.
- Billing changes reflect in effective access within one sync cycle.
- Denials are auditable and user-visible with clear next actions.
