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

export interface IntakeQuestionCondition {
  questionId: string;
  /** Question must currently equal this value (for select/boolean/text). */
  equals?: string | boolean;
  /** Question's array value must currently include this option (for multiselect). */
  includes?: string;
}

export interface IntakeQuestionOption {
  value: string;
  label: string;
  /** Only offered if the tenant's enabled modules include at least one of these. */
  requiredModules?: string[];
}

export interface IntakeQuestion {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: IntakeQuestionOption[];
  /** S3 upload category for file questions. */
  uploadCategory?: string;
  /** Maximum files for multifile type. */
  maxFiles?: number;
  /** Accept attribute for file inputs. */
  accept?: string;
  /** Only rendered if the tenant's enabled modules include at least one of these. */
  requiredModules?: string[];
  /** Hidden if the tenant's enabled modules include any of these (used for "neither" fallback questions). */
  excludedModules?: string[];
  /** Only rendered once another question in the same section currently matches this condition. */
  showIf?: IntakeQuestionCondition;
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

// ─── Visibility helpers ───────────────────────────────────────────────────────

function questionModulesMatch(question: IntakeQuestion, modules: string[]): boolean {
  if (question.requiredModules && question.requiredModules.length > 0) {
    if (!question.requiredModules.some((m) => modules.includes(m))) return false;
  }
  if (question.excludedModules && question.excludedModules.length > 0) {
    if (question.excludedModules.some((m) => modules.includes(m))) return false;
  }
  return true;
}

function filterOptionsForModules(
  options: IntakeQuestionOption[] | undefined,
  modules: string[],
): IntakeQuestionOption[] | undefined {
  if (!options) return options;
  return options.filter(
    (opt) => !opt.requiredModules || opt.requiredModules.length === 0 || opt.requiredModules.some((m) => modules.includes(m)),
  );
}

/** Evaluates a question's showIf against the form's current live answers. Used at render time — module filtering happens earlier, in getIntakeSections. */
export function isQuestionCurrentlyVisible(
  question: IntakeQuestion,
  answers: Record<string, string | string[] | boolean | number | null | undefined>,
): boolean {
  if (!question.showIf) return true;
  const actual = answers[question.showIf.questionId];
  if (question.showIf.equals !== undefined) {
    return actual === question.showIf.equals;
  }
  if (question.showIf.includes !== undefined) {
    return Array.isArray(actual) && actual.includes(question.showIf.includes);
  }
  return true;
}

// ─── About Your Business ──────────────────────────────────────────────────────

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
      type: "select",
      options: [
        { value: "under_1", label: "Less than 1 year" },
        { value: "1_to_3", label: "1-3 years" },
        { value: "3_to_10", label: "3-10 years" },
        { value: "over_10", label: "10+ years" },
      ],
    },
    {
      id: "has_credentials",
      label: "Any certifications, licenses, or credentials to highlight?",
      type: "boolean",
    },
    {
      id: "credentials_details",
      label: "List them out",
      type: "textarea",
      placeholder: "e.g. Licensed contractor #12345, NASM Certified",
      showIf: { questionId: "has_credentials", equals: true },
    },
    {
      id: "ideal_client",
      label: "Who is your ideal client or customer?",
      type: "textarea",
      required: true,
      placeholder: "e.g. Homeowners in need of emergency plumbing repairs",
    },
    {
      id: "topics_to_avoid_details",
      label: "Are there services, topics, or competitors we should NOT mention on your site?",
      type: "textarea",
      placeholder: "e.g. We no longer offer pool service, don't mention Brand X",
    },
  ],
};


// ─── Photos & Media ────────────────────────────────────────────────────────────

const UNIVERSAL_MEDIA: IntakeSection = {
  id: "media",
  title: "Photos & Media",
  description:
    "Add photos of your work to the shared folder we sent you — we'll use these on your site.",
  questions: [
    {
      id: "has_video_content",
      label: "Any video content, testimonials, or promo clips?",
      type: "boolean",
    },
    {
      id: "video_links",
      label: "Share the links",
      type: "textarea",
      placeholder: "Paste YouTube, Vimeo, or other video links here",
      showIf: { questionId: "has_video_content", equals: true },
    }
  ],
};

// ─── Services, Products & Booking ─────────────────────────────────────────────

