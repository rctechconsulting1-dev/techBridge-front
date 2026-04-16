// TypeScript interfaces that exactly match the backend database columns.
// Field names mirror the DB column names.

export interface Website {
  id: number;
  created_at: string;
  name: string;
  domain: string | null;
  tagline: string | null;
  tenant_id?: number | null;
}

export interface SiteSettings {
  id: number;
  website_id: number;
  created_at: string;
  updated_at: string;
  launch_mode: "temporary_launch" | "final_domain";
  // Branding
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_url: string | null;
  font_family: string | null;
  // Contact
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  // Hero
  hero_headline: string | null;
  hero_subheadline: string | null;
  hero_cta_text: string;
  hero_cta_url: string | null;
  hero_bg_image_url: string | null;
  hero_bg_overlay_color: string;
  // CTA section
  cta_headline: string | null;
  cta_body: string | null;
  cta_button_text: string | null;
  cta_button_url: string | null;
  cta_bg_color: string | null;
  // Footer
  footer_tagline: string | null;
  footer_copyright: string | null;
  header_nav_links: FooterNavLink[] | null;
  footer_nav_links: FooterNavLink[] | null;
  footer_social_facebook: string | null;
  footer_social_instagram: string | null;
  footer_social_x: string | null;
  footer_social_linkedin: string | null;
  // Map
  google_maps_url: string | null;
  // Reviews
  average_rating: number | null;
  review_count: number | null;
  // E-commerce
  ecommerce_enabled: boolean | null;
}

export type BuiltInPageKey = "home" | "services" | "about" | "shop";

export type BuiltInThemePack =
  | "modern_service"
  | "professional_authority"
  | "warm_local"
  | "high_contrast_conversion";

export type ConversionMode =
  | "call"
  | "email"
  | "appointment"
  | "reservation"
  | "checkout";

export type HomeRecipe =
  | "local_lead_gen"
  | "authority_trust"
  | "booking_first"
  | "offer_funnel";

export type ServicesRecipe =
  | "service_grid"
  | "service_categories"
  | "problem_solution";

export type AboutRecipe =
  | "founder_story"
  | "team_credibility"
  | "mission_trust";

export type ShopRecipe =
  | "catalog_first"
  | "featured_products"
  | "offer_first";

export interface BuiltInPageSeo {
  title: string | null;
  description: string | null;
}

export interface HomePageContent {
  heroTitle: string | null;
  heroBody: string | null;
  heroPrimaryCtaText: string | null;
  heroPrimaryCtaUrl: string | null;
  heroBackgroundImageUrl: string | null;
  heroBackgroundOverlayColor: string | null;
  ctaHeadline: string | null;
  ctaBody: string | null;
  ctaButtonText: string | null;
  ctaButtonUrl: string | null;
  offerHeadline: string | null;
  offerBody: string | null;
  offerButtonText: string | null;
  offerButtonUrl: string | null;
}

export interface ServicesPageContent {
  heroTitle: string | null;
  heroBody: string | null;
  emptyStateTitle: string | null;
  emptyStateBody: string | null;
}

export interface AboutPageContent {
  heroTitle: string | null;
  heroBody: string | null;
  missionTitle: string | null;
  missionBody: string | null;
}

export interface ShopPageContent {
  heroTitle: string | null;
  heroBody: string | null;
  emptyStateTitle: string | null;
  emptyStateBody: string | null;
}

export interface BuiltInPageContentByKey {
  home: HomePageContent;
  services: ServicesPageContent;
  about: AboutPageContent;
  shop: ShopPageContent;
}

export interface BuiltInPagePresentationByKey {
  home: {
    themePack: BuiltInThemePack;
    recipe: HomeRecipe;
    conversionMode: ConversionMode;
    sectionOrder: string[];
    sectionVariants: Record<string, string>;
  };
  services: {
    themePack: BuiltInThemePack;
    recipe: ServicesRecipe;
    conversionMode: ConversionMode;
    sectionOrder: string[];
    sectionVariants: Record<string, string>;
  };
  about: {
    themePack: BuiltInThemePack;
    recipe: AboutRecipe;
    conversionMode: ConversionMode;
    sectionOrder: string[];
    sectionVariants: Record<string, string>;
  };
  shop: {
    themePack: BuiltInThemePack;
    recipe: ShopRecipe;
    conversionMode: ConversionMode;
    sectionOrder: string[];
    sectionVariants: Record<string, string>;
  };
}

export type BuiltInPageWorkflowStatus =
  | "published"
  | "draft"
  | "in_review"
  | "changes_requested";

export interface BuiltInPageWorkflowPermissions {
  can_save_draft: boolean;
  can_submit_for_review: boolean;
  can_review: boolean;
  can_edit_presentation: boolean;
}

export interface BuiltInPageWorkflow {
  status: BuiltInPageWorkflowStatus;
  has_draft: boolean;
  draft_updated_at: string | null;
  draft_updated_by_user_id: number | null;
  submitted_at: string | null;
  submitted_by_user_id: number | null;
  reviewed_at: string | null;
  reviewed_by_user_id: number | null;
  published_at: string | null;
  published_by_user_id: number | null;
  notes: string | null;
  permissions: BuiltInPageWorkflowPermissions;
}

