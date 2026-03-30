"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { getApiBaseUrl } from "@/lib/api";
import {
  decodeJwtPayload,
  getActiveTenantId,
  getStoredAuthToken,
  normalizeAuthSession,
} from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";
import { useGetAssets, type Asset } from "@/hooks/useImage";
import { useContentAgent } from "@/hooks/useContentAgent";
import type { SiteSettings, FooterNavLink } from "@/lib/cms-types";
import EntitlementGate from "@/components/common/EntitlementGate";
import {
  normalizePermissionFlags,
  type PresetPermissionKey,
} from "@/lib/onboarding-presets";

// ─── Types ───────────────────────────────────────────────────────────────────

type FormData = Partial<
  Omit<
    SiteSettings,
    "id" | "website_id" | "created_at" | "updated_at"
  >
>;

interface Service {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  image_url: string | null;
}

interface Product {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  price: string;
  compare_at_price: string | null;
  image_url: string | null;
  stock_quantity: number;
  is_published: boolean;
  sort_order: number;
  average_rating: string;
  review_count: number;
}

type StripeConnectStatus = {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  error?: string;
};

type DnsRecord = {
  type: string;
  name: string;
  value: string;
  reason?: string;
};

type DomainRecord = {
  id: number | null;
  domain: string;
  status: string;
  isPrimary: boolean;
  verificationType: string | null;
  verificationTarget: string | null;
  failureReason: string | null;
  updatedAt: string | null;
  dnsRecords?: DnsRecord[];
  vercelVerified?: boolean;
};

type EmailDeliveryProfile = {
  available: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  sendingDomain: string;
  dkimVerified: boolean;
  spfVerified: boolean;
  leadNotificationEmails: string[];
  verificationNotes: string | null;
  verificationLastCheckedAt: string | null;
  updatedAt: string | null;
  emailMode: "platform_sender" | "tenant_branded";
  lastTestEmailStatus: "success" | "failed" | null;
  lastTestEmailTo: string | null;
  lastTestEmailSender: string | null;
  lastTestEmailError: string | null;
  lastTestEmailAt: string | null;
};

interface TeamMember {
  id: number;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
}

interface CmsPageLite {
  slug: string | null;
  is_published: boolean;
}

type Tab = "settings" | "services" | "team" | "shop";
type LaunchMode = "temporary_launch" | "final_domain";
type EmailMode = "platform_sender" | "tenant_branded";
type IndustryTemplate =
  | "trades"
  | "services"
  | "ecommerce"
  | "restaurants"
  | "healthcare-wellness";
type VisualDirection = "bold" | "clean" | "warm";
type CopyAngle = "results" | "trust" | "community";
type HeroStyle = "direct" | "question";
type OfferType = "free-consult" | "trial" | "quote" | "book-now";

type TemplateServiceDraft = {
  title: string;
  content: string;
};

type TemplateDraft = {
  settings: Partial<FormData>;
  services: TemplateServiceDraft[];
  teamMember: {
    name: string;
    title: string;
    bio: string;
  };
};

const HEADER_NAV_TEMPLATES: Record<IndustryTemplate, FooterNavLink[]> = {
  trades: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Why Us", href: "#why-us" },
    { label: "FAQ", href: "#faq" },
    { label: "Reviews", href: "#reviews" },
    { label: "Contact", href: "#contact" },
  ],
  services: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "About", href: "/about" },
    { label: "Case Studies", href: "#case-studies" },
    { label: "Contact", href: "#contact" },
  ],
  ecommerce: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "New Arrivals", href: "#new-arrivals" },
    { label: "Best Sellers", href: "#best-sellers" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "#contact" },
  ],
  restaurants: [
    { label: "Home", href: "/" },
    { label: "Browse Menu", href: "#menu" },
    { label: "Locations", href: "#locations" },
    { label: "Reservations", href: "#reservations" },
    { label: "Rewards", href: "#rewards" },
    { label: "Contact", href: "#contact" },
  ],
  "healthcare-wellness": [
    { label: "Home", href: "/" },
    { label: "Find a Club", href: "#locations" },
    { label: "Training", href: "/services" },
    { label: "Membership", href: "#membership" },
    { label: "Free Pass", href: "#free-pass" },
    { label: "Contact", href: "#contact" },
  ],
};

const DEFAULT_FOOTER_LINKS: FooterNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "#contact" },
];

type AIContentIdea = {
  idea: string;
  keywordTargets?: string[];
};

type AIServiceCopyResponse = {
  step?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  ctaHeadline?: string;
  ctaBody?: string;
  services?: Array<{
    title: string;
    slug?: string;
    description: string;
  }>;
};

type AIAboutCopyResponse = {
  step?: string;
  aboutHeadline?: string;
  aboutBody?: string;
  teamName?: string;
  teamTitle?: string;
  teamBio?: string;
  contactCtaHeadline?: string;
  contactCtaBody?: string;
};

// ─── Style constants ──────────────────────────────────────────────────────────

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";
const SECTION =
  "rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900";
const SECTION_TITLE =
  "mb-4 text-base font-semibold text-gray-800 dark:text-white";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("auth_token")
    : null;
}

function authHeaders() {
  const t = getToken();
  const activeTenantId = getActiveTenantId();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(activeTenantId ? { "x-tenant-id": String(activeTenantId) } : {}),
  };
}

function hasPlatformAdminOverride() {
  const token = getStoredAuthToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  const session = normalizeAuthSession(null, payload);
  return session.role === "admin" || session.role === "platform_admin";
}

const DEFAULT_CONTENT_PERMISSION_FLAGS: Record<PresetPermissionKey, boolean> = {
  edit_homepage: true,
  edit_services: true,
  edit_team: true,
  edit_faq: true,
  edit_branding: true,
  manage_domains: true,
  manage_integrations: true,
  manage_billing: true,
};

const RC_TEMPORARY_HOST_SUFFIXES = [
  ".rctechbridge.com",
  ".preview.rctechbridge.com",
  ".vercel.app",
];

const isTemporaryWebsiteHost = (domain: string | null | undefined): boolean => {
  const normalized = domain?.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return RC_TEMPORARY_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};

const isLikelyPlatformSender = (value: string | null | undefined): boolean => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("rctechbridge") ||
    normalized.includes("noreply@") ||
    normalized.includes("mg.")
  );
};

const launchModeLabel = (value: LaunchMode): string =>
  value === "final_domain" ? "Final Domain Launch" : "Temporary Launch";

const emailModeLabel = (value: EmailMode | "not_configured"): string => {
  if (value === "tenant_branded") {
    return "Tenant Branded";
  }

  if (value === "platform_sender") {
    return "Platform Sender";
  }

  return "Not Configured";
};

function pickValue(current: string | null | undefined, next: string, force: boolean) {
  if (force) return next;
  return current && current.trim().length > 0 ? current : next;
}

