# Phase 8 Support Escalation Runbook

Date: 2026-03-24
Status: Active v1
Owner: RD Tech Bridge

## 1) Escalation Levels

- L1: Tenant Manager / Tenant Owner
- L2: Support Agent
- L3: Platform Owner
- L4: Engineering

## 2) Module Ownership Matrix

| Module                            | L1 Owner                 | Escalation Path | Target Response  |
| --------------------------------- | ------------------------ | --------------- | ---------------- |
| Site Content (pages/services/faq) | Tenant Editor or Manager | L2 -> L3        | 1 business day   |
| Booking Intake / Calendar         | Tenant Manager           | L2 -> L4        | 4 business hours |
| Payments / Stripe                 | Support Agent            | L4 -> L3        | 1 hour           |
| Google Business                   | Support Agent            | L3 -> L4        | 1 business day   |
| Domains and DNS                   | Support Agent            | L3              | 4 business hours |

## 3) Escalation Trigger Conditions

- Revenue-impacting payment failures
- Booking create failures sustained for more than 10 minutes
- Domain onboarding blocked by DNS verification errors
- Security or cross-tenant access concern

## 4) Ticket Handoff Requirements

- Tenant identifier and website_id
- Incident source and timestamp
- Current impact (users/flows blocked)
- Logs or alert payload excerpt
- Recovery actions already attempted

## 5) Closure Criteria

- Root cause identified
- Mitigation applied and validated
- Tenant owner notified
- Follow-up action item logged (if needed)
