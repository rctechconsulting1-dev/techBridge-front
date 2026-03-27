import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPublicSiteApiBase, isPlatformHost } from "@/lib/public-site-routing";

const PUBLIC_FILE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|map)$/i;

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

export async function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  if (!host || isPlatformHost(host) || shouldSkipPath(pathname)) {
    return NextResponse.next();
  }

  try {
    const response = await fetch(`${getPublicSiteApiBase()}/public/site/context`, {
      headers: {
        "x-tenant-domain": host,
        "x-forwarded-proto": request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", ""),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.next();
    }

    const payload = (await response.json()) as {
      websiteId?: number | string;
      canonicalDomain?: string | null;
    };
    const websiteId = payload.websiteId ? String(payload.websiteId) : null;

    if (!websiteId) {
      return NextResponse.next();
    }

    if (payload.canonicalDomain && payload.canonicalDomain !== host) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.host = payload.canonicalDomain;
      return NextResponse.redirect(redirectUrl, 308);
    }

    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = `/sites/${websiteId}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(rewrittenUrl);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: "/:path*",
};