export interface BuiltInPageReviewEvent<
  K extends BuiltInPageKey = BuiltInPageKey,
> {
  id: number;
  page_content_id: number;
  tenant_id: number;
  website_id: number;
  page_key: K;
  action: "submitted" | "approved" | "rejected";
  from_status: BuiltInPageWorkflowStatus | null;
  to_status: BuiltInPageWorkflowStatus | null;
  actor_user_id: number | null;
  actor_role: string | null;
  notes: string | null;
  snapshot_content: BuiltInPageContentByKey[K];
  snapshot_seo: BuiltInPageSeo;
  snapshot_presentation: BuiltInPagePresentationByKey[K];
  created_at: string;
}

export interface BuiltInPageContentRecord<
  K extends BuiltInPageKey = BuiltInPageKey,
> {
  id: number | null;
  tenant_id: number | null;
  website_id: number;
  page_key: K;
  content: BuiltInPageContentByKey[K];
  seo: BuiltInPageSeo;
  presentation: BuiltInPagePresentationByKey[K];
  created_at: string | null;
  updated_at: string | null;
  source?: "persisted" | "fallback";
}

export interface BuiltInPageEditorRecord<
  K extends BuiltInPageKey = BuiltInPageKey,
> extends BuiltInPageContentRecord<K> {
  published_content: BuiltInPageContentByKey[K];
  published_seo: BuiltInPageSeo;
  published_presentation: BuiltInPagePresentationByKey[K];
  draft_source: "draft" | "published";
  workflow: BuiltInPageWorkflow;
  review_history: BuiltInPageReviewEvent<K>[];
}

export interface Product {
  id: number;
  website_id: number | null;
  created_at: string;
  updated_at: string;
  title: string;
  slug: string;
  description: string | null;
  price: string; // comes back as string from pg NUMERIC
  compare_at_price: string | null;
  image_url: string | null;
  stock_quantity: number;
  is_published: boolean;
  sort_order: number;
  average_rating: string;
  review_count: number;
  fulfillment_type: "manual" | "printify";
  printify_product_id: string | null;
  printify_blueprint_id: number | null;
  printify_print_provider_id: number | null;
  printify_variant_id: number | null;
}

export interface FooterNavLink {
  label: string;
  href: string;
  location?: "header" | "footer";
}

export interface Service {
  id: number;
  created_at: string;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
  featured_on_home: boolean;
  website_id: number | null;
}

export interface Testimonial {
  id: number;
  website_id: number;
  created_at: string;
  quote: string;
  author_name: string;
  author_title: string | null;
  avatar_url: string | null;
  star_rating: number;
  sort_order: number;
  is_published: boolean;
}

export interface TeamMember {
  id: number;
  website_id: number;
  created_at: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
  is_published: boolean;
}

export interface FAQItem {
  id: number;
  website_id: number;
  created_at: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export interface Page {
  id: number;
  created_at: string;
  updated_at: string | null;
  title: string;
  slug: string;
  path?: string | null;
  content: string | null;
  type: string | null;
  website_id: number | null;
  page_type: string;
  parent_id: number | null;
  sort_order: number;
  nav_order?: number;
  is_published: boolean;
  is_main_nav: boolean;
  is_enabled?: boolean;
  is_required?: boolean;
  nav_placement?: "header" | "footer" | "hidden" | null;
  nav_style?: "direct" | "dropdown_parent" | "dropdown_child" | null;
  nav_parent_id?: number | null;
  nav_label?: string | null;
  is_external_link?: boolean;
  page_source?: string | null;
  navigation_assignments?: PageNavigationAssignment[];
  template_type: string;
  meta_description: string | null;
  meta_keywords: string | null;
  featured_image_url: string | null;
  excerpt: string | null;
}

export interface PageNavigationAssignment {
  id: number;
  page_id: number;
  tenant_id: number;
  website_id: number;
  placement: "header" | "footer";
  style: "direct" | "dropdown_parent" | "dropdown_child";
  parent_page_id: number | null;
  parent_assignment_id: number | null;
  label: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface BusinessListing {
  id: number;
  created_at: string;
  platform: string | null;
  listing_url: string | null;
  business_name: string | null;
  address: string | null;
  phone: string | null;
  rating: number | null;
  review_count: number | null;
  website_id: number | null;
  x_url: string | null;
  instagram: string | null;
  facebook: string | null;
  other: string | null;
  industry: string | null;
  gmb_Id: string | null;
}

export interface SeoMetadata {
  id: number;
  created_at: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  page_id: number | null;
  blog_post_id: number | null;
}

export interface Image {
  id: number;
  created_at: string;
  url: string;
  alt_text: string | null;
  caption: string | null;
}

// Aggregated type for a full landing page dataset
export interface LandingPageData {
  website: Website | null;
  settings: SiteSettings | null;
  homePageContent: BuiltInPageContentRecord<"home"> | null;
  pages: Page[];
  services: Service[];
  testimonials: Testimonial[];
  team: TeamMember[];
  faq: FAQItem[];
}
