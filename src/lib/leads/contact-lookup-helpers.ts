import { promises as dns } from "node:dns";

const IMAGE_ISH_SUFFIX = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$/i;
const EMAIL_SHAPE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
 * A mailto: candidate must also match a single-address email shape, so a
 * multi-recipient mailto, a template placeholder, or URL-encoded junk falls
 * through to the plain-text scan instead of being saved as the lead's email.
 */
export function extractEmailFromHtml(html: string): string | null {
  const mailtoMatch = html.match(/mailto:([^"'\s?>]+)/i);
  if (mailtoMatch) {
    try {
      const candidate = decodeURIComponent(mailtoMatch[1]);
      if (!IMAGE_ISH_SUFFIX.test(candidate) && EMAIL_SHAPE.test(candidate)) {
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
 *
 * The result is restricted to the same origin as baseUrl: an off-site
 * "Contact us on Facebook" or a web agency's credit link must not have its
 * email scraped and saved as this lead's address. Pure-fragment hrefs
 * (`#contact`) and links that resolve back to the base page itself are
 * skipped too, since re-fetching identical HTML can't find anything new.
 * A malformed href skips that anchor and the scan continues with the next.
 */
export function findContactLink(html: string, baseUrl: string): string | null {
  const anchorMatches = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];

  let baseOrigin: string | null;
  let baseNoHash: string | null;
  try {
    const base = new URL(baseUrl);
    baseOrigin = base.origin;
    baseNoHash = base.origin + base.pathname + base.search;
  } catch {
    baseOrigin = null;
    baseNoHash = null;
  }

  for (const anchor of anchorMatches) {
    const hrefMatch = anchor.match(/href=["']([^"']+)["']/i);
    const textOnly = anchor.replace(/<[^>]+>/g, "").trim();

    if (!hrefMatch || !/contact/i.test(textOnly)) continue;

    const href = hrefMatch[1];
    if (href.startsWith("#")) continue;

    let resolved: URL;
    try {
      resolved = new URL(href, baseUrl);
    } catch {
      continue;
    }

    if (baseOrigin && resolved.origin !== baseOrigin) continue;

    const resolvedNoHash = resolved.origin + resolved.pathname + resolved.search;
    if (baseNoHash && resolvedNoHash === baseNoHash) continue;

    return resolved.toString();
  }

  return null;
}

/**
 * Rejects non-http(s) URLs and URLs whose hostname resolves to a
 * loopback/private/link-local address. This is a pre-flight DNS check, not
 * a connection-time guarantee (a determined attacker could race a DNS
 * rebind between this check and the fetch in fetchTextCapped) — acceptable
 * here because the URL comes from Google Places' own index, not directly
 * from user input, and the caller is always an authenticated admin.
 */
export async function isSafeExternalUrl(urlString: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  try {
    const { address } = await dns.lookup(parsed.hostname);
    // dns.lookup can return an IPv4-mapped IPv6 address (e.g. "::ffff:127.0.0.1")
    // in some environments. Strip the prefix so the embedded IPv4 address is
    // checked by isPrivateOrLoopbackIp's IPv4 branch instead of falling through
    // its IPv6 branch, which wouldn't otherwise recognize it as private/loopback.
    const normalizedAddress = address.replace(/^::ffff:/i, "");
    return !isPrivateOrLoopbackIp(normalizedAddress);
  } catch {
    return false;
  }
}

/**
 * Fetches a URL with a timeout and a byte cap enforced during the stream
 * read (not after the fact). Redirects are handled manually so that an
 * internal address can never be reached through one: up to 3 hops are
 * followed, and every redirect target is re-checked with isSafeExternalUrl
 * before it is fetched. (The original URL is already checked by the caller.)
 * Following hops matters because http→https and apex→www redirects are
 * extremely common on real business sites. Returns null on any failure, and
 * callers treat that the same as "nothing found", not a hard error.
 */
export async function fetchTextCapped(
  url: string,
  options: { timeoutMs: number; maxBytes: number },
): Promise<string | null> {
  let currentUrl = url;

  for (let hop = 0; hop < 4; hop++) {
    if (hop > 0 && !(await isSafeExternalUrl(currentUrl))) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(currentUrl, { signal: controller.signal, redirect: "manual" });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        try {
          currentUrl = new URL(location, currentUrl).toString();
        } catch {
          return null;
        }
        continue;
      }

      if (!response.ok || !response.body) {
        return null;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = 0;
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > options.maxBytes) {
          await reader.cancel();
          break;
        }
        text += decoder.decode(value, { stream: true });
      }

      return text;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}
