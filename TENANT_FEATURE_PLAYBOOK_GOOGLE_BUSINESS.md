# Tenant Feature Playbook - Google Business

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook when the tenant purchased the Google Business module.

This page supports:

1. Connecting the RC agency Google account
2. Linking a client location
3. Viewing reviews
4. Viewing performance data
5. Editing profile information
6. Creating Google Business posts

## Preconditions

Before starting, confirm all of the following:

1. The tenant has `google_business_management` enabled.
2. You clicked `Select` on the tenant from `Tenants`.
3. The correct client is selected in the sidebar.
4. The client already has a Google Business Profile location.

## Step 1 - Open Google Business

1. Open `Google Business` from the sidebar.
2. Confirm the selected client name is correct.

If no client is selected, the page blocks progress and asks you to select one from the sidebar.

## Step 2 - Connect The RC Agency Google Account

If the page shows `RC Tech Google account not connected`:

1. Click `Connect Google`.
2. Complete the Google OAuth flow.
3. Return to the app.

Expected result:

1. The page shows a success banner after the account is connected.
2. The app is ready to open the location picker.

## Step 3 - Link The Client Location

If the client is not linked yet, the page shows `No GMB Location Linked`.

Use one of these methods:

1. Location picker
2. Manual location ID entry

Recommended path:

1. Open the location picker.
2. Choose the correct Google Business location.
3. Link it to the selected client website.

Manual path:

1. Enter the location ID.
2. Enter the account ID if needed.
3. Save the manual link.

Expected result:

1. The business record now has a linked Google Business location.
2. The full Google Business dashboard becomes available.

## Step 4 - Review The Four Main Tabs

After linking, the page exposes these tabs:

1. `Reviews`
2. `Performance`
3. `Profile`
4. `Posts`

## Step 5 - Review Reviews

In `Reviews`:

1. Confirm reviews load.
2. Check total review count.
3. Review star distribution.
4. Reply to reviews only if the client workflow allows it.

Expected result:

1. Reviews are visible for the linked location.

## Step 6 - Review Performance

In `Performance`:

1. Confirm metrics load for the selected date range.
2. Verify the panel is not blocked by API approval requirements.

Known limitation:

1. The UI warns that some performance metrics require Google Business Profile API access approval.
2. If approval is missing, record the limitation and escalate only if the sold package requires live analytics.

## Step 7 - Review Profile Info

In `Profile`:

1. Confirm business details load.
2. Verify address, hours, and other business information.
3. Save edits only when the source-of-truth process allows app-side updates.

Known limitation:

1. The UI warns that profile information requires Google Business Profile API access.
2. Business hours may need to be updated directly in Google Business Profile Manager depending on the available API permissions.

## Step 8 - Create Posts

In `Posts`:

1. Click the create-post action.
2. Add one or more posts.
3. Provide meaningful summary text.
4. Save the posts.

Known limitation:

1. The UI states that live posting requires API access approval.
2. Without that approval, posts are currently saved to the database rather than published live to Google.

Expected result:

1. The employee understands whether this tenant is using live posting or staged-only behavior.

## QA Checks

Complete these checks before handoff:

1. Google account connection is complete.
2. Correct client location is linked.
3. Reviews tab loads.
4. Performance tab is tested or its limitation is documented.
5. Profile tab is tested or its limitation is documented.
6. Post creation workflow is tested.

## Common Problems

1. No client selected.
   Fix: select the tenant website in the sidebar first.
2. OAuth succeeds but no locations appear.
   Fix: verify the connected Google account can access the client's listing.
3. API returns blocked or approval-related errors.
   Fix: document the limitation and escalate only if required by contract.
4. Wrong location linked.
   Fix: relink the correct location before handoff.

## Completion Checklist

Mark this playbook complete only when all of the following are true:

1. Agency Google account is connected.
2. Client location is linked.
3. At least one successful dashboard load is confirmed.
4. Any API approval limitations are documented.
5. The tenant handoff notes clearly state what is operational today.