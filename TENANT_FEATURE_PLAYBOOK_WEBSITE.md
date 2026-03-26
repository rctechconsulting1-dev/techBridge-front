# Tenant Feature Playbook - Website And Content

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook after a tenant has been created and selected.

This playbook covers the website-side setup that happens inside:

1. `Global Site Settings`
2. `Built-in Pages`
3. `Branding`
4. `Services`
5. `Team`
6. Public preview and final website QA

## Preconditions

Before starting, confirm all of the following:

1. You are signed in with an internal `admin` account.
2. The tenant already exists.
3. You clicked `Select` on the tenant row from the `Tenants` page.
4. A client is selected in the sidebar for the tenant website you are editing.
5. The tenant has `website_core` or equivalent website access enabled.

## Expected Outcome

When this playbook is complete:

1. The tenant has correct site-wide business details.
2. The website brand assets are uploaded.
3. Built-in page copy is populated in the dedicated editors.
4. Core service and team content is populated.
4. The public site is ready for internal QA.

## Step 1 - Open Global Site Settings

1. From the tenant row, click `Global Site Settings`.
2. Confirm the page loads for the correct selected client.
3. Stay on the `Settings` tab first.

Expected result:

1. You can edit the selected tenant's site-wide configuration.

## Step 2 - Complete Core Global Settings

Update the primary website fields first.

Complete or verify these items:

1. Business name
2. Contact email
3. Contact phone
4. Address
5. Shared CTA text
6. Footer text
7. Social links
8. Map or location URL

Then:

1. Click `Save`.
2. Wait for the success state.

Expected result:

1. The page saves without permission or validation errors.
2. The site is revalidated after save when the revalidation secret is configured.

## Step 3 - Apply Preset Content Carefully

If onboarding selected a business preset, use that preset as the starting point, not the final copy.

Review and replace any placeholder or generated content in:

1. Built-in page copy
2. Contact details
3. Services text
4. Team text
5. FAQ answers

Do not leave generic city names, boilerplate promises, or template business descriptions in production content.

## Step 4 - Configure Built-In Pages And Branding

Use `Built-in Pages` to work through the platform-managed routes separately from custom slugs.

Built-in page workflow:

1. Home (`/`) uses the dedicated `Home` editor for hero copy and background settings.
2. Services (`/services`) uses the dedicated `Services` built-in page editor for intro copy and the `Services` tab for service records.
3. About (`/about`) uses the dedicated `About` built-in page editor for story and mission copy plus the `Team` tab for staff profiles.
4. Shop (`/shop`) uses the dedicated `Shop` built-in page editor for page messaging and the `Shop` tab when ecommerce is enabled.

Do not create custom pages for those built-in routes.

Then open `Branding` from the sidebar.

Upload and verify the following if available:

1. Main logo
2. Favicon
3. Small logo variant
4. Large logo variant

Notes:

1. Branding uploads are stored in the branding asset path for the selected website.
2. The page reads current branding from the website's site settings record.
3. Branding uploads also create asset records so they can be reused later.

Expected result:

1. Logo and favicon render on the page after upload.
2. No upload error remains on screen.

## Step 5 - Populate Built-In Page Copy

Open each built-in page editor and replace any seeded or migrated content that is still generic.

At minimum review:

1. Home hero title, body, CTA, and background treatment
2. Services page title, intro, and empty-state copy
3. About page title, intro, mission title, and mission body
4. Shop page title, intro, and empty-state copy when ecommerce is enabled

Expected result:

1. Built-in page copy is edited from the dedicated page editors, not from `Global Site Settings`.

## Step 6 - Populate Services

Return to `Global Site Settings` and open the `Services` tab.

For each service, confirm:

1. Title is customer-facing and specific.
2. Slug is clean and readable.
3. Content is complete and not placeholder text.
4. Image URL is set if the service card requires imagery.

Recommended minimum:

1. Add at least 3 core services.
2. Order them by business priority.
3. Remove duplicates or obvious template leftovers.

Expected result:

1. Service cards support a usable public services page.

## Step 7 - Populate Team

Open the `Team` tab in `Global Site Settings`.

For each team member, confirm:

1. Name
2. Role or title
3. Short bio
4. Photo URL if provided
5. LinkedIn URL if appropriate
6. Sort order

Recommended minimum:

1. Add only real staff members approved for publication.
2. Use sort order to control display sequence.

Expected result:

1. Team section is publishable and correctly ordered.

## Step 8 - Verify FAQ And Main Navigation Content

Confirm the website content supports the expected built-in pages and anchors.

Review at minimum:

1. Home
2. Services
3. About
4. Contact
5. FAQ anchors such as `#faq`

If the tenant package includes shop functionality, also review `Shop`.

If the client needs additional pages beyond the built-ins, create them in `Custom Pages`.

Expected result:

1. Primary navigation points to real content sections.
2. No broken anchor or placeholder page remains.

## Step 9 - Run Public QA

Open the public preview or site entry points and verify:

1. Branding is visible.
2. Contact details match the client intake information.
3. CTA buttons use the correct wording.
4. Services and team sections load.
5. Images render without broken links.
6. Footer information is correct.
7. Mobile layout is usable for the main landing page.

## Common Problems

1. Wrong tenant selected.
   Fix: Go back to `Tenants`, click `Select`, then reopen the page.
2. Changes save to the wrong website.
   Fix: Confirm the sidebar client selection before editing.
3. Brand upload succeeds but old content still appears.
   Fix: refresh after save and confirm revalidation is configured.
4. Permission errors appear.
   Fix: confirm onboarding permissions or perform the action as internal admin.

## Completion Checklist

Mark this playbook complete only when all of the following are true:

1. Global Site Settings are saved.
2. Built-in page copy is reviewed in the dedicated editors.
3. Branding is uploaded.
4. Services are populated.
5. Team is populated or intentionally omitted.
6. Public QA is complete.
7. Any unresolved copy or asset gaps are documented for follow-up.