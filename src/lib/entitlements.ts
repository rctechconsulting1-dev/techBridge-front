const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/\./g, "_");

const MODULE_ALIAS_GROUPS: string[][] = [
  ["calendar_appointments", "calendar", "appointments"],
  ["google_business_management", "google_business", "googlebusiness"],
  ["sms_leads_and_comms", "sms", "sms_comms"],
  ["google_ads_optimization", "google_ads", "googleads"],
  ["custom_ai_agent", "ai_agent", "custom_ai"],
  ["checkout_ecommerce", "checkout", "ecommerce_checkout"],
];

const buildAliasLookup = (): Record<string, Set<string>> => {
  const lookup: Record<string, Set<string>> = {};

  for (const group of MODULE_ALIAS_GROUPS) {
    const normalizedGroup = group.map(normalizeKey);
    const canonicalSet = new Set(normalizedGroup);

    for (const key of normalizedGroup) {
      lookup[key] = canonicalSet;
    }
  }

  return lookup;
};

const MODULE_ALIAS_LOOKUP = buildAliasLookup();

const toNormalizedSet = (values: string[] | null | undefined): Set<string> => {
  if (!Array.isArray(values) || values.length === 0) {
    return new Set<string>();
  }

  return new Set(
    values
      .map((value) => (typeof value === "string" ? normalizeKey(value) : ""))
      .filter(Boolean),
  );
};

const expandModuleSet = (modules: Set<string>): Set<string> => {
  const expanded = new Set(modules);

  for (const moduleKey of modules) {
    const aliases = MODULE_ALIAS_LOOKUP[moduleKey];
    if (!aliases) continue;

    for (const alias of aliases) {
      expanded.add(alias);
    }
  }

  return expanded;
};

export type EntitlementSnapshot = {
  modules: Set<string>;
  features: Set<string>;
};

export const createEntitlementSnapshot = (
  modules: string[] | null | undefined,
  features: string[] | null | undefined,
): EntitlementSnapshot => {
  return {
    modules: expandModuleSet(toNormalizedSet(modules)),
    features: toNormalizedSet(features),
  };
};

export const hasAnyModule = (
  snapshot: EntitlementSnapshot,
  requiredModules: string[] | undefined,
): boolean => {
  if (!requiredModules || requiredModules.length === 0) {
    return true;
  }

  return requiredModules.some((required) =>
    snapshot.modules.has(normalizeKey(required)),
  );
};

export const hasAnyFeature = (
  snapshot: EntitlementSnapshot,
  requiredFeatures: string[] | undefined,
): boolean => {
  if (!requiredFeatures || requiredFeatures.length === 0) {
    return true;
  }

  return requiredFeatures.some((required) =>
    snapshot.features.has(normalizeKey(required)),
  );
};

export const normalizeEntitlementValues = (
  values: string[] | null | undefined,
): string[] => Array.from(toNormalizedSet(values));
