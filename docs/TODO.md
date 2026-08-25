# TODO

Cross-cutting action items that aren't tied to a specific code feature —
things blocked on an external/business step rather than engineering work.

---

## Get a CAN-SPAM compliant mailing address for cold outreach

**Blocking:** cold-outreach email sending via the leads tracker.

`OUTREACH_COMPLIANCE_ADDRESS` is unset in `.env`. `complianceFooter()` in
`src/lib/outreach-templates.ts` deliberately throws when it's missing, and
`src/app/api/email/lead-outreach/route.ts` calls it *before* handing the
email to Resend — so this isn't a soft warning, no outreach email can send
until it's set. (Confirmed via Resend's full send log: every email ever
sent through this account went to an internal test address, never a real
lead — no compliance exposure from this being unset so far.)

Don't want to put a home address on it. Options, none require a lawyer:

- **USPS PO Box** — walk into any post office, same-day, ~$60-140 for
  6-12 months depending on size/location, needs 2 forms of ID.
- **Virtual mailbox / CMRA service** (iPostal1, Anytime Mailbox, PostScan
  Mail) — real street address format (e.g. "123 Main St, Suite 456"),
  reads more professional than a bare PO Box number. Online signup,
  address usually assigned same-day; full mail forwarding needs USPS Form
  1583 ID verification within 30 days. ~$10-25/month.
- **The UPS Store mailbox** — same idea as above, in-person or online.
- **LLC registered-agent address** — if/when forming an LLC, some
  formation services (Northwest Registered Agent, etc.) include a business
  mailing address in the package.

**Until resolved:** send cold outreach manually via LinkedIn instead of the
app's email flow.

**Once resolved:** set `OUTREACH_COMPLIANCE_ADDRESS` in `.env` (and in
production env vars) to unblock email sending.
