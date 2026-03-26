import type {
  AboutPageContent,
  BuiltInPageContentRecord,
  BuiltInPageKey,
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

const getText = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

export const getBuiltInPagePreviewPath = (
  websiteId: number | string,
  pageKey: BuiltInPageKey,
) => {
  return `/sites/${websiteId}${pageKey === "home" ? "" : `/${pageKey}`}`;
};

export const getHomePageContent = (
  record: BuiltInPageContentRecord<"home"> | null,
  website: Website | null,
  settings: SiteSettings | null,
): HomePageContent => {
  const content = record?.content;
  return {
    heroTitle: getText(content?.heroTitle) ?? website?.name ?? "Welcome",
    heroBody: getText(content?.heroBody) ?? website?.tagline ?? "",
    heroPrimaryCtaText:
      getText(content?.heroPrimaryCtaText) ?? settings?.hero_cta_text ?? "Get Started",
    heroPrimaryCtaUrl:
      getText(content?.heroPrimaryCtaUrl) ?? settings?.hero_cta_url ?? "#contact",
    heroBackgroundImageUrl:
      getText(content?.heroBackgroundImageUrl) ?? settings?.hero_bg_image_url ?? null,
    heroBackgroundOverlayColor:
      getText(content?.heroBackgroundOverlayColor) ??
      settings?.hero_bg_overlay_color ??
      "#000000",
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