function buildTemplateDraft({
  industry,
  businessName,
  city,
  phone,
  email,
  visualDirection,
  copyAngle,
  heroStyle,
  offerType,
}: {
  industry: IndustryTemplate;
  businessName: string;
  city: string;
  phone: string;
  email: string;
  visualDirection: VisualDirection;
  copyAngle: CopyAngle;
  heroStyle: HeroStyle;
  offerType: OfferType;
}): TemplateDraft {
  const safeBusinessName = businessName.trim() || "Your Business";
  const safeCity = city.trim() || "your area";

  const toneByAngle: Record<CopyAngle, string> = {
    results: "clear outcomes and measurable progress",
    trust: "reliability, transparency, and long-term confidence",
    community: "friendly relationships and local connection",
  };

  const offerByType: Record<
    OfferType,
    { ctaText: string; ctaHeadline: string; ctaBody: string }
  > = {
    "free-consult": {
      ctaText: "Book a Free Consultation",
      ctaHeadline: "Get expert guidance with zero pressure",
      ctaBody:
        "Tell us your goals and get a clear recommendation tailored to your needs.",
    },
    trial: {
      ctaText: "Start Your Free Trial",
      ctaHeadline: "Try us before you commit",
      ctaBody:
        "Experience our service firsthand and decide if it is the right fit for you.",
    },
    quote: {
      ctaText: "Get a Fast Quote",
      ctaHeadline: "Need pricing today?",
      ctaBody:
        "Share a few details and we will send a transparent estimate with next steps.",
    },
    "book-now": {
      ctaText: "Book Now",
      ctaHeadline: "Reserve your spot today",
      ctaBody:
        "Pick a convenient time and our team will take care of the rest.",
    },
  };

  const colorsByDirection: Record<
    VisualDirection,
    { primary: string; secondary: string; accent: string }
  > = {
    bold: { primary: "#111827", secondary: "#F9FAFB", accent: "#D97706" },
    clean: { primary: "#1F2937", secondary: "#FFFFFF", accent: "#2563EB" },
    warm: { primary: "#78350F", secondary: "#FFFBEB", accent: "#DC2626" },
  };

  const byIndustry: Record<
    IndustryTemplate,
    {
      heroHeadline: string;
      heroSubheadline: string;
      ctaHeadline: string;
      ctaBody: string;
      services: TemplateServiceDraft[];
    }
  > = {
    trades: {
      heroHeadline: `Trusted ${safeBusinessName} in ${safeCity}`,
      heroSubheadline:
        "Fast response, quality workmanship, and transparent pricing for homes and small businesses.",
      ctaHeadline: "Need a quote today?",
      ctaBody:
        "Tell us what you need and we will follow up quickly with a clear estimate and next steps.",
      services: [
        {
          title: "Installation Services",
          content:
            "Professional installations done safely and efficiently with quality materials and clean finishes.",
        },
        {
          title: "Repairs and Maintenance",
          content:
            "From quick fixes to ongoing maintenance plans, we keep your systems running reliably.",
        },
        {
          title: "Emergency Support",
          content:
            "Urgent issue? We provide responsive support to restore safety and comfort as fast as possible.",
        },
      ],
    },
    services: {
      heroHeadline: `${safeBusinessName}: Professional Services in ${safeCity}`,
      heroSubheadline:
        "Results-driven support tailored to your goals, with clear communication and dependable execution.",
      ctaHeadline: "Book your consultation",
      ctaBody:
        "Share your goals and challenges. We will recommend a practical plan designed for your business.",
      services: [
        {
          title: "Consulting",
          content:
            "Strategic guidance to help you make better decisions, improve operations, and accelerate growth.",
        },
        {
          title: "Implementation",
          content:
            "Hands-on execution that turns strategy into measurable outcomes with minimal disruption.",
        },
        {
          title: "Ongoing Support",
          content:
            "Continuous optimization and support to keep performance strong as your needs evolve.",
        },
      ],
    },
    ecommerce: {
      heroHeadline: `${safeBusinessName}: Shop Online in ${safeCity}`,
      heroSubheadline:
        "Quality products, easy checkout, and fast fulfillment backed by responsive customer support.",
      ctaHeadline: "Explore best sellers",
      ctaBody:
        "Discover customer favorites and new arrivals with secure checkout and reliable delivery.",
      services: [
        {
          title: "Featured Collections",
          content:
            "Curated collections designed to make shopping simple, relevant, and enjoyable.",
        },
        {
          title: "Fast Shipping",
          content:
            "Quick processing and dependable shipping options to get your order to you on time.",
        },
        {
          title: "Customer Care",
          content:
            "Friendly support for product questions, returns, and post-purchase assistance.",
        },
      ],
    },
    restaurants: {
      heroHeadline: `${safeBusinessName} in ${safeCity}`,
      heroSubheadline:
        "Fresh ingredients, memorable flavors, and a welcoming experience for every guest.",
      ctaHeadline: "Reserve a table or order online",
      ctaBody:
        "Join us for dine-in, takeout, or delivery. We make every order simple and delicious.",
      services: [
        {
          title: "Dine-In Experience",
          content:
            "Comfortable atmosphere and attentive service for lunch, dinner, and special occasions.",
        },
        {
          title: "Takeout and Delivery",
          content:
            "Enjoy your favorites at home with convenient ordering and reliable pickup or delivery.",
        },
        {
          title: "Catering",
          content:
            "Custom catering packages for office events, family gatherings, and celebrations.",
        },
      ],
    },
    "healthcare-wellness": {
      heroHeadline: `${safeBusinessName}: Personalized Care in ${safeCity}`,
      heroSubheadline:
        "Compassionate, evidence-based care focused on your comfort, confidence, and long-term wellness.",
      ctaHeadline: "Schedule your appointment",
      ctaBody:
        "Our team is here to guide you with attentive care, clear communication, and practical treatment options.",
      services: [
        {
          title: "Initial Consultation",
          content:
            "Comprehensive consultation to understand your goals, concerns, and personalized care plan.",
        },
        {
          title: "Ongoing Treatment",
          content:
            "Consistent, high-quality treatment tailored to your needs with progress-focused follow-ups.",
        },
        {
          title: "Preventive Wellness",
          content:
            "Proactive wellness services that support long-term health and reduce future risk factors.",
        },
      ],
    },
  };

  const profile = byIndustry[industry];
  const offer = offerByType[offerType];
  const colors = colorsByDirection[visualDirection];

  const baseHeadline = profile.heroHeadline;
  const angleSuffix = toneByAngle[copyAngle];
  const heroHeadline =
    heroStyle === "question"
      ? `Looking for ${industry.replace("-", " ")} support in ${safeCity}?`
      : baseHeadline;
  const heroSubheadline = `${profile.heroSubheadline} Built around ${angleSuffix}.`;

  return {
    settings: {
      hero_headline: heroHeadline,
      hero_subheadline: heroSubheadline,
      hero_cta_text: offer.ctaText,
      hero_cta_url: "/contact",
      cta_headline: offer.ctaHeadline || profile.ctaHeadline,
      cta_body: `${offer.ctaBody} ${profile.ctaBody}`,
      cta_button_text: offer.ctaText,
      cta_button_url: "/contact",
      primary_color: colors.primary,
      secondary_color: colors.secondary,
      accent_color: colors.accent,
      footer_tagline: `${safeBusinessName} serving ${safeCity}.`,
      footer_copyright: `Copyright ${safeBusinessName}`,
      contact_email: email.trim() || `hello@${safeBusinessName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
      contact_phone: phone.trim() || "(000) 000-0000",
      address: `${safeCity}`,
    },
    services: profile.services,
    teamMember: {
      name: safeBusinessName,
      title: "Owner / Founder",
      bio: `${safeBusinessName} is dedicated to serving ${safeCity} with reliable service and a customer-first approach.`,
    },
  };
}

function parseIdeas(data: unknown): AIContentIdea[] {
  const raw = data as
    | {
        ideas?: AIContentIdea[];
        content?: string | { ideas?: AIContentIdea[] };
      }
    | undefined;
  if (raw?.ideas && Array.isArray(raw.ideas)) return raw.ideas;
  if (typeof raw?.content === "string") {
    try {
      const parsed = JSON.parse(raw.content) as { ideas?: AIContentIdea[] };
      return parsed?.ideas ?? [];
    } catch {
      return [];
    }
  }
  return raw?.content && typeof raw.content === "object"
    ? (raw.content.ideas ?? [])
    : [];
}

function stripMarkdown(input: string): string {
  return input
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function extractIntro(markdown: string): string {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"));
  return stripMarkdown(lines[0] ?? "");
}

function extractServiceDrafts(markdown: string): TemplateServiceDraft[] {
  const headings = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, "").trim())
    .filter((line) => line.length > 0)
    .filter(
      (line) =>
        !/conclusion|faq|about|contact|summary|introduction/i.test(line),
    )
    .slice(0, 3);

  return headings.map((title) => ({
    title,
    content: `Learn more about our ${title.toLowerCase()} service and how it helps you achieve better outcomes.`,
  }));
}

function parseServicesInput(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function coerceNavLinks(links: FooterNavLink[] | null | undefined): FooterNavLink[] {
  if (!Array.isArray(links)) return [];
  return links.map((link) => ({
    label: typeof link?.label === "string" ? link.label : "",
    href: typeof link?.href === "string" ? link.href : "",
  }));
}

function sanitizeNavLinks(links: FooterNavLink[] | null | undefined): FooterNavLink[] {
  return coerceNavLinks(links).filter(
    (link) => link.label.trim().length > 0 && link.href.trim().length > 0,
  );
}

function normalizeNavFields(editable: FormData): FormData {
  const rawFooterLinks = (editable.footer_nav_links ?? []) as FooterNavLink[];
  const legacyCombined = sanitizeNavLinks(rawFooterLinks);
  const hasLegacyLocationTags = rawFooterLinks.some((link) => !!link.location);
  const legacyHeader = rawFooterLinks
    .filter((link) => link.location === "header")
    .map((link) => ({ label: link.label, href: link.href }));
  const legacyFooter = rawFooterLinks
    .filter((link) => link.location !== "header")
    .map((link) => ({ label: link.label, href: link.href }));

  const headerNavLinks = sanitizeNavLinks(editable.header_nav_links as FooterNavLink[] | null);
  const footerNavLinks = sanitizeNavLinks(editable.footer_nav_links as FooterNavLink[] | null);

  return {
    ...editable,
    header_nav_links:
      headerNavLinks.length > 0
        ? headerNavLinks
        : legacyHeader.length > 0
          ? legacyHeader
          : legacyCombined,
    footer_nav_links:
      hasLegacyLocationTags
        ? legacyFooter.length > 0
          ? legacyFooter
          : DEFAULT_FOOTER_LINKS
        : footerNavLinks.length > 0
        ? footerNavLinks
          : DEFAULT_FOOTER_LINKS,
  };
}

type NavLinkStatus = {
  tone: "ok" | "warn";
  message: string;
};

type LaunchChecklistItem = {
  key: string;
  label: string;
  satisfied: boolean;
  detail: string;
};

const SAFE_ANCHORS = new Set([
  "#hero",
  "#services",
  "#faq",
  "#testimonials",
  "#contact",
  "#team",
  "#why-us",
  "#reviews",
]);

const BUILT_IN_PATHS = new Set(["/", "/services", "/about", "/shop"]);

function toSlugFromHref(href: string): string | null {
  if (!href.startsWith("/")) return null;
  if (href === "/") return null;
  const [path] = href.split("?");
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean || clean.includes("/")) return null;
  return clean.toLowerCase();
}

function getNavLinkStatus(
  href: string,
  knownPageSlugs: Set<string>,
): NavLinkStatus {
  const trimmed = href.trim();
  if (!trimmed) {
    return { tone: "warn", message: "Missing href. Add a URL to avoid 404." };
  }

  const lowered = trimmed.toLowerCase();

  if (lowered.startsWith("http://") || lowered.startsWith("https://")) {
    return { tone: "ok", message: "External URL." };
  }

  if (lowered.startsWith("#")) {
    if (SAFE_ANCHORS.has(lowered)) {
      return { tone: "ok", message: "Anchor link on current site." };
    }
    return {
      tone: "warn",
      message: "Unknown anchor. Use #services, #faq, #testimonials, or #contact.",
    };
  }

  if (BUILT_IN_PATHS.has(lowered)) {
    return { tone: "ok", message: "Built-in page route." };
  }

  const slug = toSlugFromHref(lowered);
  if (!slug) {
    return {
      tone: "warn",
      message: "Nested routes are not validated here. Confirm this path exists.",
    };
  }

  if (knownPageSlugs.has(slug)) {
    return { tone: "ok", message: `Custom page exists: /${slug}` };
  }

  return {
    tone: "warn",
    message: `Missing page /${slug}. Create and publish it in Main Pages.`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiteSettingsPage() {
  const { selectedClient } = useSidebar();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [websiteId, setWebsiteId] = useState<number | null>(null);
  const toastShown = useRef(false);
  const [tab, setTab] = useState<Tab>("settings");

  // Settings state
  const [form, setForm] = useState<FormData>({ launch_mode: "temporary_launch" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [contentPermissions, setContentPermissions] = useState<
    Record<PresetPermissionKey, boolean>
  >(DEFAULT_CONTENT_PERMISSION_FLAGS);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceEdit, setServiceEdit] = useState<number | "new" | null>(null);
  const [serviceForm, setServiceForm] = useState({
    title: "",
    slug: "",
    content: "",
    image_url: "",
  });
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Team state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamEdit, setTeamEdit] = useState<number | "new" | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    title: "",
    bio: "",
    photo_url: "",
    linkedin_url: "",
    sort_order: 0,
  });
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productEdit, setProductEdit] = useState<number | "new" | null>(null);
  const [productForm, setProductForm] = useState({
    title: "",
    slug: "",
    description: "",
    price: "",
    compare_at_price: "",
    image_url: "",
    stock_quantity: "99",
    is_published: true,
    sort_order: 0,
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [stripeConnectStatus, setStripeConnectStatus] =
    useState<StripeConnectStatus | null>(null);
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
  const [stripeConnectStarting, setStripeConnectStarting] = useState(false);
  const [stripeConnectMessage, setStripeConnectMessage] = useState<string | null>(
    null,
  );
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [domainPrimaryInput, setDomainPrimaryInput] = useState(false);
  const [domainSubmitting, setDomainSubmitting] = useState(false);
  const [domainVerifyingId, setDomainVerifyingId] = useState<number | null>(null);
  const [domainRemovingId, setDomainRemovingId] = useState<number | null>(null);
  const [domainDnsExpanded, setDomainDnsExpanded] = useState<string | null>(null);
  const [domainDnsRecords, setDomainDnsRecords] = useState<Record<string, DnsRecord[]>>({});
  const [domainDnsLoading, setDomainDnsLoading] = useState<string | null>(null);
  const [domainMessage, setDomainMessage] = useState<string | null>(null);
  const [resendDomainStatus, setResendDomainStatus] = useState<Record<string, { id: string; status: string } | null>>({});
  const [resendDomainCreating, setResendDomainCreating] = useState<string | null>(null);
  const [launchModeSaving, setLaunchModeSaving] = useState(false);
  const [launchModeMessage, setLaunchModeMessage] = useState<string | null>(null);
  const [emailProfileLoading, setEmailProfileLoading] = useState(false);
  const [emailProfileSaving, setEmailProfileSaving] = useState(false);
  const [emailProfileVerifying, setEmailProfileVerifying] = useState(false);
  const [emailProfileTesting, setEmailProfileTesting] = useState(false);
  const [emailProfileMessage, setEmailProfileMessage] = useState<string | null>(
    null,
  );
  const [emailProfile, setEmailProfile] = useState<EmailDeliveryProfile>({
    available: true,
    fromName: "",
    fromEmail: "",
    replyTo: "",
    sendingDomain: "",
    emailMode: "platform_sender",
    dkimVerified: false,
    spfVerified: false,
    leadNotificationEmails: [],
    verificationNotes: null,
    verificationLastCheckedAt: null,
    lastTestEmailStatus: null,
    lastTestEmailTo: null,
    lastTestEmailSender: null,
    lastTestEmailError: null,
    lastTestEmailAt: null,
    updatedAt: null,
  });
  const [leadRoutingInput, setLeadRoutingInput] = useState("");
  const [emailTestRecipient, setEmailTestRecipient] = useState("");
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<
    number | null
  >(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerTitle, setAssetPickerTitle] = useState("Select Image");
  const onPickAssetRef = useRef<((url: string) => void) | null>(null);
  const [templateIndustry, setTemplateIndustry] =
    useState<IndustryTemplate>("trades");
  const [templateBusinessName, setTemplateBusinessName] = useState("");
  const [templateCity, setTemplateCity] = useState("");
  const [templatePhone, setTemplatePhone] = useState("");
  const [templateEmail, setTemplateEmail] = useState("");
  const [templateVisualDirection, setTemplateVisualDirection] =
    useState<VisualDirection>("clean");
  const [templateCopyAngle, setTemplateCopyAngle] =
    useState<CopyAngle>("results");
  const [templateHeroStyle, setTemplateHeroStyle] =
    useState<HeroStyle>("direct");
  const [templateOfferType, setTemplateOfferType] =
    useState<OfferType>("free-consult");
  const [templateForceReplace, setTemplateForceReplace] = useState(false);
  const [templateApplying, setTemplateApplying] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [headerNavTemplateIndustry, setHeaderNavTemplateIndustry] =
    useState<IndustryTemplate>("trades");
  const [footerNavTemplateIndustry, setFooterNavTemplateIndustry] =
    useState<IndustryTemplate>("trades");
  const [templateKeyword, setTemplateKeyword] = useState("");
  const [templateCompetitorUrl, setTemplateCompetitorUrl] = useState("");
  const [templateServicesInput, setTemplateServicesInput] = useState("");
  const [aboutContextInput, setAboutContextInput] = useState("");
  const [publishedPageSlugs, setPublishedPageSlugs] = useState<Set<string>>(
    new Set(),
  );
  const [aiIdeas, setAiIdeas] = useState<AIContentIdea[]>([]);
  const [aiSelectedIdea, setAiSelectedIdea] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const {
    trigger: triggerContentAgent,
    isLoading: isAIApplying,
  } = useContentAgent();
  const { assets: clientAssets, isLoading: assetsLoading } = useGetAssets(
    websiteId,
    0,
    200,
  );

  useEffect(() => {
    if (!templateBusinessName) {
      setTemplateBusinessName(selectedClient?.name ?? "");
    }
  }, [selectedClient?.name, templateBusinessName]);

  // ── Load settings ──
  const loadSettings = useCallback(async (wid: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/site-settings/${wid}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data: SiteSettings = await res.json();
        if (data?.id) {
          const {
            id: _id,
            website_id: _wid,
            created_at: _c,
            updated_at: _u,
            ...editable
          } = data;
          void _id;
          void _wid;
          void _c;
          void _u;
          setForm(
            normalizeNavFields({
              ...editable,
              launch_mode:
                editable.launch_mode === "final_domain"
                  ? "final_domain"
                  : "temporary_launch",
            }),
          );
        } else {
          setForm({ launch_mode: "temporary_launch" });
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContentPermissions = useCallback(async (wid: number) => {
    setPermissionsLoading(true);
    setPermissionsError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/content-permissions/${wid}`, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        setPermissionsError(text || `Failed to load permissions (${res.status})`);
        setContentPermissions(DEFAULT_CONTENT_PERMISSION_FLAGS);
        return;
      }

      const data = (await res.json()) as { permissions?: Record<string, unknown> };
      setContentPermissions(
        normalizePermissionFlags(
          data.permissions,
          DEFAULT_CONTENT_PERMISSION_FLAGS,
        ),
      );
    } catch (error) {
      setPermissionsError(
        error instanceof Error
          ? error.message
          : "Failed to load permissions profile.",
      );
      setContentPermissions(DEFAULT_CONTENT_PERMISSION_FLAGS);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  const canEditSiteSettings =
    hasPlatformAdminOverride() || contentPermissions.edit_branding;

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "settings" ||
      requestedTab === "services" ||
      requestedTab === "team" ||
      requestedTab === "shop"
    ) {
      setTab(requestedTab);
    }
  }, [searchParams]);

  // ── Load services ──
  const loadServices = useCallback(async (wid: number) => {
    setServicesLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/services?website_id=${wid}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (res.ok) setServices(await res.json());
    } finally {
      setServicesLoading(false);
    }
  }, []);

  // ── Load team ──
  const loadTeam = useCallback(async (wid: number) => {
    setTeamLoading(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/team-members?website_id=${wid}`,
        {
          headers: authHeaders(),
          cache: "no-store",
        },
      );
      if (res.ok) setTeam(await res.json());
    } finally {
      setTeamLoading(false);
    }
  }, []);

  // ── Load products ──
  const loadProducts = useCallback(async (wid: number) => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/products?website_id=${wid}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (res.ok) setProducts(await res.json());
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadStripeConnectStatus = useCallback(async (wid: number) => {
    setStripeConnectLoading(true);
    try {
      const res = await fetch(`/api/stripe/connect/status?websiteId=${wid}`, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        setStripeConnectStatus({
          connected: false,
          accountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingComplete: false,
          error: text || `Status request failed (${res.status})`,
        });
        return;
      }

      const status = (await res.json()) as StripeConnectStatus;
      setStripeConnectStatus(status);
    } catch (e) {
      setStripeConnectStatus({
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
        error:
          e instanceof Error ? e.message : "Unable to fetch Stripe status.",
      });
    } finally {
      setStripeConnectLoading(false);
    }
  }, []);

  /** Hydrate Resend domain status for a list of custom domains (non-blocking). */
  const loadResendDomainStatuses = useCallback(async (domainList: DomainRecord[]) => {
    const customDomains = domainList.filter(
      (d) => d.domain.split(".").length <= 2 && !d.domain.endsWith(".rctechbridge.com"),
    );
    if (!customDomains.length) return;

    const results = await Promise.allSettled(
      customDomains.map(async (d) => {
        const res = await fetch(
          `/api/resend-domains/status?domain=${encodeURIComponent(d.domain)}`,
          { method: "GET", headers: authHeaders(), cache: "no-store" },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          found?: boolean;
          resendDomainId?: string;
          status?: string;
        };
        if (data.found && data.resendDomainId) {
          return { domain: d.domain, id: data.resendDomainId, status: data.status || "not_started" };
        }
        return null;
      }),
    );

    const statusMap: Record<string, { id: string; status: string }> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        statusMap[r.value.domain] = { id: r.value.id, status: r.value.status };
      }
    }
    if (Object.keys(statusMap).length) {
      setResendDomainStatus((prev) => ({ ...prev, ...statusMap }));
    }
  }, []);

  const loadDomains = useCallback(async (wid: number) => {
    setDomainsLoading(true);
    try {
      const res = await fetch(`/api/domains/status?websiteId=${wid}`, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        setDomainMessage(text || `Failed to load domains (${res.status})`);
        setDomains([]);
        return;
      }

      const data = (await res.json()) as { domains?: DomainRecord[] };
      const list = Array.isArray(data.domains) ? data.domains : [];
      setDomains(list);

      // Hydrate Resend status for custom domains (non-blocking)
      loadResendDomainStatuses(list);
    } catch (e) {
      setDomainMessage(
        e instanceof Error ? e.message : "Unable to load domain status.",
      );
      setDomains([]);
    } finally {
      setDomainsLoading(false);
    }
  }, [loadResendDomainStatuses]);

  const loadEmailProfile = useCallback(async (wid: number) => {
    setEmailProfileLoading(true);
    try {
      const res = await fetch(`/api/email/profile/status?websiteId=${wid}`, {
        method: "GET",
        cache: "no-store",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const text = await res.text();
        setEmailProfileMessage(text || `Unable to load email profile (${res.status})`);
        return;
      }

      const data = (await res.json()) as { profile?: Partial<EmailDeliveryProfile> };
      if (data.profile) {
        setEmailProfile((prev) => ({
          ...prev,
          available: data.profile?.available !== false,
          fromName: data.profile?.fromName || "",
          fromEmail: data.profile?.fromEmail || "",
          replyTo: data.profile?.replyTo || "",
          sendingDomain: data.profile?.sendingDomain || "",
          emailMode:
            data.profile?.emailMode === "tenant_branded"
              ? "tenant_branded"
              : "platform_sender",
          dkimVerified: Boolean(data.profile?.dkimVerified),
          spfVerified: Boolean(data.profile?.spfVerified),
          leadNotificationEmails: data.profile?.leadNotificationEmails || [],
          verificationNotes: data.profile?.verificationNotes || null,
          verificationLastCheckedAt: data.profile?.verificationLastCheckedAt || null,
          lastTestEmailStatus:
            data.profile?.lastTestEmailStatus === "success" ||
            data.profile?.lastTestEmailStatus === "failed"
              ? data.profile.lastTestEmailStatus
              : null,
          lastTestEmailTo: data.profile?.lastTestEmailTo || null,
          lastTestEmailSender: data.profile?.lastTestEmailSender || null,
          lastTestEmailError: data.profile?.lastTestEmailError || null,
          lastTestEmailAt: data.profile?.lastTestEmailAt || null,
          updatedAt: data.profile?.updatedAt || null,
        }));
        setLeadRoutingInput((data.profile.leadNotificationEmails || []).join(", "));
        setEmailTestRecipient((prev) => {
          if (prev.trim()) {
            return prev;
          }

          const fallback =
            data.profile?.replyTo ||
            data.profile?.fromEmail ||
            data.profile?.leadNotificationEmails?.[0] ||
            "";
          return fallback;
        });
        if (data.profile.available === false) {
          setEmailProfileMessage(
            "Email delivery setup is not available in this environment yet. Save and verify actions are disabled.",
          );
        }
      }
    } catch (e) {
      setEmailProfileMessage(
        e instanceof Error ? e.message : "Unable to load email profile.",
      );
    } finally {
      setEmailProfileLoading(false);
    }
  }, []);

  const parseLeadRoutingEmails = (value: string): string[] =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  // ── Load published page slugs ──
  const loadPageSlugs = useCallback(async (wid: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/pages?website_id=${wid}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return;
      const pages = (await res.json()) as CmsPageLite[];
      const slugs = new Set(
        pages
          .filter((p) => p?.is_published)
          .map((p) => (p.slug ?? "").trim().toLowerCase())
          .filter(Boolean),
      );
      setPublishedPageSlugs(slugs);
    } catch {
      setPublishedPageSlugs(new Set());
    }
  }, []);

  useEffect(() => {
    const wid = selectedClient?.website_id ?? null;
    if (!wid) {
      if (selectedClient && !toastShown.current) {
        toastShown.current = true;
        toast.warn(
          "No website found for this account. Please complete your profile setup first.",
        );
        router.push("/profile");
      }
      return;
    }
    toastShown.current = false;
    setWebsiteId(wid);
    loadSettings(wid);
    loadServices(wid);
    loadTeam(wid);
    loadProducts(wid);
    loadContentPermissions(wid);
    loadStripeConnectStatus(wid);
    loadDomains(wid);
    loadEmailProfile(wid);
    loadPageSlugs(wid);
  }, [
    selectedClient,
    router,
    loadSettings,
    loadServices,
    loadTeam,
    loadProducts,
    loadContentPermissions,
    loadStripeConnectStatus,
    loadDomains,
    loadEmailProfile,
    loadPageSlugs,
  ]);

  const saveEmailProfile = useCallback(async () => {
    if (!websiteId) return;

    setEmailProfileSaving(true);
    setEmailProfileMessage(null);

    try {
      const leadEmails = parseLeadRoutingEmails(leadRoutingInput);
      const res = await fetch("/api/email/profile/upsert", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          websiteId,
          fromName: emailProfile.fromName,
          fromEmail: emailProfile.fromEmail,
          replyTo: emailProfile.replyTo,
          sendingDomain: emailProfile.sendingDomain,
          emailMode: emailProfile.emailMode,
          leadNotificationEmails: leadEmails,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setEmailProfileMessage(text || `Failed to save profile (${res.status})`);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      setEmailProfile((prev) => ({
        ...prev,
        leadNotificationEmails: leadEmails,
      }));
      setEmailProfileMessage(data.message || "Email sender profile saved.");
      await loadEmailProfile(websiteId);
    } catch (e) {
      setEmailProfileMessage(
        e instanceof Error ? e.message : "Failed to save email profile.",
      );
    } finally {
      setEmailProfileSaving(false);
    }
  }, [emailProfile, leadRoutingInput, loadEmailProfile, websiteId]);

  const saveLaunchMode = useCallback(async () => {
    if (!websiteId) return;
    if (!canEditSiteSettings) {
      setLaunchModeMessage("You do not have permission to update launch mode for this tenant.");
      return;
    }

    setLaunchModeSaving(true);
    setLaunchModeMessage(null);

    try {
      const res = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ launch_mode: form.launch_mode || "temporary_launch" }),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as {
          error?: string;
          reasons?: string[];
        };
        await loadSettings(websiteId);
        setLaunchModeMessage(
          errorBody.reasons?.length
            ? errorBody.reasons.join(" ")
            : errorBody.error || `Failed to save launch mode (${res.status})`,
        );
        return;
      }

      const data = (await res.json().catch(() => ({}))) as SiteSettings;
      setForm((prev) => normalizeNavFields({ ...prev, launch_mode: data.launch_mode }));
      setLaunchModeMessage(`Launch mode saved as ${launchModeLabel(data.launch_mode)}.`);
    } catch (error) {
      setLaunchModeMessage(
        error instanceof Error ? error.message : "Failed to save launch mode.",
      );
    } finally {
      setLaunchModeSaving(false);
    }
  }, [canEditSiteSettings, form.launch_mode, loadSettings, websiteId]);

  const verifyEmailDomain = useCallback(async () => {
    if (!websiteId) return;

    setEmailProfileVerifying(true);
    setEmailProfileMessage(null);
    try {
      const res = await fetch("/api/email/profile/verify", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          websiteId,
          sendingDomain: emailProfile.sendingDomain,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setEmailProfileMessage(text || `SPF/DKIM check failed (${res.status})`);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      setEmailProfileMessage(data.message || "SPF/DKIM verification check executed.");
      await loadEmailProfile(websiteId);
    } catch (e) {
      setEmailProfileMessage(
        e instanceof Error ? e.message : "Failed to verify sender domain.",
      );
    } finally {
      setEmailProfileVerifying(false);
    }
  }, [emailProfile.sendingDomain, loadEmailProfile, websiteId]);

  const sendEmailProfileTest = useCallback(async () => {
    if (!websiteId) return;

    const recipient = emailTestRecipient.trim().toLowerCase();
    if (!recipient) {
      setEmailProfileMessage("Enter a recipient email before sending a test.");
      return;
    }

    setEmailProfileTesting(true);
    setEmailProfileMessage(null);
    try {
      const res = await fetch("/api/email/profile/test", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          websiteId,
          to: recipient,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        sender?: string;
        message?: string;
      };

      if (!res.ok) {
        setEmailProfileMessage(data.error || `Failed to send test email (${res.status})`);
        await loadEmailProfile(websiteId);
        return;
      }

      setEmailProfileMessage(
        data.sender
          ? `${data.message || "Test email sent."} Sender used: ${data.sender}`
          : data.message || "Test email sent.",
      );
      await loadEmailProfile(websiteId);
    } catch (error) {
      setEmailProfileMessage(
        error instanceof Error ? error.message : "Failed to send test email.",
      );
      await loadEmailProfile(websiteId);
    } finally {
      setEmailProfileTesting(false);
    }
  }, [emailTestRecipient, loadEmailProfile, websiteId]);

  const normalizeDomain = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .replace(/\.$/, "");

  const onboardDomain = useCallback(async () => {
    if (!websiteId) return;

    const normalizedDomain = normalizeDomain(domainInput);
    if (!normalizedDomain || !/^[a-z0-9.-]+$/.test(normalizedDomain)) {
      setDomainMessage("Enter a valid domain like client-example.com.");
      return;
    }

    setDomainSubmitting(true);
    setDomainMessage(null);

    try {
      const res = await fetch("/api/domains/onboard", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          websiteId,
          domain: normalizedDomain,
          isPrimary: domainPrimaryInput,
        }),
      });

      if (res.status === 409) {
        const errData = await res.json().catch(() => null);
        setDomainMessage(
          (errData as { error?: string } | null)?.error ||
            "Domain is already used by another tenant.",
        );
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setDomainMessage(
          (errData as { error?: string } | null)?.error ||
            `Onboarding failed (${res.status})`,
        );
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        dnsRecords?: DnsRecord[];
        resendDomainId?: string;
        resendStatus?: string;
      };
      if (data.dnsRecords?.length) {
        setDomainDnsRecords((prev) => ({
          ...prev,
          [normalizedDomain]: data.dnsRecords as DnsRecord[],
        }));
        setDomainDnsExpanded(normalizedDomain);
      }
      // Capture Resend domain info if it was auto-created during onboard
      if (data.resendDomainId) {
        setResendDomainStatus((prev) => ({
          ...prev,
          [normalizedDomain]: {
            id: data.resendDomainId as string,
            status: data.resendStatus || "not_started",
          },
        }));
      }
      const hasResend = Boolean(data.resendDomainId);
      setDomainMessage(
        hasResend
          ? "Domain added to Vercel and Resend sending domain created. Add ALL DNS records shown below, then click Verify."
          : "Domain added to Vercel. Add the DNS records shown below, then click Verify.",
      );
      setDomainInput("");
      setDomainPrimaryInput(false);
      await loadDomains(websiteId);
    } catch (e) {
      setDomainMessage(
        e instanceof Error ? e.message : "Failed to submit domain onboarding.",
      );
    } finally {
      setDomainSubmitting(false);
    }
  }, [domainInput, domainPrimaryInput, loadDomains, websiteId]);

  const verifyDomain = useCallback(
    async (domain: DomainRecord) => {
      if (!websiteId) return;

      setDomainVerifyingId(domain.id ?? -1);
      setDomainMessage(null);
      try {
        const res = await fetch("/api/domains/verify", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            websiteId,
            domainId: domain.id,
            domain: domain.domain,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          setDomainMessage(
            (errData as { error?: string } | null)?.error ||
              `Verification failed (${res.status})`,
          );
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          verified?: boolean;
          status?: string;
          dnsRecords?: DnsRecord[];
        };
        if (data.dnsRecords?.length) {
          setDomainDnsRecords((prev) => ({
            ...prev,
            [domain.domain]: data.dnsRecords as DnsRecord[],
          }));
        }
        setDomainMessage(
          data.verified
            ? `${domain.domain} is verified and active!`
            : `${domain.domain} is not verified yet. Check DNS records and try again.`,
        );
        await loadDomains(websiteId);
      } catch (e) {
        setDomainMessage(
          e instanceof Error ? e.message : "Failed to verify domain.",
        );
      } finally {
        setDomainVerifyingId(null);
      }
    },
    [loadDomains, websiteId],
  );

  const removeDomain = useCallback(
    async (domain: DomainRecord) => {
      if (!websiteId || !domain.id) return;

      if (!window.confirm(`Remove ${domain.domain} from Vercel and this tenant? This cannot be undone.`)) {
        return;
      }

      setDomainRemovingId(domain.id);
      setDomainMessage(null);
      try {
        const res = await fetch(`/api/domains/${domain.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          setDomainMessage(
            (errData as { error?: string } | null)?.error ||
              `Failed to remove domain (${res.status})`,
          );
          return;
        }

        setDomainMessage(`${domain.domain} has been removed.`);
        setDomainDnsRecords((prev) => {
          const next = { ...prev };
          delete next[domain.domain];
          return next;
        });
        await loadDomains(websiteId);
      } catch (e) {
        setDomainMessage(
          e instanceof Error ? e.message : "Failed to remove domain.",
        );
      } finally {
        setDomainRemovingId(null);
      }
    },
    [loadDomains, websiteId],
  );

  const loadDnsInfo = useCallback(
    async (domain: string) => {
      setDomainDnsLoading(domain);
      try {
        const res = await fetch(
          `/api/domains/dns-info?domain=${encodeURIComponent(domain)}`,
          { headers: authHeaders(), cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as { dnsRecords?: DnsRecord[] };
          if (data.dnsRecords) {
            setDomainDnsRecords((prev) => ({
              ...prev,
              [domain]: data.dnsRecords as DnsRecord[],
            }));
          }
        }
      } catch {
        // Non-fatal
      } finally {
        setDomainDnsLoading(null);
      }
    },
    [],
  );

  const setupResendDomain = useCallback(
    async (domain: string) => {
      const isSubdomain = domain.split(".").length > 2;
      const isRCDomain = domain.endsWith(".rctechbridge.com");
      if (isSubdomain || isRCDomain) return;

      setResendDomainCreating(domain);
      setDomainMessage(null);
      try {
        const res = await fetch("/api/resend-domains/create", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ domain }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          setDomainMessage(
            (errData as { error?: string } | null)?.error ||
              `Failed to create Resend sending domain (${res.status})`,
          );
          return;
        }

        const data = (await res.json()) as {
          resendDomainId?: string;
          sendingDomain?: string;
          resendStatus?: string;
          status?: string;
          dnsRecords?: DnsRecord[];
          alreadyExisted?: boolean;
        };

        const status = data.resendStatus || data.status || "not_started";
        if (data.resendDomainId) {
          setResendDomainStatus((prev) => ({
            ...prev,
            [domain]: { id: data.resendDomainId as string, status },
          }));
        }

        // Merge Resend DNS records into the domain card
        if (data.dnsRecords?.length) {
          setDomainDnsRecords((prev) => {
            const existing = prev[domain] || [];
            const existingValues = new Set(existing.map((r) => `${r.type}|${r.name}|${r.value}`));
            const newRecords = (data.dnsRecords as DnsRecord[]).filter(
              (r) => !existingValues.has(`${r.type}|${r.name}|${r.value}`),
            );
            return { ...prev, [domain]: [...existing, ...newRecords] };
          });
          setDomainDnsExpanded(domain);
        }

        // Auto-fill sending domain in email profile if empty
        if (data.sendingDomain && !emailProfile.sendingDomain) {
          setEmailProfile((prev) => ({ ...prev, sendingDomain: data.sendingDomain as string }));
        }

        setDomainMessage(
          data.alreadyExisted
            ? `Resend sending domain (${data.sendingDomain}) already exists. DNS records shown below.`
            : `Resend sending domain (${data.sendingDomain}) created. Add the mail DNS records below, then verify.`,
        );
      } catch (e) {
        setDomainMessage(
          e instanceof Error ? e.message : "Failed to setup Resend sending domain.",
        );
      } finally {
        setResendDomainCreating(null);
      }
    },
    [emailProfile.sendingDomain],
  );

  const verifyResendDomain = useCallback(
    async (domain: string) => {
      const info = resendDomainStatus[domain];
      if (!info?.id) return;

      setResendDomainCreating(domain);
      setDomainMessage(null);
      try {
        const res = await fetch("/api/resend-domains/verify", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ resendDomainId: info.id }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          status?: string;
          dnsRecords?: DnsRecord[];
          message?: string;
        };

        if (data.status) {
          setResendDomainStatus((prev) => ({
            ...prev,
            [domain]: { id: info.id, status: data.status as string },
          }));
        }

        if (data.dnsRecords?.length) {
          setDomainDnsRecords((prev) => ({
            ...prev,
            [domain]: [
              ...(prev[domain] || []).filter((r) => !r.reason?.startsWith("Resend")),
              ...(data.dnsRecords as DnsRecord[]),
            ],
          }));
        }

        setDomainMessage(data.message || "Resend verification triggered.");
      } catch (e) {
        setDomainMessage(
          e instanceof Error ? e.message : "Failed to verify Resend domain.",
        );
      } finally {
        setResendDomainCreating(null);
      }
    },
    [resendDomainStatus],
  );

  const startStripeConnectOnboarding = useCallback(async () => {
    if (!websiteId) return;
    setStripeConnectStarting(true);
    setStripeConnectMessage(null);

    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ websiteId }),
      });

      if (!res.ok) {
        const text = await res.text();
        setStripeConnectMessage(
          text || `Unable to start Stripe onboarding (${res.status})`,
        );
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setStripeConnectMessage("Stripe onboarding URL was not returned.");
        return;
      }

      window.location.href = data.url;
    } catch (e) {
      setStripeConnectMessage(
        e instanceof Error ? e.message : "Failed to start Stripe onboarding.",
      );
    } finally {
      setStripeConnectStarting(false);
    }
  }, [websiteId]);

  // ── Settings save ──
  const handleSave = async () => {
    if (!websiteId) return;
    if (!canEditSiteSettings) {
      setSettingsError("You do not have permission to edit site settings for this tenant.");
      return;
    }
    setSaving(true);
    setSettingsError(null);
    setSaved(false);
    try {
      const res = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSettingsError(err?.error ?? `Error ${res.status}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        const secret = process.env.NEXT_PUBLIC_REVALIDATION_SECRET;
        if (secret) {
          await fetch("/api/revalidate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidation-secret": secret,
            },
            body: JSON.stringify({ websiteId: String(websiteId) }),
          });
        }
      }
    } catch (e) {
      setSettingsError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Services CRUD ──
  const startNewService = () => {
    if (!contentPermissions.edit_services) {
      setServiceError("You do not have permission to edit services for this tenant.");
      return;
    }
    setServiceForm({ title: "", slug: "", content: "", image_url: "" });
    setServiceEdit("new");
    setServiceError(null);
  };
  const startEditService = (s: Service) => {
    if (!contentPermissions.edit_services) {
      setServiceError("You do not have permission to edit services for this tenant.");
      return;
    }
    setServiceForm({
      title: s.title,
      slug: s.slug,
      content: s.content ?? "",
      image_url: s.image_url ?? "",
    });
    setServiceEdit(s.id);
    setServiceError(null);
  };
  const cancelService = () => {
    setServiceEdit(null);
    setServiceError(null);
  };
  const setServiceField = (key: keyof typeof serviceForm, val: string) =>
    setServiceForm((f) => ({
      ...f,
      [key]: val,
      ...(key === "title" && serviceEdit === "new"
        ? { slug: slugify(val) }
        : {}),
    }));

  const saveService = async () => {
    if (!contentPermissions.edit_services) {
      setServiceError("You do not have permission to edit services for this tenant.");
      return;
    }
    if (!serviceForm.title.trim()) {
      setServiceError("Title is required.");
      return;
    }
    setServiceSaving(true);
    setServiceError(null);
    try {
      if (serviceEdit === "new") {
        const res = await fetch(`${getApiBaseUrl()}/services`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...serviceForm, website_id: websiteId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Service = await res.json();
        setServices((p) => [created, ...p]);
      } else {
        const res = await fetch(`${getApiBaseUrl()}/services/${serviceEdit}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(serviceForm),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Service = await res.json();
        setServices((p) => p.map((s) => (s.id === updated.id ? updated : s)));
      }
      cancelService();
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setServiceSaving(false);
    }
  };

  const deleteService = async (id: number) => {
    if (!contentPermissions.edit_services) {
      setServiceError("You do not have permission to edit services for this tenant.");
      return;
    }
    if (!confirm("Delete this service?")) return;
    const res = await fetch(`${getApiBaseUrl()}/services/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) setServices((p) => p.filter((s) => s.id !== id));
  };

  // ── Team CRUD ──
  const startNewTeam = () => {
    if (!contentPermissions.edit_team) {
      setTeamError("You do not have permission to edit team content for this tenant.");
      return;
    }
    setTeamForm({
      name: "",
      title: "",
      bio: "",
      photo_url: "",
      linkedin_url: "",
      sort_order: 0,
    });
    setTeamEdit("new");
    setTeamError(null);
  };
  const startEditTeam = (m: TeamMember) => {
    if (!contentPermissions.edit_team) {
      setTeamError("You do not have permission to edit team content for this tenant.");
      return;
    }
    setTeamForm({
      name: m.name,
      title: m.title ?? "",
      bio: m.bio ?? "",
      photo_url: m.photo_url ?? "",
      linkedin_url: m.linkedin_url ?? "",
      sort_order: m.sort_order,
    });
    setTeamEdit(m.id);
    setTeamError(null);
  };
  const cancelTeam = () => {
    setTeamEdit(null);
    setTeamError(null);
  };
  const setTeamField = (key: keyof typeof teamForm, val: string | number) =>
    setTeamForm((f) => ({ ...f, [key]: val }));

  const saveTeam = async () => {
    if (!contentPermissions.edit_team) {
      setTeamError("You do not have permission to edit team content for this tenant.");
      return;
    }
    if (!teamForm.name.trim()) {
      setTeamError("Name is required.");
      return;
    }
    setTeamSaving(true);
    setTeamError(null);
    try {
      const payload = {
        ...teamForm,
        title: teamForm.title || null,
        bio: teamForm.bio || null,
        photo_url: teamForm.photo_url || null,
        linkedin_url: teamForm.linkedin_url || null,
      };
      if (teamEdit === "new") {
        const res = await fetch(`${getApiBaseUrl()}/team-members`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...payload, website_id: websiteId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: TeamMember = await res.json();
        setTeam((p) =>
          [...p, created].sort((a, b) => a.sort_order - b.sort_order),
        );
      } else {
        const res = await fetch(`${getApiBaseUrl()}/team-members/${teamEdit}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: TeamMember = await res.json();
        setTeam((p) =>
          p
            .map((m) => (m.id === updated.id ? updated : m))
            .sort((a, b) => a.sort_order - b.sort_order),
        );
      }
      cancelTeam();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setTeamSaving(false);
    }
  };

  const deleteTeam = async (id: number) => {
    if (!contentPermissions.edit_team) {
      setTeamError("You do not have permission to edit team content for this tenant.");
      return;
    }
    if (!confirm("Delete this team member?")) return;
    const res = await fetch(`${getApiBaseUrl()}/team-members/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) setTeam((p) => p.filter((m) => m.id !== id));
  };

  // ── Products CRUD ──
  const startNewProduct = () => {
    setProductForm({
      title: "",
      slug: "",
      description: "",
      price: "",
      compare_at_price: "",
      image_url: "",
      stock_quantity: "99",
      is_published: true,
      sort_order: 0,
    });
    setProductEdit("new");
    setProductError(null);
  };
  const startEditProduct = (p: Product) => {
    setProductForm({
      title: p.title,
      slug: p.slug,
      description: p.description ?? "",
      price: p.price,
      compare_at_price: p.compare_at_price ?? "",
      image_url: p.image_url ?? "",
      stock_quantity: String(p.stock_quantity),
      is_published: p.is_published,
      sort_order: p.sort_order,
    });
    setProductEdit(p.id);
    setProductError(null);
  };
  const cancelProduct = () => {
    setProductEdit(null);
    setProductError(null);
  };
  const setProductField = (
    key: keyof typeof productForm,
    val: string | boolean | number,
  ) =>
    setProductForm((f) => ({
      ...f,
      [key]: val,
      ...(key === "title" && productEdit === "new"
        ? { slug: slugify(String(val)) }
        : {}),
    }));

  const saveProduct = async () => {
    if (!productForm.title.trim() || !productForm.price) {
      setProductError("Title and price are required.");
      return;
    }
    setProductSaving(true);
    setProductError(null);
    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        compare_at_price: productForm.compare_at_price
          ? parseFloat(productForm.compare_at_price)
          : null,
        stock_quantity: parseInt(String(productForm.stock_quantity), 10),
        compare_at_price_val: undefined,
      };
      if (productEdit === "new") {
        const res = await fetch(`${getApiBaseUrl()}/products`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...payload, website_id: websiteId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Product = await res.json();
        setProducts((prev) => [created, ...prev]);
      } else {
        const res = await fetch(`${getApiBaseUrl()}/products/${productEdit}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Product = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
      }
      cancelProduct();
    } catch (e) {
      setProductError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setProductSaving(false);
    }
  };

  const deleteProduct = async (id: number) => {
    const res = await fetch(`${getApiBaseUrl()}/products/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    setConfirmDeleteProductId(null);
  };

  const toggleEcommerce = () => {
    const currentTab = tab;
    setForm((prev) => {
      const next = !prev.ecommerce_enabled;
      if (!next && currentTab === "shop") setTab("settings");
      return { ...prev, ecommerce_enabled: next };
    });
  };

  const openAssetPicker = useCallback(
    (title: string, onPick: (url: string) => void) => {
      setAssetPickerTitle(title);
      onPickAssetRef.current = onPick;
      setAssetPickerOpen(true);
    },
    [],
  );

  const handleSelectAsset = useCallback((url: string) => {
    if (!url) return;
    if (onPickAssetRef.current) {
      onPickAssetRef.current(url);
    }
    setAssetPickerOpen(false);
  }, []);

  const applyTemplateLibrary = useCallback(async () => {
    if (!websiteId) return;
    setTemplateApplying(true);
    setTemplateMessage(null);
    setSettingsError(null);

    try {
      const draft = buildTemplateDraft({
        industry: templateIndustry,
        businessName: templateBusinessName,
        city: templateCity,
        phone: templatePhone,
        email: templateEmail,
        visualDirection: templateVisualDirection,
        copyAngle: templateCopyAngle,
        heroStyle: templateHeroStyle,
        offerType: templateOfferType,
      });

      const mergedForm: FormData = {
        ...form,
        hero_headline: pickValue(
          form.hero_headline,
          draft.settings.hero_headline ?? "",
          templateForceReplace,
        ),
        hero_subheadline: pickValue(
          form.hero_subheadline,
          draft.settings.hero_subheadline ?? "",
          templateForceReplace,
        ),
        hero_cta_text: pickValue(
          form.hero_cta_text,
          draft.settings.hero_cta_text ?? "",
          templateForceReplace,
        ),
        hero_cta_url: pickValue(
          form.hero_cta_url,
          draft.settings.hero_cta_url ?? "",
          templateForceReplace,
        ),
        cta_headline: pickValue(
          form.cta_headline,
          draft.settings.cta_headline ?? "",
          templateForceReplace,
        ),
        cta_body: pickValue(
          form.cta_body,
          draft.settings.cta_body ?? "",
          templateForceReplace,
        ),
        cta_button_text: pickValue(
          form.cta_button_text,
          draft.settings.cta_button_text ?? "",
          templateForceReplace,
        ),
        cta_button_url: pickValue(
          form.cta_button_url,
          draft.settings.cta_button_url ?? "",
          templateForceReplace,
        ),
        footer_tagline: pickValue(
          form.footer_tagline,
          draft.settings.footer_tagline ?? "",
          templateForceReplace,
        ),
        footer_copyright: pickValue(
          form.footer_copyright,
          draft.settings.footer_copyright ?? "",
          templateForceReplace,
        ),
        contact_email: pickValue(
          form.contact_email,
          draft.settings.contact_email ?? "",
          templateForceReplace,
        ),
        contact_phone: pickValue(
          form.contact_phone,
          draft.settings.contact_phone ?? "",
          templateForceReplace,
        ),
        address: pickValue(
          form.address,
          draft.settings.address ?? "",
          templateForceReplace,
        ),
      };

      setForm(mergedForm);

      setTemplateMessage(
        "Template content staged in the form. Review it, then click Save Changes to persist site settings.",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to apply template.";
      setTemplateMessage(message);
      setSettingsError(message);
    } finally {
      setTemplateApplying(false);
    }
  }, [
    websiteId,
    templateIndustry,
    templateBusinessName,
    templateCity,
    templatePhone,
    templateEmail,
    templateVisualDirection,
    templateCopyAngle,
    templateHeroStyle,
    templateOfferType,
    templateForceReplace,
    form,
  ]);

  const applyAIDraftIdea = useCallback(
    async (idea: string) => {
      if (!websiteId) return;
      setAiSelectedIdea(idea);
      setAiMessage(null);

      try {
        const aiResponse = (await triggerContentAgent({
          mode: "site_settings_orchestrator",
          city: templateCity,
          industry: templateIndustry,
          keyword: templateKeyword || `${templateIndustry} ${templateCity}`.trim(),
          competitor1Url: templateCompetitorUrl || undefined,
          service: services[0]?.title || undefined,
          userChosenIdea: idea,
        })) as
          | {
              step?: string;
              markdownContent?: string;
              metadata?:
                | {
                    title?: string;
                    description?: string;
                    keywords?: string[];
                  }
                | string;
            }
          | undefined;

        if (aiResponse?.step !== "complete_workflow") {
          setAiMessage("AI did not return a complete draft. Try another idea.");
          return;
        }

        const markdown = aiResponse.markdownContent ?? "";
        const intro = extractIntro(markdown);
        const metadata =
          typeof aiResponse.metadata === "string"
            ? (JSON.parse(aiResponse.metadata) as {
                title?: string;
                description?: string;
                keywords?: string[];
              })
            : aiResponse.metadata;

        const mergedForm: FormData = {
          ...form,
          hero_headline: pickValue(
            form.hero_headline,
            metadata?.title || idea,
            templateForceReplace,
          ),
          hero_subheadline: pickValue(
            form.hero_subheadline,
            metadata?.description || intro || "Expert service tailored to your goals.",
            templateForceReplace,
          ),
          cta_headline: pickValue(
            form.cta_headline,
            `Ready to get started with ${templateBusinessName || "our team"}?`,
            templateForceReplace,
          ),
          cta_body: pickValue(
            form.cta_body,
            "Contact us today and we will help you choose the best next step.",
            templateForceReplace,
          ),
        };

        setForm(mergedForm);

        const settingsRes = await fetch(
          `${getApiBaseUrl()}/site-settings/${websiteId}`,
          {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(mergedForm),
          },
        );
        if (!settingsRes.ok) {
          throw new Error(`Failed to save AI settings (${settingsRes.status})`);
        }

        const serviceDrafts = extractServiceDrafts(markdown);
        const existingServiceTitles = new Set(
          services.map((s) => s.title.trim().toLowerCase()),
        );

        for (const service of serviceDrafts.slice(0, 3)) {
          const key = service.title.toLowerCase();
          if (!templateForceReplace && existingServiceTitles.has(key)) {
            continue;
          }
          if (!existingServiceTitles.has(key)) {
            const serviceRes = await fetch(`${getApiBaseUrl()}/services`, {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                title: service.title,
                slug: slugify(service.title),
                content: service.content,
                image_url: null,
                website_id: websiteId,
              }),
            });
            if (serviceRes.ok) {
              existingServiceTitles.add(key);
            }
          }
        }

        await Promise.all([loadSettings(websiteId), loadServices(websiteId)]);
        setAiMessage("AI draft applied to Site Settings and starter services.");
      } catch (e) {
        setAiMessage(
          e instanceof Error ? e.message : "Failed to apply AI-generated draft.",
        );
      }
    },
    [
      websiteId,
      triggerContentAgent,
      templateCity,
      templateIndustry,
      templateKeyword,
      templateCompetitorUrl,
      services,
      form,
      templateForceReplace,
      templateBusinessName,
      loadSettings,
      loadServices,
    ],
  );

  const generateAIIdeas = useCallback(async () => {
    setAiMessage(null);
    setAiIdeas([]);
    try {
      const aiResponse = (await triggerContentAgent({
        mode: "site_settings_orchestrator",
        city: templateCity,
        industry: templateIndustry,
        keyword: templateKeyword || `${templateIndustry} ${templateCity}`.trim(),
        competitor1Url: templateCompetitorUrl || undefined,
        service: services[0]?.title || undefined,
      })) as unknown;

      const ideas = parseIdeas(aiResponse);
      if (ideas.length === 0) {
        setAiMessage("No AI ideas returned. Please refine city/keyword and retry.");
        return;
      }
      setAiIdeas(ideas);
      setAiMessage("Ideas generated. Choose one to apply AI draft.");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "Failed to generate AI ideas.");
    }
  }, [
    triggerContentAgent,
    templateCity,
    templateIndustry,
    templateKeyword,
    templateCompetitorUrl,
    services,
  ]);

  const generateAndApplyServiceCopyV3 = useCallback(async () => {
    if (!websiteId) return;
    setAiMessage(null);

    const servicesProvided = parseServicesInput(templateServicesInput);
    if (servicesProvided.length === 0) {
      setAiMessage("Add at least one offered service before running V3.");
      return;
    }

    try {
      const aiResponse = (await triggerContentAgent({
        mode: "service_copy",
        city: templateCity,
        industry: templateIndustry,
        keyword: templateKeyword || `${templateIndustry} ${templateCity}`.trim(),
        competitor1Url: templateCompetitorUrl || undefined,
        servicesOffered: servicesProvided,
      })) as AIServiceCopyResponse;

      if (aiResponse?.step !== "service_copy_generated") {
        setAiMessage("AI did not return service-copy output.");
        return;
      }

      const mergedForm: FormData = {
        ...form,
        hero_headline: pickValue(
          form.hero_headline,
          aiResponse.heroHeadline || `${templateBusinessName} in ${templateCity}`,
          templateForceReplace,
        ),
        hero_subheadline: pickValue(
          form.hero_subheadline,
          aiResponse.heroSubheadline || "Trusted local service with fast response and quality results.",
          templateForceReplace,
        ),
        cta_headline: pickValue(
          form.cta_headline,
          aiResponse.ctaHeadline || `Need help from ${templateBusinessName || "our team"}?`,
          templateForceReplace,
        ),
        cta_body: pickValue(
          form.cta_body,
          aiResponse.ctaBody || "Contact us today and we will recommend the best next step.",
          templateForceReplace,
        ),
      };

      setForm(mergedForm);

      const settingsRes = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(mergedForm),
      });
      if (!settingsRes.ok) {
        throw new Error(`Failed to save settings (${settingsRes.status})`);
      }

      const generatedServices = (aiResponse.services || []).slice(0, 12);
      const existingByTitle = new Map(
        services.map((s) => [s.title.trim().toLowerCase(), s]),
      );

      for (const service of generatedServices) {
        const normalizedTitle = service.title.trim();
        if (!normalizedTitle) continue;
        const key = normalizedTitle.toLowerCase();
        const existing = existingByTitle.get(key);

        if (existing) {
          if (!templateForceReplace) {
            continue;
          }
          await fetch(`${getApiBaseUrl()}/services/${existing.id}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
              title: normalizedTitle,
              slug: slugify(service.slug || normalizedTitle),
              content: service.description,
              image_url: existing.image_url,
            }),
          });
        } else {
          await fetch(`${getApiBaseUrl()}/services`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              title: normalizedTitle,
              slug: slugify(service.slug || normalizedTitle),
              content: service.description,
              image_url: null,
              website_id: websiteId,
            }),
          });
        }
      }

      await Promise.all([loadSettings(websiteId), loadServices(websiteId)]);
      setAiMessage("V3 service-first copy applied successfully.");
    } catch (e) {
      setAiMessage(
        e instanceof Error ? e.message : "Failed to generate/apply V3 service copy.",
      );
    }
  }, [
    websiteId,
    templateServicesInput,
    triggerContentAgent,
    templateCity,
    templateIndustry,
    templateKeyword,
    templateCompetitorUrl,
    form,
    templateForceReplace,
    templateBusinessName,
    services,
    loadSettings,
    loadServices,
  ]);

  const syncHomeAndContactFromContent = useCallback(async () => {
    if (!websiteId) return;
    setTemplateMessage(null);

    try {
      const featuredServices = services.slice(0, 3).map((s) => s.title).join(", ");
      const nextForm: FormData = {
        ...form,
        hero_headline: pickValue(
          form.hero_headline,
          `${templateBusinessName || "Your Business"} in ${templateCity || "your area"}`,
          templateForceReplace,
        ),
        hero_subheadline: pickValue(
          form.hero_subheadline,
          featuredServices
            ? `We provide ${featuredServices} with reliable local service.`
            : "Trusted local service with fast response and quality results.",
          templateForceReplace,
        ),
        cta_headline: pickValue(
          form.cta_headline,
          `Ready to work with ${templateBusinessName || "our team"}?`,
          templateForceReplace,
        ),
        cta_body: pickValue(
          form.cta_body,
          `Call ${form.contact_phone || templatePhone || "us today"} and we will help you choose the best next step.`,
          templateForceReplace,
        ),
        contact_email: pickValue(
          form.contact_email,
          templateEmail || form.contact_email || "",
          templateForceReplace,
        ),
        contact_phone: pickValue(
          form.contact_phone,
          templatePhone || form.contact_phone || "",
          templateForceReplace,
        ),
        address: pickValue(
          form.address,
          templateCity || form.address || "",
          templateForceReplace,
        ),
      };

      setForm(nextForm);

      const res = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(nextForm),
      });
      if (!res.ok) {
        throw new Error(`Failed to sync Home/Contact (${res.status})`);
      }

      await loadSettings(websiteId);
      setTemplateMessage("Home and Contact sections synced from current content.");
    } catch (e) {
      setTemplateMessage(
        e instanceof Error ? e.message : "Failed to sync Home/Contact sections.",
      );
    }
  }, [
    websiteId,
    services,
    form,
    templateBusinessName,
    templateCity,
    templateForceReplace,
    templatePhone,
    templateEmail,
    loadSettings,
  ]);

  const generateAndApplyAboutCopyV3 = useCallback(async () => {
    if (!websiteId) return;
    setAiMessage(null);

    try {
      const aiResponse = (await triggerContentAgent({
        mode: "about_copy",
        city: templateCity,
        industry: templateIndustry,
        businessName: templateBusinessName,
        aboutContext: aboutContextInput,
      })) as AIAboutCopyResponse;

      if (aiResponse?.step !== "about_copy_generated") {
        setAiMessage("AI did not return About/Team output.");
        return;
      }

      const mergedForm: FormData = {
        ...form,
        cta_headline: pickValue(
          form.cta_headline,
          aiResponse.contactCtaHeadline || form.cta_headline || "",
          templateForceReplace,
        ),
        cta_body: pickValue(
          form.cta_body,
          aiResponse.contactCtaBody || form.cta_body || "",
          templateForceReplace,
        ),
      };

      setForm(mergedForm);
      const settingsRes = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(mergedForm),
      });
      if (!settingsRes.ok) {
        throw new Error(`Failed to save About copy (${settingsRes.status})`);
      }

      if (!team.length || templateForceReplace) {
        if (team.length) {
          const primary = team[0];
          await fetch(`${getApiBaseUrl()}/team-members/${primary.id}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
              name: aiResponse.teamName || primary.name,
              title: aiResponse.teamTitle || primary.title,
              bio: aiResponse.teamBio || primary.bio,
              photo_url: primary.photo_url,
              linkedin_url: primary.linkedin_url,
              sort_order: primary.sort_order,
            }),
          });
        } else {
          await fetch(`${getApiBaseUrl()}/team-members`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              name: aiResponse.teamName || templateBusinessName || "Owner",
              title: aiResponse.teamTitle || "Owner / Founder",
              bio:
                aiResponse.teamBio ||
                `${templateBusinessName || "Our team"} is committed to quality service in ${templateCity || "your area"}.`,
              photo_url: null,
              linkedin_url: null,
              sort_order: 0,
              website_id: websiteId,
            }),
          });
        }
      }

      await Promise.all([loadSettings(websiteId), loadTeam(websiteId)]);
      setAiMessage("V3 About/Team copy applied successfully.");
    } catch (e) {
      setAiMessage(
        e instanceof Error ? e.message : "Failed to generate/apply V3 About copy.",
      );
    }
  }, [
    websiteId,
    triggerContentAgent,
    templateCity,
    templateIndustry,
    templateBusinessName,
    aboutContextInput,
    form,
    templateForceReplace,
    team,
    loadSettings,
    loadTeam,
  ]);

  const headerNavLinks = coerceNavLinks(form.header_nav_links as FooterNavLink[] | null);
  const footerNavLinks = coerceNavLinks(form.footer_nav_links as FooterNavLink[] | null);
  const headerLinkStatuses = headerNavLinks.map((link) =>
    getNavLinkStatus(link.href ?? "", publishedPageSlugs),
  );
  const missingHeaderLinks = headerNavLinks
    .map((link, idx) => ({ link, status: headerLinkStatuses[idx] }))
    .filter(({ status }) => status.tone === "warn");
  const footerLinkStatuses = footerNavLinks.map((link) =>
    getNavLinkStatus(link.href ?? "", publishedPageSlugs),
  );

  const setNavLinksForLocation = useCallback(
    (location: "header" | "footer", nextLinks: FooterNavLink[]) => {
      setForm((prev) => {
        const scoped = coerceNavLinks(nextLinks);
        return {
          ...prev,
          ...(location === "header"
            ? { header_nav_links: scoped }
            : { footer_nav_links: scoped }),
        };
      });
    },
    [],
  );

  const applyHeaderNavTemplate = useCallback(() => {
    const template = HEADER_NAV_TEMPLATES[headerNavTemplateIndustry] ?? [];
    setNavLinksForLocation("header", template);
    setTemplateMessage("Header nav template applied. Save Changes to publish.");
  }, [headerNavTemplateIndustry, setNavLinksForLocation]);

  const applyFooterNavTemplate = useCallback(() => {
    const template = DEFAULT_FOOTER_LINKS.map((l) => ({
      label:
        footerNavTemplateIndustry === "ecommerce" && l.label === "Services"
          ? "Shop"
          : l.label,
      href:
        footerNavTemplateIndustry === "ecommerce" && l.href === "/services"
          ? "/shop"
          : l.href,
    }));
    setNavLinksForLocation("footer", template);
    setTemplateMessage("Footer nav template applied. Save Changes to publish.");
  }, [footerNavTemplateIndustry, setNavLinksForLocation]);

  const updateNavLink = useCallback(
    (
      location: "header" | "footer",
      index: number,
      key: "label" | "href",
      value: string,
    ) => {
      const source = location === "header" ? headerNavLinks : footerNavLinks;
      const next = source.map((item, i) =>
        i === index ? { ...item, [key]: value } : { ...item },
      );
      setNavLinksForLocation(location, next);
    },
    [headerNavLinks, footerNavLinks, setNavLinksForLocation],
  );

  const addNavLink = useCallback(
    (location: "header" | "footer") => {
      const source = location === "header" ? headerNavLinks : footerNavLinks;
      setNavLinksForLocation(location, [
        ...source,
        { label: "New Link", href: "#" },
      ]);
    },
    [headerNavLinks, footerNavLinks, setNavLinksForLocation],
  );

  const removeNavLink = useCallback(
    (location: "header" | "footer", index: number) => {
      const source = location === "header" ? headerNavLinks : footerNavLinks;
      setNavLinksForLocation(
        location,
        source.filter((_, i) => i !== index),
      );
    },
    [headerNavLinks, footerNavLinks, setNavLinksForLocation],
  );

  // ── Guards ──
  if (loading)
    return <div className="p-8 text-gray-400">Loading settings…</div>;
  if (!websiteId)
    return (
      <div className="p-8 text-gray-500">
        <code>website_id</code>.
      </div>
    );

  const TABS: { id: Tab; label: string; previewPath: string }[] = [
    {
      id: "settings",
      label: "Global Settings",
      previewPath: `/sites/${websiteId}`,
    },
    {
      id: "services",
      label: "Services",
      previewPath: `/sites/${websiteId}/services`,
    },
    {
      id: "team",
      label: "Team / About",
      previewPath: `/sites/${websiteId}/about`,
    },
    ...(form.ecommerce_enabled
      ? [
          {
            id: "shop" as Tab,
            label: "Shop",
            previewPath: `/sites/${websiteId}/shop`,
          },
        ]
      : []),
  ];

  const previewUrl =
    TABS.find((t) => t.id === tab)?.previewPath ?? `/sites/${websiteId}`;

  const primaryDomainRecord =
    domains.find((domain) => domain.isPrimary) ?? domains[0] ?? null;
  const detectedWebsiteMode =
    primaryDomainRecord &&
    primaryDomainRecord.status === "active" &&
    !isTemporaryWebsiteHost(primaryDomainRecord.domain)
      ? "final_domain"
      : "temporary_launch";
  const selectedLaunchMode: LaunchMode =
    form.launch_mode === "final_domain" ? "final_domain" : "temporary_launch";
  const actualEmailMode =
    emailProfile.spfVerified &&
    emailProfile.dkimVerified &&
    emailProfile.fromEmail.trim() &&
    emailProfile.sendingDomain.trim() &&
    !isLikelyPlatformSender(emailProfile.fromEmail)
      ? "tenant_branded"
      : emailProfile.fromEmail.trim() || emailProfile.replyTo.trim() || emailProfile.sendingDomain.trim()
        ? "platform_sender"
        : "not_configured";
  const selectedEmailMode: EmailMode =
    emailProfile.emailMode === "tenant_branded"
      ? "tenant_branded"
      : "platform_sender";
  const lastSuccessfulSenderMatches =
    !!emailProfile.fromEmail.trim() &&
    !!emailProfile.lastTestEmailSender &&
    emailProfile.lastTestEmailSender
      .toLowerCase()
      .includes(emailProfile.fromEmail.trim().toLowerCase());
  const launchChecklist: LaunchChecklistItem[] = [
    {
      key: "domain-primary",
      label: "Primary website domain is configured and active",
      satisfied: Boolean(primaryDomainRecord?.domain) && primaryDomainRecord?.status === "active",
      detail: primaryDomainRecord?.domain
        ? `${primaryDomainRecord.domain} (${primaryDomainRecord.status})`
        : "No primary tenant domain is configured yet.",
    },
    {
      key: "domain-final",
      label: "Primary domain is a final client hostname",
      satisfied:
        Boolean(primaryDomainRecord?.domain) &&
        primaryDomainRecord?.status === "active" &&
        !isTemporaryWebsiteHost(primaryDomainRecord.domain),
      detail: primaryDomainRecord?.domain
        ? isTemporaryWebsiteHost(primaryDomainRecord.domain)
          ? "Current primary domain is still a temporary RC-controlled or preview hostname."
          : "Primary domain is not flagged as a temporary host."
        : "Add and verify the final client domain first.",
    },
    {
      key: "email-mode",
      label: "Desired email mode is tenant branded",
      satisfied: selectedEmailMode === "tenant_branded",
      detail:
        selectedEmailMode === "tenant_branded"
          ? "Tenant branded email mode is selected."
          : "Email mode is still set to platform sender.",
    },
    {
      key: "email-verification",
      label: "Tenant sender fields and SPF/DKIM verification are complete",
      satisfied:
        !!emailProfile.fromEmail.trim() &&
        !!emailProfile.sendingDomain.trim() &&
        emailProfile.spfVerified &&
        emailProfile.dkimVerified,
      detail:
        !!emailProfile.fromEmail.trim() && !!emailProfile.sendingDomain.trim()
          ? emailProfile.spfVerified && emailProfile.dkimVerified
            ? "Sender fields exist and SPF/DKIM are verified."
            : "Sender fields exist but SPF/DKIM verification is still incomplete."
          : "From email and sending domain are both required.",
    },
    {
      key: "email-test",
      label: "A successful live outbound test email has been recorded",
      satisfied:
        emailProfile.lastTestEmailStatus === "success" &&
        !!emailProfile.lastTestEmailAt &&
        lastSuccessfulSenderMatches,
      detail:
        emailProfile.lastTestEmailStatus === "success" && emailProfile.lastTestEmailAt
          ? lastSuccessfulSenderMatches
            ? `Successful test recorded ${new Date(emailProfile.lastTestEmailAt).toLocaleString()}.`
            : "A test succeeded, but the recorded sender does not match the configured tenant sender."
          : "No successful test email is recorded yet.",
    },
  ];
  const isFinalLaunchReady = launchChecklist.every((item) => item.satisfied);
  const providerBlockedReasons = [
    !emailProfile.available
      ? "Email delivery controls are not available in this environment yet."
      : null,
    selectedLaunchMode === "final_domain" && detectedWebsiteMode !== "final_domain"
      ? "The tenant is still on a temporary or unverified website hostname."
      : null,
    selectedEmailMode === "tenant_branded" && actualEmailMode !== "tenant_branded"
      ? "Tenant-branded sender verification is still incomplete."
      : null,
    selectedLaunchMode === "final_domain" &&
    !(emailProfile.lastTestEmailStatus === "success" && lastSuccessfulSenderMatches)
      ? "A successful outbound sender test has not been recorded for the configured tenant sender."
      : null,
  ].filter(Boolean) as string[];
  const launchReadinessTone =
    selectedLaunchMode === "final_domain"
      ? isFinalLaunchReady
        ? "ready"
        : "blocked"
      : "temporary";
  const launchReadinessTitle =
    launchReadinessTone === "ready"
      ? "Final Launch Ready"
      : launchReadinessTone === "blocked"
        ? "Provider Blocked / Not Launch Ready"
        : "Temporary Launch Active";
  const launchReadinessSummary =
    launchReadinessTone === "ready"
      ? "Domain, sender verification, and outbound test checks are aligned for final launch."
      : launchReadinessTone === "blocked"
        ? "Final-domain launch is selected, but external provider or verification work still blocks a real go-live."
        : "This tenant is intentionally operating in temporary launch mode while provider-dependent final launch work remains deferred.";
  const launchReadinessClass =
    launchReadinessTone === "ready"
      ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
      : launchReadinessTone === "blocked"
        ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
        : "border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/20";
  const launchReadinessTextClass =
    launchReadinessTone === "ready"
      ? "text-green-700 dark:text-green-300"
      : launchReadinessTone === "blocked"
        ? "text-amber-800 dark:text-amber-300"
        : "text-sky-800 dark:text-sky-300";

  const isTabLocked = (tabId: Tab) => {
    if (tabId === "settings") return !canEditSiteSettings;
    if (tabId === "services") return !contentPermissions.edit_services;
    if (tabId === "team") return !contentPermissions.edit_team;
    return false;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Global Site Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Edit tenant-wide site configuration, shared content, navigation, and launch settings.
          </p>
        </div>
        <Link
          href={previewUrl}
          target="_blank"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Preview ↗
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            disabled={isTabLocked(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === id
                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            } ${isTabLocked(id) ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {permissionsLoading ? (
        <p className="text-xs text-gray-500">Loading content permissions...</p>
      ) : null}
      {permissionsError ? (
        <p className="text-xs text-amber-700">
          Permission profile could not be loaded; using default access.
        </p>
      ) : null}

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <>
          <div className={`${SECTION} ${launchReadinessClass}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className={`text-base font-semibold ${launchReadinessTextClass}`}>
                  {launchReadinessTitle}
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  {launchReadinessSummary}
                </p>
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                  Saved launch mode: <strong>{launchModeLabel(selectedLaunchMode)}</strong>
                  {primaryDomainRecord?.domain ? ` | primary domain: ${primaryDomainRecord.domain}` : " | no primary domain yet"}
                  {` | actual email state: ${emailModeLabel(actualEmailMode)}`}
                </p>
              </div>
              <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-200">
                Pause-state workflow is documented in TENANT_LIVE_TEST_RUNBOOK.md.
              </div>
            </div>

            {launchReadinessTone === "blocked" || launchReadinessTone === "temporary" ? (
              <div className="mt-4 space-y-2">
                {providerBlockedReasons.length > 0 ? (
                  providerBlockedReasons.map((reason) => (
                    <div
                      key={reason}
                      className="rounded-lg border border-white/60 bg-white/70 px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
                    >
                      {reason}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-200">
                    Final launch is not selected. Continue tenant setup, content population, and temporary-host validation without claiming branded final launch readiness.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className={SECTION}>
            <p className={SECTION_TITLE}>Domains (Phase 5)</p>
            <p className="mb-4 text-sm text-gray-500">
              Onboard custom domains for this tenant. Add DNS records, then run
              verification until status becomes <strong>active</strong>.
            </p>

            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <p>
                Detected website state: <strong>{launchModeLabel(detectedWebsiteMode)}</strong>
              </p>
              <p className="mt-1">
                {detectedWebsiteMode === "final_domain"
                  ? "A verified custom domain appears to be in place. Continue with branded sender setup only after real domain DNS is stable."
                  : "No final verified client domain is active yet. For a no-domain tenant, use a stable RC-controlled subdomain instead of a one-off preview URL until the real client domain is ready."}
              </p>
            </div>

            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Launch control
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Persist the intended launch mode here. Final domain launch is blocked until all launch gate checks pass.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                      <input
                        type="radio"
                        name="launch-mode"
                        checked={selectedLaunchMode === "temporary_launch"}
                        onChange={() => setForm((prev) => ({ ...prev, launch_mode: "temporary_launch" }))}
                        className="mr-2"
                      />
                      Temporary launch
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Stable RC-controlled hostname plus platform sender.
                      </p>
                    </label>
                    <label className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                      <input
                        type="radio"
                        name="launch-mode"
                        checked={selectedLaunchMode === "final_domain"}
                        onChange={() => setForm((prev) => ({ ...prev, launch_mode: "final_domain" }))}
                        className="mr-2"
                      />
                      Final domain launch
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Real client domain plus verified tenant-branded sender.
                      </p>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    onClick={saveLaunchMode}
                    disabled={launchModeSaving || !websiteId || !canEditSiteSettings}
                    className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {launchModeSaving ? "Saving..." : "Save Launch Mode"}
                  </button>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isFinalLaunchReady ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                    {isFinalLaunchReady ? "Final launch ready" : "Final launch blocked"}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {launchChecklist.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-lg border px-3 py-3 text-sm ${item.satisfied ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20" : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"}`}
                  >
                    <p className={`font-medium ${item.satisfied ? "text-green-700 dark:text-green-300" : "text-amber-800 dark:text-amber-300"}`}>
                      {item.satisfied ? "Ready" : "Blocked"} - {item.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              {launchModeMessage ? (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  {launchModeMessage}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className={INPUT}
                placeholder="clientdomain.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
              <button
                type="button"
                onClick={onboardDomain}
                disabled={domainSubmitting}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {domainSubmitting ? "Submitting…" : "Add Domain"}
              </button>
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={domainPrimaryInput}
                onChange={(e) => setDomainPrimaryInput(e.target.checked)}
              />
              Set as primary domain for this tenant
            </label>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Conflict detection is enforced server-side (duplicate domains
                return conflict errors).
              </p>
              <button
                type="button"
                onClick={() => websiteId && loadDomains(websiteId)}
                disabled={domainsLoading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {domainsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {domainsLoading ? (
                <p className="text-sm text-gray-400">Loading domains…</p>
              ) : domains.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700">
                  No onboarded domains yet.
                </p>
              ) : (
                domains.map((d) => {
                  const dnsRecords = domainDnsRecords[d.domain] || [];
                  const isDnsExpanded = domainDnsExpanded === d.domain;
                  const isCustomDomain = d.domain.split(".").length <= 2 && !d.domain.endsWith(".rctechbridge.com");
                  const resendInfo = resendDomainStatus[d.domain];
                  const isResendBusy = resendDomainCreating === d.domain;
                  return (
                    <div
                      key={`${d.domain}-${d.id ?? "none"}`}
                      className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {d.domain}
                            {d.isPrimary && (
                              <span className="ml-2 rounded bg-[#CD7F32]/10 px-2 py-0.5 text-xs text-[#CD7F32]">
                                primary
                              </span>
                            )}
                            <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${
                              d.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : d.status === "verification_failed"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            }`}>
                              {d.status}
                            </span>
                          </p>
                          {d.verificationType && d.verificationTarget ? (
                            <p className="mt-1 text-xs text-gray-500">
                              {d.verificationType}: {d.verificationTarget}
                            </p>
                          ) : null}
                          {d.failureReason && (
                            <p className="mt-1 text-xs text-red-500">
                              {d.failureReason}
                            </p>
                          )}
                          {isCustomDomain && resendInfo && (
                            <p className="mt-1 text-xs text-gray-500">
                              Mail domain (mg.{d.domain}):{" "}
                              <span className={
                                resendInfo.status === "verified"
                                  ? "font-semibold text-green-600 dark:text-green-400"
                                  : "font-semibold text-amber-600 dark:text-amber-400"
                              }>
                                {resendInfo.status}
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isCustomDomain && (
                            resendInfo ? (
                              <button
                                type="button"
                                onClick={() => verifyResendDomain(d.domain)}
                                disabled={isResendBusy}
                                className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                              >
                                {isResendBusy ? "Checking…" : "Verify Mail DNS"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setupResendDomain(d.domain)}
                                disabled={isResendBusy}
                                className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                              >
                                {isResendBusy ? "Creating…" : "Setup Sending Domain"}
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (isDnsExpanded) {
                                setDomainDnsExpanded(null);
                              } else {
                                setDomainDnsExpanded(d.domain);
                                if (!dnsRecords.length) {
                                  loadDnsInfo(d.domain);
                                }
                              }
                            }}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            {domainDnsLoading === d.domain ? "Loading…" : isDnsExpanded ? "Hide DNS" : "DNS Records"}
                          </button>
                          <button
                            type="button"
                            onClick={() => verifyDomain(d)}
                            disabled={domainVerifyingId === (d.id ?? -1)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            {domainVerifyingId === (d.id ?? -1)
                              ? "Verifying…"
                              : "Verify"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDomain(d)}
                            disabled={domainRemovingId === (d.id ?? -1)}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            {domainRemovingId === (d.id ?? -1)
                              ? "Removing…"
                              : "Remove"}
                          </button>
                        </div>
                      </div>

                      {isDnsExpanded && (
                        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                          <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Required DNS Records
                          </p>
                          {dnsRecords.length === 0 ? (
                            <p className="text-xs text-gray-400">No DNS records available. The domain may not be on Vercel yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-600">
                                    <th className="pb-1 pr-4 font-medium">Type</th>
                                    <th className="pb-1 pr-4 font-medium">Name</th>
                                    <th className="pb-1 pr-4 font-medium">Value</th>
                                    <th className="pb-1 font-medium">Purpose</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dnsRecords.map((rec, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                      <td className="py-1.5 pr-4 font-mono font-semibold">{rec.type}</td>
                                      <td className="py-1.5 pr-4 font-mono">{rec.name}</td>
                                      <td className="max-w-[200px] truncate py-1.5 pr-4 font-mono" title={rec.value}>{rec.value}</td>
                                      <td className="py-1.5 text-gray-500">{rec.reason || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <p className="mt-2 text-xs text-gray-400">
                            Add these records in your DNS provider. After DNS propagates, click Verify.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {domainMessage && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {domainMessage}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">
                  Email Delivery (Phase 5)
                </h3>
                <p className="text-sm text-body-color dark:text-bodydark">
                  Configure per-tenant sender profile, SPF/DKIM status, and lead notification routing.
                </p>
                <p className="mt-2 text-xs text-body-color dark:text-bodydark">
                  Use this before launch when the tenant needs branded outbound email and clear routing for new lead alerts.
                  The sender fields control how email appears to clients, and the recipient list controls who gets notified when leads arrive.
                </p>
                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-body-color dark:border-strokedark dark:bg-meta-4 dark:text-bodydark">
                  <p>
                    Saved launch mode: <strong>{launchModeLabel(selectedLaunchMode)}</strong>
                  </p>
                  <p className="mt-1">
                    Detected website state: <strong>{launchModeLabel(detectedWebsiteMode)}</strong>
                    {primaryDomainRecord?.domain ? ` (${primaryDomainRecord.domain})` : " (no primary domain yet)"}
                  </p>
                  <p className="mt-1">
                    Saved email mode: <strong>{emailModeLabel(selectedEmailMode)}</strong>
                  </p>
                  <p className="mt-1">
                    Actual email state: <strong>{emailModeLabel(actualEmailMode)}</strong>
                  </p>
                  <p className="mt-2">
                    Operational rule: saved tenant email profile values are configuration state. Do not claim branded outbound email is live until a real outbound test confirms the expected sender identity.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => websiteId && loadEmailProfile(websiteId)}
                  disabled={emailProfileLoading || !websiteId}
                  className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-black hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                >
                  {emailProfileLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={verifyEmailDomain}
                  disabled={
                    emailProfileVerifying ||
                    !websiteId ||
                    !emailProfile.available ||
                    !emailProfile.sendingDomain.trim()
                  }
                  className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailProfileVerifying ? "Checking..." : "Verify SPF/DKIM"}
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
              <p className="text-sm font-medium text-black dark:text-white">
                Desired email mode
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="rounded-lg border border-stroke bg-white p-3 text-sm dark:border-strokedark dark:bg-boxdark">
                  <input
                    type="radio"
                    name="email-mode"
                    checked={emailProfile.emailMode === "platform_sender"}
                    onChange={() =>
                      setEmailProfile((prev) => ({
                        ...prev,
                        emailMode: "platform_sender",
                      }))
                    }
                    className="mr-2"
                  />
                  Platform sender
                  <p className="mt-1 text-xs text-body-color dark:text-bodydark">
                    Use the shared verified RC sender while the tenant is still in temporary launch mode.
                  </p>
                </label>
                <label className="rounded-lg border border-stroke bg-white p-3 text-sm dark:border-strokedark dark:bg-boxdark">
                  <input
                    type="radio"
                    name="email-mode"
                    checked={emailProfile.emailMode === "tenant_branded"}
                    onChange={() =>
                      setEmailProfile((prev) => ({
                        ...prev,
                        emailMode: "tenant_branded",
                      }))
                    }
                    className="mr-2"
                  />
                  Tenant branded
                  <p className="mt-1 text-xs text-body-color dark:text-bodydark">
                    Use the tenant sender only after sender fields are complete, SPF/DKIM are verified, and the live test succeeds.
                  </p>
                </label>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-black dark:text-white">
                  From Name
                </span>
                <input
                  type="text"
                  value={emailProfile.fromName}
                  onChange={(e) =>
                    setEmailProfile((prev) => ({
                      ...prev,
                      fromName: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-stroke px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
                  placeholder="TechBridge Team"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-black dark:text-white">
                  From Email
                </span>
                <input
                  type="email"
                  value={emailProfile.fromEmail}
                  onChange={(e) =>
                    setEmailProfile((prev) => ({
                      ...prev,
                      fromEmail: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-stroke px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
                  placeholder="hello@yourdomain.com"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-black dark:text-white">
                  Reply-To
                </span>
                <input
                  type="email"
                  value={emailProfile.replyTo}
                  onChange={(e) =>
                    setEmailProfile((prev) => ({
                      ...prev,
                      replyTo: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-stroke px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
                  placeholder="support@yourdomain.com"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-black dark:text-white">
                  Sending Domain
                </span>
                <input
                  type="text"
                  value={emailProfile.sendingDomain}
                  onChange={(e) =>
                    setEmailProfile((prev) => ({
                      ...prev,
                      sendingDomain: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-stroke px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
                  placeholder="mg.yourdomain.com"
                />
              </label>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-black dark:text-white">
                Lead Notification Recipients
              </span>
              <input
                type="text"
                value={leadRoutingInput}
                onChange={(e) => setLeadRoutingInput(e.target.value)}
                className="w-full rounded-md border border-stroke px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
                placeholder="sales@yourdomain.com, ops@yourdomain.com"
              />
              <span className="mt-1 block text-xs text-body-color dark:text-bodydark">
                Comma-separated email addresses used for tenant lead routing.
              </span>
            </label>

            {emailProfile.verificationNotes ? (
              <div className="mb-4 rounded-md border border-stroke bg-gray-2 px-3 py-2 text-xs text-body-color dark:border-strokedark dark:bg-meta-4 dark:text-bodydark">
                {emailProfile.verificationNotes}
              </div>
            ) : null}

            {actualEmailMode !== "tenant_branded" ? (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                {detectedWebsiteMode === "temporary_launch"
                  ? "This tenant should stay in temporary launch mode until the final client domain exists and the sending subdomain is verified. Use a stable RC-controlled website hostname and a platform-owned verified sender in the meantime."
                  : "This tenant has not completed branded sender verification yet. Finish SPF/DKIM, confirm the final sender values, and send a real outbound test before calling email live."}
              </div>
            ) : null}

            <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="block flex-1">
                  <span className="mb-1 block text-sm font-medium text-black dark:text-white">
                    Test recipient
                  </span>
                  <input
                    type="email"
                    value={emailTestRecipient}
                    onChange={(e) => setEmailTestRecipient(e.target.value)}
                    className="w-full rounded-md border border-stroke px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark"
                    placeholder="qa@clientdomain.com"
                  />
                </label>
                <button
                  type="button"
                  onClick={sendEmailProfileTest}
                  disabled={emailProfileTesting || !websiteId || !emailProfile.available}
                  className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailProfileTesting ? "Sending Test..." : "Send Test Email"}
                </button>
              </div>
              <div className="mt-3 text-xs text-body-color dark:text-bodydark">
                Last test status: <strong>{emailProfile.lastTestEmailStatus === "success" ? "Success" : emailProfile.lastTestEmailStatus === "failed" ? "Failed" : "Not run yet"}</strong>
                {emailProfile.lastTestEmailAt ? ` at ${new Date(emailProfile.lastTestEmailAt).toLocaleString()}` : ""}
                {emailProfile.lastTestEmailTo ? ` to ${emailProfile.lastTestEmailTo}` : ""}
                {emailProfile.lastTestEmailSender ? ` using ${emailProfile.lastTestEmailSender}` : ""}
              </div>
              {emailProfile.lastTestEmailError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Last test error: {emailProfile.lastTestEmailError}
                </p>
              ) : null}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  emailProfile.spfVerified
                    ? "bg-success/20 text-success"
                    : "bg-warning/20 text-warning"
                }`}
              >
                SPF {emailProfile.spfVerified ? "Verified" : "Pending"}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  emailProfile.dkimVerified
                    ? "bg-success/20 text-success"
                    : "bg-warning/20 text-warning"
                }`}
              >
                DKIM {emailProfile.dkimVerified ? "Verified" : "Pending"}
              </span>
              {emailProfile.updatedAt ? (
                <span className="text-xs text-body-color dark:text-bodydark">
                  Last updated {new Date(emailProfile.updatedAt).toLocaleString()}
                </span>
              ) : null}
              {emailProfile.verificationLastCheckedAt ? (
                <span className="text-xs text-body-color dark:text-bodydark">
                  Last checked {new Date(emailProfile.verificationLastCheckedAt).toLocaleString()}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveEmailProfile}
                disabled={emailProfileSaving || !websiteId || !emailProfile.available}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailProfileSaving ? "Saving..." : "Save Email Profile"}
              </button>
              {emailProfileMessage ? (
                <span className="text-sm text-body-color dark:text-bodydark">
                  {emailProfileMessage}
                </span>
              ) : null}
            </div>
          </div>

          <div className={SECTION}>
            <p className={SECTION_TITLE}>Template Library (V1)</p>
            <p className="mb-4 text-sm text-gray-500">
              Quick-start copy for new client onboarding. This will seed Home,
              About, Contact, and 3 starter services.
            </p>
            <p className="mb-4 text-xs text-gray-500">
              Prefill actions only stage values in this form. Nothing is saved until you click <strong>Save Changes</strong>.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Industry Template</label>
                <select
                  className={INPUT}
                  value={templateIndustry}
                  onChange={(e) =>
                    setTemplateIndustry(e.target.value as IndustryTemplate)
                  }
                >
                  <option value="trades">Trades</option>
                  <option value="services">Services</option>
                  <option value="ecommerce">Ecommerce</option>
                  <option value="restaurants">Restaurants</option>
                  <option value="healthcare-wellness">Healthcare / Wellness</option>
                </select>
              </div>
              <Field
                label="Business Name"
                value={templateBusinessName}
                onChange={setTemplateBusinessName}
              />
              <Field
                label="City / Service Area"
                value={templateCity}
                onChange={setTemplateCity}
              />
              <Field
                label="Business Phone"
                value={templatePhone}
                onChange={setTemplatePhone}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Business Email"
                  value={templateEmail}
                  onChange={setTemplateEmail}
                />
              </div>
              <div>
                <label className={LABEL}>Visual Direction</label>
                <select
                  className={INPUT}
                  value={templateVisualDirection}
                  onChange={(e) =>
                    setTemplateVisualDirection(e.target.value as VisualDirection)
                  }
                >
                  <option value="clean">Clean</option>
                  <option value="bold">Bold</option>
                  <option value="warm">Warm</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Copy Angle</label>
                <select
                  className={INPUT}
                  value={templateCopyAngle}
                  onChange={(e) =>
                    setTemplateCopyAngle(e.target.value as CopyAngle)
                  }
                >
                  <option value="results">Results</option>
                  <option value="trust">Trust</option>
                  <option value="community">Community</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Hero Style</label>
                <select
                  className={INPUT}
                  value={templateHeroStyle}
                  onChange={(e) =>
                    setTemplateHeroStyle(e.target.value as HeroStyle)
                  }
                >
                  <option value="direct">Direct Statement</option>
                  <option value="question">Question Hook</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Primary Offer</label>
                <select
                  className={INPUT}
                  value={templateOfferType}
                  onChange={(e) =>
                    setTemplateOfferType(e.target.value as OfferType)
                  }
                >
                  <option value="free-consult">Free Consultation</option>
                  <option value="trial">Free Trial</option>
                  <option value="quote">Get Quote</option>
                  <option value="book-now">Book Now</option>
                </select>
              </div>
            </div>
            <label className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={templateForceReplace}
                onChange={(e) => setTemplateForceReplace(e.target.checked)}
              />
              Replace existing copy in populated fields
            </label>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={applyTemplateLibrary}
                disabled={templateApplying}
                className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {templateApplying ? "Prefilling…" : "Prefill Site Content"}
              </button>
              <span className="text-xs text-gray-500">
                Combination mode: industry + visual + angle + hero + offer.
              </span>
              <button
                type="button"
                onClick={syncHomeAndContactFromContent}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Sync Home + Contact
              </button>
            </div>
            {templateMessage && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {templateMessage}
              </p>
            )}
          </div>

          <div className={SECTION}>
            <p className={SECTION_TITLE}>Header Navigation Templates (Phase A)</p>
            <p className="mb-4 text-sm text-gray-500">
              Configure top navbar links by industry. You can edit, delete, or
              add custom links.
            </p>
            <p className="mb-4 text-xs text-gray-500">
              For anchor links use <code>#services</code>, <code>#faq</code>, <code>#testimonials</code>, or <code>#contact</code>. For a new page, set href like <code>/why-us</code> and create/publish that slug in <code>Custom Pages</code>.
            </p>
            {missingHeaderLinks.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-semibold">Potential 404s detected in Header Navigation</p>
                <p className="mt-1">
                  {missingHeaderLinks.length} link(s) need page setup or href updates. Use Custom Pages to create/publish missing slugs.
                </p>
                <Link
                  href="/main-page"
                  className="mt-2 inline-block font-semibold underline"
                >
                  Open Custom Pages
                </Link>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className={LABEL}>Industry Navbar Template</label>
                <select
                  className={INPUT}
                  value={headerNavTemplateIndustry}
                  onChange={(e) =>
                    setHeaderNavTemplateIndustry(e.target.value as IndustryTemplate)
                  }
                >
                  <option value="trades">Trades</option>
                  <option value="services">Services</option>
                  <option value="ecommerce">Ecommerce</option>
                  <option value="restaurants">Restaurants</option>
                  <option value="healthcare-wellness">Healthcare / Wellness</option>
                </select>
              </div>
              <button
                type="button"
                onClick={applyHeaderNavTemplate}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Prefill Header Links
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {headerNavLinks.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No header links configured yet. Apply a template or add one.
                </p>
              ) : (
                headerNavLinks.map((link, idx) => (
                  <div
                    key={`header-${idx}`}
                    className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto] dark:border-gray-700"
                  >
                    <input
                      className={INPUT}
                      value={link.label}
                      onChange={(e) =>
                        updateNavLink("header", idx, "label", e.target.value)
                      }
                      placeholder="Label"
                    />
                    <input
                      className={INPUT}
                      value={link.href}
                      onChange={(e) =>
                        updateNavLink("header", idx, "href", e.target.value)
                      }
                      placeholder="Href (e.g. /services or #contact)"
                    />
                    <button
                      type="button"
                      onClick={() => removeNavLink("header", idx)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                    <div className="sm:col-span-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${
                          headerLinkStatuses[idx]?.tone === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {headerLinkStatuses[idx]?.tone === "ok"
                          ? "Resolved"
                          : "Needs setup"}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        {headerLinkStatuses[idx]?.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => addNavLink("header")}
              className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              + Add Header Link
            </button>
          </div>

          <div className={SECTION}>
            <p className={SECTION_TITLE}>Footer Navigation</p>
            <p className="mb-4 text-sm text-gray-500">
              Configure footer-specific links separately from the header.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className={LABEL}>Footer Template</label>
                <select
                  className={INPUT}
                  value={footerNavTemplateIndustry}
                  onChange={(e) =>
                    setFooterNavTemplateIndustry(e.target.value as IndustryTemplate)
                  }
                >
                  <option value="trades">Trades</option>
                  <option value="services">Services</option>
                  <option value="ecommerce">Ecommerce</option>
                  <option value="restaurants">Restaurants</option>
                  <option value="healthcare-wellness">Healthcare / Wellness</option>
                </select>
              </div>
              <button
                type="button"
                onClick={applyFooterNavTemplate}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Prefill Footer Links
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {footerNavLinks.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No footer links configured yet. Apply a template or add one.
                </p>
              ) : (
                footerNavLinks.map((link, idx) => (
                  <div
                    key={`footer-${idx}`}
                    className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto] dark:border-gray-700"
                  >
                    <input
                      className={INPUT}
                      value={link.label}
                      onChange={(e) =>
                        updateNavLink("footer", idx, "label", e.target.value)
                      }
                      placeholder="Label"
                    />
                    <input
                      className={INPUT}
                      value={link.href}
                      onChange={(e) =>
                        updateNavLink("footer", idx, "href", e.target.value)
                      }
                      placeholder="Href (e.g. /about or #contact)"
                    />
                    <button
                      type="button"
                      onClick={() => removeNavLink("footer", idx)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                    <div className="sm:col-span-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${
                          footerLinkStatuses[idx]?.tone === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {footerLinkStatuses[idx]?.tone === "ok"
                          ? "Resolved"
                          : "Needs setup"}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        {footerLinkStatuses[idx]?.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => addNavLink("footer")}
              className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              + Add Footer Link
            </button>
          </div>

          <div className={SECTION}>
            <p className={SECTION_TITLE}>Home Page Hero</p>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                Built-in page copy now lives in dedicated page editors. Edit the
                homepage hero in <strong>Built-in Pages</strong> instead of
                Global Site Settings.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/built-in-pages/home"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Open Home Editor
                </Link>
                <Link
                  href="/branding"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Open Branding
                </Link>
              </div>
              <p className="text-xs text-gray-500">
                Global Site Settings still owns cross-cutting branding, contact,
                footer, and shared CTA configuration.
              </p>
            </div>
          </div>

          {/* Branding */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Branding</p>
            <div className="grid grid-cols-3 gap-4">
              <ColorField
                label="Primary Color"
                value={form.primary_color ?? "#CD7F32"}
                onChange={(v) => set("primary_color", v)}
              />
              <ColorField
                label="Secondary Color"
                value={form.secondary_color ?? "#ffffff"}
                onChange={(v) => set("secondary_color", v)}
              />
              <ColorField
                label="Accent Color"
                value={form.accent_color ?? "#C41E3A"}
                onChange={(v) => set("accent_color", v)}
              />
            </div>
            <div className="mt-4">
              <Field
                label="Logo URL (optional)"
                value={form.logo_url ?? ""}
                onChange={(v) => set("logo_url", v)}
              />
              <button
                type="button"
                onClick={() =>
                  openAssetPicker("Select Brand Logo", (url) =>
                    set("logo_url", url),
                  )
                }
                className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Select from Client Assets
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Google Fonts URL (optional)"
                value={form.font_url ?? ""}
                onChange={(v) => set("font_url", v)}
                hint="Paste a Google Fonts embed URL, e.g. https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
              />
              <Field
                label="Font Family CSS (optional)"
                value={form.font_family ?? ""}
                onChange={(v) => set("font_family", v)}
                hint="CSS font-family value, e.g. 'Inter', sans-serif"
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>CTA Section</p>
            <div className="space-y-4">
              <Field
                label="Headline"
                value={form.cta_headline ?? ""}
                onChange={(v) => set("cta_headline", v)}
              />
              <Field
                label="Body Text"
                value={form.cta_body ?? ""}
                onChange={(v) => set("cta_body", v)}
                textarea
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Button Text"
                  value={form.cta_button_text ?? ""}
                  onChange={(v) => set("cta_button_text", v)}
                />
                <Field
                  label="Button URL"
                  value={form.cta_button_url ?? ""}
                  onChange={(v) => set("cta_button_url", v)}
                />
              </div>
              <div>
                <ColorField
                  label="Background Color"
                  value={form.cta_bg_color ?? "#CD7F32"}
                  onChange={(v) => set("cta_bg_color", v)}
                />
                <p className="mt-1 text-xs text-gray-400">
                  If left at default, falls back to:{" "}
                  <span className="font-medium text-gray-500">
                    Accent color
                  </span>
                  {" → "}
                  <span className="font-medium text-gray-500">
                    Primary color
                  </span>
                  {" → "}
                  <span className="font-medium text-gray-500">#CD7F32</span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Footer</p>
            <div className="space-y-4">
              <Field
                label="Tagline"
                value={form.footer_tagline ?? ""}
                onChange={(v) => set("footer_tagline", v)}
              />
              <Field
                label="Copyright Text"
                value={form.footer_copyright ?? ""}
                onChange={(v) => set("footer_copyright", v)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Facebook URL"
                  value={form.footer_social_facebook ?? ""}
                  onChange={(v) => set("footer_social_facebook", v)}
                />
                <Field
                  label="Instagram URL"
                  value={form.footer_social_instagram ?? ""}
                  onChange={(v) => set("footer_social_instagram", v)}
                />
                <Field
                  label="X (Twitter) URL"
                  value={form.footer_social_x ?? ""}
                  onChange={(v) => set("footer_social_x", v)}
                />
                <Field
                  label="LinkedIn URL"
                  value={form.footer_social_linkedin ?? ""}
                  onChange={(v) => set("footer_social_linkedin", v)}
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Contact Info</p>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Email"
                value={form.contact_email ?? ""}
                onChange={(v) => set("contact_email", v)}
              />
              <Field
                label="Phone"
                value={form.contact_phone ?? ""}
                onChange={(v) => set("contact_phone", v)}
              />
              <div className="col-span-2">
                <Field
                  label="Address"
                  value={form.address ?? ""}
                  onChange={(v) => set("address", v)}
                />
              </div>
              <div className="col-span-2">
                <Field
                  label="Google Maps Embed URL"
                  value={form.google_maps_url ?? ""}
                  onChange={(v) => set("google_maps_url", v)}
                  hint="Paste the src URL from Google Maps → Share → Embed a map"
                />
              </div>
            </div>
          </div>

          {/* E-commerce */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>E-commerce</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  Enable Shop
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Shows a Shop link in the nav and enables the product grid
                  page.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleEcommerce}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  form.ecommerce_enabled
                    ? "bg-[#CD7F32]"
                    : "bg-gray-200 dark:bg-gray-600"
                }`}
                aria-checked={!!form.ecommerce_enabled}
                role="switch"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.ecommerce_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pb-8">
            <button
              onClick={handleSave}
              disabled={saving || !canEditSiteSettings}
              className="rounded-lg bg-[#CD7F32] px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#b8702b] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <span className="text-sm font-medium text-green-600">
                ✓ Saved! Landing page will update within 60 s.
              </span>
            )}
            {settingsError && (
              <span className="text-sm text-red-600">{settingsError}</span>
            )}
          </div>
        </>
      )}

      {/* ── Services tab ── */}
      {tab === "services" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Appears on your public <strong>Services</strong> page.
            </p>
            {serviceEdit === null && (
              <button
                onClick={startNewService}
                disabled={!contentPermissions.edit_services}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Service
              </button>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
              Services AI Context Builder (V3)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Primary SEO Keyword"
                value={templateKeyword}
                onChange={setTemplateKeyword}
              />
              <Field
                label="Competitor URL (optional)"
                value={templateCompetitorUrl}
                onChange={setTemplateCompetitorUrl}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Services Client Provides"
                  value={templateServicesInput}
                  onChange={setTemplateServicesInput}
                  textarea
                  hint="One per line or comma-separated. Example: EV Charger Installation, Panel Upgrades, Electrical Troubleshooting"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={generateAndApplyServiceCopyV3}
                disabled={isAIApplying}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isAIApplying
                  ? "Generating V3…"
                  : "Generate & Apply Service Copy (V3)"}
              </button>
              <button
                type="button"
                onClick={generateAIIdeas}
                disabled={isAIApplying}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {isAIApplying ? "Generating…" : "Generate Legacy Ideas"}
              </button>
            </div>
            {aiIdeas.length > 0 && (
              <div className="mt-3 space-y-2">
                {aiIdeas.map((ideaItem) => (
                  <button
                    key={ideaItem.idea}
                    type="button"
                    onClick={() => applyAIDraftIdea(ideaItem.idea)}
                    disabled={isAIApplying}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      aiSelectedIdea === ideaItem.idea
                        ? "border-[#CD7F32] bg-orange-50 dark:bg-gray-800"
                        : "border-gray-200 hover:border-[#CD7F32] dark:border-gray-700"
                    }`}
                  >
                    <p className="font-medium text-gray-800 dark:text-white">
                      {ideaItem.idea}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {aiMessage && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {aiMessage}
              </p>
            )}
          </div>

          {/* Service form */}
          {serviceEdit !== null && (
            <div className="rounded-xl border border-[#CD7F32]/30 bg-orange-50/40 p-5 shadow-sm dark:bg-gray-800">
              <p className="mb-4 text-sm font-semibold tracking-wide text-[#CD7F32] uppercase">
                {serviceEdit === "new" ? "New Service" : "Edit Service"}
              </p>
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Title *</label>
                  <input
                    className={INPUT}
                    value={serviceForm.title}
                    onChange={(e) => setServiceField("title", e.target.value)}
                    placeholder="e.g. Web Design"
                  />
                </div>
                <div>
                  <label className={LABEL}>Slug</label>
                  <input
                    className={INPUT}
                    value={serviceForm.slug}
                    onChange={(e) =>
                      setServiceField("slug", slugify(e.target.value))
                    }
                    placeholder="e.g. web-design"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Auto-generated from title.
                  </p>
                </div>
                <div>
                  <label className={LABEL}>Description</label>
                  <textarea
                    className={INPUT}
                    rows={4}
                    value={serviceForm.content}
                    onChange={(e) => setServiceField("content", e.target.value)}
                    placeholder="Describe this service…"
                  />
                </div>
                <div>
                  <label className={LABEL}>Service Image URL (optional)</label>
                  <input
                    className={INPUT}
                    value={serviceForm.image_url}
                    onChange={(e) =>
                      setServiceField("image_url", e.target.value)
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      openAssetPicker("Select Service Image", (url) =>
                        setServiceField("image_url", url),
                      )
                    }
                    className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Select from Client Assets
                  </button>
                  <p className="mt-1 text-xs text-gray-400">
                    Paste a direct image URL. Displayed in the services panel on
                    your public site.
                  </p>
                  {serviceForm.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={serviceForm.image_url}
                      alt="Service preview"
                      className="mt-3 h-36 w-full rounded-lg border border-gray-200 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
              {serviceError && (
                <p className="mt-2 text-sm text-red-500">{serviceError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveService}
                  disabled={serviceSaving || !contentPermissions.edit_services}
                  className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {serviceSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancelService}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Service list */}
          {servicesLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : services.length === 0 && serviceEdit === null ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
              No services yet. Click <strong>+ Add Service</strong> to get
              started.
            </div>
          ) : (
            <ul className="space-y-3">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex min-w-0 gap-3">
                    {s.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.image_url}
                        alt={s.title}
                        className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {s.title}
                      </p>
                      {s.content && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {s.content.replace(/<[^>]+>/g, "")}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        slug: {s.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditService(s)}
                      disabled={!contentPermissions.edit_services}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteService(s.id)}
                      disabled={!contentPermissions.edit_services}
                      className="rounded-md border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Team / About tab ── */}
      {tab === "team" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Appears on your public <strong>About</strong> page.
            </p>
            {teamEdit === null && (
              <button
                onClick={startNewTeam}
                disabled={!contentPermissions.edit_team}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Member
              </button>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
              About / Team AI Context Builder (V3)
            </p>
            <Field
              label="About Context (founder story, years in business, credentials, trust points)"
              value={aboutContextInput}
              onChange={setAboutContextInput}
              textarea
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={generateAndApplyAboutCopyV3}
                disabled={isAIApplying}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isAIApplying
                  ? "Generating About…"
                  : "Generate & Apply About Copy (V3)"}
              </button>
              <span className="text-xs text-gray-500">
                Applies CTA + primary team/about copy.
              </span>
            </div>
            {aiMessage && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {aiMessage}
              </p>
            )}
          </div>

          {/* Team form */}
          {teamEdit !== null && (
            <div className="rounded-xl border border-[#CD7F32]/30 bg-orange-50/40 p-5 shadow-sm dark:bg-gray-800">
              <p className="mb-4 text-sm font-semibold tracking-wide text-[#CD7F32] uppercase">
                {teamEdit === "new" ? "New Team Member" : "Edit Team Member"}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Name *</label>
                  <input
                    className={INPUT}
                    value={teamForm.name}
                    onChange={(e) => setTeamField("name", e.target.value)}
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div>
                  <label className={LABEL}>Role / Title</label>
                  <input
                    className={INPUT}
                    value={teamForm.title}
                    onChange={(e) => setTeamField("title", e.target.value)}
                    placeholder="e.g. Lead Developer"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Bio</label>
                  <textarea
                    className={INPUT}
                    rows={3}
                    value={teamForm.bio}
                    onChange={(e) => setTeamField("bio", e.target.value)}
                    placeholder="Short bio shown on the About page…"
                  />
                </div>
                <div>
                  <label className={LABEL}>Photo URL</label>
                  <input
                    className={INPUT}
                    value={teamForm.photo_url}
                    onChange={(e) => setTeamField("photo_url", e.target.value)}
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      openAssetPicker("Select Team Photo", (url) =>
                        setTeamField("photo_url", url),
                      )
                    }
                    className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Select from Client Assets
                  </button>
                  <p className="mt-1 text-xs text-gray-400">
                    Leave blank for initials avatar.
                  </p>
                </div>
                <div>
                  <label className={LABEL}>LinkedIn URL</label>
                  <input
                    className={INPUT}
                    value={teamForm.linkedin_url}
                    onChange={(e) =>
                      setTeamField("linkedin_url", e.target.value)
                    }
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
                <div>
                  <label className={LABEL}>Sort Order</label>
                  <input
                    className={INPUT}
                    type="number"
                    min={0}
                    value={teamForm.sort_order}
                    onChange={(e) =>
                      setTeamField("sort_order", Number(e.target.value))
                    }
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Lower = appears first.
                  </p>
                </div>
              </div>
              {teamError && (
                <p className="mt-2 text-sm text-red-500">{teamError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveTeam}
                  disabled={teamSaving || !contentPermissions.edit_team}
                  className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {teamSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancelTeam}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Team list */}
          {teamLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : team.length === 0 && teamEdit === null ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
              No team members yet. Click <strong>+ Add Member</strong> to get
              started.
            </div>
          ) : (
            <ul className="space-y-3">
              {team.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#CD7F32] text-lg font-bold text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {m.name}
                      </p>
                      {m.title && (
                        <p className="text-sm text-[#CD7F32]">{m.title}</p>
                      )}
                      {m.bio && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {m.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditTeam(m)}
                      disabled={!contentPermissions.edit_team}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTeam(m.id)}
                      disabled={!contentPermissions.edit_team}
                      className="rounded-md border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Shop tab ── */}
      {tab === "shop" && (
        <EntitlementGate
          requiredModules={["checkout_ecommerce"]}
          requiredFeatures={["commerce.checkout.manage"]}
          pageTitle="Shop Management"
        >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold tracking-wide text-[#CD7F32] uppercase">
                  Stripe Connect
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Connect this tenant&apos;s Stripe account for live payouts and
                  tenant-scoped checkout settlement.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => websiteId && loadStripeConnectStatus(websiteId)}
                  disabled={stripeConnectLoading || !websiteId}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {stripeConnectLoading ? "Refreshing…" : "Refresh Status"}
                </button>
                <button
                  type="button"
                  onClick={startStripeConnectOnboarding}
                  disabled={stripeConnectStarting || !websiteId}
                  className="rounded-lg bg-[#CD7F32] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {stripeConnectStarting
                    ? "Redirecting…"
                    : stripeConnectStatus?.connected
                      ? "Continue Onboarding"
                      : "Connect Stripe"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <p>
                Status:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {stripeConnectStatus?.connected
                    ? "Connected"
                    : stripeConnectLoading
                      ? "Checking…"
                      : "Not connected"}
                </span>
              </p>
              <p>
                Charges Enabled:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {stripeConnectStatus?.chargesEnabled ? "Yes" : "No"}
                </span>
              </p>
              <p>
                Payouts Enabled:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {stripeConnectStatus?.payoutsEnabled ? "Yes" : "No"}
                </span>
              </p>
              <p>
                Onboarding Complete:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {stripeConnectStatus?.onboardingComplete ? "Yes" : "No"}
                </span>
              </p>
            </div>

            {stripeConnectStatus?.accountId && (
              <p className="mt-3 text-xs text-gray-500">
                Account ID: {stripeConnectStatus.accountId}
              </p>
            )}
            {(stripeConnectStatus?.error || stripeConnectMessage) && (
              <p className="mt-3 text-sm text-red-500">
                {stripeConnectMessage || stripeConnectStatus?.error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Manage products shown on your public <strong>Shop</strong> page.
              Enable the shop in <strong>Site Settings</strong> to show the nav
              link.
            </p>
            {productEdit === null && (
              <button
                onClick={startNewProduct}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                + Add Product
              </button>
            )}
          </div>

          {/* Product form */}
          {productEdit !== null && (
            <div className="rounded-xl border border-[#CD7F32]/30 bg-orange-50/40 p-5 shadow-sm dark:bg-gray-800">
              <p className="mb-4 text-sm font-semibold tracking-wide text-[#CD7F32] uppercase">
                {productEdit === "new" ? "New Product" : "Edit Product"}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={LABEL}>Title *</label>
                  <input
                    className={INPUT}
                    value={productForm.title}
                    onChange={(e) => setProductField("title", e.target.value)}
                    placeholder="e.g. Small Wrapped Bouquet"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Slug</label>
                  <input
                    className={INPUT}
                    value={productForm.slug}
                    onChange={(e) =>
                      setProductField("slug", slugify(e.target.value))
                    }
                    placeholder="e.g. small-wrapped-bouquet"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Auto-generated from title.
                  </p>
                </div>
                <div>
                  <label className={LABEL}>Price ($) *</label>
                  <input
                    className={INPUT}
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductField("price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={LABEL}>Compare-at Price ($)</label>
                  <input
                    className={INPUT}
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.compare_at_price}
                    onChange={(e) =>
                      setProductField("compare_at_price", e.target.value)
                    }
                    placeholder="0.00 (optional strikethrough price)"
                  />
                </div>
                <div>
                  <label className={LABEL}>Stock Quantity</label>
                  <input
                    className={INPUT}
                    type="number"
                    min="0"
                    value={productForm.stock_quantity}
                    onChange={(e) =>
                      setProductField("stock_quantity", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Sort Order</label>
                  <input
                    className={INPUT}
                    type="number"
                    min="0"
                    value={productForm.sort_order}
                    onChange={(e) =>
                      setProductField("sort_order", Number(e.target.value))
                    }
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Lower = appears first.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Image URL</label>
                  <input
                    className={INPUT}
                    value={productForm.image_url}
                    onChange={(e) =>
                      setProductField("image_url", e.target.value)
                    }
                    placeholder="https://example.com/product.jpg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      openAssetPicker("Select Product Image", (url) =>
                        setProductField("image_url", url),
                      )
                    }
                    className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Select from Client Assets
                  </button>
                  {productForm.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productForm.image_url}
                      alt="preview"
                      className="mt-3 h-40 w-full rounded-lg border border-gray-200 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Description</label>
                  <textarea
                    className={INPUT}
                    rows={4}
                    value={productForm.description}
                    onChange={(e) =>
                      setProductField("description", e.target.value)
                    }
                    placeholder="Describe this product…"
                  />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      setProductField("is_published", !productForm.is_published)
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      productForm.is_published ? "bg-[#CD7F32]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={productForm.is_published}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        productForm.is_published
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Published (visible on shop)
                  </span>
                </div>
              </div>
              {productError && (
                <p className="mt-2 text-sm text-red-500">{productError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveProduct}
                  disabled={productSaving}
                  className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {productSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancelProduct}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Product list */}
          {productsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : products.length === 0 && productEdit === null ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
              No products yet. Click <strong>+ Add Product</strong> to get
              started.
            </div>
          ) : (
            <ul className="space-y-3">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex min-w-0 gap-3">
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {p.title}
                      </p>
                      <p className="text-sm text-[#CD7F32]">
                        ${parseFloat(p.price).toFixed(2)}
                        {p.compare_at_price && (
                          <span className="ml-2 text-gray-400 line-through">
                            ${parseFloat(p.compare_at_price).toFixed(2)}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        slug: {p.slug} · stock: {p.stock_quantity} ·{" "}
                        {p.is_published ? (
                          <span className="text-green-500">published</span>
                        ) : (
                          <span className="text-gray-400">draft</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditProduct(p)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteProductId(p.id)}
                      className="rounded-md border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </EntitlementGate>
      )}

      {/* ── Delete product confirmation modal ── */}
      {confirmDeleteProductId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete product?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. The product will be permanently
              removed from your shop.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteProductId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProduct(confirmDeleteProductId)}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      <AssetPickerModal
        open={assetPickerOpen}
        title={assetPickerTitle}
        assets={clientAssets ?? []}
        isLoading={assetsLoading}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handleSelectAsset}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  textarea,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          className={INPUT}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={INPUT}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#CD7F32"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-gray-200 p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function AssetPickerModal({
  open,
  title,
  assets,
  isLoading,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  assets: Asset[];
  isLoading: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [query, setQuery] = useState("");

  if (!open) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = assets.filter((a) => {
    const image = a.image;
    if (!image?.url) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      image.url,
      image.alt_text ?? "",
      image.caption ?? "",
      image.title ?? "",
      image.description ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <input
            type="text"
            className={INPUT}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by URL, alt text, caption, title..."
          />
        </div>

        <div className="overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading client assets…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">
              No assets found for this client. Upload images in Assets first,
              then come back and select them here.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((asset) => {
                const image = asset.image;
                const imageUrl = image?.url;
                if (!imageUrl) return null;
                const label = image.alt_text || image.title || image.caption;
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(imageUrl)}
                      className="group w-full rounded-lg border border-gray-200 bg-white p-2 text-left transition hover:border-[#CD7F32] hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={label ?? "Asset preview"}
                        className="h-28 w-full rounded-md object-cover"
                      />
                      <p className="mt-2 line-clamp-2 text-xs text-gray-600 group-hover:text-[#CD7F32] dark:text-gray-300">
                        {label || "Untitled image"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
