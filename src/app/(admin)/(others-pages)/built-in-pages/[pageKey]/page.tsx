"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { Modal } from "@/components/ui/modal";
import { useSidebar } from "@/context/SidebarContext";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import { buildLatestIntakeAdminPath } from "@/lib/intake-admin";
import { useContentAgent } from "@/hooks/useContentAgent";
import {
  BUILT_IN_PAGE_KEYS,
  BUILT_IN_PAGE_LABELS,
  getBuiltInPageDraftPreviewPath,
  getDefaultBuiltInPresentation,
} from "@/lib/builtInPageContent";
import type {
  BuiltInPageEditorRecord,
  BuiltInPageKey,
  BuiltInPageReviewEvent,
  BuiltInThemePack,
  BuiltInPageWorkflow,
  BuiltInPageWorkflowStatus,
  ConversionMode,
  FAQItem,
  Service,
  SiteSettings,
  TeamMember,
  Testimonial,
} from "@/lib/cms-types";
import type { IntakeStoredSubmission } from "@/lib/intake-types";

type PageFieldConfig = {
  key: string;
  label: string;
  hint?: string;
  textarea?: boolean;
};

type PresentationOption = {
  value: string;
  label: string;
  description?: string;
};

type PresentationPreset = {
  sectionOrder: string[];
  sectionVariants: Record<string, string>;
  conversionMode?: ConversionMode;
};

type EditorPresentationState = {
  themePack: string;
  recipe: string;
  conversionMode: string;
  sectionOrder: string[];
  sectionVariants: Record<string, string>;
};

type PreviewGuidance = {
  summary: string;
  requirements: string[];
};

type ApprovalBoundary = {
  adminOnly: string[];
  tenantDraftOnly: string[];
  publishingRules: string[];
};

type DraftValidation = {
  blockingIssues: string[];
  advisoryIssues: string[];
};

type SeoAssistantQuestion = {
  key: string;
  label: string;
  hint?: string;
  textarea?: boolean;
  required?: boolean;
  intakeKeys?: string[];
};

type BuiltInSeoAssistantResponse = {
  step?: string;
  primaryKeyword?: string;
  supportingTerms?: string[];
  recommendedFields?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  missingInputs?: string[];
  rationale?: string[];
};

type WorkflowAction = "draft" | "submit" | "approve" | "reject";

type SectionSourceKind = "page" | "global" | "collection" | "computed";

type HomeSourceSummary = {
  settings: Pick<
    SiteSettings,
    | "average_rating"
    | "review_count"
    | "contact_email"
    | "contact_phone"
    | "address"
  > | null;
  serviceCount: number;
  testimonialCount: number;
  faqCount: number;
  teamCount: number;
  loading: boolean;
  error: string | null;
};

type SectionReadiness = {
  sourceKind: SectionSourceKind;
  sourceLabel: string;
  statusTone: "ready" | "warning" | "needs-source" | "needs-config";
  statusLabel: string;
  detail: string;
  manageHref?: string;
  manageLabel?: string;
};

type HomeSectionGuide = {
  overview: string;
  seoRole: string;
  checklist: string[];
};

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

const PANEL =
  "rounded-xl border border-gray-200 p-4 dark:border-gray-800";

const SEO_ASSISTANT_QUESTIONS: Record<BuiltInPageKey, SeoAssistantQuestion[]> = {
  home: [
    {
      key: "targetKeyword",
      label: "What should this Home page rank for locally?",
      hint: "Example: electrician sacramento or hvac repair roseville",
      required: true,
    },
    {
      key: "targetCity",
      label: "What city or service area should the page target?",
      required: true,
      intakeKeys: ["location", "service_area_details", "hours_locations"],
    },
    {
      key: "primaryService",
      label: "What is the main service or offer to lead with?",
      required: true,
      textarea: true,
      intakeKeys: [
        "service_list",
        "appointment_types",
        "product_list",
        "reservation_types",
        "service_product_list",
      ],
    },
    {
      key: "idealCustomer",
      label: "Who is the ideal customer for this page?",
      textarea: true,
      intakeKeys: ["ideal_client"],
    },
    {
      key: "differentiator",
      label: "Why should someone choose this business instead of competitors?",
      textarea: true,
      intakeKeys: ["differentiator"],
    },
    {
      key: "trustSignals",
      label: "What trust signals can we mention truthfully?",
      hint: "Licenses, insurance, years in business, certifications, Google Business, etc.",
      textarea: true,
      intakeKeys: ["credentials", "years_in_business", "has_insurance", "google_business_url"],
    },
    {
      key: "conversionGoal",
      label: "What action should visitors take next?",
      hint: "Call, request quote, book appointment, contact form, shop now",
    },
  ],
  services: [
    {
      key: "targetKeyword",
      label: "What local service keyword should this page target?",
      required: true,
    },
    {
      key: "targetCity",
      label: "What city or service area should the Services page target?",
      required: true,
      intakeKeys: ["location", "service_area_details", "hours_locations"],
    },
    {
      key: "priorityServices",
      label: "Which services should this page emphasize first?",
      textarea: true,
      required: true,
      intakeKeys: [
        "service_list",
        "appointment_types",
        "product_list",
        "reservation_types",
        "service_product_list",
      ],
    },
    {
      key: "customerProblems",
      label: "What customer problems or needs should the intro speak to?",
      textarea: true,
      intakeKeys: ["ideal_client"],
    },
    {
      key: "differentiator",
      label: "What makes these services better or more trustworthy?",
      textarea: true,
      intakeKeys: ["differentiator", "credentials"],
    },
    {
      key: "conversionGoal",
      label: "What is the main CTA for this page?",
    },
  ],
  about: [
    {
      key: "targetKeyword",
      label: "What local brand or about-page keyword should this page support?",
      required: true,
    },
    {
      key: "targetCity",
      label: "What city or region should the About page reference?",
      required: true,
      intakeKeys: ["location", "service_area_details", "hours_locations"],
    },
    {
      key: "businessStory",
      label: "What is the business story, mission, or reason it exists?",
      textarea: true,
      required: true,
      intakeKeys: ["differentiator", "ideal_client"],
    },
    {
      key: "credibility",
      label: "What credibility details can we mention?",
      textarea: true,
      intakeKeys: ["credentials", "years_in_business", "has_insurance", "google_business_url"],
    },
    {
      key: "idealCustomer",
      label: "Who does the business help most?",
      textarea: true,
      intakeKeys: ["ideal_client"],
    },
    {
      key: "conversionGoal",
      label: "What should someone do after reading About?",
    },
  ],
  shop: [
    {
      key: "targetKeyword",
      label: "What product or shop keyword should this page target?",
      required: true,
    },
    {
      key: "targetCity",
      label: "What city, region, or delivery area matters for this Shop page?",
      intakeKeys: ["location"],
    },
    {
      key: "productFocus",
      label: "What product categories or featured items should the page lead with?",
      textarea: true,
      required: true,
      intakeKeys: ["product_list", "service_product_list"],
    },
    {
      key: "customerFit",
      label: "Who are these products for?",
      textarea: true,
      intakeKeys: ["ideal_client"],
    },
    {
      key: "storeDifferentiator",
      label: "What makes this shop or product line stand out?",
      textarea: true,
      intakeKeys: ["differentiator"],
    },
    {
      key: "conversionGoal",
      label: "What should shoppers do next?",
    },
  ],
};

const WORKFLOW_STATUS_LABELS: Record<BuiltInPageWorkflowStatus, string> = {
  published: "Published",
  draft: "Draft",
  in_review: "In Review",
  changes_requested: "Changes Requested",
};

const WORKFLOW_STATUS_CLASSES: Record<BuiltInPageWorkflowStatus, string> = {
  published:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  draft:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
  in_review:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
  changes_requested:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
};

const THEME_PACK_OPTIONS: Array<{
  value: BuiltInThemePack;
  label: string;
  description: string;
}> = [
  {
    value: "modern_service",
    label: "Modern Service",
    description: "Clean service-business layout with strong action cues.",
  },
  {
    value: "professional_authority",
    label: "Professional Authority",
    description: "Stronger credibility and trust framing for expert brands.",
  },
  {
    value: "warm_local",
    label: "Warm Local",
    description: "Friendlier local-business tone with softer visual rhythm.",
  },
  {
    value: "high_contrast_conversion",
    label: "High Contrast Conversion",
    description: "Sharper offer-first treatment with more aggressive CTA emphasis.",
  },
];

const CONVERSION_MODE_OPTIONS: Array<{
  value: ConversionMode;
  label: string;
  description: string;
}> = [
  { value: "call", label: "Call", description: "Drive direct phone leads." },
  { value: "email", label: "Email", description: "Drive form or email inquiries." },
  {
    value: "appointment",
    label: "Appointment",
    description: "Drive scheduled consultations or sessions.",
  },
  {
    value: "reservation",
    label: "Reservation",
    description: "Drive table, venue, or event reservations.",
  },
  {
    value: "checkout",
    label: "Checkout",
    description: "Drive direct product purchase behavior.",
  },
];

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  proof: "Proof / Trust",
  servicesPreview: "Services Preview",
  testimonials: "Testimonials",
  faq: "FAQ",
  cta: "Primary CTA",
  aboutPreview: "About Preview",
  booking: "Booking",
  offer: "Offer",
  servicesList: "Services List",
  mission: "Mission",
  team: "Team",
  catalog: "Catalog",
  featured: "Featured Products",
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  hero: "Above-the-fold headline, phone CTA, and image.",
  proof: "Star rating, review count, and trust badges.",
  servicesPreview: "Crawlable service cards linking to service pages.",
  testimonials: "Named customer reviews with city and service type.",
  faq: "5–6 keyword questions — targets featured snippets.",
  cta: "Conversion close — phone, form, or booking action.",
  aboutPreview: "Brand story snippet — strengthens E-E-A-T signals.",
  booking: "Inline booking widget — keeps visitors on the page.",
  offer: "Dollar amount + expiry promo — urgency and fresh content.",
};

type SlotEntry = {
  slot: string;
  required: boolean;
  defaultOn: boolean;
};

const HOME_SLOT_CATALOG: SlotEntry[] = [
  { slot: "hero",            required: true,  defaultOn: true },
  { slot: "proof",           required: false, defaultOn: true },
  { slot: "servicesPreview", required: false, defaultOn: true },
  { slot: "testimonials",   required: false, defaultOn: true },
  { slot: "cta",             required: false, defaultOn: true },
  { slot: "faq",             required: false, defaultOn: false },
  { slot: "offer",           required: false, defaultOn: false },
  { slot: "aboutPreview",    required: false, defaultOn: false },
  { slot: "booking",         required: false, defaultOn: false },
];

const PAGE_SLOT_CATALOG: Partial<Record<BuiltInPageKey, SlotEntry[]>> = {
  home: HOME_SLOT_CATALOG,
};

