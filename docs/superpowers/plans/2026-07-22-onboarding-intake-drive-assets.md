# Onboarding Intake: Drive-Based Assets + Automation Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route intake asset files (logo, headshot, work photos) through a
client-provided Google Drive folder link instead of the product's own S3
upload path, and add a new "Automation & Workflows" section to the intake
questionnaire, per `docs/superpowers/specs/2026-07-22-client-onboarding-process-design.md`.

**Architecture:** `src/lib/intake-questions.ts` is the single source of
truth for intake form fields, consumed by both the classic (`/intake`) and
AI-assisted (`/intake/ai`) forms. Three file-upload questions
(`logo`, `headshot`, `work_photos`) are replaced by one text field
(`asset_drive_link`). Three downstream consumers that currently
auto-detect the uploaded logo file (Branding, Onboarding checklist,
Site Settings) are updated to read the new text answer instead and stop
auto-applying a logo image, since a Drive link isn't a directly servable
image URL. The AI-assisted intake's "suggested images found on your site"
feature is removed since it has no file question left to attach to. A
`driveFolderUrl` value is threaded from the tenant-creation/resend UI
through to the intake email template, which is the one place the
per-client Drive folder link is communicated to the client.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Zod, Resend (email).

## Global Constraints

- This repo has **no automated test runner** (no jest/vitest; `package.json`
  has no `test` script). Verification per task uses `npx tsc --noEmit`
  (type safety) and `npx eslint <changed files>` (style/correctness),
  substituting for the usual red/green test cycle. This mirrors the
  repo's existing convention of documented manual smoke tests
  (`docs/guides/*_TEST.md`, `scripts/*-smoke-test.mjs`) rather than a
  unit-test suite.
- Baseline confirmed in the implementation worktree (fresh `npm install`):
  `npx tsc --noEmit` has 8 pre-existing errors, all `Property 'className'
  does not exist on type 'IntrinsicAttributes'` on `<EyeIcon>`/
  `<EyeCloseIcon>` in `src/components/auth/SignInForm.tsx` (lines 207,
  209), `src/components/auth/SignUpForm.tsx` (lines 222, 224),
  `src/components/form/date-picker.tsx:55`,
  `src/components/form/form-elements/DefaultInputs.tsx` (lines 56, 58),
  and `src/layout/AppSidebar.tsx:273`. `npm run lint` has 7 pre-existing
  errors / 5 warnings in files unrelated to this plan (`ai-leads/page.tsx`,
  `google-business/page.tsx`, `main-page/page.tsx`,
  `built-in-pages/[pageKey]/page.tsx`, `onboarding/page.tsx:194`). None of
  these files are touched by any task in this plan. Do not fix these as
  part of this plan; only ensure no *new* errors appear in files this plan
  touches.
- Do not modify `/api/intake/upload`, `/api/s3-upload`, or
  `src/app/intake/page.tsx`'s file-upload machinery. They become unused
  by the removed questions but remain generic, reusable, working
  infrastructure — removing them is out of scope (YAGNI cuts both ways:
  don't build it, and don't rip out working generic infra that something
  else could reuse later).
- Do not modify `src/app/api/intake/agent/route.ts` — it doesn't reference
  the removed file-question IDs or `suggestedFiles`.
- The per-client Google Drive folder itself is created manually by the
  admin (process step, not code) and pasted into the UI field this plan
  adds. No Google Drive API integration is in scope.

---

### Task 1: Update intake question config

**Files:**
- Modify: `src/lib/intake-questions.ts`

**Interfaces:**
- Produces: a new answer key `asset_drive_link` (type `text`) replacing
  the removed `logo`, `headshot`, `work_photos` file questions. A new
  `automation` section with answer keys `manual_workflows`,
  `current_tools`, `automation_interest`, `automation_notes`. Tasks 5, 6,
  and 7 read `answers.asset_drive_link` from a submitted
  `IntakeStoredSubmission`.

- [ ] **Step 1: Remove the `logo` and `headshot` file questions, add `asset_drive_link`**

In `src/lib/intake-questions.ts`, replace the `UNIVERSAL_BRAND` section:

```ts
const UNIVERSAL_BRAND: IntakeSection = {
  id: "brand",
  title: "Your Brand",
  description: "Help us match your website to your brand identity.",
  questions: [
    {
      id: "logo",
      label: "Upload your logo (PNG or SVG, transparent background preferred)",
      type: "file",
      uploadCategory: "logo",
      accept: "image/png,image/svg+xml,image/jpeg,image/webp",
      hint: "If you don't have a logo yet, we can help create one.",
    },
    {
      id: "headshot",
      label: "A professional photo of yourself or your team",
      type: "file",
      uploadCategory: "team",
      accept: "image/*",
      hint: "High-res, good lighting preferred.",
    },
    {
      id: "brand_colors",
      label: "What colors feel like 'you'?",
      type: "text",
      placeholder: "e.g. bold blue and white, earthy green and tan",
    },
    {
      id: "brand_words",
      label: "Three words that describe your brand or service style",
      type: "text",
      required: true,
      placeholder: "e.g. reliable, modern, friendly",
    },
  ],
};
```

with:

```ts
const UNIVERSAL_BRAND: IntakeSection = {
  id: "brand",
  title: "Your Brand",
  description: "Help us match your website to your brand identity.",
  questions: [
    {
      id: "asset_drive_link",
      label:
        "Once you've added your logo, photos, and any brand assets to the shared folder we sent you, paste the folder link here (or leave a note)",
      type: "text",
      placeholder:
        'e.g. https://drive.google.com/drive/folders/... — or "Uploaded, all set"',
      hint: "We emailed you a link to a shared folder for your logo, headshots, and any other brand assets. Drop everything there — no need to upload files in this form. If you don't have a logo yet, we can help create one.",
    },
    {
      id: "brand_colors",
      label: "What colors feel like 'you'?",
      type: "text",
      placeholder: "e.g. bold blue and white, earthy green and tan",
    },
    {
      id: "brand_words",
      label: "Three words that describe your brand or service style",
      type: "text",
      required: true,
      placeholder: "e.g. reliable, modern, friendly",
    },
  ],
};
```

- [ ] **Step 2: Remove the `work_photos` file question from Media**

Replace the `UNIVERSAL_MEDIA` section:

```ts
const UNIVERSAL_MEDIA: IntakeSection = {
  id: "media",
  title: "Photos & Media",
  description: "Upload photos that show off your work. We'll use these on your site.",
  questions: [
    {
      id: "work_photos",
      label: "Photos of your work, products, or workspace",
      type: "multifile",
      uploadCategory: "work",
      accept: "image/*",
      maxFiles: 20,
      hint: "5–15 photos recommended. Before/after shots are great!",
    },
    {
      id: "video_links",
      label: "Any video content, testimonials, or promo clips?",
      type: "textarea",
      placeholder: "Paste YouTube, Vimeo, or other video links here",
    },
    {
      id: "existing_testimonials",
      label: "Do you have any existing testimonials or reviews you'd like us to use?",
      type: "textarea",
      placeholder: "Paste review text, customer quotes, or share a link to your reviews",
      hint: "These can be from Google, Yelp, Facebook, or any other platform.",
    },
  ],
};
```

with:

```ts
const UNIVERSAL_MEDIA: IntakeSection = {
  id: "media",
  title: "Photos & Media",
  description:
    "Add photos of your work to the shared folder we sent you — we'll use these on your site.",
  questions: [
    {
      id: "video_links",
      label: "Any video content, testimonials, or promo clips?",
      type: "textarea",
      placeholder: "Paste YouTube, Vimeo, or other video links here",
    },
    {
      id: "existing_testimonials",
      label: "Do you have any existing testimonials or reviews you'd like us to use?",
      type: "textarea",
      placeholder: "Paste review text, customer quotes, or share a link to your reviews",
      hint: "These can be from Google, Yelp, Facebook, or any other platform.",
    },
  ],
};
```

- [ ] **Step 3: Add the new "Automation & Workflows" section**

Add this new section after `UNIVERSAL_PLATFORMS` and before the
`// ─── Launch & setup section ───` comment in
`src/lib/intake-questions.ts`:

```ts
// ─── Automation & workflows section ──────────────────────────────────────────

const UNIVERSAL_AUTOMATION: IntakeSection = {
  id: "automation",
  title: "Automation & Workflows",
  description: "Help us spot repetitive work we could take off your plate.",
  questions: [
    {
      id: "manual_workflows",
      label: "What tasks or parts of running your business feel repetitive or manual right now?",
      type: "textarea",
      placeholder:
        "e.g. manually texting customers back, re-typing the same quote every time, tracking leads in a notebook",
    },
    {
      id: "current_tools",
      label: "What software or tools do you currently use for day-to-day operations?",
      type: "textarea",
      placeholder:
        "e.g. QuickBooks for invoicing, a shared spreadsheet for scheduling, texting customers from a personal phone",
    },
    {
      id: "automation_interest",
      label: "Which of these would you be interested in automating?",
      type: "multiselect",
      options: [
        { value: "sms_followups", label: "Text message follow-ups with leads/customers" },
        { value: "ai_content_agent", label: "AI-assisted content or customer responses" },
        { value: "ads_optimization", label: "Ad campaign management/optimization" },
        { value: "none_yet", label: "Not sure yet / none of these" },
      ],
    },
    {
      id: "automation_notes",
      label: "Anything else you wish could just run itself?",
      type: "textarea",
      placeholder: "Optional — anything not covered above",
    },
  ],
};
```

- [ ] **Step 4: Register the new section in `getIntakeSections`**

Replace:

```ts
export function getIntakeSections(businessType: BusinessType = "universal"): IntakeSection[] {
  return [
    UNIVERSAL_ABOUT,
    UNIVERSAL_BRAND,
    getOfferingsSection(businessType),
    UNIVERSAL_PLATFORMS,
    UNIVERSAL_MEDIA,
    UNIVERSAL_CONTACT,
    UNIVERSAL_SETUP,
  ];
}
```

with:

```ts
export function getIntakeSections(businessType: BusinessType = "universal"): IntakeSection[] {
  return [
    UNIVERSAL_ABOUT,
    UNIVERSAL_BRAND,
    getOfferingsSection(businessType),
    UNIVERSAL_PLATFORMS,
    UNIVERSAL_AUTOMATION,
    UNIVERSAL_MEDIA,
    UNIVERSAL_CONTACT,
    UNIVERSAL_SETUP,
  ];
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npx eslint src/lib/intake-questions.ts`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, sign in as admin, and open the `Tenants` page. Use an
existing tenant's "Resend Intake Email" (or create a test tenant) to get a
valid intake link, then open `/intake?token=...` in the browser.

