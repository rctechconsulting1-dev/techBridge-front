const DEFAULT_API_BASE_URL = "http://localhost:5000/api";
const DEFAULT_APP_BASE_URL = "http://localhost:3000";

const RESOURCE_PATH_MAP: Record<string, string> = {
  "/page": "/pages",
  "/website": "/websites",
  "/business_listing": "/business-listings",
  "/image": "/images",
  "/user": "/users",
  "/page_image": "/page-images",
  "/seo_metadata": "/seo-metadata",
  "/asset": "/assets",
};

const normalizePath = (path: string) => RESOURCE_PATH_MAP[path] || path;

const normalizeBaseUrl = (value: string | undefined, fallback: string): string =>
  (value || fallback).replace(/\/$/, "");

export const getApiBaseUrl = (): string => {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_BASE_URL);
};

export const getAppBaseUrl = (): string => {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL,
    DEFAULT_APP_BASE_URL,
  );
};

export const getRequiredAppBaseUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!configured) {
    throw new Error("NEXT_PUBLIC_APP_URL or NEXTAUTH_URL is not set");
  }

  return normalizeBaseUrl(configured, DEFAULT_APP_BASE_URL);
};

export const toApiUrl = (pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const base = getApiBaseUrl();
  const [rawPath, rawQuery = ""] = pathOrUrl.split("?");
  const baseHasApiPrefix = base.endsWith("/api");
  const normalizedRawPath =
    baseHasApiPrefix && rawPath.startsWith("/api/")
      ? rawPath.replace(/^\/api/, "")
      : rawPath;
  const normalizedPath = normalizePath(normalizedRawPath);
  const query = new URLSearchParams(rawQuery);

  const websiteIdEq = query.get("website_id");
  if (websiteIdEq?.startsWith("eq.")) {
    query.set("website_id", websiteIdEq.replace("eq.", ""));
  }

  const emailLike = query.get("email");
  if (emailLike?.startsWith("like.")) {
    query.delete("email");
    query.set("email_like", emailLike.replace("like.", "").replace("*", ""));
  }

  const queryString = query.toString();
  return `${base}${normalizedPath}${queryString ? `?${queryString}` : ""}`;
};

export const methodToBackendMethod = (method: string) => {
  if (method.toUpperCase() === "PATCH") {
    return "PUT";
  }
  return method.toUpperCase();
};