const RECIPE_PRESETS: Record<BuiltInPageKey, Record<string, PresentationPreset>> = {
  home: {
    local_lead_gen: {
      conversionMode: "call",
      sectionOrder: [
        "hero",
        "proof",
        "servicesPreview",
        "testimonials",
        "faq",
        "cta",
      ],
      sectionVariants: {
        hero: "service_area_call",
        proof: "star_rating_bar",
        servicesPreview: "three_card_grid",
        testimonials: "review_cards",
        cta: "quote_request",
      },
    },
    authority_trust: {
      conversionMode: "email",
      sectionOrder: [
        "hero",
        "proof",
        "aboutPreview",
        "servicesPreview",
        "testimonials",
        "cta",
      ],
      sectionVariants: {
        hero: "credential_split",
        proof: "logo_and_badge_row",
        aboutPreview: "mission_highlight",
        servicesPreview: "authority_list",
        testimonials: "featured_quote",
        cta: "consultation_request",
      },
    },
    booking_first: {
      conversionMode: "appointment",
      sectionOrder: [
        "hero",
        "booking",
        "servicesPreview",
        "testimonials",
        "faq",
        "cta",
      ],
      sectionVariants: {
        hero: "appointment_split",
        booking: "inline_booking_card",
        servicesPreview: "service_tiles",
        testimonials: "review_strip",
        cta: "book_now",
      },
    },
    offer_funnel: {
      conversionMode: "checkout",
      sectionOrder: [
        "hero",
        "offer",
        "proof",
        "servicesPreview",
        "testimonials",
        "cta",
      ],
      sectionVariants: {
        hero: "offer_stack",
        offer: "single_offer_panel",
        proof: "stats_bar",
        servicesPreview: "compact_cards",
        testimonials: "single_featured_quote",
        cta: "offer_claim",
      },
    },
  },
  services: {
    service_grid: {
      conversionMode: "call",
      sectionOrder: ["hero", "servicesList", "faq", "cta"],
      sectionVariants: {
        hero: "service_grid_intro",
        servicesList: "grid_cards",
        faq: "accordion",
        cta: "quote_request",
      },
    },
    service_categories: {
      conversionMode: "email",
      sectionOrder: ["hero", "servicesList", "faq", "cta"],
      sectionVariants: {
        hero: "category_overview",
        servicesList: "category_sections",
        faq: "accordion",
        cta: "consultation_request",
      },
    },
    problem_solution: {
      conversionMode: "appointment",
      sectionOrder: ["hero", "servicesList", "faq", "cta"],
      sectionVariants: {
        hero: "problem_solution_split",
        servicesList: "problem_solution_rows",
        faq: "compact_list",
        cta: "book_now",
      },
    },
  },
  about: {
    founder_story: {
      conversionMode: "email",
      sectionOrder: ["hero", "mission", "team", "testimonials", "cta"],
      sectionVariants: {
        hero: "founder_portrait",
        mission: "story_stack",
        team: "founder_focus",
        testimonials: "featured_quote",
        cta: "contact_team",
      },
    },
    team_credibility: {
      conversionMode: "appointment",
      sectionOrder: ["hero", "mission", "team", "testimonials", "cta"],
      sectionVariants: {
        hero: "credential_split",
        mission: "values_grid",
        team: "profile_cards",
        testimonials: "review_cards",
        cta: "consultation_request",
      },
    },
    mission_trust: {
      conversionMode: "call",
      sectionOrder: ["hero", "mission", "team", "testimonials", "cta"],
      sectionVariants: {
        hero: "centered_statement",
        mission: "timeline_story",
        team: "credibility_row",
        testimonials: "review_strip",
        cta: "book_now",
      },
    },
  },
  shop: {
    catalog_first: {
      conversionMode: "checkout",
      sectionOrder: ["hero", "catalog", "featured", "cta"],
      sectionVariants: {
        hero: "catalog_intro",
        catalog: "product_grid",
        featured: "featured_row",
        cta: "shop_now",
      },
    },
    featured_products: {
      conversionMode: "checkout",
      sectionOrder: ["hero", "catalog", "featured", "cta"],
      sectionVariants: {
        hero: "featured_offer",
        catalog: "category_grid",
        featured: "bestseller_strip",
        cta: "checkout_offer",
      },
    },
    offer_first: {
      conversionMode: "email",
      sectionOrder: ["hero", "catalog", "featured", "cta"],
      sectionVariants: {
        hero: "seasonal_banner",
        catalog: "collection_tabs",
        featured: "offer_panel",
        cta: "shop_now",
      },
    },
  },
};

const RECIPE_OPTIONS: Record<BuiltInPageKey, PresentationOption[]> = {
  home: [
    {
      value: "local_lead_gen",
      label: "Local Lead Gen",
      description: "Service-business homepage that leads with trust and contact intent.",
    },
    {
      value: "authority_trust",
      label: "Authority Trust",
      description: "Expert positioning with stronger credibility framing.",
    },
    {
      value: "booking_first",
      label: "Booking First",
      description: "Appointment-oriented homepage with booking prominence.",
    },
    {
      value: "offer_funnel",
      label: "Offer Funnel",
      description: "Promo-driven homepage for campaigns and offers.",
    },
  ],
  services: [
    {
      value: "service_grid",
      label: "Service Grid",
      description: "Balanced layout that favors scanability and breadth.",
    },
    {
      value: "service_categories",
      label: "Service Categories",
      description: "Groups services into clearer buckets for larger catalogs.",
    },
    {
      value: "problem_solution",
      label: "Problem Solution",
      description: "Frames services around customer pain points and outcomes.",
    },
  ],
  about: [
    {
      value: "founder_story",
      label: "Founder Story",
      description: "Personal narrative with a founder-led trust angle.",
    },
    {
      value: "team_credibility",
      label: "Team Credibility",
      description: "Leads with credentials, experts, and proof signals.",
    },
    {
      value: "mission_trust",
      label: "Mission Trust",
      description: "Brand mission and values with trust-building structure.",
    },
  ],
  shop: [
    {
      value: "catalog_first",
      label: "Catalog First",
      description: "Product discovery first with broad catalog visibility.",
    },
    {
      value: "featured_products",
      label: "Featured Products",
      description: "Pushes curated items and hero merchandising harder.",
    },
    {
      value: "offer_first",
      label: "Offer First",
      description: "Leads with promos, launches, and featured offer logic.",
    },
  ],
};

const SECTION_VARIANT_OPTIONS: Record<
  BuiltInPageKey,
  Record<string, PresentationOption[]>
> = {
  home: {
    hero: [
      { value: "service_area_call", label: "Service Area Call" },
      { value: "credential_split", label: "Credential Split" },
      { value: "appointment_split", label: "Appointment Split" },
      { value: "offer_stack", label: "Offer Stack" },
    ],
    proof: [
      { value: "star_rating_bar", label: "Star Rating Bar", description: "Tight trust band — shows star rating + review count + phone. Best above services." },
      { value: "badges_and_stats", label: "Badges and Stats" },
      { value: "logo_and_badge_row", label: "Logo and Badge Row" },
      { value: "stats_bar", label: "Stats Bar" },
      { value: "review_strip", label: "Review Strip" },
    ],
    servicesPreview: [
      { value: "three_card_grid", label: "Three Card Grid" },
      { value: "authority_list", label: "Authority List" },
      { value: "service_tiles", label: "Service Tiles" },
      { value: "compact_cards", label: "Compact Cards" },
    ],
    testimonials: [
      { value: "review_cards", label: "Review Cards" },
      { value: "featured_quote", label: "Featured Quote" },
      { value: "review_strip", label: "Review Strip" },
      { value: "single_featured_quote", label: "Single Featured Quote" },
    ],
    cta: [
      { value: "quote_request", label: "Quote Request" },
      { value: "consultation_request", label: "Consultation Request" },
      { value: "book_now", label: "Book Now" },
      { value: "offer_claim", label: "Offer Claim" },
    ],
    aboutPreview: [{ value: "mission_highlight", label: "Mission Highlight" }],
    booking: [{ value: "inline_booking_card", label: "Inline Booking Card" }],
    offer: [{ value: "single_offer_panel", label: "Single Offer Panel" }],
    faq: [{ value: "default_faq", label: "Default FAQ" }],
  },
  services: {
    hero: [
      { value: "service_grid_intro", label: "Service Grid Intro" },
      { value: "category_overview", label: "Category Overview" },
      { value: "problem_solution_split", label: "Problem Solution Split" },
    ],
    servicesList: [
      { value: "grid_cards", label: "Grid Cards" },
      { value: "category_sections", label: "Category Sections" },
      { value: "problem_solution_rows", label: "Problem Solution Rows" },
    ],
    faq: [
      { value: "accordion", label: "Accordion" },
      { value: "compact_list", label: "Compact List" },
    ],
    cta: [
      { value: "quote_request", label: "Quote Request" },
      { value: "consultation_request", label: "Consultation Request" },
      { value: "book_now", label: "Book Now" },
    ],
  },
  about: {
    hero: [
      { value: "founder_portrait", label: "Founder Portrait" },
      { value: "credential_split", label: "Credential Split" },
      { value: "centered_statement", label: "Centered Statement" },
    ],
    mission: [
      { value: "story_stack", label: "Story Stack" },
      { value: "values_grid", label: "Values Grid" },
      { value: "timeline_story", label: "Timeline Story" },
    ],
    team: [
      { value: "founder_focus", label: "Founder Focus" },
      { value: "profile_cards", label: "Profile Cards" },
      { value: "credibility_row", label: "Credibility Row" },
    ],
    testimonials: [
      { value: "featured_quote", label: "Featured Quote" },
      { value: "review_cards", label: "Review Cards" },
      { value: "review_strip", label: "Review Strip" },
    ],
    cta: [
      { value: "contact_team", label: "Contact Team" },
      { value: "consultation_request", label: "Consultation Request" },
      { value: "book_now", label: "Book Now" },
    ],
  },
  shop: {
    hero: [
      { value: "catalog_intro", label: "Catalog Intro" },
      { value: "featured_offer", label: "Featured Offer" },
      { value: "seasonal_banner", label: "Seasonal Banner" },
    ],
    catalog: [
      { value: "product_grid", label: "Product Grid" },
      { value: "category_grid", label: "Category Grid" },
      { value: "collection_tabs", label: "Collection Tabs" },
    ],
    featured: [
      { value: "featured_row", label: "Featured Row" },
      { value: "bestseller_strip", label: "Bestseller Strip" },
      { value: "offer_panel", label: "Offer Panel" },
    ],
    cta: [
      { value: "shop_now", label: "Shop Now" },
      { value: "checkout_offer", label: "Checkout Offer" },
    ],
  },
};

const PAGE_DESCRIPTIONS: Record<BuiltInPageKey, string> = {
  home: "Control Home page-owned section copy for Hero, CTA, and Offer separately from tenant-wide branding, theme tokens, and shared collections.",
  services:
    "Edit the built-in Services page intro and empty-state copy while service records stay in the Services collection.",
  about:
    "Edit the built-in About page story and mission copy while team profiles stay in the Team collection.",
  shop: "Edit the built-in Shop page headline and empty-state messaging separately from catalog data.",
};

