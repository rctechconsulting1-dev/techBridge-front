/**
 * Intake questionnaire configuration.
 *
 * Defines the questions shown to each tenant using the universal onboarding profile.
 * The email template in email-templates.ts shows a preview; this file drives
 * the actual interactive form at /intake.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "file"
  | "multifile"
  | "boolean"
  | "number";

export interface IntakeQuestion {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** S3 upload category for file questions. */
  uploadCategory?: string;
  /** Maximum files for multifile type. */
  maxFiles?: number;
  /** Accept attribute for file inputs. */
  accept?: string;
}

export interface IntakeSection {
  id: string;
  title: string;
  description?: string;
  questions: IntakeQuestion[];
}

export type BusinessType =
  | "universal"
  | "lead_gen_services"
  | "appointments"
  | "ecommerce"
  | "reservations"
  | "hybrid_local";

// ─── Universal questions ──────────────────────────────────────────────────────

const UNIVERSAL_ABOUT: IntakeSection = {
  id: "about",
  title: "About Your Business",
  description: "Tell us the basics so we can get your site started.",
  questions: [
    {
      id: "business_name",
      label: "What is your full business name?",
      type: "text",
      required: true,
      placeholder: "e.g. Smith's Plumbing LLC",
    },
    {
      id: "owner_name",
      label: "What is your name, and what do you like to be called?",
      type: "text",
      required: true,
      placeholder: "e.g. John Smith — goes by John",
    },
    {
      id: "location",
      label: "What city/area are you based in?",
      type: "text",
      required: true,
      placeholder: "e.g. Sacramento, CA",
    },
    {
      id: "service_area",
      label: "Do you serve customers in-person, virtually, or both?",
      type: "select",
      required: true,
      options: [
        { value: "in_person", label: "In-person only" },
        { value: "virtual", label: "Virtual / remote only" },
        { value: "both", label: "Both in-person and virtual" },
      ],
    },
    {
      id: "years_in_business",
      label: "How long have you been in business?",
      type: "text",
      placeholder: "e.g. 5 years, Just starting out",
    },
    {
      id: "credentials",
      label: "Any certifications, licenses, or credentials to highlight?",
      type: "textarea",
      placeholder: "e.g. Licensed contractor #12345, NASM Certified",
    },
    {
      id: "ideal_client",
      label: "Who is your ideal client or customer?",
      type: "textarea",
      required: true,
      placeholder: "e.g. Homeowners in need of emergency plumbing repairs",
    },
    {
      id: "differentiator",
      label: "What makes you different from competitors in your area?",
      type: "textarea",
      placeholder: "e.g. Same-day service, 20 years of experience, family-owned",
    },
    {
      id: "tagline",
      label: "Do you have an existing slogan or tagline?",
      type: "text",
      placeholder: "e.g. \"Reliable repairs, every time\" — leave blank if you don't have one",
      hint: "If you don't have one, we can help create one based on your brand.",
    },
    {
      id: "topics_to_avoid",
      label: "Are there services, topics, or competitors we should NOT mention on your site?",
      type: "textarea",
      placeholder: "e.g. We no longer offer pool service, don't mention Brand X",
    },
  ],
};

const UNIVERSAL_BRAND: IntakeSection = {
  id: "brand",
  title: "Your Brand",
  description: "Help us match your website to your brand identity.",
  questions: [
    {
      id: "logo",
      label: "Upload your logo (PNG or SVG, transparent background preferred)",
      type: "file",
      uploadCategory: "logo",
      accept: "image/png,image/svg+xml,image/jpeg,image/webp",
      hint: "If you don't have a logo yet, we can help create one.",
    },
    {
      id: "headshot",
      label: "A professional photo of yourself or your team",
      type: "file",
      uploadCategory: "team",
      accept: "image/*",
      hint: "High-res, good lighting preferred.",
    },
    {
      id: "brand_colors",
      label: "What colors feel like 'you'?",
      type: "text",
      placeholder: "e.g. bold blue and white, earthy green and tan",
    },
    {
      id: "brand_words",
      label: "Three words that describe your brand or service style",
      type: "text",
      required: true,
      placeholder: "e.g. reliable, modern, friendly",
    },
  ],
};

const UNIVERSAL_MEDIA: IntakeSection = {
  id: "media",
  title: "Photos & Media",
  description: "Upload photos that show off your work. We'll use these on your site.",
  questions: [
    {
      id: "work_photos",
      label: "Photos of your work, products, or workspace",
      type: "multifile",
      uploadCategory: "work",
      accept: "image/*",
      maxFiles: 20,
      hint: "5–15 photos recommended. Before/after shots are great!",
    },
    {
      id: "video_links",
      label: "Any video content, testimonials, or promo clips?",
      type: "textarea",
      placeholder: "Paste YouTube, Vimeo, or other video links here",
    },
    {
      id: "existing_testimonials",
      label: "Do you have any existing testimonials or reviews you'd like us to use?",
      type: "textarea",
      placeholder: "Paste review text, customer quotes, or share a link to your reviews",
      hint: "These can be from Google, Yelp, Facebook, or any other platform.",
    },
  ],
};

