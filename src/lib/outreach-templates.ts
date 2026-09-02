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

export interface CallScript {
  opener: string;
  pitch: string[];
  objections: { objection: string; response: string }[];
}

// Returns a weekday name roughly two business days out, for the "can I call you
// back on X" ask. Purely cosmetic; no timezone precision needed.
function suggestedCallbackDay(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date();
  d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  return days[d.getDay()];
}

export function buildCallScript(lead: {
  businessName: string;
  trade?: string | null;
  city?: string | null;
  reviewCount?: number | null;
}): CallScript {
  const tradePlural = lead.trade?.trim() || "local businesses";
  const tradeSingular = tradePlural.replace(/s$/, "");
  const city = lead.city?.trim() || "your area";
  const reviews =
    typeof lead.reviewCount === "number" && lead.reviewCount > 0
      ? `your ${lead.reviewCount} reviews on Google Maps`
      : "your Google Maps listing";

  return {
    opener:
      `Hi, is that ${lead.businessName}? I came across ${reviews} and noticed you do not have a website yet. ` +
      `I build websites for ${tradePlural} in ${city}. Is now a bad time for a quick two-minute chat?`,
    pitch: [
      `What I do: a clean, professional site, usually live within a week, built and hosted for you.`,
      `I have done this for other ${tradePlural} nearby. It tends to pay for itself the first time someone finds you on Google instead of a competitor.`,
      `The ask: let me put together a couple of free mockups for ${lead.businessName} so you can see it. Could I call you back ${suggestedCallbackDay()} to walk through them?`,
    ],
    objections: [
      {
        objection: "I do not need a website",
        response: `Can I show you what comes up when someone searches for a ${tradeSingular} in ${city} right now? Usually it is your competitors, not you.`,
      },
      {
        objection: "I get all my work by word of mouth",
        response: `That is the best kind of work. A site is just where those referrals check you out before they call. Right now they find nothing, or an old social page.`,
      },
      {
        objection: "Someone is already building one for me",
        response: `No problem. Happy to be a second set of eyes on it before it goes live, no charge.`,
      },
      {
        objection: "How much is it?",
        response: `It depends what you need, and I would rather show you the mockups first so we are talking about something real. Can I send those over?`,
      },
      {
        objection: "Just email me the details",
        response: `Will do. What is the best address? I will send a couple of examples and a short note, then follow up in a few days.`,
      },
    ],
  };
}
