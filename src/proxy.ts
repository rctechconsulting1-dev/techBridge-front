import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPublicSiteApiBase, isPlatformHost } from "@/lib/public-site-routing";

const PUBLIC_FILE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|map)$/i;

const normalizeComparableHost = (host: string | null | undefined): string | null => {
  if (!host) {
    return null;
  }

  return host.trim().toLowerCase().replace(/:\d+$/, "");
};

const canBeFramed = (pathname: string): boolean => {
  if (pathname.startsWith("/sites/")) {
    return true;
  }

  return /^\/built-in-pages\/[^/]+\/draft-preview$/.test(pathname);
};

const withFramePolicy = (response: NextResponse, pathname: string): NextResponse => {
  if (!canBeFramed(pathname)) {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }

  return response;
};

const shouldSkipPath = (pathname: string): boolean => {
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  return PUBLIC_FILE.test(pathname);
};

export async function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  if (!host || isPlatformHost(host) || shouldSkipPath(pathname)) {
    return withFramePolicy(NextResponse.next(), pathname);
  }

  try {
    const response = await fetch(`${getPublicSiteApiBase()}/public/site/context`, {
      headers: {
        "x-tenant-domain": host,
        "x-forwarded-proto": request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", ""),
      },
      cache: "no-store",
    });

    if (response.status === 403) {
      try {
        const body = (await response.json()) as { code?: string };
        if (body.code === "TENANT_OFFBOARDED" || body.code === "TENANT_SUSPENDED") {
          const deactivatedUrl = request.nextUrl.clone();
          deactivatedUrl.pathname = "/sites/deactivated";
          return withFramePolicy(NextResponse.rewrite(deactivatedUrl), pathname);
        }
      } catch {
        // Parse failed — fall through to default handling
      }
      return withFramePolicy(NextResponse.next(), pathname);
    }

    if (!response.ok) {
      return withFramePolicy(NextResponse.next(), pathname);
    }

    const payload = (await response.json()) as {
      websiteId?: number | string;
      canonicalDomain?: string | null;
    };
    const websiteId = payload.websiteId ? String(payload.websiteId) : null;

    if (!websiteId) {
      return withFramePolicy(NextResponse.next(), pathname);
    }

    if (
      payload.canonicalDomain &&
      normalizeComparableHost(payload.canonicalDomain) !== normalizeComparableHost(host)
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.host = payload.canonicalDomain;
      return withFramePolicy(NextResponse.redirect(redirectUrl, 308), pathname);
    }

    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = `/sites/${websiteId}${pathname === "/" ? "" : pathname}`;
    return withFramePolicy(NextResponse.rewrite(rewrittenUrl), pathname);
  } catch {
    return withFramePolicy(NextResponse.next(), pathname);
  }
}

export const config = {
  matcher: "/:path*",
};