import type {
  AboutPageContent,
  BuiltInPageContentRecord,
  BuiltInPageKey,
  BuiltInPagePresentationByKey,
  HomePageContent,
  ServicesPageContent,
  ShopPageContent,
  SiteSettings,
  Website,
} from "./cms-types";

export const BUILT_IN_PAGE_KEYS: BuiltInPageKey[] = [
  "home",
  "services",
  "about",
  "shop",
];

export const BUILT_IN_PAGE_LABELS: Record<BuiltInPageKey, string> = {
  home: "Home",
  services: "Services",
  about: "About",
  shop: "Shop",
};

const BUILT_IN_PRESENTATION_DEFAULTS: {
  [K in BuiltInPageKey]: BuiltInPagePresentationByKey[K];
} = {
  home: {
    themePack: "modern_service",
    recipe: "local_lead_gen",
    conversionMode: "call",
    sectionOrder: [
      "hero",
      "proof",
      "servicesPreview",
      "testimonials",
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
  services: {
    themePack: "modern_service",
    recipe: "service_grid",
    conversionMode: "call",
    sectionOrder: ["hero", "servicesList", "faq", "cta"],
    sectionVariants: {
      hero: "service_grid_intro",
      servicesList: "grid_cards",
      faq: "accordion",
      cta: "quote_request",
    },
  },
  about: {
    themePack: "professional_authority",
    recipe: "founder_story",
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
  shop: {
    themePack: "high_contrast_conversion",
    recipe: "catalog_first",
    conversionMode: "checkout",
    sectionOrder: ["hero", "catalog", "featured", "cta"],
    sectionVariants: {
      hero: "catalog_intro",
      catalog: "product_grid",
      featured: "featured_row",
      cta: "shop_now",
    },
  },
};

const getText = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const hasOwnContentField = (value: unknown, key: string): boolean => {
  return isObject(value) && Object.prototype.hasOwnProperty.call(value, key);
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
};

export const getBuiltInPagePreviewPath = (
  websiteId: number | string,
  pageKey: BuiltInPageKey,
) => {
  return `/sites/${websiteId}${pageKey === "home" ? "" : `/${pageKey}`}`;
};

export const getBuiltInPageDraftPreviewPath = (
  websiteId: number | string,
  pageKey: BuiltInPageKey,
  tenantId?: number | string | null,
) => {
  const params = new URLSearchParams({ websiteId: String(websiteId) });

  if (tenantId) {
    params.set("tenantId", String(tenantId));
  }

  return `/built-in-pages/${pageKey}/draft-preview?${params.toString()}`;
};

export const getDefaultBuiltInPresentation = <K extends BuiltInPageKey>(
  pageKey: K,
): BuiltInPagePresentationByKey[K] => {
  const defaults = BUILT_IN_PRESENTATION_DEFAULTS[pageKey];

  return {
    ...defaults,
    sectionOrder: [...defaults.sectionOrder],
    sectionVariants: { ...defaults.sectionVariants },
  };
};

export const getResolvedBuiltInPresentation = <K extends BuiltInPageKey>(
  pageKey: K,
  record: BuiltInPageContentRecord<K> | null,
): BuiltInPagePresentationByKey[K] => {
  const fallback = getDefaultBuiltInPresentation(pageKey);
  const presentation = record?.presentation;

  if (!isObject(presentation)) {
    return fallback;
  }

  const sectionVariants = isObject(presentation.sectionVariants)
    ? Object.fromEntries(
        Object.entries(presentation.sectionVariants).filter(
          ([slot, variant]) =>
            typeof slot === "string" &&
            slot.trim().length > 0 &&
            typeof variant === "string" &&
            variant.trim().length > 0,
        ),
      )
    : {};

  return {
    ...fallback,
    ...presentation,
    sectionOrder:
      toStringArray(presentation.sectionOrder).length > 0
        ? toStringArray(presentation.sectionOrder)
        : fallback.sectionOrder,
    sectionVariants: {
      ...fallback.sectionVariants,
      ...sectionVariants,
    },
  };
};

export const getHomePageContent = (
  record: BuiltInPageContentRecord<"home"> | null,
  website: Website | null,
  settings: SiteSettings | null,
): HomePageContent => {
  const content = record?.content;
  return {
    heroTitle: hasOwnContentField(content, "heroTitle")
      ? (getText(content?.heroTitle) ?? "")
      : (website?.name ?? "Welcome"),
    heroBody: hasOwnContentField(content, "heroBody")
      ? (getText(content?.heroBody) ?? "")
      : (website?.tagline ?? ""),
    heroPrimaryCtaText: hasOwnContentField(content, "heroPrimaryCtaText")
      ? (getText(content?.heroPrimaryCtaText) ?? "")
      : (settings?.hero_cta_text ?? "Get Started"),
    heroPrimaryCtaUrl: hasOwnContentField(content, "heroPrimaryCtaUrl")
      ? (getText(content?.heroPrimaryCtaUrl) ?? "")
      : (settings?.hero_cta_url ?? "/contact"),
    heroBackgroundImageUrl: hasOwnContentField(content, "heroBackgroundImageUrl")
      ? (getText(content?.heroBackgroundImageUrl) ?? null)
      : (settings?.hero_bg_image_url ?? null),
    heroBackgroundOverlayColor: hasOwnContentField(content, "heroBackgroundOverlayColor")
      ? (getText(content?.heroBackgroundOverlayColor) ?? "")
      : (settings?.hero_bg_overlay_color ?? "#000000"),
    ctaHeadline: hasOwnContentField(content, "ctaHeadline")
      ? (getText(content?.ctaHeadline) ?? null)
      : (settings?.cta_headline ?? null),
    ctaBody: hasOwnContentField(content, "ctaBody")
      ? (getText(content?.ctaBody) ?? null)
      : (settings?.cta_body ?? null),
    ctaButtonText: hasOwnContentField(content, "ctaButtonText")
      ? (getText(content?.ctaButtonText) ?? null)
      : (settings?.cta_button_text ?? null),
    ctaButtonUrl: hasOwnContentField(content, "ctaButtonUrl")
      ? (getText(content?.ctaButtonUrl) ?? "")
      : (settings?.cta_button_url ?? "/contact"),
    offerHeadline: hasOwnContentField(content, "offerHeadline")
      ? (getText(content?.offerHeadline) ?? null)
      : null,
    offerBody: hasOwnContentField(content, "offerBody")
      ? (getText(content?.offerBody) ?? null)
      : null,
    offerButtonText: hasOwnContentField(content, "offerButtonText")
      ? (getText(content?.offerButtonText) ?? null)
      : null,
    offerButtonUrl: hasOwnContentField(content, "offerButtonUrl")
      ? (getText(content?.offerButtonUrl) ?? "")
      : "/contact",
  };
};

export const getServicesPageContent = (
  record: BuiltInPageContentRecord<"services"> | null,
  website: Website | null,
  settings: SiteSettings | null,
): ServicesPageContent => {
  const content = record?.content;
  return {
    heroTitle: getText(content?.heroTitle) ?? "Our Services",
    heroBody:
      getText(content?.heroBody) ??
      settings?.hero_subheadline ??
      `Explore the services offered by ${website?.name ?? "our company"}.`,
    emptyStateTitle: getText(content?.emptyStateTitle) ?? "Services coming soon.",
    emptyStateBody:
      getText(content?.emptyStateBody) ??
      "This page will update automatically as services are published.",
  };
};

export const getAboutPageContent = (
  record: BuiltInPageContentRecord<"about"> | null,
  website: Website | null,
  settings: SiteSettings | null,
): AboutPageContent => {
  const content = record?.content;
  return {
    heroTitle: getText(content?.heroTitle) ?? "About Us",
    heroBody:
      getText(content?.heroBody) ??
      settings?.footer_tagline ??
      `Get to know the people and story behind ${website?.name ?? "our company"}.`,
    missionTitle: getText(content?.missionTitle) ?? "Our Mission",
    missionBody: getText(content?.missionBody) ?? "",
  };
};

export const getShopPageContent = (
  record: BuiltInPageContentRecord<"shop"> | null,
  website: Website | null,
): ShopPageContent => {
  const content = record?.content;
  return {
    heroTitle: getText(content?.heroTitle) ?? "Shop",
    heroBody:
      getText(content?.heroBody) ??
      `Browse products from ${website?.name ?? "our company"}.`,
    emptyStateTitle: getText(content?.emptyStateTitle) ?? "Products coming soon.",
    emptyStateBody:
      getText(content?.emptyStateBody) ??
      "Publish products to start selling on this built-in page.",
  };
};