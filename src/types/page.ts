export type PageType = 
  | 'main-page'     // Primary navigation pages (Home, About, Contact, Services)
  | 'service'       // Individual service pages
  | 'blog-post'     // Blog articles
  | 'blog-category' // Blog category pages
  | 'gallery'       // Photo galleries
  | 'landing'       // Special landing pages
  | 'legal'         // Privacy, Terms, etc.
  | 'custom';       // Custom page types

export type TemplateType = 
  | 'standard'      // Standard page layout
  | 'service'       // Service-specific template
  | 'blog-post'     // Blog post template
  | 'blog-list'     // Blog listing template
  | 'gallery'       // Gallery template
  | 'landing'       // Landing page template
  | 'contact'       // Contact page template
  | 'home';         // Homepage template

export type PageRole = 'parent' | 'child';

export type PageSource = 'built_in' | 'industry_nav' | 'custom' | 'system' | 'unknown';

export type NavPlacement = 'header' | 'footer' | 'hidden';

export type NavStyle = 'direct' | 'dropdown_parent' | 'dropdown_child';

export interface PageNavigationAssignment {
  id?: number;
  page_id?: number;
  tenant_id?: number;
  website_id?: number;
  placement: 'header' | 'footer';
  style: NavStyle;
  parent_page_id?: number | null;
  parent_assignment_id?: number | null;
  label?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PageCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  website_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Page {
  content: string | null;
  created_at: string | null;
  id: number;
  slug: string | null;
  title: string | null;
  type: string | null; // Keep for backward compatibility
  website_id: number | null;
  // Enhanced fields
  page_type: PageType | null;
  parent_id: number | null;
  sort_order: number;
  nav_order?: number;
  is_published: boolean;
  is_main_nav: boolean;
  is_enabled?: boolean;
  is_required?: boolean;
  nav_placement?: NavPlacement | null;
  nav_style?: NavStyle | null;
  nav_parent_id?: number | null;
  nav_label?: string | null;
  is_external_link?: boolean;
  navigation_assignments?: PageNavigationAssignment[];
  template_type: TemplateType | null;
  meta_description: string | null;
  meta_keywords: string | null;
  featured_image_url: string | null;
  excerpt: string | null;
  updated_at: string | null;
  // Relationships
  parent_page?: Page | null;
  sub_pages?: Page[];
  categories?: PageCategory[];
  // Frontend-only derived metadata
  page_role?: PageRole;
  page_source?: PageSource;
}

// Page creation wizard data
export interface PageCreationData {
  page_type: PageType;
  template_type: TemplateType;
  title: string;
  slug: string;
  parent_id?: number | null;
  is_main_nav: boolean;
  is_enabled?: boolean;
  is_required?: boolean;
  nav_placement?: NavPlacement;
  nav_style?: NavStyle;
  nav_parent_id?: number | null;
  nav_order?: number;
  nav_label?: string;
  is_external_link?: boolean;
  navigation_assignments?: PageNavigationAssignment[];
  is_published?: boolean;
  meta_description?: string;
  meta_keywords?: string;
  content?: string; // Added for AI-generated content
  website_id?: number; // Added for API compatibility
  category_ids?: number[]; // Added for category relationships
}

export interface InitialPageDraft {
  slug: string;
  title: string;
  is_published?: boolean;
  is_main_nav?: boolean;
  is_enabled?: boolean;
  nav_placement?: NavPlacement;
  nav_style?: NavStyle;
  nav_parent_id?: number | null;
  navigation_assignments?: PageNavigationAssignment[];
  page_type?: PageType;
  template_type?: TemplateType;
  parent_id?: number | null;
}

export interface FormData {
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
  title: string;
  slug: string;
  altText?: string; // Optional for image metadata
  caption?: string; // Optional for image metadata
}

export interface FormErrors {
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
  title: string;
  slug: string;
}

export interface SelectOption {
  value: number;
  label: string;
}

export interface ImageUploadLocation {
  table: string;
  id: number;
  idFieldName?: string; // Optional, used for specific cases like page images
}
