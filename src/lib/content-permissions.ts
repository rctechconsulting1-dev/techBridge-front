export type ContentPermissionKey =
  | "edit_homepage"
  | "edit_services"
  | "edit_team"
  | "edit_faq"
  | "edit_branding"
  | "manage_domains"
  | "manage_integrations"
  | "manage_billing";

export const CONTENT_PERMISSION_KEYS: ContentPermissionKey[] = [
  "edit_homepage",
  "edit_services",
  "edit_team",
  "edit_faq",
  "edit_branding",
  "manage_domains",
  "manage_integrations",
  "manage_billing",
];

export const DEFAULT_CONTENT_PERMISSION_FLAGS: Record<ContentPermissionKey, boolean> = {
  edit_homepage: true,
  edit_services: true,
  edit_team: true,
  edit_faq: true,
  edit_branding: false,
  manage_domains: false,
  manage_integrations: false,
  manage_billing: false,
};

export const normalizeContentPermissionFlags = (
  input: unknown,
  fallback: Record<ContentPermissionKey, boolean> = DEFAULT_CONTENT_PERMISSION_FLAGS,
): Record<ContentPermissionKey, boolean> => {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};

  return Object.fromEntries(
    CONTENT_PERMISSION_KEYS.map((key) => [
      key,
      typeof source[key] === "boolean" ? Boolean(source[key]) : Boolean(fallback[key]),
    ]),
  ) as Record<ContentPermissionKey, boolean>;
};

export const CONTENT_PERMISSION_LABELS: Record<ContentPermissionKey, string> = {
  edit_homepage: "Edit homepage content",
  edit_services: "Edit services content",
  edit_team: "Edit team section",
  edit_faq: "Edit FAQ content",
  edit_branding: "Edit branding tokens/colors",
  manage_domains: "Manage domain onboarding",
  manage_integrations: "Manage integrations (Google/Stripe)",
  manage_billing: "Manage billing and subscriptions",
};