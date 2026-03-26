import type { Metadata } from "next";

const parseHostFromUrl = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
};

const PLATFORM_HOSTS = Array.from(
  new Set(
    [
      parseHostFromUrl(process.env.NEXT_PUBLIC_SITE_URL),
      parseHostFromUrl(process.env.NEXT_PUBLIC_APP_URL),
      "localhost:3000",
      "127.0.0.1:3000",
    ].filter(Boolean),
  ),
);

const normalizePathname = (pathname: string): string => {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
};

export const isPlatformHost = (host: string | null | undefined): boolean => {
  if (!host) {
    return true;
  }

  const normalized = host.toLowerCase();
  return PLATFORM_HOSTS.includes(normalized);
};

export const getPublicSiteApiBase = (): string =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const getPublicCanonicalUrl = async (
  pathname: string,
): Promise<string | null> => {
  if (typeof window !== "undefined") {
    return null;
  }

  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ||
      headerStore.get("host") ||
      null;

    if (!host || isPlatformHost(host)) {
      return null;
    }

    const proto = headerStore.get("x-forwarded-proto") || "https";
    return `${proto}://${host}${normalizePathname(pathname)}`;
  } catch {
    return null;
  }
};

export const getPublicCanonicalMetadata = async (
  pathname: string,
): Promise<Metadata> => {
  const canonical = await getPublicCanonicalUrl(pathname);
  if (!canonical) {
    return {};
  }

  return {
    alternates: {
      canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
};
