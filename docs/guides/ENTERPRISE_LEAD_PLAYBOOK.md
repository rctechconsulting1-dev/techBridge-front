# Enterprise / Large-Company Lead Playbook

The cold-outreach system in `/leads` (AI parsing, tiered templates, one-click
send) is built for local small-and-medium businesses: a business owner who
personally reads their own email, and a website/workflow problem you can see
and fix in a day. That playbook breaks down against a large company —
multi-location chains, franchises, or anything with a named executive team.
This doc is the different playbook for those.

Case study that prompted this: **Restaurant Depot**, captured via Google Maps
as a single warehouse location. The AI-parsed draft was generic ("Small
Business in Los Angeles") and the stored email was wrong, because there was
no real hook or real contact behind a local listing for a national chain.

## 1. Recognize an enterprise lead before drafting anything

Check for these signals before letting the AI-parsed draft go out as-is:

- Multiple locations / warehouses / branches under one brand
- A corporate HQ address distinct from the location you found
- Named C-suite or VP-level executives findable via search or LinkedIn
- Existing in-house tech (a member portal, a POS integration, an app) —
  evidence they already have IT/dev budget, not zero web presence
- The Google Maps listing is one storefront of something much bigger

If two or more of these are true, stop and switch to this playbook instead
of sending the auto-drafted small/medium-tier email.

## 2. Research before drafting (30-45 min, not 5)

The small-business templates work because a Google rating + city + trade is
already enough personalization. It isn't here. Before writing anything:

1. **Read the actual company site and, if separate, the customer/member
   portal.** Note what's modern vs. dated, what's self-serve vs. manual, and
   any visible operational gap (no quote form, manual "we'll call you"
   flows, a portal that looks like it hasn't been touched in a decade).
2. **Search for the corporate entity name**, not just the brand — chains are
   often run by a parent holding company (e.g., Restaurant Depot / Jetro
   Holdings). Find HQ location, named executives, employee count.
3. **Check press releases / trade press** for anything about recent tech
   investments — tells you what they already spend money on and rules out
   pitches that duplicate existing tools.
4. Write down 2-4 specific, verifiable observations. Frame anything about
   *internal* operations as a question ("I wondered whether...") not a
   claim — you can't see their internals from the outside.

## 3. Find a real decision-maker — don't trust a scraped email

A Google Maps listing's "email" field is frequently wrong or empty for a
location that belongs to a larger company, because there's no public inbox
tied to that storefront. Before sending:

- Search the company's LinkedIn page for a named person in a relevant role
  (IT, Digital, E-commerce, Ops, Marketing — title varies by company).
- If no email can be confirmed, **default to LinkedIn outreach to that named
  person** instead of guessing an email address. A wrong email either
  bounces (wastes the touch) or reaches someone with zero authority to act.
- If you can't find any named person with plausible authority, this lead
  isn't ready to pursue yet — log it and move on rather than force a send.

## 4. Reposition the pitch — this isn't the small-business close

The local-SMB templates end on a deliberately low-pressure, single-favor ask
("happy to send a mockup over, no pressure either way") because the reader
is a solo owner who can say yes on the spot. An enterprise contact can't —
they need to loop in other people, and a "quick mockup" undersells what
you're actually proposing.

- Lead with the specific, researched observation(s) from step 2 — this is
  what proves you're not a mass-blast vendor.
- Position toward the **Enterprise tier** (see `docs/SALES_PITCH.md`):
  custom AI agents, white-label capability, dedicated account manager —
  not the Starter/Professional framing built for a single-location shop.
- Close by asking for a short discovery call, not "reply if curious." A
  vague low-pressure close reads as a lower-stakes offer than what you're
  actually pitching.
- Expect multiple touches. One email/LinkedIn message is an opener, not the
  whole play — plan a short follow-up sequence rather than treating a single
  non-reply as a dead lead.

## 5. Before sending — checklist

- [ ] Confirmed this is a multi-location/corporate entity, not an
      independent local business
- [ ] Read the real site (and portal, if separate) — have 2-4 specific,
      verifiable observations, not generic filler
- [ ] Found a named person with plausible authority (LinkedIn or the
      company site's leadership/press page)
- [ ] Have a real send channel for that person (confirmed email, or
      LinkedIn if no email can be verified) — not a guessed address
- [ ] Pitch references the Enterprise tier framing, not the small-business
      templates in `outreach-templates.ts`
- [ ] Close asks for a discovery call, not a low-pressure "no worries
      either way"

## 6. Once they say yes — onboarding checklist

Enterprise deals don't onboard like a Starter/Professional/Business Plan
signup (no self-serve checkout, no standard SOW). Before any work starts:

- [ ] Fill in `docs/legal/MASTER_SERVICE_AGREEMENT_TEMPLATE.md` with the
      client's legal entity name, address, and signatory — every
      `[BRACKETED]` field, none left as placeholder text
- [ ] Confirm `docs/TODO.md`'s mailing-address item is resolved — the MSA
      template's `[COMPLIANCE MAILING ADDRESS]` field can't ship blank or
      with a home address
- [ ] Negotiate and fill in the liability cap (Section 8.2) — the
      standard Terms of Service use a 3-month-of-fees cap; Enterprise
      deals commonly negotiate a longer look-back or a flat dollar figure
- [ ] Fill in term length, renewal notice period, and payment terms
      (Sections 2 and 3) to match what was actually agreed on the
      discovery call
- [ ] Have the filled-in draft reviewed by an attorney before it goes to
      the client — this template hasn't been reviewed, and an MSA is a
      signed contract, not a marketing page
- [ ] Confirm the client's data flows (what of *their* customers' data
      will touch the platform) so `/data-processing-agreement` — which
      the MSA incorporates by reference in Section 6 — actually covers
      what they need; flag anything outside its US-only scope (Section 12
      of the DPA) before signing
- [ ] Get the MSA countersigned before any SOW-level work begins,
      consistent with Section 1.2 of the MSA (SOWs are executed *under*
      this Agreement, not instead of it)

## 7. Open question for later

The leads tracker's `tier` field is currently `small` | `medium` only
(`backend-rc/routes/outreachLeads.js`), with no `enterprise` value and no
distinct template branch for it. If this becomes a repeatable motion, worth
revisiting: a third tier, a manual "needs research" status so these don't
get auto-drafted and sent like a small-business lead, and possibly a
dedicated enterprise template shell in `outreach-templates.ts`. Not
implemented now — flagging for when we're ready to build it.
