---
description: "Turn intake answers into built-in page field values for Home, Services, and About. Use when onboarding a tenant and you want field-by-field copy from questionnaire answers, settings, and known business facts."
name: "Intake To Built-in Pages"
argument-hint: "Tenant name, business type, target city/area, known services, and any intake context to convert into page fields"
agent: "SEO Page Builder"
---
Turn the available intake answers, tenant settings, and business facts into implementation-ready built-in page fields.

Use [docs/seo/LOCAL_SEO_PAGE_PLAYBOOK.md](../../docs/seo/LOCAL_SEO_PAGE_PLAYBOOK.md) as the operating standard.

## Task

Generate field-by-field recommendations for these built-in pages:

1. Home
2. Services
3. About

## Required output

For each page, return:

1. Primary keyword target
2. Secondary/supporting terms
3. Recommended field values for the actual built-in page fields
4. SEO title
5. SEO description
6. Missing inputs that would improve ranking strength

## Field expectations

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

## Rules
- Use only facts supported by the intake or known workspace context.
- Do not invent licenses, years in business, reviews, or awards.
- Prioritize ranking for local and service-intent searches.
- Keep CTA recommendations aligned with the tenant's actual conversion goal.
- Write concise copy that can be pasted directly into the editor.