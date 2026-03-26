# Tenant Feature Playbook - Assets And Image Uploads

Date: 2026-03-25
Audience: Internal admin employees
Status: Active

## Purpose

Use this playbook for tenant image library work.

This page supports:

1. Bulk asset upload
2. Metadata entry for each image
3. Image storage in S3
4. Asset-library association to the selected website
5. URL retrieval for reuse in site content

## Preconditions

Before starting, confirm all of the following:

1. The tenant exists.
2. You clicked `Select` on the tenant from `Tenants`.
3. The correct client is selected in the sidebar.
4. You have approved source images.

## Step 1 - Open Assets

1. Open `Assets` from the sidebar.
2. Confirm the page shows the selected client name.

If no client is selected, the page explicitly tells you to select a client before uploading assets.

## Step 2 - Start A New Upload Batch

1. Click `Upload New Asset`.
2. Drag and drop images into the drop zone or use `Choose multiple images`.
3. Wait for the client-side uploads to finish.

Important behavior:

1. S3 upload happens per image.
2. Database save happens later when you click `Save`.
3. Do not leave the page before saving the batch.

## Step 3 - Enter Image Metadata

For each image, complete or verify:

1. Alt text
2. Title
3. Description

Notes:

1. Alt text should describe the image for accessibility.
2. Title should be short and organized.
3. Description should add context when useful.
4. If metadata v2 is enabled, title and description are stored separately.
5. If metadata v2 is not enabled, title and description are rolled into the legacy caption format.

## Step 4 - Optional Geolocation Data

Before upload, the tool also allows latitude and longitude entry.

Use this only when location tagging is intentionally required.

Notes:

1. The uploader writes GPS EXIF data into the processed image.
2. If you do not provide coordinates, the uploader uses default coordinates.
3. Do not enter fake coordinates unless the workflow explicitly allows it.

## Step 5 - Save The Batch

After all uploads finish:

1. Confirm there are no failed uploads.
2. Confirm no images are still pending or uploading.
3. Click `Save`.

The save process creates:

1. Image rows
2. Website-to-image asset relationship rows

Expected result:

1. The upload form closes.
2. The asset grid refreshes.
3. New images appear in `All Assets`.

## Step 6 - Verify Reuse Readiness

From the `All Assets` grid, verify:

1. Image thumbnail renders.
2. URL is visible.
3. Alt text is present when required.
4. Title is present when required.
5. Description is present when required.

You can use the copy action to reuse the asset URL in:

1. Site settings image fields
2. Service image URLs
3. Team photo URLs
4. Other content areas that accept an image URL

## Step 7 - Branding Versus General Assets

Use the correct page for the correct job:

1. Use `Branding` for logos and favicon assets tied to brand identity.
2. Use `Assets` for general reusable library images.

This distinction matters because branding uploads use the branding path and are also surfaced through branding-specific settings.

## Common Problems

1. Images upload but do not appear in the library.
   Fix: the batch was uploaded to S3 but not saved to the database. Reopen and save the batch.
2. Save fails because some uploads are still pending.
   Fix: wait for all uploads to complete.
3. Save fails because some uploads failed.
   Fix: remove or retry the failed items first.
4. Assets are attached to the wrong client.
   Fix: confirm the selected client before starting a new upload batch.

## Completion Checklist

Mark this playbook complete only when all of the following are true:

1. All required images are uploaded.
2. Metadata is entered for all customer-facing images.
3. The batch has been saved.
4. Assets appear in the grid.
5. Required URLs have been copied into the relevant site content fields.