Confirm:
1. The "Your Brand" section shows one text field ("paste the folder
   link...") instead of a logo file upload, followed by colors and brand
   words.
2. The "Photos & Media" section no longer shows a file upload for work
   photos — only video links and testimonials.
3. A new "Automation & Workflows" section appears with the four new
   questions, positioned after "Online Presence & Platforms".

- [ ] **Step 7: Commit**

```bash
git add src/lib/intake-questions.ts
git commit -m "$(cat <<'EOF'
feat: replace intake file uploads with Drive link, add automation section

Logo/headshot/work-photo uploads now go through a client-shared Google
Drive folder instead of the product's S3 upload path. Adds an Automation
& Workflows section to surface manual-process pain points during intake.
EOF
)"
```

---

### Task 2: Remove the AI suggested-file feature

**Files:**
- Modify: `src/lib/intake-ai-schema.ts`
- Modify: `src/app/api/intake/prefill/route.ts`
- Modify: `src/app/intake/ai/page.tsx`

**Interfaces:**
- Consumes: none from Task 1 (this task is independent — it removes a
  feature tied to the three removed question IDs, but does so by deleting
  the feature's schema/UI, not by referencing the new `asset_drive_link`
  field).
- Produces: `AiPrefillResponseSchema` and `/api/intake/prefill`'s response
  shape no longer include `suggestedFiles`. `ReviewPhase` in
  `intake/ai/page.tsx` no longer accepts a `suggestedFiles` prop.

**Context:** The AI-assisted intake path scrapes a client's existing
website and suggests image URLs for the `logo`/`headshot`/`work_photos`
file questions. Since Task 1 removes those file questions, there is
nothing left for a suggested image to attach to — the feature becomes
actively misleading (suggesting logo/photo URLs a client can't do
anything with) rather than just unused, so it's removed rather than left
in place.

- [ ] **Step 1: Remove the suggested-file schema**

In `src/lib/intake-ai-schema.ts`, delete these three blocks:

```ts
// Suggested image URLs found on the client's site (logo, headshots, etc.).
// The client reviews these on the review step — nothing is uploaded to S3
// automatically in this MVP.
export const AiSuggestedFileSchema = z.object({
  questionId: z.enum(["logo", "headshot", "work_photos"]),
  url: z.string().url(),
  reason: z.string().optional(),
});

export type AiSuggestedFile = z.infer<typeof AiSuggestedFileSchema>;
```

and replace:

```ts
export const AiPrefillResponseSchema = z.object({
  answers: AiIntakeAnswersSchema,
  suggestedFiles: z.array(AiSuggestedFileSchema).default([]),
  notes: z.string().optional(),
});
```

with:

```ts
export const AiPrefillResponseSchema = z.object({
  answers: AiIntakeAnswersSchema,
  notes: z.string().optional(),
});
```

Then, in `AI_INTAKE_JSON_SCHEMA`, remove the `suggestedFiles` property and
its entry in `required`:

```ts
      suggestedFiles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            questionId: {
              type: "string",
              enum: ["logo", "headshot", "work_photos"],
            },
            url: { type: "string" },
            reason: { type: "string" },
          },
          required: ["questionId", "url", "reason"],
        },
      },
      notes: { type: "string" },
    },
    required: ["answers", "suggestedFiles", "notes"],
```

becomes:

```ts
      notes: { type: "string" },
    },
    required: ["answers", "notes"],
```

- [ ] **Step 2: Remove suggested-file extraction from the prefill route**

In `src/app/api/intake/prefill/route.ts`, remove this line from the system
prompt array:

```ts
              "- `suggestedFiles`: pick at most 3 image URLs that look like a logo, a team/owner headshot, or work samples. Prefer og:image for logo and larger contextual images for work. Each item must include a short `reason` string.",
```

Then replace:

```ts
    const raw = completion.choices[0]?.message?.content || "{}";
    let payload: {
      answers?: unknown;
      suggestedFiles?: unknown;
      notes?: unknown;
    };
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }

    const cleanedAnswers = cleanAiAnswers(payload.answers);

    const suggestedFiles: AiSuggestedFile[] = Array.isArray(payload.suggestedFiles)
      ? (payload.suggestedFiles
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as {
              questionId?: unknown;
              url?: unknown;
              reason?: unknown;
            };
            const qid = entry.questionId;
            const url = entry.url;
            if (
              typeof qid !== "string" ||
              !["logo", "headshot", "work_photos"].includes(qid) ||
              typeof url !== "string" ||
              !/^https?:\/\//i.test(url)
            ) {
              return null;
            }
            return {
              questionId: qid as AiSuggestedFile["questionId"],
              url,
              reason: typeof entry.reason === "string" ? entry.reason : undefined,
            };
          })
          .filter(Boolean) as AiSuggestedFile[])
      : [];

    return NextResponse.json({
      source: "prefill",
      finalUrl,
      answers: cleanedAnswers,
      suggestedFiles,
      notes: typeof payload.notes === "string" ? payload.notes : undefined,
```

with:

```ts
    const raw = completion.choices[0]?.message?.content || "{}";
    let payload: {
      answers?: unknown;
      notes?: unknown;
    };
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }

    const cleanedAnswers = cleanAiAnswers(payload.answers);

    return NextResponse.json({
      source: "prefill",
      finalUrl,
      answers: cleanedAnswers,
      notes: typeof payload.notes === "string" ? payload.notes : undefined,
```

Check the top of the file for an `import type { AiSuggestedFile } ...` or
similar import from `@/lib/intake-ai-schema` — remove it if present, since
the type no longer exists.

- [ ] **Step 3: Remove `suggestedFiles` state/UI from the AI intake page**

In `src/app/intake/ai/page.tsx`:

1. Remove `suggestedFiles` from `ReviewPhaseProps` and from `ReviewPhase`'s
   destructured props. Replace:

```ts
interface ReviewPhaseProps {
  token: string;
  sections: IntakeSection[];
  answers: IntakeAnswers;
  aiFilledFields: Set<string>;
  suggestedFiles: AiSuggestedFile[];
  onChange: (questionId: string, value: string | string[] | boolean) => void;
  onDone: () => void;
  onBack: () => void;
}

function ReviewPhase({
  token,
  sections,
  answers,
  aiFilledFields,
  suggestedFiles,
  onChange,
  onDone,
  onBack,
}: ReviewPhaseProps) {
```

   with:

```ts
interface ReviewPhaseProps {
  token: string;
  sections: IntakeSection[];
  answers: IntakeAnswers;
  aiFilledFields: Set<string>;
  onChange: (questionId: string, value: string | string[] | boolean) => void;
  onDone: () => void;
  onBack: () => void;
}

function ReviewPhase({
  token,
  sections,
  answers,
  aiFilledFields,
  onChange,
  onDone,
  onBack,
}: ReviewPhaseProps) {
```

2. Remove `suggestedFiles` from `ReviewPhase`'s `handleSubmit` dependency
   array (`[answers, onDone, sections, suggestedFiles, token]` becomes
   `[answers, onDone, sections, token]`), and delete this block inside
   `handleSubmit`:

```ts
      // Suggested image URLs from the prefill step are sent to the admin as a
      // note in the answers blob under __ai_suggested_files — this MVP does
      // not re-upload external images into S3 automatically.
      const answersWithMeta: IntakeAnswers = { ...answers };
      if (suggestedFiles.length > 0) {
        answersWithMeta["__ai_suggested_files"] = JSON.stringify(
          suggestedFiles,
        );
      }
```

   replacing the subsequent submit body from:

```ts
        const res = await fetch("/api/intake/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            answers: answersWithMeta,
            files: [] as IntakeFileRef[],
          }),
        });
```

   to:

```ts
        const res = await fetch("/api/intake/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            answers,
            files: [] as IntakeFileRef[],
          }),
        });
```

3. Delete the "Images we spotted on your site" block:

```tsx
      {suggestedFiles.length > 0 && (
        <div className="rounded-xl border border-[#CD7F32]/30 bg-[#CD7F32]/5 p-4 text-sm text-gray-700 dark:text-gray-200">
          <p className="mb-2 font-semibold text-[#CD7F32]">
            Images we spotted on your site
          </p>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            We saved these references for your account manager. You can upload
            final versions on the classic form.
          </p>
          <ul className="space-y-1 text-xs">
            {suggestedFiles.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.questionId}:</span>{" "}
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#CD7F32] underline"
                >
                  {f.url}
                </a>
                {f.reason ? ` — ${f.reason}` : null}
              </li>
            ))}
          </ul>
        </div>
      )}

```

4. Remove the `suggestedFiles={suggestedFiles}` prop where `<ReviewPhase`
   is rendered. Replace:

```tsx
      {phase === "review" && (
        <ReviewPhase
          token={token}
          sections={sections}
          answers={answers}
          aiFilledFields={aiFilledFields}
          suggestedFiles={suggestedFiles}
          onChange={handleAnswerChange}
          onDone={() => setPhase("done")}
          onBack={() => setPhase("start")}
```

   with:

```tsx
      {phase === "review" && (
        <ReviewPhase
          token={token}
          sections={sections}
          answers={answers}
          aiFilledFields={aiFilledFields}
          onChange={handleAnswerChange}
          onDone={() => setPhase("done")}
          onBack={() => setPhase("start")}
```

5. Remove the `suggestedFiles` state and its setter call. Replace:

```ts
  const [suggestedFiles, setSuggestedFiles] = useState<AiSuggestedFile[]>([]);
```

   (delete this line entirely — no replacement) and replace:

```ts
        const incoming = (body.answers ?? {}) as IntakeAnswers;
        setAnswers((prev) => ({ ...prev, ...incoming }));
        setAiFilledFields(new Set(Object.keys(incoming)));
        setSuggestedFiles(
          Array.isArray(body.suggestedFiles) ? body.suggestedFiles : [],
        );
        setPhase("review");
```

   with:

```ts
        const incoming = (body.answers ?? {}) as IntakeAnswers;
        setAnswers((prev) => ({ ...prev, ...incoming }));
        setAiFilledFields(new Set(Object.keys(incoming)));
        setPhase("review");
```

6. Remove the now-unused import. Replace:

```ts
import type { AiSuggestedFile } from "@/lib/intake-ai-schema";
```

   (delete this line entirely).

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output (clean). This step will surface any remaining
references to `AiSuggestedFile`/`suggestedFiles` as compile errors — fix
any that appear before proceeding.

Run: `npx eslint src/lib/intake-ai-schema.ts src/app/api/intake/prefill/route.ts src/app/intake/ai/page.tsx`
Expected: no errors (pre-existing warnings elsewhere in the repo are out
of scope).

- [ ] **Step 5: Manual verification**

With `npm run dev` running and `OPENAI_API_KEY` configured, open
`/intake/ai?token=...` for a test tenant, run the URL-prefill step against
a real business website, and confirm the review screen no longer shows an
"Images we spotted on your site" panel, and submission still succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/intake-ai-schema.ts src/app/api/intake/prefill/route.ts src/app/intake/ai/page.tsx
git commit -m "$(cat <<'EOF'
refactor: remove AI suggested-image-file feature from intake

The logo/headshot/work-photo file questions this fed into no longer
exist (assets now go through a shared Drive folder), so suggesting
scraped image URLs for them has nothing to attach to.
EOF
)"
```

---

### Task 3: Thread `driveFolderUrl` through the intake email

**Files:**
- Modify: `src/lib/email-templates.ts`
- Modify: `src/lib/email.ts`
- Modify: `src/app/api/email/intake/route.ts`
- Modify: `src/lib/api-client.ts`

**Interfaces:**
- Produces: `apiClient.sendIntakeEmail(to, tenantId, businessType,
  firstName?, websiteId?, tenantName?, driveFolderUrl?)` — a new optional
  7th parameter. Task 4 calls this with the admin-provided Drive folder
  link.

- [ ] **Step 1: Add `driveFolderUrl` to the email template**

In `src/lib/email-templates.ts`, update `TenantIntakeTemplateOptions`:

```ts
export interface TenantIntakeTemplateOptions {
  firstName?: string;
  tenantName?: string;
  businessType?: BusinessType;
  /** URL to the online intake questionnaire form. */
  intakeUrl?: string;
}
```

becomes:

```ts
export interface TenantIntakeTemplateOptions {
  firstName?: string;
  tenantName?: string;
  businessType?: BusinessType;
  /** URL to the online intake questionnaire form. */
  intakeUrl?: string;
  /** Shared Google Drive folder link for logo/photo/brand asset uploads. */
  driveFolderUrl?: string;
}
```

Update `IntakeContent` to add the automation preview questions:

```ts
interface IntakeContent {
  subject: string;
  intro: string;
  aboutQs: string[];
  brandQs: string[];
  servicesQs: string[];
  mediaQs: string[];
  onlinePresenceQs: string[];
  setupQs: string[];
}
```

becomes:

```ts
interface IntakeContent {
  subject: string;
  intro: string;
  aboutQs: string[];
  brandQs: string[];
  servicesQs: string[];
  mediaQs: string[];
  onlinePresenceQs: string[];
  automationQs: string[];
  setupQs: string[];
}
```

In `getIntakeContent()`, replace the `brandQs` and `mediaQs` arrays:

```ts
    brandQs: [
      'Your logo — PNG or SVG, transparent background preferred <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
      'A headshot, team photo, storefront photo, product shot, or workspace image we can use right away <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
      "What colors or overall style feel right for your brand?",
      "Three words that describe your business, service style, or customer experience",
    ],