const UNIVERSAL_OFFERINGS: IntakeSection = {
  id: "services",
  title: "Services, Products & Booking",
  description: "Tell us what you offer and how customers buy, book, or contact you.",
  questions: [
    {
      id: "pricing_packages",
      label: "Share your pricing, packages, subscriptions, or add-ons",
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
        { value: "book_appointment", label: "Book appointment", requiredModules: ["calendar_appointments"] },
        { value: "make_reservation", label: "Make reservation", requiredModules: ["reservations"] },
        { value: "buy_online", label: "Buy online", requiredModules: ["checkout_ecommerce"] },
        { value: "visit_location", label: "Visit location" },
      ],
    },
    {
      id: "fulfillment_ecommerce",
      label: "How do you fulfill orders?",
      type: "multiselect",
      requiredModules: ["checkout_ecommerce"],
      options: [
        { value: "ship", label: "Ship products" },
        { value: "local_pickup", label: "Local pickup" },
        { value: "digital_delivery", label: "Digital delivery" },
        { value: "in_person", label: "In-person handoff" },
      ],
    },
    {
      id: "fulfillment_booking",
      label: "Describe your booking flow",
      type: "textarea",
      requiredModules: ["calendar_appointments", "reservations"],
      placeholder: "Explain how customers pick a time, what happens after they book, cancellation window, etc.",
    }
  ],
};

// ─── Online Presence & Platforms ──────────────────────────────────────────────

const UNIVERSAL_PLATFORMS: IntakeSection = {
  id: "platforms",
  title: "Online Presence & Platforms",
  description: "Help us connect and sync all your existing online accounts.",
  questions: [
    {
      id: "has_google_business",
      label: "Do you have a Google Business Profile?",
      type: "boolean",
    },
    {
      id: "google_business_url",
      label: "Paste the URL or name",
      type: "text",
      placeholder: "e.g. https://g.page/your-business or \"RnR Electric Sacramento\"",
      hint: "To connect your profile, please grant Manager access to rctechsolutions1@gmail.com in your Google Business settings. This lets us manage reviews, posts, and performance data on your behalf.",
      showIf: { questionId: "has_google_business", equals: true },
    },
    {
      id: "has_facebook",
      label: "Do you have a Facebook business page?",
      type: "boolean",
    },
    {
      id: "facebook_url",
      label: "Facebook page URL",
      type: "text",
      placeholder: "e.g. https://www.facebook.com/yourbusiness",
      showIf: { questionId: "has_facebook", equals: true },
    },
    {
      id: "has_instagram",
      label: "Do you have an Instagram profile?",
      type: "boolean",
    },
    {
      id: "instagram_url",
      label: "Instagram URL or handle",
      type: "text",
      placeholder: "e.g. https://www.instagram.com/yourbusiness or @yourbusiness",
      showIf: { questionId: "has_instagram", equals: true },
    },
    {
      id: "has_yelp",
      label: "Do you have a Yelp profile?",
      type: "boolean",
    },
    {
      id: "yelp_url",
      label: "Yelp profile URL",
      type: "text",
      placeholder: "e.g. https://www.yelp.com/biz/your-business",
      showIf: { questionId: "has_yelp", equals: true },
    },
    {
      id: "has_other_review_platforms",
      label: "Any other review or directory profiles? (Angi, Thumbtack, BBB, HomeAdvisor, etc.)",
      type: "boolean",
    },
    {
      id: "other_review_platforms",
      label: "List them",
      type: "textarea",
      placeholder: "Paste links or names of any other profiles you have",
      showIf: { questionId: "has_other_review_platforms", equals: true },
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
      type: "select",
      options: [
        { value: "jobber", label: "Jobber" },
        { value: "servicetitan", label: "ServiceTitan" },
        { value: "calendly", label: "Calendly" },
        { value: "housecall_pro", label: "Housecall Pro" },
        { value: "square", label: "Square" },
        { value: "none", label: "None" },
        { value: "other", label: "Other" },
      ],
      hint: "We'll make sure our booking integration doesn't conflict with what you already use.",
    },
    {
      id: "existing_booking_software_other",
      label: "What software do you use?",
      type: "text",
      showIf: { questionId: "existing_booking_software", equals: "other" },
    },
  ],
};