const UNIVERSAL_CONTACT: IntakeSection = {
  id: "contact",
  title: "Contact & Business Info",
  description: "A few quick details to make sure we set everything up correctly.",
  questions: [
    {
      id: "business_phone",
      label: "What is your primary business phone number?",
      type: "text",
      required: true,
      placeholder: "e.g. (916) 555-1234",
    },
    {
      id: "email_preference",
      label: "How would you like to handle your business email?",
      type: "select",
      required: true,
      options: [
        { value: "company_email", label: "I'd like a company email (e.g. john@yourbusiness.com)" },
        { value: "bring_own", label: "I'll use my own existing email" },
        { value: "undecided", label: "Not sure yet" },
      ],
    },
    {
      id: "has_insurance",
      label: "Are you licensed and insured?",
      type: "select",
      options: [
        { value: "yes_both", label: "Yes, licensed and insured" },
        { value: "insured_only", label: "Insured only" },
        { value: "licensed_only", label: "Licensed only" },
        { value: "no", label: "No" },
        { value: "not_applicable", label: "Not applicable for my business" },
      ],
      hint: "Many clients look for this — we can feature it on your site.",
    },
    {
      id: "business_address",
      label: "What is your business address?",
      type: "text",
      placeholder: "e.g. 123 Main St, Sacramento, CA 95814 — or \"Mobile / service area only\"",
      hint: "Used for Google Maps, schema markup, and local SEO. If you don't have a storefront, just say mobile or service-area only.",
    },
    {
      id: "content_approval_contact",
      label: "Who should we contact for content approvals and edits?",
      type: "text",
      placeholder: "e.g. John Smith — john@yourbusiness.com — (916) 555-1234",
      hint: "This is the person we'll reach out to when we need sign-off on copy or design decisions.",
    },
  ],
};

// ─── Universal offerings questions ───────────────────────────────────────────

const UNIVERSAL_OFFERINGS: IntakeSection = {
  id: "services",
  title: "Services, Products & Booking",
  description: "Tell us what you offer and how customers buy, book, or contact you.",
  questions: [
    {
      id: "primary_offerings",
      label: "What are your main services, products, or reservation types?",
      type: "textarea",
      required: true,
      placeholder: "List the main things customers can buy, book, or hire you for.",
    },
    {
      id: "pricing_packages",
      label: "Share any pricing, packages, subscriptions, or add-ons we should know about",
      type: "textarea",
      placeholder: "Include starting prices, bundles, memberships, deposits, or special offers.",
    },
    {
      id: "customer_action",
      label: "What is the main action you want visitors to take?",
      type: "multiselect",
      options: [
        { value: "call", label: "Call" },
        { value: "contact_form", label: "Submit contact form" },
        { value: "book_appointment", label: "Book appointment" },
        { value: "make_reservation", label: "Make reservation" },
        { value: "buy_online", label: "Buy online" },
        { value: "visit_location", label: "Visit location" },
      ],
    },
    {
      id: "fulfillment_details",
      label: "How do you currently deliver, fulfill, or book this work?",
      type: "textarea",
      placeholder: "Explain your booking flow, checkout flow, delivery area, shipping, pickup, or service process.",
    },
    {
      id: "hours_service_area",
      label: "What are your hours, service area, or location details?",
      type: "textarea",
      placeholder: "Include business hours, service radius, neighborhoods, or physical address details.",
    },
    {
      id: "policies_guarantees",
      label: "Any policies, guarantees, deposits, cancellations, returns, or warranties to highlight?",
      type: "textarea",
      placeholder: "Share the important trust and policy details customers should see before they contact or buy.",
    },
  ],
};
// ─── Online presence section ─────────────────────────────────────────────────

