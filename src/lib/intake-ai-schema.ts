/**
 * Shared schema and helpers for the AI-assisted intake flow.
 *
 * The same structured answer shape is produced by both the URL prefill path
 * (scrape + extract) and the cold-start conversational agent path. Both
 * flows ultimately hydrate the form and submit via /api/intake/submit,
 * which expects the IntakeStoredSubmission answer shape.
 */

import { z } from "zod";
import type { IntakeAnswers } from "@/lib/intake-types";

// ─── AI-extracted answer schema ───────────────────────────────────────────────
// Every field is optional — the AI only fills what it can confidently infer.
// Field IDs match those in src/lib/intake-questions.ts so the output drops
// directly into the intake form.
export const AiIntakeAnswersSchema = z.object({
  business_name: z.string().optional(),
  owner_name: z.string().optional(),
  location: z.string().optional(),
  service_area: z.enum(["in_person", "virtual", "both"]).optional(),
  years_in_business: z.string().optional(),
  credentials: z.string().optional(),
  ideal_client: z.string().optional(),
  differentiator: z.string().optional(),
  tagline: z.string().optional(),
  topics_to_avoid: z.string().optional(),
  brand_colors: z.string().optional(),
  brand_words: z.string().optional(),
  primary_offerings: z.string().optional(),
  pricing_packages: z.string().optional(),
  customer_action: z
    .array(
      z.enum([
        "call",
        "contact_form",
        "book_appointment",
        "make_reservation",
        "buy_online",
        "visit_location",
      ]),
    )
    .optional(),
  fulfillment_details: z.string().optional(),
  hours_service_area: z.string().optional(),
  policies_guarantees: z.string().optional(),
  video_links: z.string().optional(),
  existing_testimonials: z.string().optional(),
  google_business_url: z.string().optional(),
  facebook_url: z.string().optional(),
  instagram_url: z.string().optional(),
  yelp_url: z.string().optional(),
  other_review_platforms: z.string().optional(),
  has_google_ads: z
    .enum(["yes_google_ads", "yes_lsa", "yes_both", "no", "interested"])
    .optional(),
  existing_booking_software: z.string().optional(),
  business_phone: z.string().optional(),
  business_address: z.string().optional(),
  email_preference: z.enum(["company_email", "bring_own", "undecided"]).optional(),
  has_insurance: z
    .enum(["yes_both", "insured_only", "licensed_only", "no", "not_applicable"])
    .optional(),
  content_approval_contact: z.string().optional(),
  // Setup & launch
  existing_website_url: z.string().optional(),
  existing_domain: z.string().optional(),
  domain_registrar: z.string().optional(),
  target_go_live: z.string().optional(),
  // Legacy — kept for backwards compat with old submissions
  social_media: z.string().optional(),
});

export type AiIntakeAnswers = z.infer<typeof AiIntakeAnswersSchema>;

// Suggested image URLs found on the client's site (logo, headshots, etc.).
// The client reviews these on the review step — nothing is uploaded to S3
// automatically in this MVP.
export const AiSuggestedFileSchema = z.object({
  questionId: z.enum(["logo", "headshot", "work_photos"]),
  url: z.string().url(),
  reason: z.string().optional(),
});

export type AiSuggestedFile = z.infer<typeof AiSuggestedFileSchema>;

export const AiPrefillResponseSchema = z.object({
  answers: AiIntakeAnswersSchema,
  suggestedFiles: z.array(AiSuggestedFileSchema).default([]),
  notes: z.string().optional(),
});

export type AiPrefillResponse = z.infer<typeof AiPrefillResponseSchema>;

// ─── JSON schema (for OpenAI response_format) ─────────────────────────────────
// OpenAI structured-output requires every key in `required` to also be present,
// so we mark all answer keys required and let the model emit empty strings
// when it can't infer a value. We then prune empty strings before returning.
const STRING_OR_EMPTY = { type: "string" } as const;

