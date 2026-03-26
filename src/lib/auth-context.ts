export type AuthMembership = {
  tenantId?: number;
  tenant_id?: number;
  role?: string;
  roles?: string[];
  modules?: string[];
  features?: string[];
  websiteIds?: number[];
  website_ids?: number[];
};

export type NormalizedAuthSession = {
  id?: number | string;
  email?: string;
  role?: string;
  website_id?: number;
  activeTenantId?: number;
  memberships?: AuthMembership[];
  enabledModules: string[];
  enabledFeatures: string[];
};

const TOKEN_KEY = "auth_token";
const TOKEN_BOOTSTRAP_COOKIE = "auth_token_client";
const ACTIVE_TENANT_STORAGE_KEY = "active_tenant_id";

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toStringOrNumber = (value: unknown): string | number | undefined => {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return undefined;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const uniqueStrings = (items: string[]) => Array.from(new Set(items));

const parseCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const hit = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));
  if (!hit) return null;
  return decodeURIComponent(hit.slice(prefix.length));
};

const clearCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

export const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const raw = atob(padded);
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const membershipTenantId = (membership: AuthMembership): number | undefined => {
  return toNumber(membership.tenant_id) ?? toNumber(membership.tenantId);
};

const normalizeMemberships = (payload: Record<string, unknown>): AuthMembership[] => {
  const candidates = [
    payload.memberships,
    payload.tenantMemberships,
    payload.tenant_memberships,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    const memberships = candidate
      .map((item) => asObject(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        tenantId: toNumber(item.tenantId),
        tenant_id: toNumber(item.tenant_id),
        role: typeof item.role === "string" ? item.role : undefined,
        roles: toStringArray(item.roles),
        modules: toStringArray(item.modules),
        features: toStringArray(item.features),
        websiteIds: Array.isArray(item.websiteIds)
          ? item.websiteIds.map((v) => toNumber(v)).filter((v): v is number => typeof v === "number")
          : undefined,
        website_ids: Array.isArray(item.website_ids)
          ? item.website_ids.map((v) => toNumber(v)).filter((v): v is number => typeof v === "number")
          : undefined,
      }));

    if (memberships.length > 0) {
      return memberships;
    }
  }

  return [];
};

const getStoredActiveTenantId = (): number | undefined => {
  if (typeof window === "undefined") return undefined;
  return toNumber(window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY));
};

export const setActiveTenantId = (tenantId: number) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, String(tenantId));
};

export const clearActiveTenantId = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
};

export const getStoredAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const localStorageToken = window.localStorage.getItem(TOKEN_KEY);
  if (localStorageToken) return localStorageToken;

  const cookieToken = parseCookie(TOKEN_BOOTSTRAP_COOKIE);
  if (cookieToken) {
    window.localStorage.setItem(TOKEN_KEY, cookieToken);
    clearCookie(TOKEN_BOOTSTRAP_COOKIE);
    return cookieToken;
  }

  return null;
};

export const getActiveTenantId = (): number | undefined => {
  const storedTenantId = getStoredActiveTenantId();
  if (storedTenantId) {
    return storedTenantId;
  }

  const token = getStoredAuthToken();
  if (!token) {
    return undefined;
  }

  const payload = decodeJwtPayload(token);
  const normalized = normalizeAuthSession(null, payload);
  return normalized.activeTenantId;
};

export const persistAuthToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthTokenStorage = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  clearCookie(TOKEN_BOOTSTRAP_COOKIE);
};

export const normalizeAuthSession = (
  user: Record<string, unknown> | null,
  tokenPayload: Record<string, unknown> | null,
): NormalizedAuthSession => {
  const payload = tokenPayload ?? {};
  const memberships = normalizeMemberships(payload);

  const payloadTenantId =
    toNumber(payload.activeTenantId) ??
    toNumber(payload.tenantId) ??
    toNumber(payload.tenant_id);
  const storedTenantId = getStoredActiveTenantId();

  const activeTenantId =
    storedTenantId ??
    payloadTenantId ??
    membershipTenantId(memberships[0] ?? {}) ??
    undefined;

  const activeMembership =
    memberships.find((membership) => membershipTenantId(membership) === activeTenantId) ??
    memberships[0];

  const payloadModules = toStringArray(payload.modules).concat(toStringArray(payload.enabledModules));
  const payloadFeatures = toStringArray(payload.features).concat(toStringArray(payload.enabledFeatures));

  const enabledModules = uniqueStrings([
    ...payloadModules,
    ...(activeMembership?.modules ?? []),
  ]);

  const enabledFeatures = uniqueStrings([
    ...payloadFeatures,
    ...(activeMembership?.features ?? []),
  ]);

  const rolesFromMembership = activeMembership?.roles?.length
    ? activeMembership.roles
    : activeMembership?.role
      ? [activeMembership.role]
      : [];

  const role =
    (typeof user?.role === "string" ? user.role : undefined) ??
    (typeof payload.role === "string" ? payload.role : undefined) ??
    rolesFromMembership[0];

  const websiteId =
    toNumber(user?.website_id) ??
    toNumber(payload.website_id) ??
    activeMembership?.websiteIds?.[0] ??
    activeMembership?.website_ids?.[0];

  return {
    id: toStringOrNumber(user?.id) ?? toStringOrNumber(payload.sub),
    email:
      (typeof user?.email === "string" ? user.email : undefined) ??
      (typeof payload.email === "string" ? payload.email : undefined),
    role,
    website_id: websiteId,
    activeTenantId,
    memberships,
    enabledModules,
    enabledFeatures,
  };
};
