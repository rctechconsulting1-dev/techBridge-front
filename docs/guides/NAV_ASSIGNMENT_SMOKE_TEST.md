# Navigation Assignment Smoke Test

Use this script when you want a repeatable end-to-end check of page-managed navigation assignments against the local backend and frontend.

It will:

1. Authenticate with the backend.
2. Create temporary pages for:
   - one direct header link
   - one dropdown parent
   - one dropdown child
   - one footer link
3. Verify `navigation_assignments` come back from the pages API.
4. Verify the public site HTML includes the expected labels and hrefs.
5. Delete the temporary pages unless you opt out.

## Prerequisites

- Backend running locally, usually at `http://localhost:5000/api`
- Frontend built server or dev server reachable, default configured here as `http://localhost:3002`
- A valid tenant and website pair
- Auth via either a bearer token or sign-in credentials

## Run With Existing Token

```bash
SMOKE_WEBSITE_ID=1 \
SMOKE_TENANT_ID=1 \
SMOKE_AUTH_TOKEN="your-jwt-here" \
npm run smoke:nav
```

## Run By Signing In

```bash
SMOKE_WEBSITE_ID=1 \
SMOKE_TENANT_ID=1 \
SMOKE_EMAIL="admin@example.com" \
SMOKE_PASSWORD="your-password" \
npm run smoke:nav
```

## Optional Overrides

```bash
SMOKE_API_URL=http://localhost:5000/api
SMOKE_PUBLIC_URL=http://localhost:3002
SMOKE_KEEP_PAGES=1
```

`SMOKE_KEEP_PAGES=1` leaves the created pages in place for manual inspection. Otherwise the script deletes them automatically.

If `CMS_REVALIDATION_SECRET` is available in the frontend repo env files, the script automatically calls `/api/revalidate` before checking public HTML. If not, it falls back to waiting through the ISR window.

## Notes

- The script expects the public frontend route to render page-backed navigation labels in the HTML.
- Cleanup runs in reverse order so dropdown children are removed before their parent pages.
- If cleanup fails, the script logs the failed page IDs so they can be removed manually.