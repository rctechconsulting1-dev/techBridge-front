# Phase 0 Decision Log

Date: 2026-03-23
Status: Approved

Purpose: lock architecture decisions before schema migrations begin.

## A) Confirmed From Discussion

- Database: AWS RDS PostgreSQL
- Backend ownership: Express backend repo (not Supabase)
- Admin model: one admin can manage multiple client tenants
- Access model: phased access over time
- Add-on direction:
  - Google Business management
  - SMS lead notifications and client communication
  - Google Ads optimization workflow
  - Custom AI agents by industry
- Custom domains: every client has custom domain
- Enterprise strategy: dedicated repo/deployment only for enterprise exceptions

## B) Approved Defaults

## B1) Business Type Enum

- `lead_gen_services`
- `appointments`
- `ecommerce`
- `reservations`
- `hybrid_local`

## B2) Module Enum

- `website_core`
- `seo_content`
- `lead_capture`
- `calendar_appointments`
- `checkout_ecommerce`
- `reservations`
- `google_business_management`
- `sms_leads_and_comms`
- `google_ads_optimization`
- `custom_ai_agent`

## B3) Role Matrix

- `platform_admin`
- `tenant_owner`
- `tenant_manager`
- `tenant_editor`
- `tenant_viewer`
- `support_agent`

## B4) Payments Model

- Stripe Connect with one platform account and per-tenant connected accounts.

## B5) Email Model

- One email provider account, per-tenant sender profiles and verified domains.

## B6) Enterprise Carve-Out Triggers

- Contractual isolation required
- Dedicated SLA/release cadence required
- Heavy custom logic outside shared modules
- Security/compliance isolation required

## B7) Domain Onboarding SOP Owner

- Owner: Internal Operations (with engineering support for escalations)

## C) Phase 0 Approval Checklist

- [x] Approve business type enum values
- [x] Approve module enum values
- [x] Approve role matrix
- [x] Approve Stripe model
- [x] Approve email model
- [x] Approve enterprise carve-out triggers
- [x] Assign domain onboarding SOP owner

## D) Exit Criteria For Phase 0

- [x] This document approved
- [x] `MULTI_TENANCY_PHASE_CHECKLIST.md` Phase 0 items checked off
- [x] Ready to start Phase 1 schema migrations
