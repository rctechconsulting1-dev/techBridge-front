# Local New Tenant UI Test

Date: April 8, 2026

Use this guide when testing a brand new tenant locally from the admin account.

This is the correct flow when you are creating a new tenant in the admin UI and want to verify both the admin experience and the local tenant-domain preview.

## Preconditions

Before starting:

1. Frontend is running on `http://localhost:3000`
2. Backend is running on `http://localhost:5000`
3. You are signed in as your admin user

## Step 1: Create A New Tenant

1. Open `http://localhost:3000/tenants`
2. Create the tenant from the admin UI
3. After creation, note the following:
   1. tenant name
   2. temporary domain
   3. owner email

Expected result:

1. Tenant creation succeeds
2. A temporary domain ending in `.rctechbridge.com` is assigned
3. The tenant becomes available in admin context

## Step 2: Point The New Tenant Domain To Localhost

Take the exact temporary domain from the tenant you just created.

1. Open Notepad as Administrator
2. Open `C:\Windows\System32\drivers\etc\hosts`
3. Add a line like this:

```txt
127.0.0.1 your-new-tenant-domain.rctechbridge.com
```

4. Save the file

Important:

1. Use the exact new tenant domain from the UI
2. Do not use an old disposable launch-test domain unless that is the tenant you are testing

## Step 3: Open The Local Tenant Preview

Open an incognito or private browser window.

Use `http`, not `https`, and keep the `:3000` port.

Open these URLs:

1. `http://your-new-tenant-domain.rctechbridge.com:3000/`
2. `http://your-new-tenant-domain.rctechbridge.com:3000/services`
3. `http://your-new-tenant-domain.rctechbridge.com:3000/about`
4. `http://your-new-tenant-domain.rctechbridge.com:3000/contact`

Expected result:

1. All four routes load successfully
2. You see the tenant site, not the RC Tech Bridge platform homepage

If the browser tries to use the live deployed site instead:

1. stay on `http`
2. keep `:3000` in the URL
3. use incognito to avoid cached redirects

## Step 4: Verify The Admin Flow

After creating the tenant, test the admin pages in this order:

1. `http://localhost:3000/onboarding`
2. `http://localhost:3000/site-settings`
3. `http://localhost:3000/built-in-pages`

Expected result:

1. The new tenant is selected in context
2. Onboarding loads for the tenant
3. Site Settings loads for the tenant
4. Built-in Pages opens for the tenant

## Step 5: Verify Global Site Settings

In Site Settings:

1. confirm the temporary RC domain is shown
2. add or verify phone
3. add or verify email
4. add or verify service area or address
5. confirm header navigation is present
6. save changes

Expected result:

1. Save succeeds
2. Refreshing the tenant preview shows updated tenant-wide data where applicable

## Step 6: Verify Built-In Pages

Open Built-in Pages and test at minimum:

1. Home
2. Services
3. About

For each page:

1. confirm content loads
2. make a visible edit
3. save or publish through the normal workflow
4. refresh the matching preview page under the tenant domain

Expected result:

1. The edit appears on the local tenant preview
2. The tenant preview reflects saved tenant content instead of generic fallback-only content

## Step 7: Verify The Contact Path

Open:

1. `http://your-new-tenant-domain.rctechbridge.com:3000/contact`

Then verify:

1. the page renders
2. nav links to Contact work from Home, Services, and About
3. any CTA path to Contact does not 404

## Pass Criteria

The local UI test passes if all are true:

1. tenant creation succeeds
2. the new temporary tenant domain loads locally on `:3000`
3. `/`, `/services`, `/about`, and `/contact` all load
4. admin pages load for the new tenant
5. Site Settings saves successfully
6. Built-in Pages save successfully
7. saved edits appear on the tenant preview

## Failure Checklist

If something fails, capture these exact details:

1. the new tenant domain
2. the exact step that failed
3. whether the failure happened in admin UI or public preview
4. the exact URL used
5. whether the problem was a 404, wrong content, save failure, or redirect issue

That is enough information to debug the real new-tenant path without guessing.