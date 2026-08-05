# Post-Launch Google Analytics & Search Console Email Template

Audience: internal admin employees
Status: Active
Trigger: send once a tenant's domain shows `active` in
`Global Site Settings`, per `TENANT_ONBOARDING_RUNBOOK.md` Step 11.4.

## Subject

Your website is live — let's connect Google Analytics and Search Console

## Body

```
Hi {{owner_name}},

Great news — {{business_name}}'s website is live at {{domain}}.

Two quick things to finish setting up so we can track your site's
performance and help it show up better in Google search:

1. Google Analytics (GA4)
   - Go to https://analytics.google.com and create a property for
     {{domain}} if you don't already have one (or open your existing one).
   - Go to Admin → Property Access Management → Add users.
   - Add rctechsolutions1@gmail.com with the Editor role.
   - Reply to this email with your GA4 Measurement ID (starts with "G-"),
     found under Admin → Data Streams → your web stream.

2. Google Search Console
   - Go to https://search.google.com/search-console and add a property
     for {{domain}}.
   - Go to Settings → Users and permissions → Add user.
   - Add rctechsolutions1@gmail.com as a Full user.

Once both are done, just reply and let us know — we'll take it from there.

Thanks,
RD Tech Bridge
```

## Placeholders

- `{{owner_name}}` — tenant owner's name, from the tenant record.
- `{{business_name}}` — tenant's business name, from the tenant record.
- `{{domain}}` — the tenant's now-verified custom domain (or preview URL,
  if applicable).

## Sending

No automated send path exists for this yet (per
`docs/superpowers/specs/2026-08-03-onboarding-call-access-checklist-design.md`,
this is an ops/process spec with no code changes). Admin sends this
manually from their own email client, filling in the placeholders above.
