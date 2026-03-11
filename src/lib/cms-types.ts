// TypeScript interfaces that exactly match the backend database columns.
// Field names mirror the DB column names.

export interface Website {
  id: number;
  created_at: string;
  name: string;
  domain: string | null;
  tagline: string | null;
}

export interface SiteSettings {
  id: number;
  website_id: number;
  created_at: string;
  updated_at: string;
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
  footer_nav_links: FooterNavLink[] | null;
  footer_social_facebook: string | null;
  footer_social_instagram: string | null;
  footer_social_x: string | null;
  footer_social_linkedin: string | null;
  // Map
  google_maps_url: string | null;
  // E-commerce
  ecommerce_enabled: boolean | null;
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
}

export interface FooterNavLink {
  label: string;
  href: string;
}

export interface Service {
  id: number;
  created_at: string;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
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
  content: string | null;
  type: string | null;
  website_id: number | null;
  page_type: string;
  parent_id: number | null;
  sort_order: number;
  is_published: boolean;
  is_main_nav: boolean;
  template_type: string;
  meta_description: string | null;
  meta_keywords: string | null;
  featured_image_url: string | null;
  excerpt: string | null;
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
  xUrl: string | null;
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
  services: Service[];
  testimonials: Testimonial[];
  team: TeamMember[];
  faq: FAQItem[];
}