const UNIVERSAL_PLATFORMS: IntakeSection = {
  id: "platforms",
  title: "Online Presence & Platforms",
  description: "Help us connect and sync all your existing online accounts.",
  questions: [
    {
      id: "google_business_url",
      label: "Do you have a Google Business Profile? Paste the URL or name.",
      type: "text",
      placeholder: "e.g. https://g.page/your-business or \"RnR Electric Sacramento\"",
      hint: "To connect your profile, please grant Manager access to rctechsolutions1@gmail.com in your Google Business settings. This lets us manage reviews, posts, and performance data on your behalf.",
    },
    {
      id: "facebook_url",
      label: "Facebook business page URL",
      type: "text",
      placeholder: "e.g. https://www.facebook.com/yourbusiness",
    },
    {
      id: "instagram_url",
      label: "Instagram profile URL or handle",
      type: "text",
      placeholder: "e.g. https://www.instagram.com/yourbusiness or @yourbusiness",
    },
    {
      id: "yelp_url",
      label: "Yelp profile URL",
      type: "text",
      placeholder: "e.g. https://www.yelp.com/biz/your-business",
    },
    {
      id: "other_review_platforms",
      label: "Any other review or directory profiles? (Angi, Thumbtack, BBB, HomeAdvisor, etc.)",
      type: "textarea",
      placeholder: "Paste links or names of any other profiles you have",
    },
    {
      id: "has_google_ads",
      label: "Are you currently running Google Ads or Local Services Ads (LSA)?",
      type: "select",
      options: [
        { value: "yes_google_ads", label: "Yes, Google Search Ads" },
        { value: "yes_lsa", label: "Yes, Local Services Ads (LSA / Google Guaranteed)" },
        { value: "yes_both", label: "Yes, both" },
        { value: "no", label: "No, not currently" },
        { value: "interested", label: "No, but I'm interested" },
      ],
      hint: "We'll use this to align your landing pages and CTAs with your ad strategy.",
    },
    {
      id: "existing_booking_software",
      label: "Do you currently use any booking, scheduling, or CRM software?",
      type: "text",
      placeholder: "e.g. Jobber, ServiceTitan, Calendly, Housecall Pro, Square, or None",
      hint: "We'll make sure our booking integration doesn't conflict with what you already use.",
    },
  ],
};

// ─── Launch & setup section ───────────────────────────────────────────────────

const UNIVERSAL_SETUP: IntakeSection = {
  id: "setup",
  title: "Website Setup & Launch",
  description: "A few technical details to get your site live without any delays.",
  questions: [
    {
      id: "existing_website_url",
      label: "Do you have an existing website we should reference or pull content from?",
      type: "text",
      placeholder: "e.g. https://www.youroldbusiness.com — or leave blank if none",
      hint: "If you have an existing site, we can save a lot of time by reusing approved copy and photos.",
    },
    {
      id: "existing_domain",
      label: "Do you have a domain name you want to use for your new site?",
      type: "text",
      placeholder: "e.g. yourbusiness.com — or \"No, I need one\" or \"Not sure\"",
    },
    {
      id: "domain_registrar",
      label: "Who is your domain registrar (where you bought the domain)?",
      type: "text",
      placeholder: "e.g. GoDaddy, Namecheap, Google Domains, Squarespace — or \"Not sure\"",
      hint: "We'll walk you through the DNS changes needed to point your domain to your new site.",
    },
    {
      id: "target_go_live",
      label: "When do you want your site to go live?",
      type: "text",
      placeholder: "e.g. ASAP, within 2 weeks, by May 1st — or \"Flexible\"",
    },
  ],
};

// ─── Section builder ──────────────────────────────────────────────────────────

function getOfferingsSection(_profile: BusinessType): IntakeSection {
  return UNIVERSAL_OFFERINGS;
}

export function getIntakeSections(businessType: BusinessType = "universal"): IntakeSection[] {
  return [
    UNIVERSAL_ABOUT,
    UNIVERSAL_BRAND,
    getOfferingsSection(businessType),
    UNIVERSAL_PLATFORMS,
    UNIVERSAL_MEDIA,
    UNIVERSAL_CONTACT,
    UNIVERSAL_SETUP,
  ];
}

/** Flat list of all question IDs for the intake profile. Useful for validation. */
export function getAllQuestionIds(businessType: BusinessType): string[] {
  return getIntakeSections(businessType).flatMap((s) =>
    s.questions.map((q) => q.id),
  );
}

export function getQuestionLabelMap(
  businessType: BusinessType,
): Record<string, string> {
  return Object.fromEntries(
    getIntakeSections(businessType)
      .flatMap((section) => section.questions)
      .map((question) => [question.id, question.label]),
  );
}

/** Human-readable label for the intake profile. */
export function getBusinessTypeLabel(businessType: BusinessType): string {
  const labels: Record<BusinessType, string> = {
    universal: "Universal Website Intake",
    lead_gen_services: "Service Business",
    appointments: "Appointment-Based Business",
    ecommerce: "Online Store",
    reservations: "Reservation / Hospitality",
    hybrid_local: "Local Business",
  };
  return labels[businessType] ?? labels.universal;
}
