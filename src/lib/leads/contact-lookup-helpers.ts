const IMAGE_ISH_SUFFIX = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$/i;

/**
 * IPv4/IPv6 loopback, private, and link-local range check. Used to stop the
 * website/contact-page fetch in this module from reaching internal network
 * addresses (SSRF guard) — see isSafeExternalUrl in this same file.
 */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80")) return true;
  return false;
}

/**
 * Finds a visible contact email in raw HTML. Checks mailto: links first
 * (most reliable), then falls back to a plain email pattern in the text.
 * Filters out matches that are actually image/asset filenames caught by the
 * email regex (e.g. "logo@2x.png" matches `\S+@\S+\.\w{2,}` but isn't one).
 */
export function extractEmailFromHtml(html: string): string | null {
  const mailtoMatch = html.match(/mailto:([^"'\s?>]+)/i);
  if (mailtoMatch) {
    try {
      const candidate = decodeURIComponent(mailtoMatch[1]);
      if (!IMAGE_ISH_SUFFIX.test(candidate)) {
        return candidate;
      }
    } catch {
      // Fall through to plain-text email regex scan if decoding fails
    }
  }

  const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const candidate = emailMatches.find((match) => !IMAGE_ISH_SUFFIX.test(match));
  return candidate ?? null;
}

/**
 * Best-effort scan for an anchor tag whose visible text mentions "contact",
 * returning its href resolved against baseUrl. No HTML parser dependency —
 * this is intentionally a lightweight regex scan, not exhaustive.
 */
export function findContactLink(html: string, baseUrl: string): string | null {
  const anchorMatches = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];

  for (const anchor of anchorMatches) {
    const hrefMatch = anchor.match(/href=["']([^"']+)["']/i);
    const textOnly = anchor.replace(/<[^>]+>/g, "").trim();

    if (hrefMatch && /contact/i.test(textOnly)) {
      try {
        return new URL(hrefMatch[1], baseUrl).toString();
      } catch {
        return null;
      }
    }
  }

  return null;
}
