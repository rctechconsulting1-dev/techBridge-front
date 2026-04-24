import type { TemplateType } from "@/types/page";

export type OptionalSystemPageSlug =
  | "contact"
  | "faq"
  | "reviews"
  | "locations"
  | "blog"
  | "reservations"
  | "menu";

export interface OptionalSystemPageConfig {
  slug: OptionalSystemPageSlug;
  title: string;
  templateType: TemplateType;
  description: string;
  supportsDropdownParent?: boolean;
}

export const OPTIONAL_SYSTEM_PAGE_CONFIGS: OptionalSystemPageConfig[] = [
  {
    slug: "contact",
    title: "Contact",
    templateType: "contact",
    description: "Route-backed contact page with business contact methods and lead conversion intent.",
  },
  {
    slug: "faq",
    title: "FAQ",
    templateType: "standard",
    description: "Optional trust and objection-handling parent page when FAQ belongs in header navigation.",
  },
  {
    slug: "reviews",
    title: "Reviews",
    templateType: "standard",
    description: "Optional social-proof parent page for review-led trust strategies.",
  },
  {
    slug: "locations",
    title: "Locations",
    templateType: "standard",
    description: "Optional parent page for multi-area SEO and location-detail child pages.",
    supportsDropdownParent: true,
  },
  {
    slug: "blog",
    title: "Blog",
    templateType: "standard",
    description: "Optional parent page for content marketing and blog child pages.",
    supportsDropdownParent: true,
  },
  {
    slug: "reservations",
    title: "Reservations",
    templateType: "standard",
    description: "Optional parent page for hospitality and reservation-first business models.",
  },
  {
    slug: "menu",
    title: "Menu",
    templateType: "standard",
    description: "Optional parent page for hospitality menus when a real route is preferred over anchors.",
  },
];

export const OPTIONAL_SYSTEM_PAGE_SLUGS = new Set<OptionalSystemPageSlug>(
  OPTIONAL_SYSTEM_PAGE_CONFIGS.map((config) => config.slug),
);

export const isOptionalSystemPageSlug = (
  value: string,
): value is OptionalSystemPageSlug => OPTIONAL_SYSTEM_PAGE_SLUGS.has(value as OptionalSystemPageSlug);

export const OPTIONAL_SYSTEM_PAGE_CONFIG_BY_SLUG = new Map<
  OptionalSystemPageSlug,
  OptionalSystemPageConfig
>(
  OPTIONAL_SYSTEM_PAGE_CONFIGS.map((config) => [config.slug, config]),
);