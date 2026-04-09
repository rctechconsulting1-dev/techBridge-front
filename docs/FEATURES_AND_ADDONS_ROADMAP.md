# Features & Add-Ons Roadmap

**Last updated:** 2026-03-27  
**Status:** Living document

This document tracks planned features and add-ons that have backend support built but still need frontend UI, as well as future enhancements.

---

## Planned Features (Backend Ready — UI Pending)

### 1. Reservations

**Backend:** `POST/GET/PATCH /api/reservations`, cancel, collect-deposit  
**Status:** Backend complete, UI not started

**What it does:**  
Allows businesses (restaurants, venues, event spaces) to accept time-slot reservations from customers. Supports optional deposit collection at booking time.

**UI needed:**
- [ ] List page — table or calendar view with date filters, status badges
- [ ] Create form — service selector, date/time pickers, customer info, notes
- [ ] Detail page — reservation info, status management, cancel action
- [ ] Deposit widget — show auto-calculated deposit, trigger Stripe collection
- [ ] Sidebar nav entry (gated by `reservations_enabled` in payment config)

**Types to add:** `Reservation`, `ReservationPayment` in `src/types/payments.ts`

---

### 2. Connect Deposits Dashboard

**Backend:** `POST /api/connect/deposit` with auto-calc from service pricing + tenant config  
**Status:** Backend complete, UI not started

**What it does:**  
Collects booking deposits through Stripe Connect. Auto-calculates deposit amount from the tenant's payment config (percentage or fixed) and the service price, or accepts an explicit amount.

**UI needed:**
- [ ] Deposit collection form — select booking, optionally override amount
- [ ] Deposit history — list of collected deposits with status, amount, dates
- [ ] Integration in booking detail view — "Collect Deposit" action button

---

### 3. Booking Management (Admin View)

**Backend:** Booking requests exist via `/api/bookings`  
**Status:** Public booking form exists; admin management view missing

**What it does:**  
Admin view to list, review, approve/reject, and manage incoming booking requests.

**UI needed:**
- [ ] Bookings list page — filterable table with status, customer, date
- [ ] Booking detail page — full info, approve/reject actions
- [ ] Sidebar nav entry

---

## Future Enhancements

### Estimate Enhancements
- [ ] PDF export / download
- [ ] Email delivery with branded template
- [ ] Estimate-to-invoice conversion
- [ ] Customer-facing accept/decline portal (public page)
- [ ] Revision history / audit trail

### Reservation Enhancements
- [ ] Calendar view (day/week/month)
- [ ] Availability rules (time slots, blackout dates)
- [ ] Recurring reservations
- [ ] SMS/email confirmations
- [ ] Waitlist management

### Payment & Billing Enhancements
- [ ] Invoice generation from estimates
- [ ] Partial payment / payment plans
- [ ] Refund management UI
- [ ] Revenue reporting dashboard
- [ ] Multi-currency support

### Ecommerce — Orders & Fulfillment
- [ ] **Orders page** — admin dashboard view where tenants see incoming purchases (from `stripe_order_payment` table)
- [ ] Order detail view — line items, customer info, payment status, timestamps
- [ ] **Status transitions:** `pending → processing → shipped → delivered` with action buttons
- [ ] **Shipping details** — tracking number, carrier name, shipped-at timestamp per order
- [ ] Email notifications to customer on status change (shipped w/ tracking link, delivered)
- [ ] Order filters & search (by status, date range, customer)
- [ ] Sidebar nav entry (gated by `ecommerce_checkout_enabled` in payment config)

### Booking Deposits — Success & Confirmation
- [ ] **Separate deposit success page** — booking deposits use PaymentIntent via `/bookings/:id/deposit` (not Checkout Sessions), so success messaging is handled differently
- [ ] Deposit confirmation view with booking details, amount, and next steps
- [ ] Deposit status reflected in booking detail page (paid / pending / failed)
- [ ] Email receipt to customer on successful deposit

### Platform
- [ ] Webhook event log viewer (admin)
- [ ] Stripe Connect onboarding status in site-settings
- [ ] Service pricing management (price_cents, duration_minutes) in site-settings services tab

### Intake Questionnaire — Enhancements
- [ ] **Persist answers to DB** — store intake submissions in a dedicated table (tenant_id, answers JSONB, files JSONB, submitted_at) instead of email-only
- [ ] **Admin review UI** — dashboard page to view/search intake submissions, mark reviewed, export answers
- [ ] **Reminder emails** — automated 3-day and 6-day reminders for tenants who haven't completed intake before the 7-day token expires
- [ ] **Progress saving** — auto-save answers to localStorage (or DB) so users don't lose progress if they navigate away or close the tab
