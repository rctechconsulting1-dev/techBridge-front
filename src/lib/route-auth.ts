/**
 * Shared auth guards for Next.js Route Handlers.
 *
 * Token resolution order:
 *   1. `auth_token` cookie  (set on browser sign-in)
 *   2. `auth_token_client`  (bootstrap cookie set by SSR for first-page hydration)
 *   3. `Authorization` header  (for programmatic / server-to-server callers)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

type AuthOk = { ok: true; token: string };
type AuthFail = { ok: false; response: NextResponse };
export type RouteAuthResult = AuthOk | AuthFail;

const extractToken = (req: NextRequest): string | null =>
  req.cookies.get("auth_token")?.value ||
  req.cookies.get("auth_token_client")?.value ||
  req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
  null;

const failUnauth = (message: string, status: 401 | 403 | 503): AuthFail => ({
  ok: false,
  response: NextResponse.json({ error: message }, { status }),
});

/**
 * Confirms the request carries a valid session token.
 * Does NOT enforce a specific role — use `verifyAdminAuth` for admin-only routes.
 */
export const verifyAuth = async (req: NextRequest): Promise<RouteAuthResult> => {
  const token = extractToken(req);

  if (!token) {
    return failUnauth("Authentication required.", 401);
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return failUnauth("Invalid or expired token.", 401);
    }

    return { ok: true, token };
  } catch {
    return failUnauth("Auth service unavailable.", 503);
  }
};

/**
 * Confirms the request carries a valid session token AND the caller has an
 * admin or platform_admin role. Returns a 403 for authenticated non-admins.
 */
export const verifyAdminAuth = async (req: NextRequest): Promise<RouteAuthResult> => {
  const token = extractToken(req);

  if (!token) {
    return failUnauth("Authentication required.", 401);
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return failUnauth("Invalid or expired token.", 401);
    }

    const data = (await res.json()) as { user?: { role?: string | null } };
    const role = data?.user?.role ?? null;

    if (role !== "admin" && role !== "platform_admin") {
      return failUnauth("Admin access required.", 403);
    }

    return { ok: true, token };
  } catch {
    return failUnauth("Auth service unavailable.", 503);
  }
};
