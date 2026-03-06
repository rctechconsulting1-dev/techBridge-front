/**
 * JWT auth helpers for the CMS.
 * Matches the Express authMiddleware: Authorization: Bearer <token>
 *
 * Uses localStorage on the client.
 * On the server (RSC / route handlers), read from cookies or env — not needed
 * for public landing page reads since those routes are unprotected.
 */

const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    // Decode payload (no verify — server validates on each request)
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 > Date.now() : true;
  } catch {
    return false;
  }
}
