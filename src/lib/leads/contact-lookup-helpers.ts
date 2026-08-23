import { promises as dns } from "node:dns";

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
 * read (not after the fact), and refuses to follow redirects (a redirect
 * to an internal address would otherwise bypass isSafeExternalUrl's check
 * on the original URL). Returns null on any failure — callers treat that
 * the same as "nothing found", not a hard error.
 */
export async function fetchTextCapped(
  url: string,
  options: { timeoutMs: number; maxBytes: number },
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "manual" });
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