// ─── Contact & Business Info ───────────────────────────────────────────────────

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
      id: "has_physical_address",
      label: "Do you have a physical storefront or office?",
      type: "select",
      options: [
        { value: "yes", label: "Yes, we have a storefront/office" },
        { value: "no", label: "No, mobile or service-area only" },
      ],
      hint: "Used for Google Maps, schema markup, and local SEO.",
    },
    {
      id: "business_address",
      label: "What is your business address?",
      type: "text",
      placeholder: "e.g. 123 Main St, Sacramento, CA 95814",
      showIf: { questionId: "has_physical_address", equals: "yes" },
    }
  ],
};

// ─── Website Setup & Launch ─────────────────────────────────────────────────────

const UNIVERSAL_SETUP: IntakeSection = {
  id: "setup",
  title: "Website Setup & Launch",
  description: "A few technical details to get your site live without any delays.",
  questions: [
    {
      id: "has_existing_website",
      label: "Do you have an existing website we should reference or pull content from?",
      type: "boolean",
      hint: "If you have an existing site, we can save a lot of time by reusing approved copy and photos.",
    },
    {
      id: "existing_website_url",
      label: "What's the URL?",
      type: "text",
      placeholder: "e.g. https://www.youroldbusiness.com",
      showIf: { questionId: "has_existing_website", equals: true },
    },
    {
      id: "existing_domain_status",
      label: "Do you have a domain name you want to use for your new site?",
      type: "select",
      options: [
        { value: "already_own", label: "Yes, I already own one" },
        { value: "need_one", label: "No, I need one" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    {
      id: "existing_domain_name",
      label: "What's the domain?",
      type: "text",
      placeholder: "e.g. yourbusiness.com",
      showIf: { questionId: "existing_domain_status", equals: "already_own" },
    },
    {
      id: "domain_registrar",
      label: "Who is your domain registrar (where you bought the domain)?",
      type: "select",
      options: [
        { value: "godaddy", label: "GoDaddy" },
        { value: "namecheap", label: "Namecheap" },
        { value: "google_domains", label: "Google Domains" },
        { value: "squarespace", label: "Squarespace" },
        { value: "wix", label: "Wix" },
        { value: "not_sure", label: "Not sure" },
        { value: "other", label: "Other" },
      ],
      hint: "We'll walk you through the DNS changes needed to point your domain to your new site.",
      showIf: { questionId: "existing_domain_status", equals: "already_own" },
    },
    {
      id: "domain_registrar_other",
      label: "Which registrar?",
      type: "text",
      showIf: { questionId: "domain_registrar", equals: "other" },
    },
    {
      id: "target_go_live_date",
      label: "What date?",
      type: "text",
      placeholder: "e.g. May 1st",
      showIf: { questionId: "target_go_live", equals: "specific_date" },
    },
  ],
};

// ─── Section builder ──────────────────────────────────────────────────────────

function getOfferingsSection(_profile: BusinessType): IntakeSection {
  return UNIVERSAL_OFFERINGS;
}

function getAllSections(businessType: BusinessType): IntakeSection[] {
  return [
    UNIVERSAL_ABOUT,
    getOfferingsSection(businessType),
    UNIVERSAL_PLATFORMS,
    UNIVERSAL_MEDIA,
    UNIVERSAL_CONTACT,
    UNIVERSAL_SETUP,
  ];
}

/**
 * Sections/questions filtered to what a tenant with this module list should
 * actually be asked. This is the function the live /intake page renders from.
 */
export function getIntakeSections(
  businessType: BusinessType = "universal",
  modules: string[] = [],
): IntakeSection[] {
  return getAllSections(businessType).map((section) => ({
    ...section,
    questions: section.questions
      .filter((q) => questionModulesMatch(q, modules))
      .map((q) => ({ ...q, options: filterOptionsForModules(q.options, modules) })),
  }));
}

/**
 * Flat list of every possible question ID, ignoring module filtering — used
 * for admin-side display of already-submitted answers (onboarding/page.tsx),
 * where a question's presence in the label map must not depend on whether
 * today's module list happens to include it.
 */
export function getAllQuestionIds(businessType: BusinessType): string[] {
  return getAllSections(businessType).flatMap((s) => s.questions.map((q) => q.id));
}

export function getQuestionLabelMap(
  businessType: BusinessType,
): Record<string, string> {
  return Object.fromEntries(
    getAllSections(businessType)
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
