---
description: "Fill or improve a built-in page for ranking and conversion. Use when onboarding a tenant and you are working page-by-page in Home, Services, About, or Shop."
name: "Fill Built-in Page"
argument-hint: "Page name, tenant business type, city/area, conversion goal, and any known facts or intake context"
agent: "SEO Page Builder"
---
Fill or improve one built-in page so it is ready for ranking and conversion.

Use [docs/seo/LOCAL_SEO_PAGE_PLAYBOOK.md](../../docs/seo/LOCAL_SEO_PAGE_PLAYBOOK.md) as the standard.

## Task

Given the page the user is working on, return implementation-ready copy for the relevant built-in page fields.

## Required workflow

1. Identify the page type and its role in the funnel.
2. Identify the primary keyword target and local intent.
3. Use only trustworthy business facts already provided or present in the workspace.
4. Return field-by-field copy that fits the page's CMS fields.
5. Flag any missing facts that limit ranking strength.

## Required output

1. Page role summary
2. Primary keyword target
3. Supporting terms
4. Field-by-field recommended copy
5. SEO risks or missing inputs

## Page-specific field mapping

### Home
- Hero title
- Hero body
- Primary CTA text
- Primary CTA URL
- CTA section headline
- CTA section body
- CTA button text
- CTA button URL
- SEO title
- SEO description

### Services
- Hero title
- Hero body
- Empty-state title if needed
- Empty-state body if needed
- SEO title
- SEO description

### About
- Hero title
- Hero body
- Mission title
- Mission body
- SEO title
- SEO description

### Shop
- Hero title
- Hero body
- Empty-state title if needed
- Empty-state body if needed
- SEO title
- SEO description

## Rules
- Keep copy natural and local-intent aware.
- Do not keyword-stuff.
- Do not invent business claims.
- Prefer direct CTAs over soft filler language.