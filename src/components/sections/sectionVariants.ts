export type NavBarVariant = "inline" | "centered" | "pill";

export type HeroSectionVariant =
  | "centered_overlay"
  | "split_spotlight"
  | "stacked_card";

export type CTASectionVariant =
  | "solid_banner"
  | "split_panel"
  | "minimal_inline";

export type FooterSectionVariant =
  | "classic_dark"
  | "grid_contact"
  | "brand_strip";

export type BookingSectionVariant =
  | "split_form"
  | "stacked_panel"
  | "contrast_band";

export type FAQSectionVariant = "accordion" | "cards" | "split_list";

export type TestimonialsSectionVariant =
  | "review_grid"
  | "featured_quote"
  | "stacked_cards";

export type FeaturesSectionVariant =
  | "alternating_panels"
  | "card_grid"
  | "numbered_list";

export type TeamSectionVariant =
  | "portrait_grid"
  | "editorial_list"
  | "compact_cards";

export type ShopGridSectionVariant =
  | "product_grid"
  | "editorial_cards"
  | "minimal_rows";

export type BlogListSectionVariant =
  | "editorial_grid"
  | "featured_stack"
  | "compact_rows";

export interface GenericSectionVariantPreset {
  navBar: NavBarVariant;
  hero: HeroSectionVariant;
  cta: CTASectionVariant;
  footer: FooterSectionVariant;
  booking: BookingSectionVariant;
  faq: FAQSectionVariant;
  testimonials: TestimonialsSectionVariant;
  features: FeaturesSectionVariant;
  team: TeamSectionVariant;
  shopGrid: ShopGridSectionVariant;
  blogList: BlogListSectionVariant;
}

export type GenericSectionPresetKey = "home" | "services" | "about" | "shop" | "custom";

export const GENERIC_SECTION_VARIANT_PRESETS: Record<
  GenericSectionPresetKey,
  GenericSectionVariantPreset
> = {
  home: {
    navBar: "centered",
    hero: "centered_overlay",
    cta: "split_panel",
    footer: "grid_contact",
    booking: "stacked_panel",
    faq: "cards",
    testimonials: "review_grid",
    features: "card_grid",
    team: "compact_cards",
    shopGrid: "product_grid",
    blogList: "editorial_grid",
  },
  services: {
    navBar: "pill",
    hero: "split_spotlight",
    cta: "solid_banner",
    footer: "grid_contact",
    booking: "split_form",
    faq: "accordion",
    testimonials: "stacked_cards",
    features: "alternating_panels",
    team: "portrait_grid",
    shopGrid: "minimal_rows",
    blogList: "compact_rows",
  },
  about: {
    navBar: "centered",
    hero: "stacked_card",
    cta: "split_panel",
    footer: "brand_strip",
    booking: "contrast_band",
    faq: "split_list",
    testimonials: "featured_quote",
    features: "numbered_list",
    team: "editorial_list",
    shopGrid: "editorial_cards",
    blogList: "featured_stack",
  },
  shop: {
    navBar: "pill",
    hero: "split_spotlight",
    cta: "minimal_inline",
    footer: "classic_dark",
    booking: "split_form",
    faq: "accordion",
    testimonials: "review_grid",
    features: "card_grid",
    team: "compact_cards",
    shopGrid: "editorial_cards",
    blogList: "editorial_grid",
  },
  custom: {
    navBar: "inline",
    hero: "stacked_card",
    cta: "split_panel",
    footer: "grid_contact",
    booking: "split_form",
    faq: "accordion",
    testimonials: "stacked_cards",
    features: "alternating_panels",
    team: "portrait_grid",
    shopGrid: "product_grid",
    blogList: "editorial_grid",
  },
};

export const getGenericSectionVariants = (key: GenericSectionPresetKey) => {
  return GENERIC_SECTION_VARIANT_PRESETS[key];
};