const PAGE_FIELD_CONFIG: Record<BuiltInPageKey, PageFieldConfig[]> = {
  home: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "heroPrimaryCtaText", label: "Primary CTA text" },
    { key: "heroPrimaryCtaUrl", label: "Primary CTA URL", hint: "Example: /contact or #contact" },
    { key: "heroBackgroundImageUrl", label: "Background image URL" },
    { key: "heroBackgroundOverlayColor", label: "Background overlay color", hint: "Example: #000000" },
    { key: "ctaHeadline", label: "CTA section headline" },
    { key: "ctaBody", label: "CTA section body", textarea: true },
    { key: "ctaButtonText", label: "CTA button text" },
    { key: "ctaButtonUrl", label: "CTA button URL", hint: "Example: /contact or #contact" },
    { key: "offerHeadline", label: "Offer headline" },
    { key: "offerBody", label: "Offer body", textarea: true },
    { key: "offerButtonText", label: "Offer button text" },
    { key: "offerButtonUrl", label: "Offer button URL", hint: "Example: /contact or /special-offer" },
  ],
  services: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "emptyStateTitle", label: "Empty-state title" },
    { key: "emptyStateBody", label: "Empty-state body", textarea: true },
  ],
  about: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "missionTitle", label: "Mission section title" },
    { key: "missionBody", label: "Mission section body", textarea: true },
  ],
  shop: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "emptyStateTitle", label: "Empty-state title" },
    { key: "emptyStateBody", label: "Empty-state body", textarea: true },
  ],
};

const HOME_EDITOR_SECTIONS: Array<{
  title: string;
  description: string;
  slot: string;
  fields: string[];
}> = [
  {
    title: "Hero Section",
    description: "Hero copy is page-owned. It should live with the Hero section, not in Global Site Settings.",
    slot: "hero",
    fields: [
      "heroTitle",
      "heroBody",
      "heroPrimaryCtaText",
      "heroPrimaryCtaUrl",
      "heroBackgroundImageUrl",
      "heroBackgroundOverlayColor",
    ],
  },
  {
    title: "CTA Section",
    description: "This is the Home-specific conversion close. It should not be treated as shared site-wide utility copy.",
    slot: "cta",
    fields: ["ctaHeadline", "ctaBody", "ctaButtonText", "ctaButtonUrl"],
  },
  {
    title: "Offer Section",
    description: "Offer copy is now separate from CTA copy so promotional panels can be configured without reusing the CTA section.",
    slot: "offer",
    fields: ["offerHeadline", "offerBody", "offerButtonText", "offerButtonUrl"],
  },
];

const RELATED_LINKS: Record<
  BuiltInPageKey,
  Array<{ label: string; href: string }>
> = {
  home: [
    { label: "Theme & Brand Tokens", href: "/site-settings?tab=settings" },
    { label: "Branding", href: "/branding" },
  ],
  services: [
    { label: "Service Records", href: "/site-settings?tab=services" },
    { label: "Global Site Settings", href: "/site-settings?tab=settings" },
  ],
  about: [
    { label: "Team Profiles", href: "/site-settings?tab=team" },
    { label: "Branding", href: "/branding" },
  ],
  shop: [
    { label: "Product Catalog", href: "/site-settings?tab=shop" },
    { label: "Global Site Settings", href: "/site-settings?tab=settings" },
  ],
};

const PAGE_PREVIEW_GUIDANCE: Record<BuiltInPageKey, PreviewGuidance> = {
  home: {
    summary: "Home should lead with one clear conversion path, visible trust, and enough service context to push the next click.",
    requirements: [
      "Hero title and body should explain the offer quickly.",
      "At least one CTA should be obvious above the fold.",
      "Recipe and section variants should match the tenant's lead type.",
    ],
  },
  services: {
    summary: "Services should stay crawlable and scanable, with clear paths from overview to inquiry.",
    requirements: [
      "Hero should frame the service scope, not generic brand language.",
      "Service records remain the source of truth for the actual list.",
      "Use CTA variants that match whether leads book, call, or submit forms.",
    ],
  },
  about: {
    summary: "About should strengthen trust through story, team credibility, and a clear reason to contact the business.",
    requirements: [
      "Mission copy should add real differentiation, not filler.",
      "Team or founder context should reinforce expertise.",
      "Testimonials should support the same trust angle as the chosen recipe.",
    ],
  },
  shop: {
    summary: "Shop should balance discovery and merchandising while keeping the path to checkout obvious.",
    requirements: [
      "Hero should support the merchandising angle for the selected recipe.",
      "Catalog variants should still make product discovery fast.",
      "Featured slot should highlight the strongest commercial items, not random inventory.",
    ],
  },
};

const APPROVAL_BOUNDARIES: Record<BuiltInPageKey, ApprovalBoundary> = {
  home: {
    adminOnly: [
      "Recipe, theme pack, and conversion mode selection",
      "Section order and approved variant structure",
      "Final SEO title and description approval",
    ],
    tenantDraftOnly: [
      "Headline, supporting copy, and CTA wording drafts",
      "Background imagery or visual asset swaps",
    ],
    publishingRules: [
      "Keep one clear primary CTA above the fold",
      "Do not publish with an empty hero title or CTA text",
      "Trust and service-discovery slots must remain visible in the chosen recipe",
    ],
  },
  services: {
    adminOnly: [
      "Recipe, theme pack, and conversion mode selection",
      "Services page layout strategy and FAQ treatment",
      "SEO approval for crawlable service entry points",
    ],
    tenantDraftOnly: [
      "Hero introduction copy",
      "Empty-state messaging while the catalog is being built",
    ],
    publishingRules: [
      "Do not publish with an empty hero title",
      "Service records remain the source of truth for the actual offer list",
      "CTA must match the intended call, email, or booking flow",
    ],
  },
  about: {
    adminOnly: [
      "Recipe, theme pack, and conversion mode selection",
      "Trust framing between mission, team, and testimonials",
      "Final SEO approval for brand-positioning copy",
    ],
    tenantDraftOnly: [
      "Mission copy, founder story, and supporting brand narrative",
      "Team bio drafts and supporting imagery",
    ],
    publishingRules: [
      "Do not publish with an empty hero title",
      "Mission copy should add differentiation, not placeholder filler",
      "The chosen recipe must keep a visible trust path into the CTA",
    ],
  },
  shop: {
    adminOnly: [
      "Recipe, theme pack, and conversion mode selection",
      "Merchandising strategy between hero, catalog, and featured slots",
      "Final SEO approval for category and offer positioning",
    ],
    tenantDraftOnly: [
      "Shop hero copy and merchandising messages",
      "Featured product emphasis drafts",
    ],
    publishingRules: [
      "Do not publish with an empty hero title",
      "Product catalog remains the source of truth for items and pricing",
      "CTA should shorten the path to catalog browsing or checkout",
    ],
  },
};

const getDraftValidation = (
  pageKey: BuiltInPageKey,
  content: Record<string, string>,
  seo: { title: string; description: string },
  presentation: EditorPresentationState,
): DraftValidation => {
  const blockingIssues: string[] = [];
  const advisoryIssues: string[] = [];

  const requireField = (fieldKey: string, message: string) => {
    if (!(content[fieldKey] ?? "").trim()) {
      blockingIssues.push(message);
    }
  };

  if (!presentation.recipe.trim()) {
    blockingIssues.push("Recipe must be selected.");
  }

  if (!presentation.themePack.trim()) {
    blockingIssues.push("Theme pack must be selected.");
  }

  if (!presentation.conversionMode.trim()) {
    blockingIssues.push("Conversion mode must be selected.");
  }

  if (presentation.sectionOrder.length === 0) {
    blockingIssues.push("At least one approved section slot must be present.");
  }

  switch (pageKey) {
    case "home":
      requireField("heroTitle", "Hero title is required for Home.");
      requireField("heroPrimaryCtaText", "Primary CTA text is required for Home.");
      if (!hasOwnContentField(content, "heroBody")) {
        advisoryIssues.push(
          "Hero body is still inheriting from Site Settings or the website tagline.",
        );
      }
      if (presentation.sectionOrder.includes("cta")) {
        if (!(content.ctaHeadline ?? "").trim()) {
          advisoryIssues.push(
            hasOwnContentField(content, "ctaHeadline")
              ? "CTA section headline is blank while the CTA section is enabled."
              : "CTA section headline is still inheriting from Site Settings while the CTA section is enabled.",
          );
        }

        if (!(content.ctaButtonText ?? "").trim()) {
          advisoryIssues.push(
            hasOwnContentField(content, "ctaButtonText")
              ? "CTA button text is blank while the CTA section is enabled."
              : "CTA button text is still inheriting from Site Settings or defaults while the CTA section is enabled.",
          );
        }
      }
      if (presentation.sectionOrder.includes("offer")) {
        if (!(content.offerHeadline ?? "").trim()) {
          advisoryIssues.push(
            hasOwnContentField(content, "offerHeadline")
              ? "Offer headline is blank while the Offer section is enabled."
              : "Offer headline has not been written yet for the enabled Offer section.",
          );
        }

        if (!(content.offerButtonText ?? "").trim()) {
          advisoryIssues.push(
            hasOwnContentField(content, "offerButtonText")
              ? "Offer button text is blank while the Offer section is enabled."
              : "Offer button text has not been written yet for the enabled Offer section.",
          );
        }
      }
      break;
    case "services":
      requireField("heroTitle", "Hero title is required for Services.");
      break;
    case "about":
      requireField("heroTitle", "Hero title is required for About.");
      break;
    case "shop":
      requireField("heroTitle", "Hero title is required for Shop.");
      break;
  }

  if (!seo.title.trim()) {
    advisoryIssues.push("SEO title is empty.");
  }

  if (!seo.description.trim()) {
    advisoryIssues.push("SEO description is empty.");
  }

  if (pageKey === "about" && !(content.missionBody ?? "").trim()) {
    advisoryIssues.push("Mission body is still empty.");
  }

  if ((pageKey === "services" || pageKey === "shop") && !(content.emptyStateTitle ?? "").trim()) {
    advisoryIssues.push("Empty-state title is still empty.");
  }

  return { blockingIssues, advisoryIssues };
};

const normalizeStringRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      typeof item === "string" ? item : "",
    ]),
  );
};

