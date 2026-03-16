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
  is_published: boolean;
  is_main_nav: boolean;
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
}

// Page creation wizard data
export interface PageCreationData {
  page_type: PageType;
  template_type: TemplateType;
  title: string;
  slug: string;
  parent_id?: number | null;
  is_main_nav: boolean;
  is_published?: boolean;
  meta_description?: string;
  meta_keywords?: string;
  content?: string; // Added for AI-generated content
  website_id?: number; // Added for API compatibility
  category_ids?: number[]; // Added for category relationships
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
