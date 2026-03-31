/**
 * Resend Domain Management API wrapper.
 *
 * Server-side only — uses RESEND_API_KEY.
 * Handles creating, verifying, retrieving, and listing sending domains
 * for per-tenant branded email via the Resend REST API.
 */

import { getResendClient } from "@/lib/resend-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResendDnsRecord = {
  record: string; // "SPF" | "DKIM"
  name: string;
  type: string; // "MX" | "TXT" | "CNAME"
  ttl: string;
  status: string;
  value: string;
  priority?: number;
};

export type ResendDomain = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  region: string;
  records: ResendDnsRecord[];
};

export type ResendDomainListItem = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  region: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the standard sending subdomain for a tenant domain. */
export const buildSendingSubdomain = (domain: string): string => {
  const clean = domain.trim().toLowerCase().replace(/^www\./, "");
  return `mg.${clean}`;
};

// ─── API Wrappers ─────────────────────────────────────────────────────────────

/**
 * Create a new sending domain in Resend.
 * Returns the domain object including DNS records that must be configured.
 */
export async function createResendDomain(
  domainName: string,
): Promise<{ data: ResendDomain | null; error: string | null }> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.domains.create({ name: domainName });

    if (error) {
      return { data: null, error: error.message || "Resend domain creation failed" };
    }

    return { data: data as unknown as ResendDomain, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unexpected error creating Resend domain",
    };
  }
}

/**
 * Trigger verification for a Resend domain.
 * This kicks off an async process — the domain status will update via webhook or polling.
 */
export async function verifyResendDomain(
  domainId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const resend = getResendClient();
    const { error } = await resend.domains.verify(domainId);

    if (error) {
      return { success: false, error: error.message || "Resend domain verification failed" };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error verifying Resend domain",
    };
  }
}

/**
 * Get a single Resend domain by ID, including current DNS record status.
 */
export async function getResendDomain(
  domainId: string,
): Promise<{ data: ResendDomain | null; error: string | null }> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.domains.get(domainId);

    if (error) {
      return { data: null, error: error.message || "Failed to retrieve Resend domain" };
    }

    return { data: data as unknown as ResendDomain, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unexpected error retrieving Resend domain",
    };
  }
}

/**
 * List all Resend domains on the account.
 */
export async function listResendDomains(): Promise<{
  data: ResendDomainListItem[];
  error: string | null;
}> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.domains.list();

    if (error) {
      return { data: [], error: error.message || "Failed to list Resend domains" };
    }

    const items = (data as unknown as { data?: ResendDomainListItem[] })?.data ?? [];
    return { data: items, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Unexpected error listing Resend domains",
    };
  }
}

/**
 * Find a Resend domain by name (exact match).
 * Useful for checking if a sending subdomain already exists.
 */
export async function findResendDomainByName(
  name: string,
): Promise<{ data: ResendDomainListItem | null; error: string | null }> {
  const { data: domains, error } = await listResendDomains();
  if (error) return { data: null, error };

  const normalized = name.trim().toLowerCase();
  const match = domains.find((d) => d.name.toLowerCase() === normalized) ?? null;
  return { data: match, error: null };
}

/**
 * Convert Resend DNS records to the same DnsRecord format used by the domain UI.
 */
export function resendRecordsToDnsRecords(
  records: ResendDnsRecord[],
): { type: string; name: string; value: string; reason: string }[] {
  return records.map((rec) => ({
    type: rec.type,
    name: rec.name,
    value: rec.value,
    reason: `Resend ${rec.record}${rec.status === "verified" ? " ✓" : ""}`,
  }));
}