```

becomes:

```ts
    brandQs: [
      "Your logo and any brand photos — see the shared folder link below to upload",
      "What colors or overall style feel right for your brand?",
      "Three words that describe your business, service style, or customer experience",
    ],
```

and:

```ts
    mediaQs: [
      '5–15 photos of your work, products, team, venue, or business <span style="color:#C41E3A;font-weight:600;">[attach files or share folder]</span>',
      'Any before/after shots, customer result photos, or portfolio images <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
      'Any video content, walkthroughs, testimonials, reels, or promo clips <span style="color:#C41E3A;font-weight:600;">[attach or share link]</span>',
      'Any review screenshots, press mentions, menus, brochures, or supporting files you want us to use <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
      'Paste any existing customer testimonials or reviews you want featured on the site',
    ],
```

becomes:

```ts
    mediaQs: [
      "5–15 photos of your work, products, team, venue, or business — add these to the shared folder",
      "Any before/after shots, customer result photos, or portfolio images — add these to the shared folder",
      'Any video content, walkthroughs, testimonials, reels, or promo clips <span style="color:#6b7280;">(paste links, or add video files to the shared folder)</span>',
      "Paste any existing customer testimonials or reviews you want featured on the site",
    ],
```

Add `automationQs` right after `onlinePresenceQs` in the returned object
(after the closing `],` of `onlinePresenceQs`, before `setupQs:`):

```ts
    automationQs: [
      "What tasks or parts of running your business feel repetitive or manual right now?",
      "What software or tools do you currently use for day-to-day operations?",
      'Would you be interested in text-message follow-ups, AI-assisted content/customer responses, or ad campaign optimization? <span style="color:#6b7280;">(just a general sense — no commitment)</span>',
    ],