const hasOwnContentField = (value: Record<string, string>, key: string) => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const SECTION_STATUS_STYLES: Record<SectionReadiness["statusTone"], string> = {
  ready:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
  "needs-source":
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
  "needs-config":
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

const SECTION_SOURCE_STYLES: Record<SectionSourceKind, string> = {
  page:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
  global:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300",
  collection:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300",
  computed:
    "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300",
};

const HOME_SECTION_GUIDES: Record<string, HomeSectionGuide> = {
  hero: {
    overview: "Hero is page-owned. Home controls the headline, body, CTA, and visual treatment for above-the-fold conversion.",
    seoRole: "Shapes topical relevance, click intent, and the first visible conversion path.",
    checklist: [
      "Lead with the primary local service and city if it fits naturally.",
      "Keep the CTA aligned with the current conversion mode.",
      "Avoid generic claims that are not supported elsewhere on the page.",
    ],
  },
  proof: {
    overview: "Proof is computed from review signals, services, team, and testimonials. The page chooses the variant, not the raw records.",
    seoRole: "Reinforces trust and local credibility without forcing duplicate copy blocks.",
    checklist: [
      "Make sure review count or star-rating data exists when using review-led proof variants.",
      "Do not use proof-heavy variants if the business has thin trust signals.",
      "Keep proof close to the hero for service-led Home recipes.",
    ],
  },
  servicesPreview: {
    overview: "Services Preview is collection-backed. Home only controls layout and position; service records stay in the Services source manager.",
    seoRole: "Adds crawlable internal links and supports entity relevance for primary services.",
    checklist: [
      "Publish at least 3 strong services before using wide grid variants.",
      "Confirm service names and blurbs are specific, not generic filler.",
      "Make sure linked service pages are the ones you actually want to surface first.",
    ],
  },
  testimonials: {
    overview: "Testimonials are collection-backed and can be reused across Home and About. This section should surface approved quotes, not page-specific rewrites.",
    seoRole: "Supports trust, topical validation, and local social proof when quotes are specific and attributable.",
    checklist: [
      "Use real named testimonials only.",
      "Prefer 3 or more published items for card or strip variants.",
      "Keep single-quote variants for sparse collections or stronger flagship testimonials.",
    ],
  },
  faq: {
    overview: "FAQ is collection-backed and reusable across pages. Home controls placement and variant, while answers stay in the FAQ manager.",
    seoRole: "Targets search questions and featured-snippet style queries when answers are concise and real.",
    checklist: [
      "Aim for at least 3 published FAQ items before enabling Home FAQ.",
      "Use real buyer questions, not keyword-stuffed headings.",
      "Keep answers short enough to scan while still being specific.",
    ],
  },
  cta: {
    overview: "CTA is page-owned closing copy. It exists to convert visitors after trust and offer context have been established.",
    seoRole: "Supports conversion intent rather than ranking; it should be clear and direct.",
    checklist: [
      "Match the button language to the conversion mode.",
      "Keep headline and button text specific to the action you want now.",
      "Do not reuse Offer copy here.",
    ],
  },
  aboutPreview: {
    overview: "About Preview is team-backed and reusable. Home uses it as a trust bridge, not as the full About page narrative.",
    seoRole: "Adds brand and people credibility signals that support E-E-A-T.",
    checklist: [
      "Make sure at least one strong team member profile is published.",
      "Use this when founder or team credibility is important to the sale.",
      "Keep it preview-level; the About page should still carry the full story.",
    ],
  },
  booking: {
    overview: "Booking is a computed functional section that depends on contact and scheduling data rather than editorial copy blocks.",
    seoRole: "Supports conversion flow for appointment-first businesses but is not a primary ranking block.",
    checklist: [
      "Make sure phone or email exists in Global Site Settings.",
      "Use this only when booking is the main next step.",
      "Keep the surrounding sections light so the booking intent stays obvious.",
    ],
  },
  offer: {
    overview: "Offer is page-owned promotional copy. It now owns its own headline and CTA instead of borrowing from the main CTA section.",
    seoRole: "Adds urgency and campaign focus, but should remain truthful and specific.",
    checklist: [
      "Use concrete offer language, not vague hype.",
      "Keep the button action aligned with the promotion.",
      "Do not enable the section until the offer copy is actually written.",
    ],
  },
};

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const asAnswerString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(", ");
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return "";
};

const pickAnswer = (
  submission: IntakeStoredSubmission | null,
  ...keys: string[]
): string => {
  const answers = submission?.answers as Record<string, unknown> | undefined;
  if (!answers) {
    return "";
  }

  for (const key of keys) {
    const value = asAnswerString(answers[key]);
    if (value) {
      return value;
    }
  }

  return "";
};

const buildSeoAssistantPrefill = (
  pageKey: BuiltInPageKey,
  submission: IntakeStoredSubmission | null,
) => {
  const questions = SEO_ASSISTANT_QUESTIONS[pageKey];

  return Object.fromEntries(
    questions.map((question) => {
      const value = question.intakeKeys?.length
        ? pickAnswer(submission, ...question.intakeKeys)
        : "";

      return [question.key, value];
    }),
  ) as Record<string, string>;
};

const buildSeoAssistantContext = (
  questions: SeoAssistantQuestion[],
  answers: Record<string, string>,
) =>
  questions
    .map((question) => {
      const answer = answers[question.key]?.trim();
      if (!answer) {
        return null;
      }

      return `${question.label}: ${answer}`;
    })
    .filter(Boolean)
    .join("\n");

const toServiceLines = (value: string): string[] =>
  value
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

const authHeaders = () => {
  const token = getStoredAuthToken();
  const tenantId = getActiveTenantId();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "x-tenant-id": String(tenantId) } : {}),
  };
};

function TextField({
  label,
  value,
  onChange,
  hint,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  hint?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {textarea ? (
        <textarea
          className={`${INPUT} min-h-28`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={INPUT}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  options: PresentationOption[];
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <select
        className={INPUT}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      {options.find((option) => option.value === value)?.description ? (
        <p className="mt-1 text-xs text-gray-500">
          {options.find((option) => option.value === value)?.description}
        </p>
      ) : null}
    </div>
  );
}

const normalizePresentationState = (
  pageKey: BuiltInPageKey,
  value: unknown,
): EditorPresentationState => {
  const fallback = getDefaultBuiltInPresentation(pageKey);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ...fallback,
      sectionOrder: [...fallback.sectionOrder],
      sectionVariants: { ...fallback.sectionVariants },
    };
  }

  const input = value as {
    themePack?: unknown;
    recipe?: unknown;
    conversionMode?: unknown;
    sectionOrder?: unknown;
    sectionVariants?: unknown;
  };

  return {
    themePack:
      typeof input.themePack === "string" ? input.themePack : fallback.themePack,
    recipe: typeof input.recipe === "string" ? input.recipe : fallback.recipe,
    conversionMode:
      typeof input.conversionMode === "string"
        ? input.conversionMode
        : fallback.conversionMode,
    sectionOrder: Array.isArray(input.sectionOrder)
      ? input.sectionOrder.filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        )
      : [...fallback.sectionOrder],
    sectionVariants:
      input.sectionVariants &&
      typeof input.sectionVariants === "object" &&
      !Array.isArray(input.sectionVariants)
        ? Object.fromEntries(
            Object.entries(input.sectionVariants).filter(
              ([slot, variant]) =>
                typeof slot === "string" &&
                slot.length > 0 &&
                typeof variant === "string" &&
                variant.length > 0,
            ),
          )
        : { ...fallback.sectionVariants },
  };
};

