# Image Metadata V2 Migration

This repo now supports a migration-safe path for separate image `title` and `description` fields.

Current behavior:
- If `NEXT_PUBLIC_IMAGE_METADATA_V2=false` (default), uploader stores metadata in legacy fields:
  - `alt_text` = alt text
  - `caption` = `title | description`
- If `NEXT_PUBLIC_IMAGE_METADATA_V2=true`, uploader sends:
  - `alt_text`
  - `title`
  - `description`
  - `caption` (fallback for compatibility)

## Backend steps

1. Add columns to image table

```sql
ALTER TABLE image
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;
```

2. Update image create/update API DTOs to accept and persist `title` and `description`.

3. Keep returning `caption` during transition, but prefer `title` + `description` in API responses.

4. (Optional) backfill legacy caption values.
- If caption format is `title | description`, split into new columns.
- If caption has no separator, move to `description`.

## Frontend rollout

1. Deploy backend migration first.
2. Set env value:

```dotenv
NEXT_PUBLIC_IMAGE_METADATA_V2=true
```

3. Re-deploy frontend.

## Notes

- Assets UI now reads `title` and `description` when available.
- Legacy caption parsing is still supported for older records.
