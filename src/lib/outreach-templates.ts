/**
 * Plain-text cold outreach templates. Deliberately not part of
 * email-templates.ts's branded HTML layout() — cold outreach needs to read
 * as a real person's email, not a marketing blast.
 */

export type LeadSource = "google_maps" | "facebook" | "instagram" | "craigslist" | "cslb";
export type LeadTier = "small" | "medium";

export interface OutreachMergeFields {
  source: LeadSource;
  tier: LeadTier;
  businessName: string;
  contactName?: string | null;
  city?: string | null;
  trade?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  senderName: string;
}

const OPENERS: Record<LeadSource, (f: OutreachMergeFields) => string> = {
  google_maps: (f) =>
    `I came across ${f.businessName} on Google Maps${
      f.rating && f.reviewCount ? ` — ${f.rating} stars across ${f.reviewCount} reviews is no small thing` : ""
    }.`,
  facebook: (f) => `I saw the ad ${f.businessName} is running on Facebook.`,
  instagram: (f) => `I saw the ad ${f.businessName} is running on Instagram.`,
  craigslist: (f) =>
    `I saw your ${f.trade ? `${f.trade} ` : ""}listing for ${f.businessName} on Craigslist.`,
  cslb: (f) => `Congrats on the new ${f.trade ? `${f.trade} ` : ""}license for ${f.businessName}.`,
};

const BODIES: Record<LeadTier, (f: OutreachMergeFields) => string> = {
  small: (f) =>
    `Starting out, it's easy for the website to fall to the bottom of the list — and that usually means people searching for ${
      f.trade || "your services"
    }${f.city ? ` in ${f.city}` : ""} can't find you, or land somewhere that doesn't look finished. I put together a quick mockup of what a real site could look like for ${f.businessName} — happy to send it over.`,
  medium: (f) =>
    `A lot of the day-to-day for a business like ${f.businessName} — missed calls, following up on quotes, getting back to people — ends up eating time that should go toward the work itself. I put together a mockup of a site for ${f.businessName}, plus an idea for a simple automation (following up on missed calls automatically, for example) that could save real time. Happy to send both over.`,
};

const CLOSE = (f: OutreachMergeFields) =>
  `Just reply to this email if you'd like to see it — no pressure either way.\n\n${f.senderName}`;

// Exported (not folded into buildOutreachEmail's returned body) so the send
// route can append it server-side right before sending, regardless of what
// the client's editable composer contains — this is what makes it actually
// non-removable rather than just deletable text in a textarea.
export function complianceFooter(): string {
  const address = process.env.OUTREACH_COMPLIANCE_ADDRESS;
  if (!address) {
    throw new Error(
      "OUTREACH_COMPLIANCE_ADDRESS is not configured. Set it to RD Tech Bridge's mailing address before sending outreach email (CAN-SPAM requires it).",
    );
  }
  return `\n\n---\n${address}\nDon't want to hear from us again? Just reply and let me know.`;
}

export function buildOutreachEmail(fields: OutreachMergeFields): { subject: string; body: string } {
  const greeting = fields.contactName ? `Hi ${fields.contactName},` : "Hi there,";
  const opener = OPENERS[fields.source](fields);
  const body = BODIES[fields.tier](fields);
  const close = CLOSE(fields);

  return {
    subject: `Quick idea for ${fields.businessName}`,
    body: `${greeting}\n\n${opener} ${body}\n\n${close}`,
  };
}