```

- [ ] **Step 2: Render the Drive folder callout and Automation section**

In `buildTenantIntakeHtml`, update the destructured parameters:

```ts
export function buildTenantIntakeHtml({
  firstName,
  tenantName,
  businessType,
  intakeUrl,
}: TenantIntakeTemplateOptions): string {
```

becomes:

```ts
export function buildTenantIntakeHtml({
  firstName,
  tenantName,
  businessType,
  intakeUrl,
  driveFolderUrl,
}: TenantIntakeTemplateOptions): string {
```

Add a Drive-folder callout block right after `ctaBlock` is defined (after
its closing backtick/semicolon, before `return layout(`):

```ts
  const driveFolderBlock = driveFolderUrl
    ? `<div style="margin:0 0 24px;padding:16px 20px;background-color:#fff7ed;border-left:4px solid #CD7F32;border-radius:4px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">
        Upload your logo, photos, and brand assets here:
      </p>
      <p style="margin:0;font-size:14px;word-break:break-all;">
        <a href="${driveFolderUrl}" style="color:#CD7F32;">${driveFolderUrl}</a>
      </p>
    </div>`
    : "";
```

Then update the returned `layout(...)` call to insert `driveFolderBlock`
after the intro paragraphs and add the automation section. Replace:

```ts
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      Below is a preview of the questions we'll ask. Click the button to fill out the form online — you can upload your logo, photos, and documents directly.
    </p>
    ${sectionHtml("About Your Business", content.aboutQs)}
    ${sectionHtml("Your Brand", content.brandQs, "You'll be able to upload files directly in the form.")}
    ${sectionHtml("Your Services", content.servicesQs)}
    ${sectionHtml("Online Presence &amp; Platforms", content.onlinePresenceQs)}
    ${sectionHtml("Photos &amp; Media", content.mediaQs, "You'll be able to upload files directly in the form.")}
    ${sectionHtml("Website Setup &amp; Launch", content.setupQs)}
    ${ctaBlock}
```

with:

```ts
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      Below is a preview of the questions we'll ask. Click the button to fill out the form online.
    </p>
    ${driveFolderBlock}
    ${sectionHtml("About Your Business", content.aboutQs)}
    ${sectionHtml("Your Brand", content.brandQs, driveFolderUrl ? "Upload files to the shared folder above." : undefined)}
    ${sectionHtml("Your Services", content.servicesQs)}
    ${sectionHtml("Online Presence &amp; Platforms", content.onlinePresenceQs)}
    ${sectionHtml("Automation &amp; Workflows", content.automationQs)}
    ${sectionHtml("Photos &amp; Media", content.mediaQs, driveFolderUrl ? "Upload files to the shared folder above." : undefined)}
    ${sectionHtml("Website Setup &amp; Launch", content.setupQs)}
    ${ctaBlock}
```

- [ ] **Step 3: Thread `driveFolderUrl` through `sendIntakeEmail`**

In `src/lib/email.ts`, update:

```ts
export interface SendIntakeEmailOptions {
  to: string;
  firstName?: string;
  tenantName?: string;
  tenantId: number;
  businessType?: string;
  websiteId?: number;
}

export async function sendIntakeEmail({
  to,
  firstName,
  tenantName,
  tenantId,
  businessType = "universal",
  websiteId,
}: SendIntakeEmailOptions) {
```

to:

```ts
export interface SendIntakeEmailOptions {
  to: string;
  firstName?: string;
  tenantName?: string;
  tenantId: number;
  businessType?: string;
  websiteId?: number;
  driveFolderUrl?: string;
}

export async function sendIntakeEmail({
  to,
  firstName,
  tenantName,
  tenantId,
  businessType = "universal",
  websiteId,
  driveFolderUrl,
}: SendIntakeEmailOptions) {
```

and update the `buildTenantIntakeHtml` call:

```ts
  const content = buildTenantIntakeHtml({
    firstName,
    tenantName,
    businessType,
    intakeUrl,
  });
```

to:

```ts
  const content = buildTenantIntakeHtml({
    firstName,
    tenantName,
    businessType,
    intakeUrl,
    driveFolderUrl,
  });
```

- [ ] **Step 4: Accept `driveFolderUrl` in the intake email API route**

In `src/app/api/email/intake/route.ts`, update the schema:

```ts
const schema = z.object({
  to: z.string().email(),
  firstName: z.string().nullish(),
  tenantName: z.string().trim().min(1).optional(),
  tenantId: z.number().int().positive(),
  businessType: z.string().min(1).optional().default("universal"),
  websiteId: z.number().int().positive().optional(),
});
```

to:

```ts
const schema = z.object({
  to: z.string().email(),
  firstName: z.string().nullish(),
  tenantName: z.string().trim().min(1).optional(),
  tenantId: z.number().int().positive(),
  businessType: z.string().min(1).optional().default("universal"),
  websiteId: z.number().int().positive().optional(),
  driveFolderUrl: z.string().trim().min(1).optional(),
});
```

and update the handler:

```ts
  const { to, firstName, tenantName, tenantId, businessType, websiteId } = parsed.data;

  const { data, error } = await sendIntakeEmail({
    to,
    firstName: firstName ?? undefined,
    tenantName: tenantName ?? undefined,
    tenantId,
    businessType,
    websiteId,
  });
```

to:

```ts
  const { to, firstName, tenantName, tenantId, businessType, websiteId, driveFolderUrl } =
    parsed.data;

  const { data, error } = await sendIntakeEmail({
    to,
    firstName: firstName ?? undefined,
    tenantName: tenantName ?? undefined,
    tenantId,
    businessType,
    websiteId,
    driveFolderUrl,
  });
```

- [ ] **Step 5: Add `driveFolderUrl` to the `apiClient.sendIntakeEmail` method**

In `src/lib/api-client.ts`, update:

```ts
  async sendIntakeEmail(
    to: string,
    tenantId: number,
    businessType = "universal",
    firstName?: string,
    websiteId?: number,
    tenantName?: string,
  ): Promise<{ id: string }> {
    const response = await fetch('/api/email/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        firstName: firstName ?? undefined,
        tenantName: tenantName ?? undefined,
        tenantId,
```

to:

```ts
  async sendIntakeEmail(
    to: string,
    tenantId: number,
    businessType = "universal",
    firstName?: string,
    websiteId?: number,
    tenantName?: string,
    driveFolderUrl?: string,
  ): Promise<{ id: string }> {
    const response = await fetch('/api/email/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        firstName: firstName ?? undefined,
        tenantName: tenantName ?? undefined,
        tenantId,
        driveFolderUrl: driveFolderUrl ?? undefined,
```

Leave the remaining fields in that body (`businessType`, `websiteId`,
etc.) exactly as they already are — only add the `driveFolderUrl` line.

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npx eslint src/lib/email-templates.ts src/lib/email.ts src/app/api/email/intake/route.ts src/lib/api-client.ts`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run `npm run dev`. Use `curl` against the local API route directly (no
UI depends on `driveFolderUrl` yet — that's Task 4):

```bash
curl -X POST http://localhost:3000/api/email/intake \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","tenantId":1,"tenantName":"Test Co","driveFolderUrl":"https://drive.google.com/drive/folders/test123"}'
```

Expected: `200` response with an `id`. Check the received email (or Resend
dashboard) and confirm the Drive folder callout block and the "Automation
& Workflows" section both render.

- [ ] **Step 8: Commit**

```bash
git add src/lib/email-templates.ts src/lib/email.ts src/app/api/email/intake/route.ts src/lib/api-client.ts
git commit -m "$(cat <<'EOF'
feat: thread Drive folder link through the intake email

Adds an optional driveFolderUrl end-to-end (email template, sendIntakeEmail,
the /api/email/intake route, and apiClient) so the intake email can point
clients at a shared asset folder instead of in-form file uploads.
EOF
)"
```

---

### Task 4: Add Drive folder link input to the Tenants page

**Files:**
- Modify: `src/app/(admin)/(others-pages)/tenants/page.tsx`

**Interfaces:**
- Consumes: `apiClient.sendIntakeEmail(..., driveFolderUrl?)` from Task 3.

- [ ] **Step 1: Add `assetDriveFolderUrl` to `FormState`**

Replace:

```ts
type FormState = {
  tenantName: string;
  tenantSlug: string;
  timezone: string;
  defaultCurrency: string;
  domain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone: string;
  planKey: string;
};
```

with:

```ts
type FormState = {
  tenantName: string;
  tenantSlug: string;
  timezone: string;
  defaultCurrency: string;
  domain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone: string;
  planKey: string;
  assetDriveFolderUrl: string;
};
```

and replace:

```ts
const initialState: FormState = {
  tenantName: "",
  tenantSlug: "",
  timezone: "America/Chicago",
  defaultCurrency: "USD",
  domain: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  ownerPhone: "",
  planKey: "starter",
};
```

with:

```ts
const initialState: FormState = {
  tenantName: "",
  tenantSlug: "",
  timezone: "America/Chicago",
  defaultCurrency: "USD",
  domain: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  ownerPhone: "",
  planKey: "starter",
  assetDriveFolderUrl: "",
};
```

- [ ] **Step 2: Add the form field**

In the Create Tenant form JSX, find the grid that ends right after the
Owner Phone field:

```tsx
              <div>
                <Label htmlFor="ownerPhone">Owner Phone</Label>
                <Input
                  id="ownerPhone"
                  value={form.ownerPhone}
                  onChange={(event) =>
                    handleChange("ownerPhone", event.target.value)
                  }
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            <div>
              <Label className="mb-3">Enabled Modules / Add-Ons</Label>
```

Insert a new field between the grid's closing `</div>` and the "Enabled
Modules" block:

```tsx
              <div>
                <Label htmlFor="ownerPhone">Owner Phone</Label>
                <Input
                  id="ownerPhone"
                  value={form.ownerPhone}
                  onChange={(event) =>
                    handleChange("ownerPhone", event.target.value)
                  }
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="assetDriveFolderUrl">
                Client Asset Drive Folder Link (optional)
              </Label>
              <Input
                id="assetDriveFolderUrl"
                value={form.assetDriveFolderUrl}
                onChange={(event) =>
                  handleChange("assetDriveFolderUrl", event.target.value)
                }
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Create a shared Drive folder for this client's logo/photos
                before submitting, then paste the link here — it's included
                in their intake email.
              </p>
            </div>

            <div>
              <Label className="mb-3">Enabled Modules / Add-Ons</Label>
```

- [ ] **Step 3: Exclude the new field from the `/tenants` provisioning payload**

The backend's `POST /tenants` endpoint doesn't know about
`assetDriveFolderUrl` — it must not be spread into that request body.
Find `handleSubmit` and replace:

```ts
    try {
      const response = await apiClient.post<ProvisionResponse>("/tenants", {
        ...form,
        enabledModules,
        pageSlugs: selectedAdditionalPages,
        featureToggles,
      });
```

with:

```ts
    try {
      const { assetDriveFolderUrl, ...tenantForm } = form;
      const response = await apiClient.post<ProvisionResponse>("/tenants", {
        ...tenantForm,
        enabledModules,
        pageSlugs: selectedAdditionalPages,
        featureToggles,
      });
```

- [ ] **Step 4: Pass the Drive link on tenant creation**

Still inside `handleSubmit`, find the `intake` job in `inviteJobs` and
replace:

```ts
        {
          key: "intake",
          promise: apiClient.sendIntakeEmail(
            response.ownerUser.email,
            response.tenant.id,
            "universal",
            firstName,
            response.website.id,
            response.tenant.name,
          ),
        },
```

with:

```ts
        {
          key: "intake",
          promise: apiClient.sendIntakeEmail(
            response.ownerUser.email,
            response.tenant.id,
            "universal",
            firstName,
            response.website.id,
            response.tenant.name,
            assetDriveFolderUrl.trim() || undefined,
          ),
        },
```

- [ ] **Step 5: Prompt for the Drive link on resend (bulk owner-emails resend)**

Find `handleResendOwnerEmails` and replace:

```ts
  const handleResendOwnerEmails = async (tenant: TenantListItem) => {
    if (!tenant.owner_email) {
      setTenantListError("Tenant owner email is missing.");
      return;
    }

    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      const firstName = tenant.owner_name?.trim().split(/\s+/)[0] || undefined;
```

with:

```ts
  const handleResendOwnerEmails = async (tenant: TenantListItem) => {
    if (!tenant.owner_email) {
      setTenantListError("Tenant owner email is missing.");
      return;
    }

    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      const driveFolderUrl =
        window.prompt(
          "Client asset Drive folder link (leave blank to skip):",
          "",
        )?.trim() || undefined;
      const firstName = tenant.owner_name?.trim().split(/\s+/)[0] || undefined;
```

Then find the `intake` job a few lines below it and replace:

```ts
        {
          key: "intake",
          promise: apiClient.sendIntakeEmail(
            tenant.owner_email,
            tenant.id,
            "universal",
            firstName,
            tenant.website_id ?? undefined,
            tenant.name,
          ),
        },
```

with:

```ts
        {
          key: "intake",
          promise: apiClient.sendIntakeEmail(
            tenant.owner_email,
            tenant.id,
            "universal",
            firstName,
            tenant.website_id ?? undefined,
            tenant.name,
            driveFolderUrl,
          ),
        },
```

- [ ] **Step 6: Prompt for the Drive link on `handleResendIntakeEmail`**

Find `handleResendIntakeEmail` and replace:

```ts
  const handleResendIntakeEmail = async (tenant: TenantListItem) => {
    if (!tenant.owner_email) {
      setTenantListError("Tenant owner email is missing.");
      return;
    }

    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      const firstName = tenant.owner_name?.trim().split(/\s+/)[0] || undefined;
      const intakeJob = {
        key: "intake" as InviteEmailKey,
        promise: apiClient.sendIntakeEmail(
          tenant.owner_email,
          tenant.id,
          "universal",
          firstName,
          tenant.website_id ?? undefined,
          tenant.name,
        ),
      };
```

with:

```ts
  const handleResendIntakeEmail = async (tenant: TenantListItem) => {
    if (!tenant.owner_email) {
      setTenantListError("Tenant owner email is missing.");
      return;
    }

    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      const driveFolderUrl =
        window.prompt(
          "Client asset Drive folder link (leave blank to skip):",
          "",
        )?.trim() || undefined;
      const firstName = tenant.owner_name?.trim().split(/\s+/)[0] || undefined;
      const intakeJob = {
        key: "intake" as InviteEmailKey,
        promise: apiClient.sendIntakeEmail(
          tenant.owner_email,
          tenant.id,
          "universal",
          firstName,
          tenant.website_id ?? undefined,
          tenant.name,
          driveFolderUrl,
        ),
      };
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npx eslint "src/app/(admin)/(others-pages)/tenants/page.tsx"`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run `npm run dev`, sign in as admin, open `Tenants` → `Create Tenant`.
Confirm:
1. The new "Client Asset Drive Folder Link" field appears below Owner
   Phone.
2. Create a test tenant with a Drive link filled in; confirm tenant
   creation still succeeds (the `/tenants` request must not include
   `assetDriveFolderUrl` — check the network request body in devtools).
3. On an existing tenant row, click "Resend Intake Email" and confirm a
   browser prompt appears asking for the Drive folder link, and clicking
   Cancel/OK both proceed without error.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(admin)/(others-pages)/tenants/page.tsx"
git commit -m "$(cat <<'EOF'
feat: collect client asset Drive folder link on tenant creation/resend

Threads the admin-provided Drive folder link into the intake email on
create, and prompts for it on both intake-email resend paths.
EOF
)"
```

---

### Task 5: Update Branding page to show the Drive link instead of auto-detecting a logo file

**Files:**
- Modify: `src/app/(admin)/(others-pages)/branding/page.tsx`

**Interfaces:**
- Consumes: `IntakeStoredSubmission.answers.asset_drive_link` (a `string`
  when present), from Task 1's new question.

- [ ] **Step 1: Remove file-based logo state**

Replace:

```ts
  const [intakeLogoUrl, setIntakeLogoUrl] = useState<string | null>(null);
  const [intakeLogoFilename, setIntakeLogoFilename] = useState<string | null>(null);
  const [latestIntakeSubmission, setLatestIntakeSubmission] =
    useState<IntakeStoredSubmission | null>(null);
  const [intakeLogoLoading, setIntakeLogoLoading] = useState(false);
  const [intakeLogoMessage, setIntakeLogoMessage] = useState<string | null>(null);
  const intakeLogoAppliedRef = useRef(false);
```

with:

```ts
  const [latestIntakeSubmission, setLatestIntakeSubmission] =
    useState<IntakeStoredSubmission | null>(null);
  const [intakeLogoLoading, setIntakeLogoLoading] = useState(false);
  const [intakeLogoMessage, setIntakeLogoMessage] = useState<string | null>(null);
```

- [ ] **Step 2: Clean up the reset branch in the selected-website effect**

Replace:

```ts
  useEffect(() => {
    if (!selectedWebsiteId) {
      setSettings(defaultSettings);
      setExtraBrandingUrls({
        small_logo_url: null,
        large_logo_url: null,
      });
      setIntakeLogoUrl(null);
      setIntakeLogoFilename(null);
      return;
    }

    loadBrandingSettings(selectedWebsiteId);
  }, [selectedWebsiteId, loadBrandingSettings]);
```

with:

```ts
  useEffect(() => {
    if (!selectedWebsiteId) {
      setSettings(defaultSettings);
      setExtraBrandingUrls({
        small_logo_url: null,
        large_logo_url: null,
      });
      setLatestIntakeSubmission(null);
      return;
    }

    loadBrandingSettings(selectedWebsiteId);
  }, [selectedWebsiteId, loadBrandingSettings]);
```

- [ ] **Step 3: Simplify `loadLatestIntakeLogo`**

Replace:

```ts
  const loadLatestIntakeLogo = useCallback(async (websiteId?: number | null) => {
    setIntakeLogoLoading(true);
    setIntakeLogoMessage(null);

    const requestPath = buildLatestIntakeAdminPath({
      websiteId,
      tenantId: selectedTenantId,
    });

    if (!requestPath) {
      setLatestIntakeSubmission(null);
      setIntakeLogoUrl(null);
      setIntakeLogoFilename(null);
      setIntakeLogoLoading(false);
      return;
    }

    try {
      const response = await fetch(requestPath, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (response.status === 404) {
        setLatestIntakeSubmission(null);
        setIntakeLogoUrl(null);
        setIntakeLogoFilename(null);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load intake (${response.status})`);
      }

      const data = (await response.json()) as IntakeStoredSubmission;
      setLatestIntakeSubmission(data);
      const logoFile = data.files.find((file) => file.questionId === "logo");
      setIntakeLogoUrl(logoFile?.url ?? null);
      setIntakeLogoFilename(logoFile?.filename ?? null);
    } catch (error) {
      setLatestIntakeSubmission(null);
      setIntakeLogoMessage(
        error instanceof Error
          ? error.message
          : "Failed to load intake branding assets.",
      );
    } finally {
      setIntakeLogoLoading(false);
    }
  }, [selectedTenantId]);
```

with:

```ts
  const loadLatestIntakeLogo = useCallback(async (websiteId?: number | null) => {
    setIntakeLogoLoading(true);
    setIntakeLogoMessage(null);

    const requestPath = buildLatestIntakeAdminPath({
      websiteId,
      tenantId: selectedTenantId,
    });

    if (!requestPath) {
      setLatestIntakeSubmission(null);
      setIntakeLogoLoading(false);
      return;
    }

    try {
      const response = await fetch(requestPath, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (response.status === 404) {
        setLatestIntakeSubmission(null);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load intake (${response.status})`);
      }

      const data = (await response.json()) as IntakeStoredSubmission;
      setLatestIntakeSubmission(data);
    } catch (error) {
      setLatestIntakeSubmission(null);
      setIntakeLogoMessage(
        error instanceof Error
          ? error.message
          : "Failed to load intake branding assets.",
      );
    } finally {
      setIntakeLogoLoading(false);
    }
  }, [selectedTenantId]);
```

- [ ] **Step 4: Remove `applyIntakeLogo` and its auto-apply effect**

Delete this function entirely:

```ts
  const applyIntakeLogo = useCallback(async () => {
    if (!intakeLogoUrl) {
      return;
    }

    if (settings.logo_url === intakeLogoUrl) {
      setIntakeLogoMessage("The intake logo is already set as the current brand logo.");
      return;
    }

    setIsUploadingField("logo_url");
    setIntakeLogoMessage(null);

    try {
      await saveBrandField("logo_url", intakeLogoUrl);
      await createBrandAssetRecord(intakeLogoUrl, "Brand Logo");
      setSettings((prev) => ({ ...prev, logo_url: intakeLogoUrl }));
      await refetchAssets();
      setIntakeLogoMessage("Intake logo applied. Review it below.");
    } catch (error) {
      setIntakeLogoMessage(
        error instanceof Error ? error.message : "Failed to apply intake logo.",
      );
    } finally {
      setIsUploadingField(null);
    }
  }, [createBrandAssetRecord, intakeLogoUrl, refetchAssets, saveBrandField, settings.logo_url]);
```

And delete this effect (it auto-applied the intake logo when navigating
in with `?prefillFromIntake=1`):

```ts
  useEffect(() => {
    const shouldPrefill = searchParams.get("prefillFromIntake") === "1";
    if (
      !shouldPrefill ||
      !intakeLogoUrl ||
      !!settings.logo_url ||
      intakeLogoAppliedRef.current
    ) {
      return;
    }

    intakeLogoAppliedRef.current = true;
    void applyIntakeLogo();
  }, [applyIntakeLogo, intakeLogoUrl, searchParams, settings.logo_url]);
```

If this leaves `searchParams` unused elsewhere in the component, check
with `grep -n "searchParams" "src/app/(admin)/(others-pages)/branding/page.tsx"`
before removing its declaration — leave the declaration in place if it's
still referenced elsewhere.

- [ ] **Step 5: Replace the "Intake logo" panel with an "Intake asset folder" panel**

Replace:

```tsx
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Intake logo
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {intakeLogoLoading
                        ? "Checking latest intake submission..."
                        : intakeLogoUrl
                          ? `Latest upload: ${intakeLogoFilename ?? "logo file"}`
                          : "No logo was uploaded in the latest intake submission."}
                    </p>
                  </div>
                  {intakeLogoUrl ? (
                    <Button
                      variant="outline"
                      onClick={() => void applyIntakeLogo()}
                      disabled={isUploadingField !== null || isLoadingSettings}
                    >
                      Use Intake Logo
                    </Button>
                  ) : null}
                </div>
                {intakeLogoMessage ? (
                  <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                    {intakeLogoMessage}
                  </p>
                ) : null}
              </div>
```

with:

```tsx
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Intake asset folder
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {intakeLogoLoading
                    ? "Checking latest intake submission..."
                    : typeof latestIntakeSubmission?.answers.asset_drive_link === "string" &&
                        latestIntakeSubmission.answers.asset_drive_link.trim()
                      ? latestIntakeSubmission.answers.asset_drive_link.trim()
                      : "No asset folder link submitted in the latest intake submission."}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Download the logo from the folder and upload it below — it
                  is no longer auto-detected from the questionnaire.
                </p>
                {intakeLogoMessage ? (
                  <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                    {intakeLogoMessage}
                  </p>
                ) : null}
              </div>
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output (clean). This will catch any leftover references to
`intakeLogoUrl`/`intakeLogoFilename`/`applyIntakeLogo`/`intakeLogoAppliedRef`
— fix any that appear.

Run: `npx eslint "src/app/(admin)/(others-pages)/branding/page.tsx"`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run `npm run dev`, sign in as admin, select a tenant with a submitted
intake that has an `asset_drive_link` answer, and open `/branding`.
Confirm:
1. The panel now reads "Intake asset folder" and shows the submitted
   link text (not a filename).
2. There is no "Use Intake Logo" button.
3. Manually uploading a logo via the existing upload control still works
   (this exercises `handleUploadBrandField`, which this task did not
   touch).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(admin)/(others-pages)/branding/page.tsx"
git commit -m "$(cat <<'EOF'
refactor: show intake Drive link instead of auto-detected logo file

The logo no longer arrives as an uploaded file, so Branding can't
auto-apply it as logo_url anymore. Shows the client's Drive folder link
instead so the admin can pull the file manually.
EOF
)"
```

---

### Task 6: Update the onboarding checklist's Branding status

**Files:**
- Modify: `src/app/(admin)/(others-pages)/onboarding/page.tsx`

**Interfaces:**
- Consumes: `IntakeStoredSubmission.answers.asset_drive_link`, same as
  Task 5.

- [ ] **Step 1: Update the Branding checklist item's status condition**

Replace:

```ts
      {
        title: "Branding",
        desc: "A logo or prefilled assets mean branding is staged. Mark complete only after visual QA is done.",
        href: "/branding",
        status: checklist.branding
          ? "complete"
          : brandingComplete
            ? "reviewed"
            : intakeSubmission?.files.some((file) => file.questionId === "logo")
              ? "seeded"
              : "not_started",
      },
```

with:

```ts
      {
        title: "Branding",
        desc: "A logo/asset folder link or prefilled assets mean branding is staged. Mark complete only after visual QA is done.",
        href: "/branding",
        status: checklist.branding
          ? "complete"
          : brandingComplete
            ? "reviewed"
            : typeof intakeSubmission?.answers.asset_drive_link === "string" &&
                intakeSubmission.answers.asset_drive_link.trim().length > 0
              ? "seeded"
              : "not_started",
      },
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npx eslint "src/app/(admin)/(others-pages)/onboarding/page.tsx"`
Expected: no new errors (the pre-existing `hasMeaningfulSiteSettings`
unused-var warning at line 194 is out of scope for this task).

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in as admin, open `/onboarding` for a tenant whose
latest intake submission has a non-empty `asset_drive_link` answer.
Confirm the "Branding" checklist row shows status `seeded` (not
`not_started`).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/(others-pages)/onboarding/page.tsx"
git commit -m "$(cat <<'EOF'
fix: key onboarding checklist Branding status off the intake Drive link

The logo no longer arrives as an intake file, so "seeded" status now
checks for a submitted asset_drive_link answer instead.
EOF
)"
```

---

### Task 7: Update Site Settings' intake logo prefill and panel

**Files:**
- Modify: `src/app/(admin)/(others-pages)/site-settings/page.tsx`

**Interfaces:**
- Consumes: `IntakeStoredSubmission.answers.asset_drive_link`, same as
  Tasks 5 and 6.

- [ ] **Step 1: Stop prefilling `logo_url` from an intake file**

Find `applyIntakeToSiteSettings` and replace:

```ts
      const intakeLogoFile = submission.files.find((file) => file.questionId === "logo");
      const aboutContext = [
```

with:

```ts
      const aboutContext = [
```

Then find, further down in the same function:

```ts
          logo_url: prev.logo_url || intakeLogoFile?.url || null,
```

and replace with:

```ts
          logo_url: prev.logo_url || null,
```

Update the message set right after, from:

```ts
      setIntakePrefillMessage(
        "Latest intake answers and any uploaded questionnaire logo were staged into Site Settings and template inputs. Review them, then click Save Changes to persist site settings.",
      );
```

to:

```ts
      setIntakePrefillMessage(
        "Latest intake answers were staged into Site Settings and template inputs. If the client shared an asset folder link, review it in the Intake Asset Folder panel below and upload the logo manually. Review everything, then click Save Changes to persist site settings.",
      );
```

- [ ] **Step 2: Replace the derived `latestIntakeLogoFile` value**

Replace:

```ts
  const latestIntakeLogoFile =
    latestIntakeSubmission?.files.find((file) => file.questionId === "logo") ?? null;
```

Delete these two lines entirely (no replacement needed — Step 3 reads
`latestIntakeSubmission?.answers.asset_drive_link` directly in the JSX).

- [ ] **Step 3: Replace the "Intake Logo" panel with an "Intake Asset Folder" panel**

Replace:

```tsx
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Intake Logo</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {latestIntakeLogoFile?.filename ?? "No logo uploaded in the questionnaire."}
                      </p>
                    </div>
                    {latestIntakeLogoFile?.url ? (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, logo_url: latestIntakeLogoFile.url }))}
                        className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Use Intake Logo
                      </button>
                    ) : null}
                  </div>
                  {latestIntakeLogoFile?.url ? (
                    <div className="mt-3 flex min-h-24 items-center justify-center rounded-lg bg-white px-4 py-6 dark:bg-gray-900/50">
                      <Image
                        src={latestIntakeLogoFile.url}
                        alt="Intake Logo"
                        width={180}
                        height={72}
                        className="h-auto max-h-20 w-auto"
                      />
                    </div>
                  ) : null}
                </div>
```

with:

```tsx
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Intake Asset Folder</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {typeof latestIntakeSubmission?.answers.asset_drive_link === "string" &&
                    latestIntakeSubmission.answers.asset_drive_link.trim() ? (
                      /^https?:\/\//i.test(latestIntakeSubmission.answers.asset_drive_link.trim()) ? (
                        <a
                          href={latestIntakeSubmission.answers.asset_drive_link.trim()}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 underline dark:text-brand-400"
                        >
                          {latestIntakeSubmission.answers.asset_drive_link.trim()}
                        </a>
                      ) : (
                        latestIntakeSubmission.answers.asset_drive_link.trim()
                      )
                    ) : (
                      "No asset folder link submitted in the questionnaire."
                    )}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Download the logo from the folder and upload it manually
                    below — it is no longer auto-detected from the
                    questionnaire.
                  </p>
                </div>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output (clean). This will catch any leftover reference to
`latestIntakeLogoFile` — fix any that appear.

Run: `npx eslint "src/app/(admin)/(others-pages)/site-settings/page.tsx"`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, sign in as admin, open `/site-settings` for a tenant
with a submitted intake that has an `asset_drive_link` answer. Confirm:
1. The panel reads "Intake Asset Folder" and shows the link (as a
   clickable link if it's a URL, plain text otherwise).
2. There is no "Use Intake Logo" button or image preview in that panel.
3. Click "Prefill from Latest Intake" (or the equivalent action that
   calls `applyIntakeToSiteSettings`) and confirm it still stages the
   other fields (business name, phone, address, socials) without error,
   and does not overwrite an existing `logo_url`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/(others-pages)/site-settings/page.tsx"
git commit -m "$(cat <<'EOF'
refactor: show intake Drive link instead of auto-detected logo file

Mirrors the Branding page change: Site Settings can no longer auto-apply
a logo URL from intake since assets now arrive via a Drive folder link,
not an uploaded file.
EOF
)"
```

---

## Self-Review Notes

**Spec coverage:**
- "Replace file questions with a Drive link" → Task 1.
- "Add Automation & Workflows section" → Task 1.
- "Intake email template needs the Drive folder link injected" → Task 3.
- Downstream consumers of the removed `logo` file question (Branding,
  Onboarding checklist, Site Settings) → Tasks 5, 6, 7.
- Process/ops items (Google Calendar booking page, Drive folder template,
  access checklist, AI logo tool) are explicitly out of scope per the
  spec and are not tasks here.

**Placeholder scan:** No TBD/TODO markers. Every step shows exact code.

**Type consistency:** `asset_drive_link` is used identically (as a
`string`-typed answer read via `typeof ... === "string"`) across Tasks
5, 6, and 7. `driveFolderUrl` is threaded with the same optional-string
type from `TenantsPage` → `apiClient.sendIntakeEmail` → the API route →
`sendIntakeEmail` → `buildTenantIntakeHtml` in Tasks 3 and 4.
