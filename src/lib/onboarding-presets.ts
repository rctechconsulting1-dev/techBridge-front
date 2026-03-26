export type BusinessPresetId =
  | "home_services"
  | "health_wellness"
  | "professional_services"
  | "ecommerce_retail";

export type PresetPermissionKey =
  | "edit_homepage"
  | "edit_services"
  | "edit_team"
  | "edit_faq"
  | "edit_branding"
  | "manage_domains"
  | "manage_integrations"
  | "manage_billing";

export const PERMISSION_KEYS: PresetPermissionKey[] = [
  "edit_homepage",
  "edit_services",
  "edit_team",
  "edit_faq",
  "edit_branding",
  "manage_domains",
  "manage_integrations",
  "manage_billing",
];

export type LaunchChecklistItem = {
  id: string;
  label: string;
};

export type EscalationEntry = {
  module: string;
  firstLineOwner: string;
  escalationPath: string;
  slaTarget: string;
};

export type BusinessPreset = {
  id: BusinessPresetId;
  name: string;
  summary: string;
  recommendedModules: string[];
  defaultPermissions: Record<PresetPermissionKey, boolean>;
  escalationMatrix: EscalationEntry[];
  launchChecklist: LaunchChecklistItem[];
};

const BASE_CHECKLIST: LaunchChecklistItem[] = [
  { id: "tenant-record", label: "Create tenant and assign tenant owner" },
  { id: "domain", label: "Onboard and verify domain" },
  { id: "email", label: "Configure sender profile and verify SPF/DKIM" },
  { id: "payments", label: "Complete Stripe Connect onboarding" },
  { id: "site", label: "Publish core pages (home/services/about/contact)" },
  { id: "alerts", label: "Validate alert routing and reliability dashboard" },
  { id: "handoff", label: "Run client handoff and support orientation" },
];

const DEFAULT_PERMISSIONS: Record<PresetPermissionKey, boolean> = {
  edit_homepage: true,
  edit_services: true,
  edit_team: true,
  edit_faq: true,
  edit_branding: false,
  manage_domains: false,
  manage_integrations: false,
  manage_billing: false,
};

export const normalizePermissionFlags = (
  input: unknown,
  fallback: Record<PresetPermissionKey, boolean> = DEFAULT_PERMISSIONS,
): Record<PresetPermissionKey, boolean> => {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};

  return Object.fromEntries(
    PERMISSION_KEYS.map((key) => [
      key,
      typeof source[key] === "boolean" ? Boolean(source[key]) : Boolean(fallback[key]),
    ]),
  ) as Record<PresetPermissionKey, boolean>;
};

export const PHASE8_PRESETS: BusinessPreset[] = [
  {
    id: "home_services",
    name: "Home Services",
    summary: "Field-service teams that rely on bookings, reviews, and local SEO.",
    recommendedModules: ["calendar_appointments", "google_business_management"],
    defaultPermissions: {
      ...DEFAULT_PERMISSIONS,
      edit_services: true,
      edit_team: false,
    },
    escalationMatrix: [
      {
        module: "Bookings / Calendar",
        firstLineOwner: "Tenant Manager",
        escalationPath: "Support Agent -> Platform Owner",
        slaTarget: "4 business hours",
      },
      {
        module: "Google Business",
        firstLineOwner: "Support Agent",
        escalationPath: "Platform Owner -> Engineering",
        slaTarget: "1 business day",
      },
    ],
    launchChecklist: BASE_CHECKLIST,
  },
  {
    id: "health_wellness",
    name: "Health & Wellness",
    summary: "Appointment-driven providers with strict communication quality requirements.",
    recommendedModules: ["calendar_appointments", "custom_ai_agent"],
    defaultPermissions: {
      ...DEFAULT_PERMISSIONS,
      edit_team: true,
      edit_branding: true,
    },
    escalationMatrix: [
      {
        module: "Appointments",
        firstLineOwner: "Tenant Manager",
        escalationPath: "Support Agent -> Engineering",
        slaTarget: "2 business hours",
      },
      {
        module: "AI Content Agent",
        firstLineOwner: "Support Agent",
        escalationPath: "Engineering -> Platform Owner",
        slaTarget: "1 business day",
      },
    ],
    launchChecklist: BASE_CHECKLIST,
  },
  {
    id: "professional_services",
    name: "Professional Services",
    summary: "Consulting and agency teams focused on lead quality and trust content.",
    recommendedModules: ["google_business_management", "custom_ai_agent"],
    defaultPermissions: {
      ...DEFAULT_PERMISSIONS,
      edit_faq: true,
      edit_branding: true,
    },
    escalationMatrix: [
      {
        module: "Lead Intake",
        firstLineOwner: "Tenant Owner",
        escalationPath: "Support Agent -> Platform Owner",
        slaTarget: "4 business hours",
      },
      {
        module: "Site Content",
        firstLineOwner: "Tenant Editor",
        escalationPath: "Tenant Owner -> Support Agent",
        slaTarget: "1 business day",
      },
    ],
    launchChecklist: BASE_CHECKLIST,
  },
  {
    id: "ecommerce_retail",
    name: "Ecommerce Retail",
    summary: "Product-focused storefronts with payment and catalog reliability needs.",
    recommendedModules: ["checkout_ecommerce", "google_business_management"],
    defaultPermissions: {
      ...DEFAULT_PERMISSIONS,
      edit_services: false,
      manage_integrations: true,
    },
    escalationMatrix: [
      {
        module: "Checkout / Payments",
        firstLineOwner: "Support Agent",
        escalationPath: "Engineering -> Platform Owner",
        slaTarget: "1 hour",
      },
      {
        module: "Catalog / Inventory",
        firstLineOwner: "Tenant Manager",
        escalationPath: "Support Agent -> Engineering",
        slaTarget: "4 business hours",
      },
    ],
    launchChecklist: BASE_CHECKLIST,
  },
];

export const PERMISSION_LABELS: Record<PresetPermissionKey, string> = {
  edit_homepage: "Edit homepage content",
  edit_services: "Edit services content",
  edit_team: "Edit team section",
  edit_faq: "Edit FAQ content",
  edit_branding: "Edit branding tokens/colors",
  manage_domains: "Manage domain onboarding",
  manage_integrations: "Manage integrations (Google/Stripe)",
  manage_billing: "Manage billing and subscriptions",
};

export const getPresetById = (id: BusinessPresetId): BusinessPreset => {
  return PHASE8_PRESETS.find((preset) => preset.id === id) || PHASE8_PRESETS[0];
};

export const isBusinessPresetId = (value: unknown): value is BusinessPresetId => {
  return typeof value === "string" && PHASE8_PRESETS.some((preset) => preset.id === value);
};