export const AI_INTAKE_JSON_SCHEMA = {
  name: "ai_intake_extraction",
  schema: {
    type: "object" as const,
    properties: {
      answers: {
        type: "object",
        properties: {
          business_name: STRING_OR_EMPTY,
          owner_name: STRING_OR_EMPTY,
          location: STRING_OR_EMPTY,
          service_area: {
            type: "string",
            enum: ["", "in_person", "virtual", "both"],
          },
          years_in_business: STRING_OR_EMPTY,
          credentials: STRING_OR_EMPTY,
          ideal_client: STRING_OR_EMPTY,
          differentiator: STRING_OR_EMPTY,
          tagline: STRING_OR_EMPTY,
          topics_to_avoid: STRING_OR_EMPTY,
          brand_colors: STRING_OR_EMPTY,
          brand_words: STRING_OR_EMPTY,
          primary_offerings: STRING_OR_EMPTY,
          pricing_packages: STRING_OR_EMPTY,
          customer_action: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "call",
                "contact_form",
                "book_appointment",
                "make_reservation",
                "buy_online",
                "visit_location",
              ],
            },
          },
          fulfillment_details: STRING_OR_EMPTY,
          hours_service_area: STRING_OR_EMPTY,
          policies_guarantees: STRING_OR_EMPTY,
          video_links: STRING_OR_EMPTY,
          existing_testimonials: STRING_OR_EMPTY,
          google_business_url: STRING_OR_EMPTY,
          facebook_url: STRING_OR_EMPTY,
          instagram_url: STRING_OR_EMPTY,
          yelp_url: STRING_OR_EMPTY,
          other_review_platforms: STRING_OR_EMPTY,
          has_google_ads: {
            type: "string",
            enum: ["", "yes_google_ads", "yes_lsa", "yes_both", "no", "interested"],
          },
          existing_booking_software: STRING_OR_EMPTY,
          business_phone: STRING_OR_EMPTY,
          business_address: STRING_OR_EMPTY,
          email_preference: {
            type: "string",
            enum: ["", "company_email", "bring_own", "undecided"],
          },
          has_insurance: {
            type: "string",
            enum: [
              "",
              "yes_both",
              "insured_only",
              "licensed_only",
              "no",
              "not_applicable",
            ],
          },
          content_approval_contact: STRING_OR_EMPTY,
          existing_website_url: STRING_OR_EMPTY,
          existing_domain: STRING_OR_EMPTY,
          domain_registrar: STRING_OR_EMPTY,
          target_go_live: STRING_OR_EMPTY,
          social_media: STRING_OR_EMPTY,
        },
        required: [
          "business_name",
          "owner_name",
          "location",
          "service_area",
          "years_in_business",
          "credentials",
          "ideal_client",
          "differentiator",
          "tagline",
          "topics_to_avoid",
          "brand_colors",
          "brand_words",
          "primary_offerings",
          "pricing_packages",
          "customer_action",
          "fulfillment_details",
          "hours_service_area",
          "policies_guarantees",
          "video_links",
          "existing_testimonials",
          "google_business_url",
          "facebook_url",
          "instagram_url",
          "yelp_url",
          "other_review_platforms",
          "has_google_ads",
          "existing_booking_software",
          "business_phone",
          "business_address",
          "email_preference",
          "has_insurance",
          "content_approval_contact",
          "existing_website_url",
          "existing_domain",
          "domain_registrar",
          "target_go_live",
          "social_media",
        ],
      },
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
  },
};

// Prune empty strings/empty arrays so the downstream form only shows
// confidently-filled fields. Enum fields ("" means unknown) are dropped.
export function cleanAiAnswers(raw: unknown): IntakeAnswers {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const cleaned: IntakeAnswers = {};

  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) cleaned[key] = trimmed;
      continue;
    }
    if (Array.isArray(value)) {
      const filtered = value.filter(
        (v) => typeof v === "string" && v.trim().length > 0,
      );
      if (filtered.length > 0) cleaned[key] = filtered as string[];
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      cleaned[key] = value;
    }
  }

  return cleaned;
}
