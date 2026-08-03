# Agency Ad Platform Setup Checklist (One-Time, Manual)

Audience: internal admin employees / agency owner
Status: Needs completion — these are one-time setup actions outside any
codebase in this repo. An engineer or agent cannot complete these steps;
they require an authorized person to sign into Google Ads and Meta
Business Manager directly.

These accounts must exist before the "Google Ads / Meta Ads — confirm
only" step in `ONBOARDING_CALL_SCRIPT.md` can send a link/partner request
ahead of any client's onboarding call. Complete once, not per-client.

## Google Ads Manager (MCC) account

- [ ] Go to https://ads.google.com/home/tools/manager-accounts/ and
      create an MCC account for RD Tech Bridge, if one doesn't already
      exist.
- [ ] Record the resulting Manager Customer ID (format `XXX-XXX-XXXX`).
- [ ] Store the Manager Customer ID wherever `ads-mcp` credentials are
      currently stored (see `backend-rc/README.md`'s "Onboarding New
      Tenants" section for the existing per-client credential pattern).

## Meta Business Manager account

- [ ] Go to https://business.facebook.com and create a Business Manager
      account for RD Tech Bridge, if one doesn't already exist.
- [ ] Record the resulting Business Manager ID (Business Settings →
      Business Info).
- [ ] Store the Business Manager ID alongside the Google Ads Manager
      Customer ID above.

## Verification

- [ ] Confirm both IDs are documented somewhere the admin running
      `ONBOARDING_CALL_SCRIPT.md`'s "Before the call" steps can find them.

Once both accounts exist and their IDs are recorded, the "Before the
call" steps in `ONBOARDING_CALL_SCRIPT.md` (sending the MCC link request
/ Meta partner request) become actionable for any client with the Ads
module.