export default function BuiltInPageEditorPage() {
  const params = useParams<{ pageKey: string }>();
  const { selectedClient } = useSidebar();
  const selectedTenantId =
    Number(selectedClient?.tenant_id || getActiveTenantId() || 0) || null;
  const [content, setContent] = useState<Record<string, string>>({});
  const [seo, setSeo] = useState({ title: "", description: "" });
  const [presentation, setPresentation] = useState<EditorPresentationState | null>(null);
  const [workflow, setWorkflow] = useState<BuiltInPageWorkflow | null>(null);
  const [reviewHistory, setReviewHistory] = useState<BuiltInPageReviewEvent[]>([]);
  const [reviewDecisionNotes, setReviewDecisionNotes] = useState("");
  const [latestIntakeSubmission, setLatestIntakeSubmission] =
    useState<IntakeStoredSubmission | null>(null);
  const [latestIntakeLoading, setLatestIntakeLoading] = useState(false);
  const [latestIntakeError, setLatestIntakeError] = useState<string | null>(null);
  const [seoAssistantAnswers, setSeoAssistantAnswers] = useState<Record<string, string>>({});
  const [seoAssistantResult, setSeoAssistantResult] =
    useState<BuiltInSeoAssistantResponse | null>(null);
  const [activeSectionConfig, setActiveSectionConfig] = useState<string | null>(null);
  const [homeSourceSummary, setHomeSourceSummary] = useState<HomeSourceSummary>({
    settings: null,
    serviceCount: 0,
    testimonialCount: 0,
    faqCount: 0,
    teamCount: 0,
    loading: false,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const { trigger: triggerContentAgent, isLoading: isSeoAssistantLoading } = useContentAgent();

  const pageKey = useMemo(() => {
    const rawPageKey = Array.isArray(params?.pageKey)
      ? params.pageKey[0]
      : params?.pageKey;
    return BUILT_IN_PAGE_KEYS.includes(rawPageKey as BuiltInPageKey)
      ? (rawPageKey as BuiltInPageKey)
      : null;
  }, [params?.pageKey]);
  const activePageKey = pageKey ?? "home";

  useEffect(() => {
    setSeoAssistantAnswers({});
    setSeoAssistantResult(null);
    setActiveSectionConfig(null);
  }, [pageKey]);

  const websiteId = Number(selectedClient?.website_id || 0) || null;

  const applyEditorPayload = useCallback((payload: BuiltInPageEditorRecord<BuiltInPageKey>) => {
    setContent(normalizeStringRecord(payload.content));
    setPresentation(normalizePresentationState(pageKey ?? payload.page_key, payload.presentation));
    setSeo({
      title: typeof payload.seo?.title === "string" ? payload.seo.title : "",
      description:
        typeof payload.seo?.description === "string"
          ? payload.seo.description
          : "",
    });
    setUpdatedAt(payload.updated_at ?? null);
    setWorkflow(payload.workflow ?? null);
    setReviewHistory(Array.isArray(payload.review_history) ? payload.review_history : []);
  }, [pageKey]);

  useEffect(() => {
    if (!pageKey || !websiteId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadPageContent = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/built-in-page-content/editor/${pageKey}?website_id=${websiteId}`,
          {
            headers: authHeaders(),
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${pageKey} page content`);
        }

        const payload = await response.json();
        if (isCancelled) {
          return;
        }

        applyEditorPayload(payload as BuiltInPageEditorRecord<BuiltInPageKey>);
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to load page content";
          toast.error(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPageContent();

    return () => {
      isCancelled = true;
    };
  }, [applyEditorPayload, pageKey, websiteId]);

  useEffect(() => {
    const requestPath = buildLatestIntakeAdminPath({
      websiteId,
      tenantId: selectedTenantId,
    });

    if (!requestPath) {
      setLatestIntakeSubmission(null);
      setLatestIntakeError(null);
      return;
    }

    let cancelled = false;

    const loadLatestIntakeSubmission = async () => {
      setLatestIntakeLoading(true);
      setLatestIntakeError(null);

      try {
        const token = getStoredAuthToken();
        const response = await fetch(requestPath, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });

        if (response.status === 404) {
          if (!cancelled) {
            setLatestIntakeSubmission(null);
          }
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load intake (${response.status})`);
        }

        const payload = (await response.json()) as IntakeStoredSubmission;
        if (!cancelled) {
          setLatestIntakeSubmission(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setLatestIntakeSubmission(null);
          setLatestIntakeError(
            error instanceof Error
              ? error.message
              : "Failed to load latest intake submission.",
          );
        }
      } finally {
        if (!cancelled) {
          setLatestIntakeLoading(false);
        }
      }
    };

    void loadLatestIntakeSubmission();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, websiteId]);

  useEffect(() => {
    if (pageKey !== "home" || !websiteId) {
      setHomeSourceSummary({
        settings: null,
        serviceCount: 0,
        testimonialCount: 0,
        faqCount: 0,
        teamCount: 0,
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;

    const loadHomeSourceSummary = async () => {
      setHomeSourceSummary((current) => ({ ...current, loading: true, error: null }));

      try {
        const headers = authHeaders();
        const [settingsRes, servicesRes, testimonialsRes, faqRes, teamRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${getApiBaseUrl()}/services?website_id=${websiteId}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${getApiBaseUrl()}/testimonials?website_id=${websiteId}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${getApiBaseUrl()}/faq?website_id=${websiteId}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${getApiBaseUrl()}/team-members?website_id=${websiteId}`, {
            headers,
            cache: "no-store",
          }),
        ]);

        const settings = settingsRes.ok
          ? ((await settingsRes.json()) as Pick<
              SiteSettings,
              "average_rating" | "review_count" | "contact_email" | "contact_phone" | "address"
            >)
          : null;
        const services = servicesRes.ok ? ((await servicesRes.json()) as Service[]) : [];
        const testimonials = testimonialsRes.ok
          ? ((await testimonialsRes.json()) as Testimonial[])
          : [];
        const faq = faqRes.ok ? ((await faqRes.json()) as FAQItem[]) : [];
        const team = teamRes.ok ? ((await teamRes.json()) as TeamMember[]) : [];

        if (cancelled) {
          return;
        }

        setHomeSourceSummary({
          settings,
          serviceCount: services.length,
          testimonialCount: testimonials.filter((item) => item.is_published !== false).length,
          faqCount: faq.filter((item) => item.is_published !== false).length,
          teamCount: team.filter((item) => item.is_published !== false).length,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setHomeSourceSummary({
          settings: null,
          serviceCount: 0,
          testimonialCount: 0,
          faqCount: 0,
          teamCount: 0,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load Home section source summary.",
        });
      }
    };

    void loadHomeSourceSummary();

    return () => {
      cancelled = true;
    };
  }, [pageKey, websiteId]);

  const pageTitle = `${BUILT_IN_PAGE_LABELS[activePageKey]} Page`;
  const fieldConfig = PAGE_FIELD_CONFIG[activePageKey];
  const relatedLinks = RELATED_LINKS[activePageKey];
  const previewGuidance = PAGE_PREVIEW_GUIDANCE[activePageKey];
  const approvalBoundary = APPROVAL_BOUNDARIES[activePageKey];
  const recipeOptions = RECIPE_OPTIONS[activePageKey];
  const sectionVariantOptions = SECTION_VARIANT_OPTIONS[activePageKey];
  const presentationState = presentation ?? normalizePresentationState(activePageKey, null);
  const inheritedHomeFields =
    pageKey === "home"
      ? fieldConfig.filter((field) => !hasOwnContentField(content, field.key))
      : [];
  const blankOverriddenHomeFields =
    pageKey === "home"
      ? fieldConfig.filter(
          (field) =>
            hasOwnContentField(content, field.key) &&
            !(content[field.key] ?? "").trim(),
        )
      : [];
  const getHomeFieldHint = (field: PageFieldConfig) => {
    if (pageKey !== "home") {
      return field.hint;
    }

    return [
      field.hint,
      !hasOwnContentField(content, field.key)
        ? "Currently inherits from Site Settings or page defaults until you save a page-specific value here."
        : !(content[field.key] ?? "").trim()
          ? "This blank value is owned by the Home editor and overrides the inherited fallback for this field."
          : undefined,
    ]
      .filter(Boolean)
      .join(" ");
  };
  const renderContentField = (field: PageFieldConfig) => (
    <div key={field.key} className={field.textarea ? "lg:col-span-2" : undefined}>
      <TextField
        label={field.label}
        value={content[field.key] ?? ""}
        onChange={(nextValue) =>
          setContent((current) => ({
            ...current,
            [field.key]: nextValue,
          }))
        }
        hint={getHomeFieldHint(field)}
        textarea={field.textarea}
      />
    </div>
  );
  const homeEditorGroups =
    pageKey === "home"
      ? HOME_EDITOR_SECTIONS.map((section) => ({
          ...section,
          fields: section.fields
            .map((fieldKey) => fieldConfig.find((field) => field.key === fieldKey))
            .filter((field): field is PageFieldConfig => Boolean(field)),
          isActive: presentationState.sectionOrder.includes(section.slot),
        }))
      : [];
  const homeSectionReadiness = useMemo<Record<string, SectionReadiness>>(() => {
    if (pageKey !== "home") {
      return {} as Record<string, SectionReadiness>;
    }

    const reviewSignalsAvailable =
      (homeSourceSummary.settings?.average_rating ?? 0) > 0 ||
      (homeSourceSummary.settings?.review_count ?? 0) > 0;
    const computedTrustSignals =
      homeSourceSummary.serviceCount +
      homeSourceSummary.testimonialCount +
      homeSourceSummary.teamCount;
    const proofVariant = presentationState.sectionVariants.proof ?? "star_rating_bar";
    const testimonialsVariant =
      presentationState.sectionVariants.testimonials ?? "review_cards";

    return {
      hero: {
        sourceKind: "page",
        sourceLabel: "Page-owned copy",
        statusTone:
          (content.heroTitle ?? "").trim() && (content.heroPrimaryCtaText ?? "").trim()
            ? !hasOwnContentField(content, "heroBody")
              ? "warning"
              : "ready"
            : "needs-config",
        statusLabel:
          (content.heroTitle ?? "").trim() && (content.heroPrimaryCtaText ?? "").trim()
            ? !hasOwnContentField(content, "heroBody")
              ? "Needs body review"
              : "Ready"
            : "Needs page copy",
        detail:
          (content.heroTitle ?? "").trim() && (content.heroPrimaryCtaText ?? "").trim()
            ? !hasOwnContentField(content, "heroBody")
              ? "Hero body is still inheriting from Site Settings or the website tagline."
              : "Hero owns its title and primary CTA inside this page editor."
            : "Fill Hero title and Primary CTA text in the Home editor.",
      },
      proof: {
        sourceKind: "computed",
        sourceLabel: "Computed trust data",
        statusTone:
          proofVariant === "star_rating_bar"
            ? reviewSignalsAvailable
              ? "ready"
              : computedTrustSignals > 0
                ? "warning"
                : "needs-source"
            : computedTrustSignals > 0
              ? "ready"
              : "needs-source",
        statusLabel:
          proofVariant === "star_rating_bar"
            ? reviewSignalsAvailable
              ? "Ready"
              : computedTrustSignals > 0
                ? "Fallback only"
                : "Needs trust data"
            : computedTrustSignals > 0
              ? "Ready"
              : "Needs trust data",
        detail:
          proofVariant === "star_rating_bar"
            ? reviewSignalsAvailable
              ? "Uses Google review signals from Global Site Settings."
              : computedTrustSignals > 0
                ? "Star rating data is missing, so this variant would fall back to generic counts."
                : "Add review signals or enough services, testimonials, or team data to support proof."
            : computedTrustSignals > 0
              ? "This proof variant can render from current collection counts."
              : "Add services, testimonials, or team content before relying on this proof block.",
        manageHref: "/site-settings?tab=settings",
        manageLabel: "Review Signals",
      },
      servicesPreview: {
        sourceKind: "collection",
        sourceLabel: "Services collection",
        statusTone:
          homeSourceSummary.serviceCount >= 3
            ? "ready"
            : homeSourceSummary.serviceCount > 0
              ? "warning"
              : "needs-source",
        statusLabel:
          homeSourceSummary.serviceCount >= 3
            ? "Ready"
            : homeSourceSummary.serviceCount > 0
              ? "Thin source"
              : "Needs services",
        detail:
          homeSourceSummary.serviceCount >= 3
            ? `${homeSourceSummary.serviceCount} services available for Home preview cards.`
            : homeSourceSummary.serviceCount > 0
              ? `Only ${homeSourceSummary.serviceCount} service record${homeSourceSummary.serviceCount === 1 ? " is" : "s are"} available.`
              : "Add service records before enabling this section for Home.",
        manageHref: "/site-settings?tab=services",
        manageLabel: "Manage Services",
      },
      testimonials: {
        sourceKind: "collection",
        sourceLabel: "Testimonials collection",
        statusTone:
          homeSourceSummary.testimonialCount === 0
            ? "needs-source"
            : testimonialsVariant === "single_featured_quote"
              ? "ready"
              : homeSourceSummary.testimonialCount >= 3
                ? "ready"
                : "warning",
        statusLabel:
          homeSourceSummary.testimonialCount === 0
            ? "Needs testimonials"
            : testimonialsVariant === "single_featured_quote"
              ? "Ready"
              : homeSourceSummary.testimonialCount >= 3
                ? "Ready"
                : "Thin source",
        detail:
          homeSourceSummary.testimonialCount === 0
            ? "No published testimonials are available for this Home section yet."
            : testimonialsVariant === "single_featured_quote"
              ? `${homeSourceSummary.testimonialCount} published testimonial${homeSourceSummary.testimonialCount === 1 ? " is" : "s are"} available for a featured quote.`
              : homeSourceSummary.testimonialCount >= 3
                ? `${homeSourceSummary.testimonialCount} published testimonials are available.`
                : `This variant works best with 3 or more published testimonials; only ${homeSourceSummary.testimonialCount} found.`,
        manageHref: "/content-testimonials",
        manageLabel: "Manage Testimonials",
      },
      faq: {
        sourceKind: "collection",
        sourceLabel: "FAQ collection",
        statusTone:
          homeSourceSummary.faqCount >= 3
            ? "ready"
            : homeSourceSummary.faqCount > 0
              ? "warning"
              : "needs-source",
        statusLabel:
          homeSourceSummary.faqCount >= 3
            ? "Ready"
            : homeSourceSummary.faqCount > 0
              ? "Thin source"
              : "Needs FAQ items",
        detail:
          homeSourceSummary.faqCount >= 3
            ? `${homeSourceSummary.faqCount} published FAQ items are available.`
            : homeSourceSummary.faqCount > 0
              ? `Home FAQ should usually have at least 3 items; only ${homeSourceSummary.faqCount} found.`
              : "Add published FAQ items before enabling this section.",
        manageHref: "/content-faq",
        manageLabel: "Manage FAQ",
      },
      cta: {
        sourceKind: "page",
        sourceLabel: "Page-owned copy",
        statusTone:
          (content.ctaHeadline ?? "").trim() && (content.ctaButtonText ?? "").trim()
            ? "ready"
            : presentationState.sectionOrder.includes("cta")
              ? "warning"
              : "needs-config",
        statusLabel:
          (content.ctaHeadline ?? "").trim() && (content.ctaButtonText ?? "").trim()
            ? "Ready"
            : presentationState.sectionOrder.includes("cta")
              ? "Review CTA copy"
              : "Disabled",
        detail:
          (content.ctaHeadline ?? "").trim() && (content.ctaButtonText ?? "").trim()
            ? "CTA owns its headline and button text in the Home editor."
            : presentationState.sectionOrder.includes("cta")
              ? "CTA is enabled, but its headline or button text is still inherited or blank."
              : "CTA section is not active in the current recipe.",
      },
      aboutPreview: {
        sourceKind: "collection",
        sourceLabel: "Team collection",
        statusTone:
          homeSourceSummary.teamCount > 0 ? "ready" : "needs-source",
        statusLabel:
          homeSourceSummary.teamCount > 0 ? "Ready" : "Needs team content",
        detail:
          homeSourceSummary.teamCount > 0
            ? `${homeSourceSummary.teamCount} published team member${homeSourceSummary.teamCount === 1 ? " is" : "s are"} available.`
            : "Add at least one published team member before enabling About Preview.",
        manageHref: "/site-settings?tab=team",
        manageLabel: "Manage Team",
      },
      booking: {
        sourceKind: "computed",
        sourceLabel: "Public booking form",
        statusTone:
          homeSourceSummary.settings?.contact_email || homeSourceSummary.settings?.contact_phone
            ? "ready"
            : "warning",
        statusLabel:
          homeSourceSummary.settings?.contact_email || homeSourceSummary.settings?.contact_phone
            ? "Ready"
            : "Needs contact data",
        detail:
          homeSourceSummary.settings?.contact_email || homeSourceSummary.settings?.contact_phone
            ? "Booking can route through the public form and show real contact methods."
            : "Booking form still works, but contact methods are missing from Global Site Settings.",
        manageHref: "/site-settings?tab=settings",
        manageLabel: "Manage Contact",
      },
      offer: {
        sourceKind: "page",
        sourceLabel: "Page-owned offer copy",
        statusTone:
          presentationState.sectionOrder.includes("offer")
            ? (content.offerHeadline ?? "").trim() && (content.offerButtonText ?? "").trim()
              ? "ready"
              : "warning"
            : "needs-config",
        statusLabel:
          presentationState.sectionOrder.includes("offer")
            ? (content.offerHeadline ?? "").trim() && (content.offerButtonText ?? "").trim()
              ? "Ready"
              : "Needs offer copy"
            : "Disabled",
        detail: presentationState.sectionOrder.includes("offer")
          ? (content.offerHeadline ?? "").trim() && (content.offerButtonText ?? "").trim()
            ? "Offer now owns its own headline and button copy in the Home editor."
            : "Offer section is enabled, but its dedicated headline or button copy is still missing."
          : "Offer section is not active in the current recipe.",
      },
    };
  }, [content, homeSourceSummary, pageKey, presentationState]);
  const activeHomeSectionReadiness =
    pageKey === "home" && activeSectionConfig
      ? homeSectionReadiness[activeSectionConfig]
      : null;
  const activeHomeSectionGuide =
    pageKey === "home" && activeSectionConfig
      ? HOME_SECTION_GUIDES[activeSectionConfig] ?? null
      : null;
  const activeHomeSectionOptions =
    pageKey === "home" && activeSectionConfig
      ? sectionVariantOptions[activeSectionConfig] ?? []
      : [];
  const activeHomeSectionPosition =
    pageKey === "home" && activeSectionConfig
      ? presentationState.sectionOrder.indexOf(activeSectionConfig)
      : -1;
  const draftValidation = getDraftValidation(activePageKey, content, seo, presentationState);
  const hasBlockingIssues = draftValidation.blockingIssues.length > 0;
  const canReview = workflow?.permissions?.can_review === true;
  const canSubmitForReview = workflow?.permissions?.can_submit_for_review !== false;
  const canEditPresentation = workflow?.permissions?.can_edit_presentation === true;
  const lastActivityAt =
    workflow?.draft_updated_at ??
    workflow?.reviewed_at ??
    workflow?.submitted_at ??
    workflow?.published_at ??
    updatedAt;
  const workflowStatus = workflow?.status ?? "published";
  const seoAssistantQuestions = SEO_ASSISTANT_QUESTIONS[activePageKey];
  const derivedBusinessContext =
    pickAnswer(latestIntakeSubmission, "primary_offerings") ||
    pickAnswer(latestIntakeSubmission, "ideal_client") ||
    "Universal website";

  const prefillSeoAssistantFromIntake = useCallback(() => {
    if (!latestIntakeSubmission) {
      toast.error("No intake submission found for this tenant.");
      return;
    }

    const nextAnswers = buildSeoAssistantPrefill(activePageKey, latestIntakeSubmission);
    const city = nextAnswers.targetCity?.trim() || pickAnswer(latestIntakeSubmission, "location");
    const serviceLikeAnswer =
      nextAnswers.primaryService?.trim() ||
      nextAnswers.priorityServices?.trim() ||
      nextAnswers.productFocus?.trim() ||
      activePageKey;

    if (!nextAnswers.targetKeyword?.trim()) {
      nextAnswers.targetKeyword = `${toServiceLines(serviceLikeAnswer)[0] ?? activePageKey} ${city}`.trim();
    }

    setSeoAssistantAnswers((current) => ({
      ...nextAnswers,
      ...Object.fromEntries(
        Object.entries(current).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
      ),
    }));
  }, [activePageKey, latestIntakeSubmission]);

  useEffect(() => {
    if (!latestIntakeSubmission) {
      return;
    }

    if (Object.values(seoAssistantAnswers).every((value) => !value?.trim())) {
      prefillSeoAssistantFromIntake();
    }
  }, [latestIntakeSubmission, prefillSeoAssistantFromIntake, seoAssistantAnswers]);

  const generateSeoAssistantDraft = useCallback(async () => {
    if (!websiteId || !pageKey) {
      toast.error("Select a tenant first.");
      return;
    }

    const resolvedKeyword = seoAssistantAnswers.targetKeyword?.trim();
    const resolvedCity = seoAssistantAnswers.targetCity?.trim() || pickAnswer(latestIntakeSubmission, "location");
    const resolvedServices =
      seoAssistantAnswers.primaryService?.trim() ||
      seoAssistantAnswers.priorityServices?.trim() ||
      seoAssistantAnswers.productFocus?.trim() ||
      "";
    const missingRequiredQuestion = seoAssistantQuestions.find(
      (question) => question.required && !seoAssistantAnswers[question.key]?.trim(),
    );

    if (missingRequiredQuestion) {
      toast.error(`Answer this first: ${missingRequiredQuestion.label}`);
      return;
    }

    if (!resolvedCity) {
      toast.error("Add a target city or service area before generating copy.");
      return;
    }

    const response = (await triggerContentAgent({
      websiteId,
      mode: "built_in_page_seo",
      pageKey: activePageKey,
      city: resolvedCity,
      industry: derivedBusinessContext,
      keyword: resolvedKeyword || `${BUILT_IN_PAGE_LABELS[activePageKey]} ${resolvedCity}`,
      businessName: selectedClient?.name || undefined,
      pageIntent: presentationState.recipe,
      pageGoal: presentationState.themePack,
      primaryCta: presentationState.conversionMode,
      servicesOffered: toServiceLines(resolvedServices),
      aboutContext: [
        latestIntakeSubmission
          ? `Intake submitted by ${latestIntakeSubmission.email} on ${latestIntakeSubmission.submittedAt}.`
          : null,
        buildSeoAssistantContext(seoAssistantQuestions, seoAssistantAnswers)
          ? `Editor interview answers:\n${buildSeoAssistantContext(seoAssistantQuestions, seoAssistantAnswers)}`
          : null,
        Object.keys(content).length > 0
          ? `Current page draft:\n${JSON.stringify(content, null, 2)}`
          : null,
        seo.title || seo.description
          ? `Current SEO:\nTitle: ${seo.title || ""}\nDescription: ${seo.description || ""}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    })) as BuiltInSeoAssistantResponse;

    if (response?.step !== "built_in_page_seo_generated") {
      throw new Error("AI did not return a built-in page SEO draft.");
    }

    const nextFields = response.recommendedFields ?? {};
    setContent((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(nextFields).filter(
          ([key, value]) => typeof key === "string" && typeof value === "string",
        ),
      ),
    }));
    setSeo((current) => ({
      title: response.seoTitle ?? current.title,
      description: response.seoDescription ?? current.description,
    }));
    setSeoAssistantResult(response);
    toast.success(`${BUILT_IN_PAGE_LABELS[activePageKey]} SEO draft staged in the editor.`);
  }, [
    activePageKey,
    content,
    derivedBusinessContext,
    latestIntakeSubmission,
    pageKey,
    presentationState.conversionMode,
    presentationState.recipe,
    presentationState.themePack,
    selectedClient?.name,
    seo.description,
    seo.title,
    seoAssistantAnswers,
    seoAssistantQuestions,
    triggerContentAgent,
    websiteId,
  ]);

  if (!pageKey) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Built-in Pages" />
        <ComponentCard title="Invalid Built-in Page">
          <p className="text-sm text-rose-600 dark:text-rose-300">
            This built-in page editor does not exist.
          </p>
          <Link
            href="/built-in-pages"
            className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Back to Built-in Pages
          </Link>
        </ComponentCard>
      </div>
    );
  }

  const runEditorAction = async ({
    action,
    method,
    path,
    successMessage,
    extraBody,
  }: {
    action: WorkflowAction;
    method: "PUT" | "POST";
    path: string;
    successMessage: string;
    extraBody?: Record<string, unknown>;
  }) => {
    if (!websiteId) {
      toast.error("Select a tenant first.");
      return;
    }

    setActiveAction(action);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}${path}`,
        {
          method,
          headers: authHeaders(),
          body: JSON.stringify({
            website_id: websiteId,
            content,
            seo,
            presentation: presentationState,
            ...extraBody,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to save ${pageTitle}`);
      }

      const payload = await response.json();
      applyEditorPayload(payload as BuiltInPageEditorRecord<BuiltInPageKey>);
      if (action !== "reject") {
        setReviewDecisionNotes("");
      }
      toast.success(successMessage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to update ${pageTitle}`;
      toast.error(message);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={pageTitle} />

      {!selectedClient ? (
        <ComponentCard title="No Active Tenant">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Select a tenant in the sidebar first to edit built-in page content.
          </p>
        </ComponentCard>
      ) : null}

      <ComponentCard title={`${pageTitle} Content`} desc={PAGE_DESCRIPTIONS[pageKey]}>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/built-in-pages"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Back to Built-in Pages
          </Link>
          {relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {link.label}
            </Link>
          ))}
          {websiteId ? (
            <Link
              href={getBuiltInPageDraftPreviewPath(
                websiteId,
                pageKey,
                selectedTenantId,
              )}
              target="_blank"
              className="rounded-lg border border-[#CD7F32] px-3 py-1.5 text-xs font-semibold text-[#CD7F32] hover:bg-[#CD7F32]/10"
            >
              Draft Preview
            </Link>
          ) : null}
        </div>

        {lastActivityAt ? (
          <p className="text-xs text-gray-500">
            Last activity: {formatTimestamp(lastActivityAt)}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading page content…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className={PANEL}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Workflow Status
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Drafts now persist separately from the published page, and review actions are enforced by the backend.
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${WORKFLOW_STATUS_CLASSES[workflowStatus]}`}
                  >
                    {WORKFLOW_STATUS_LABELS[workflowStatus]}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Editing From
                    </p>
                    <p className="mt-1">
                      {workflow?.has_draft ? "Saved draft" : "Published content"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Published
                    </p>
                    <p className="mt-1">{formatTimestamp(workflow?.published_at) ?? "Not published yet"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Draft Updated
                    </p>
                    <p className="mt-1">{formatTimestamp(workflow?.draft_updated_at) ?? "No draft saved"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Submitted
                    </p>
                    <p className="mt-1">{formatTimestamp(workflow?.submitted_at) ?? "Not in review"}</p>
                  </div>
                </div>
                {workflow?.notes ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <p className="font-semibold">Latest review note</p>
                    <p className="mt-1 whitespace-pre-wrap">{workflow.notes}</p>
                  </div>
                ) : null}
                {workflow?.has_draft ? (
                  <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                    <p className="font-semibold">Draft preview is separate from publish</p>
                    <p className="mt-1">
                      Draft Preview renders your saved draft state immediately. Publishing is still separate and only affects the live public route.
                    </p>
                  </div>
                ) : null}
                {!canEditPresentation ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    Strategy controls are locked for tenant editors. Copy, SEO, draft saves, and review submission remain available, but recipe, conversion mode, theme pack, and approved section variants are platform-admin only.
                  </div>
                ) : null}
              </div>

              <div className={PANEL}>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Review History
                </p>
                {reviewHistory.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    No submission or review events yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {reviewHistory.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {event.action === "submitted"
                              ? "Submitted for review"
                              : event.action === "approved"
                                ? "Approved and published"
                                : "Changes requested"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimestamp(event.created_at) ?? event.created_at}
                          </p>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {event.actor_role ?? "unknown role"}
                          {event.actor_user_id ? ` • User ${event.actor_user_id}` : ""}
                        </p>
                        {event.notes ? (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {event.notes}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={PANEL}>
              <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                Page Strategy
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SelectField
                  label="Recipe"
                  value={presentationState.recipe}
                  disabled={!canEditPresentation}
                  onChange={(nextRecipe) => {
                    const preset = RECIPE_PRESETS[pageKey][nextRecipe];
                    if (!preset) {
                      return;
                    }

                    setPresentation((current) => {
                      const next = current ?? presentationState;
                      return {
                        ...next,
                        recipe: nextRecipe,
                        conversionMode: preset.conversionMode ?? next.conversionMode,
                        sectionOrder: [...preset.sectionOrder],
                        sectionVariants: { ...preset.sectionVariants },
                      };
                    });
                  }}
                  options={recipeOptions}
                  hint="Recipes control the approved section strategy and slot order for this page."
                />
                <SelectField
                  label="Conversion Mode"
                  value={presentationState.conversionMode}
                  disabled={!canEditPresentation}
                  onChange={(nextValue) =>
                    setPresentation((current) => ({
                      ...(current ?? presentationState),
                      conversionMode: nextValue,
                    }))
                  }
                  options={CONVERSION_MODE_OPTIONS}
                  hint="This sets the primary conversion intent the page is optimized around."
                />
              </div>
            </div>

            <div className={PANEL}>
              <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                Visual Theme
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SelectField
                  label="Theme Pack"
                  value={presentationState.themePack}
                  disabled={!canEditPresentation}
                  onChange={(nextValue) =>
                    setPresentation((current) => ({
                      ...(current ?? presentationState),
                      themePack: nextValue,
                    }))
                  }
                  options={THEME_PACK_OPTIONS}
                  hint="Theme packs change the visual language without changing editable copy fields."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className={PANEL}>
                <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Strategy Preview
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {previewGuidance.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    Theme: {THEME_PACK_OPTIONS.find((option) => option.value === presentationState.themePack)?.label ?? presentationState.themePack}
                  </span>
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    Recipe: {recipeOptions.find((option) => option.value === presentationState.recipe)?.label ?? presentationState.recipe}
                  </span>
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    Conversion: {CONVERSION_MODE_OPTIONS.find((option) => option.value === presentationState.conversionMode)?.label ?? presentationState.conversionMode}
                  </span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {previewGuidance.requirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={PANEL}>
                <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Content Checks
                </p>
                {draftValidation.blockingIssues.length === 0 && draftValidation.advisoryIssues.length === 0 ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Core content and SEO fields are filled for this page.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {draftValidation.blockingIssues.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Blocking
                        </p>
                        <ul className="mt-2 space-y-2 text-sm text-rose-700 dark:text-rose-300">
                          {draftValidation.blockingIssues.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {draftValidation.advisoryIssues.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Advisory
                        </p>
                        <ul className="mt-2 space-y-2 text-sm text-amber-700 dark:text-amber-300">
                          {draftValidation.advisoryIssues.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className={PANEL}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    SEO Assistant
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    This assistant now lives inside Built-in Pages. It uses the current recipe, conversion mode, draft content, and latest intake answers to stage ranking-focused copy directly into this editor.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={prefillSeoAssistantFromIntake}
                    disabled={latestIntakeLoading || !latestIntakeSubmission}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Use Latest Intake
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void generateSeoAssistantDraft().catch((error) => {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Failed to generate built-in page SEO draft.",
                        );
                      });
                    }}
                    disabled={isSeoAssistantLoading || !websiteId}
                    className="rounded-lg bg-[#CD7F32] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b06d2b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSeoAssistantLoading ? "Generating..." : "Generate SEO Draft"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {seoAssistantQuestions.map((question) => (
                  <div
                    key={question.key}
                    className={question.textarea ? "lg:col-span-2" : undefined}
                  >
                    <TextField
                      label={`${question.label}${question.required ? " *" : ""}`}
                      value={seoAssistantAnswers[question.key] ?? ""}
                      onChange={(nextValue) =>
                        setSeoAssistantAnswers((current) => ({
                          ...current,
                          [question.key]: nextValue,
                        }))
                      }
                      hint={question.hint}
                      textarea={question.textarea}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Source Context
                  </p>
                  {latestIntakeLoading ? (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading intake…</p>
                  ) : latestIntakeError ? (
                    <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{latestIntakeError}</p>
                  ) : latestIntakeSubmission ? (
                    <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <p>Universal Website Intake</p>
                      <p>{formatTimestamp(latestIntakeSubmission.submittedAt) ?? latestIntakeSubmission.submittedAt}</p>
                      <p>{latestIntakeSubmission.email}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">No intake submission found.</p>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    How It Works
                  </p>
                  <ol className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li>1. Answer the page questions above.</li>
                    <li>2. Pull in intake answers when available.</li>
                    <li>3. Generate a local SEO draft for this page.</li>
                    <li>4. Review and save the staged copy.</li>
                    <li>5. Open Draft Preview to inspect the saved draft before publish.</li>
                  </ol>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Active Strategy
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>Recipe: {presentationState.recipe}</p>
                    <p>Theme: {presentationState.themePack}</p>
                    <p>Conversion: {presentationState.conversionMode}</p>
                  </div>
                </div>
              </div>

              {seoAssistantResult ? (
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Last AI Result
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <p>
                        <span className="font-semibold text-gray-800 dark:text-white/90">Primary keyword:</span>{" "}
                        {seoAssistantResult.primaryKeyword}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(seoAssistantResult.supportingTerms ?? []).map((term) => (
                          <span
                            key={term}
                            className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:text-gray-300"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Missing Inputs
                    </p>
                    {(seoAssistantResult.missingInputs ?? []).length > 0 ? (
                      <ul className="mt-2 space-y-2 text-sm text-amber-700 dark:text-amber-300">
                        {(seoAssistantResult.missingInputs ?? []).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">No missing inputs were flagged.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {seoAssistantResult?.rationale?.length ? (
                <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ranking Notes
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    {seoAssistantResult.rationale.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className={PANEL}>
                <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Admin-Controlled
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {approvalBoundary.adminOnly.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={PANEL}>
                <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Tenant Draft Scope
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {approvalBoundary.tenantDraftOnly.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={PANEL}>
                <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Publish Rules
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {approvalBoundary.publishingRules.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={PANEL}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Page Sections
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Hero is always first and required. Reorder or remove optional sections, then add from the catalog below.
                  </p>
                </div>
              </div>

              {pageKey === "home" ? (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                  <p>
                    Home section cards now open a dedicated configuration view. Use Configure to change variants, review source readiness, and jump to the right source manager without crowding the active-section list.
                  </p>
                  {homeSourceSummary.loading ? (
                    <p className="mt-2">Loading source summary…</p>
                  ) : homeSourceSummary.error ? (
                    <p className="mt-2 text-rose-700 dark:text-rose-300">{homeSourceSummary.error}</p>
                  ) : null}
                </div>
              ) : null}

              {/* Active sections list */}
              <div className="space-y-2">
                {presentationState.sectionOrder.map((slot, index) => {
                  const catalog = PAGE_SLOT_CATALOG[pageKey];
                  const entry = catalog?.find((e) => e.slot === slot);
                  const isRequired = entry?.required ?? false;
                  const options = sectionVariantOptions[slot] ?? [];
                  const isFirst = index === 0;
                  const isLast = index === presentationState.sectionOrder.length - 1;
                  const homeReadiness = pageKey === "home" ? homeSectionReadiness[slot] : null;

                  const moveUp = () => {
                    if (!canEditPresentation || isFirst || isRequired) return;
                    setPresentation((current) => {
                      const next = current ?? presentationState;
                      const order = [...next.sectionOrder];
                      [order[index - 1], order[index]] = [order[index], order[index - 1]];
                      return { ...next, sectionOrder: order };
                    });
                  };

                  const moveDown = () => {
                    if (!canEditPresentation || isLast || isRequired) return;
                    setPresentation((current) => {
                      const next = current ?? presentationState;
                      const order = [...next.sectionOrder];
                      [order[index], order[index + 1]] = [order[index + 1], order[index]];
                      return { ...next, sectionOrder: order };
                    });
                  };

                  const removeSlot = () => {
                    if (!canEditPresentation || isRequired) return;
                    setPresentation((current) => {
                      const next = current ?? presentationState;
                      return {
                        ...next,
                        sectionOrder: next.sectionOrder.filter((s) => s !== slot),
                      };
                    });
                  };

                  return (
                    <div
                      key={slot}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >
                      {/* Position number */}
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {index + 1}
                      </span>

                      {/* Label + description + variant picker */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {SECTION_LABELS[slot] ?? slot}
                          </p>
                          {isRequired ? (
                            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-700 dark:text-gray-500">
                              required
                            </span>
                          ) : null}
                          {homeReadiness ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SECTION_SOURCE_STYLES[homeReadiness.sourceKind]}`}
                            >
                              {homeReadiness.sourceLabel}
                            </span>
                          ) : null}
                          {homeReadiness ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SECTION_STATUS_STYLES[homeReadiness.statusTone]}`}
                            >
                              {homeReadiness.statusLabel}
                            </span>
                          ) : null}
                        </div>
                        {SECTION_DESCRIPTIONS[slot] ? (
                          <p className="mt-0.5 text-xs text-gray-500">{SECTION_DESCRIPTIONS[slot]}</p>
                        ) : null}
                        {homeReadiness ? (
                          <p className="mt-1 text-xs text-gray-500">{homeReadiness.detail}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveSectionConfig(slot)}
                            className="rounded-lg border border-[#CD7F32] px-2.5 py-1 text-[11px] font-semibold text-[#CD7F32] hover:bg-[#CD7F32]/10"
                          >
                            Configure Section
                          </button>
                          {homeReadiness?.manageHref ? (
                            <Link
                              href={homeReadiness.manageHref}
                              className="rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              {homeReadiness.manageLabel ?? "Manage Source"}
                            </Link>
                          ) : null}
                        </div>
                        {homeReadiness && !homeReadiness.manageHref && homeReadiness.sourceKind === "collection" ? (
                          <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                            This section is collection-backed, but there is no direct source-manager link configured yet.
                          </p>
                        ) : null}
                        {pageKey !== "home" && options.length > 1 ? (
                          <div className="mt-2">
                            <SelectField
                              label="Variant"
                              value={presentationState.sectionVariants[slot] ?? options[0]?.value ?? ""}
                              disabled={!canEditPresentation}
                              onChange={(nextValue) =>
                                setPresentation((current) => ({
                                  ...(current ?? presentationState),
                                  sectionVariants: {
                                    ...(current?.sectionVariants ?? presentationState.sectionVariants),
                                    [slot]: nextValue,
                                  },
                                }))
                              }
                              options={options}
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* Up / Down / Remove controls */}
                      {canEditPresentation && !isRequired ? (
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            onClick={moveUp}
                            disabled={isFirst}
                            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-gray-800"
                            aria-label="Move section up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={moveDown}
                            disabled={isLast}
                            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-gray-800"
                            aria-label="Move section down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={removeSlot}
                            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/20"
                            aria-label="Remove section"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Add from catalog */}
              {(() => {
                const catalog = PAGE_SLOT_CATALOG[pageKey];
                if (!catalog || !canEditPresentation) return null;
                const available = catalog.filter(
                  (entry) => !entry.required && !presentationState.sectionOrder.includes(entry.slot),
                );
                if (available.length === 0) return null;
                return (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Add a Section
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {available.map((entry) => (
                        <button
                          key={entry.slot}
                          type="button"
                          onClick={() =>
                            setPresentation((current) => {
                              const next = current ?? presentationState;
                              if (next.sectionOrder.includes(entry.slot)) return next;
                              const options = sectionVariantOptions[entry.slot] ?? [];
                              return {
                                ...next,
                                sectionOrder: [...next.sectionOrder, entry.slot],
                                sectionVariants: {
                                  ...next.sectionVariants,
                                  ...(options[0] && !(entry.slot in next.sectionVariants)
                                    ? { [entry.slot]: options[0].value }
                                    : {}),
                                },
                              };
                            })
                          }
                          className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-left text-xs hover:border-[#CD7F32] hover:bg-[#CD7F32]/5 dark:border-gray-700 dark:hover:border-[#CD7F32]"
                        >
                          <span className="font-semibold text-gray-700 dark:text-gray-200">
                            + {SECTION_LABELS[entry.slot] ?? entry.slot}
                          </span>
                          {SECTION_DESCRIPTIONS[entry.slot] ? (
                            <p className="mt-0.5 text-gray-400">{SECTION_DESCRIPTIONS[entry.slot]}</p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {pageKey === "home" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">Home copy ownership</p>
                <p className="mt-1">
                  If a Home field has never been saved here, the live page still falls back to Site Settings or page defaults. If you save a blank value here, that blank value overrides the Site Settings fallback for that field.
                </p>
                {inheritedHomeFields.length > 0 ? (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                    Currently inheriting: {inheritedHomeFields.map((field) => field.label).join(", ")}.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                    All Home copy fields now have page-owned values in this editor.
                  </p>
                )}
                {blankOverriddenHomeFields.length > 0 ? (
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                    Saved blank here: {blankOverriddenHomeFields.map((field) => field.label).join(", ")}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {pageKey === "home" ? (
              <div className="space-y-4">
                {homeEditorGroups.map((section) => {
                  const readiness = homeSectionReadiness[section.slot];
                  return (
                    <div
                      key={section.slot}
                      id={`home-editor-${section.slot}`}
                      className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {section.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {section.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              section.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            }`}
                          >
                            {section.isActive ? "Active Section" : "Inactive Section"}
                          </span>
                          {readiness ? (
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${SECTION_STATUS_STYLES[readiness.statusTone]}`}
                            >
                              {readiness.statusLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {!section.isActive ? (
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          This section is not active in the current Home recipe, but you can still prepare copy before switching variants.
                        </p>
                      ) : null}

                      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {section.fields.map(renderContentField)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {fieldConfig.map(renderContentField)}
              </div>
            )}

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                SEO
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextField
                  label="SEO title"
                  value={seo.title}
                  onChange={(nextValue) =>
                    setSeo((current) => ({ ...current, title: nextValue }))
                  }
                />
                <div className="lg:col-span-2">
                  <TextField
                    label="SEO description"
                    value={seo.description}
                    onChange={(nextValue) =>
                      setSeo((current) => ({ ...current, description: nextValue }))
                    }
                    textarea
                  />
                </div>
              </div>
            </div>

            {canReview ? (
              <div className={PANEL}>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Review Decision Notes
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Required when requesting changes. Optional when approving.
                </p>
                <div className="mt-4">
                  <TextField
                    label="Review notes"
                    value={reviewDecisionNotes}
                    onChange={setReviewDecisionNotes}
                    textarea
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  void runEditorAction({
                    action: "draft",
                    method: "PUT",
                    path: `/built-in-page-content/editor/${pageKey}/draft`,
                    successMessage: `${pageTitle} draft saved. Open Draft Preview to inspect it before publish.`,
                  })
                }
                disabled={!selectedClient || activeAction !== null}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {activeAction === "draft" ? "Saving Draft..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (hasBlockingIssues) {
                    toast.error(draftValidation.blockingIssues[0]);
                    return;
                  }

                  void runEditorAction({
                    action: "submit",
                    method: "POST",
                    path: `/built-in-page-content/editor/${pageKey}/submit`,
                    successMessage: `${pageTitle} submitted for review. Draft Preview still shows the draft until approval and publish.`,
                  });
                }}
                disabled={!selectedClient || activeAction !== null || !canSubmitForReview || hasBlockingIssues}
                className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/30"
              >
                {activeAction === "submit" ? "Submitting..." : "Submit for Review"}
              </button>
              {canReview ? (
                <button
                  type="button"
                  onClick={() =>
                    void runEditorAction({
                      action: "reject",
                      method: "POST",
                      path: `/built-in-page-content/editor/${pageKey}/review`,
                      successMessage: `Changes requested for ${pageTitle}`,
                      extraBody: {
                        action: "reject",
                        notes: reviewDecisionNotes,
                      },
                    })
                  }
                  disabled={!selectedClient || activeAction !== null || !reviewDecisionNotes.trim()}
                  className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                >
                  {activeAction === "reject" ? "Requesting Changes..." : "Request Changes"}
                </button>
              ) : null}
              {canReview ? (
                <button
                  type="button"
                  onClick={() => {
                    if (hasBlockingIssues) {
                      toast.error(draftValidation.blockingIssues[0]);
                      return;
                    }

                    void runEditorAction({
                      action: "approve",
                      method: "POST",
                      path: `/built-in-page-content/editor/${pageKey}/review`,
                      successMessage: `${pageTitle} approved and published`,
                      extraBody: {
                        action: "approve",
                        notes: reviewDecisionNotes,
                      },
                    });
                  }}
                  disabled={!selectedClient || activeAction !== null || hasBlockingIssues}
                  className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b06d2b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeAction === "approve" ? "Publishing..." : "Approve & Publish"}
                </button>
              ) : null}
            </div>

            {pageKey === "home" && activeSectionConfig ? (
              <Modal
                isOpen={Boolean(activeSectionConfig)}
                onClose={() => setActiveSectionConfig(null)}
                className="max-h-[90vh] max-w-3xl overflow-y-auto p-6 sm:p-8"
              >
                <div className="pr-10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CD7F32]">
                        Home Section Configuration
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                        {SECTION_LABELS[activeSectionConfig] ?? activeSectionConfig}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {activeHomeSectionGuide?.overview ?? SECTION_DESCRIPTIONS[activeSectionConfig] ?? "Adjust this Home section without leaving the page editor."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeHomeSectionReadiness ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${SECTION_SOURCE_STYLES[activeHomeSectionReadiness.sourceKind]}`}
                        >
                          {activeHomeSectionReadiness.sourceLabel}
                        </span>
                      ) : null}
                      {activeHomeSectionReadiness ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${SECTION_STATUS_STYLES[activeHomeSectionReadiness.statusTone]}`}
                        >
                          {activeHomeSectionReadiness.statusLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Section Status
                      </p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                        {activeHomeSectionPosition >= 0
                          ? `Active at position ${activeHomeSectionPosition + 1} in the current Home layout.`
                          : "Not active in the current Home recipe yet."}
                      </p>
                      {activeHomeSectionReadiness ? (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          {activeHomeSectionReadiness.detail}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        SEO Role
                      </p>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {activeHomeSectionGuide?.seoRole ?? "This section contributes to the page recipe, structure, and conversion flow."}
                      </p>
                    </div>
                  </div>

                  {activeHomeSectionOptions.length > 1 ? (
                    <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <SelectField
                        label="Section variant"
                        value={presentationState.sectionVariants[activeSectionConfig] ?? activeHomeSectionOptions[0]?.value ?? ""}
                        disabled={!canEditPresentation}
                        onChange={(nextValue) =>
                          setPresentation((current) => ({
                            ...(current ?? presentationState),
                            sectionVariants: {
                              ...(current?.sectionVariants ?? presentationState.sectionVariants),
                              [activeSectionConfig]: nextValue,
                            },
                          }))
                        }
                        options={activeHomeSectionOptions}
                      />
                    </div>
                  ) : null}

                  <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Configuration Checklist
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {(activeHomeSectionGuide?.checklist ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {activeHomeSectionReadiness?.manageHref ? (
                        <Link
                          href={activeHomeSectionReadiness.manageHref}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          {activeHomeSectionReadiness.manageLabel ?? "Manage Source"}
                        </Link>
                      ) : null}
                      {HOME_EDITOR_SECTIONS.some((section) => section.slot === activeSectionConfig) ? (
                        <a
                          href={`#home-editor-${activeSectionConfig}`}
                          onClick={() => setActiveSectionConfig(null)}
                          className="rounded-lg border border-[#CD7F32] px-4 py-2 text-sm font-semibold text-[#CD7F32] hover:bg-[#CD7F32]/10"
                        >
                          Edit Section Copy
                        </a>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSectionConfig(null)}
                      className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b06d2b]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Modal>
            ) : null}
          </>
        )}
      </ComponentCard>
    </div>
  );
}