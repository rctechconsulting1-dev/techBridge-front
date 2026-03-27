/**
 * HTML email templates for RD TechBridge.
 * Inline styles ensure maximum email-client compatibility.
 */

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="vertical-align:middle;padding-right:8px;">
                    <span style="font-size:28px;font-weight:800;color:#CD7F32;">R</span>
                    <span style="display:inline-block;width:28px;height:2px;background-color:#C41E3A;vertical-align:middle;margin:0 4px;"></span>
                    <span style="font-size:28px;font-weight:800;color:#CD7F32;">D</span>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="color:#CD7F32;font-weight:700;font-size:14px;letter-spacing:2px;line-height:1.1;">TECH</div>
                    <div style="color:#C41E3A;font-weight:700;font-size:14px;letter-spacing:2px;line-height:1.1;margin-top:-2px;">BRIDGE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                RD TechBridge &middot; Helping businesses grow online
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                You received this email because you have an account at RD TechBridge.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:32px 0;">
    <tr>
      <td style="background-color:#CD7F32;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export interface WelcomeTemplateOptions {
  firstName?: string;
}

export function buildWelcomeHtml({
  firstName,
}: WelcomeTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  return layout(
    "Welcome to RD TechBridge!",
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
      Welcome to <strong>RD TechBridge</strong> — your all-in-one platform for managing your online presence, client sites, and business growth.
    </p>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
      Your account is now active. Here's what you can do next:
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:15px;line-height:2;">
      <li>Set up your business profile</li>
      <li>Connect your Google Business listing</li>
      <li>Manage your client sites and pages</li>
      <li>Track performance with built-in analytics</li>
    </ul>
    <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">
      If you have any questions, just reply to this email — we're always happy to help.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#374151;">
      — The RD TechBridge Team
    </p>`,
  );
}

// ─── Email verification ───────────────────────────────────────────────────────

export interface VerifyTemplateOptions {
  firstName?: string;
  verifyUrl: string;
}

export function buildVerifyHtml({
  firstName,
  verifyUrl,
}: VerifyTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  return layout(
    "Verify your email – RD TechBridge",
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
      Thanks for signing up! Please verify your email address by clicking the button below.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">
      This link expires in 24 hours.
    </p>
    ${primaryButton(verifyUrl, "Verify Email Address")}
    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
      Or copy and paste this URL into your browser:
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">
      <a href="${verifyUrl}" style="color:#CD7F32;">${verifyUrl}</a>
    </p>
    <p style="margin:24px 0 0;font-size:14px;color:#9ca3af;">
      If you didn't create an account, you can safely ignore this email.
    </p>`,
  );
}

// ─── Password reset ───────────────────────────────────────────────────────────

export interface ResetPasswordTemplateOptions {
  firstName?: string;
  resetUrl: string;
}

export function buildResetPasswordHtml({
  firstName,
  resetUrl,
}: ResetPasswordTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  return layout(
    "Reset your password – RD TechBridge",
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
      We received a request to reset the password for your RD TechBridge account.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will not change.
    </p>
    ${primaryButton(resetUrl, "Reset Password")}
    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
      Or copy and paste this URL into your browser:
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">
      <a href="${resetUrl}" style="color:#CD7F32;">${resetUrl}</a>
    </p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
    <p style="margin:0;font-size:13px;color:#9ca3af;">
      For your security, this link can only be used once and expires in 1 hour.
    </p>`,
  );
}

// ─── Tenant onboarding intake ─────────────────────────────────────────────────

export type BusinessType =
  | "lead_gen_services"
  | "appointments"
  | "ecommerce"
  | "reservations"
  | "hybrid_local"
  | string; // fallback for unknown future types

export interface TenantIntakeTemplateOptions {
  firstName?: string;
  businessType?: BusinessType;
}

interface IntakeContent {
  subject: string;
  intro: string;
  aboutQs: string[];
  brandQs: string[];
  servicesQs: string[];
  mediaQs: string[];
}

function getIntakeContent(businessType?: BusinessType): IntakeContent {
  switch (businessType) {
    case "appointments":
      return {
        subject: "Let's build your website — a few quick questions",
        intro:
          "Welcome! Your website is being set up. To make it feel authentically you, I need a few details. This takes about 10–15 minutes — just reply with your answers and files attached.",
        aboutQs: [
          "What's your full name, and what do you like to be called by clients?",
          "What city/area are you based in? Do you offer services in-person, virtually, or both?",
          "How long have you been in business? Any credentials, licenses, or specializations you're proud of?",
          'Who is your ideal client? <span style="color:#6b7280;">(e.g. busy professionals, families, seniors, athletes)</span>',
        ],
        brandQs: [
          'Your logo — PNG or SVG, transparent background preferred <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
          'A professional headshot or photo of your workspace — high-res, good lighting <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
          "What colors feel like 'you'? <span style=\"color:#6b7280;\">(e.g. 'soft navy and gold', 'clean white and sage')</span>",
          "Three words that describe your brand or service style",
        ],
        servicesQs: [
          "List your appointment types and duration <span style=\"color:#6b7280;\">(e.g. 'Initial Consultation, 60 min, $120' / 'Follow-up, 30 min, $65')</span>",
          "Do you offer packages or prepaid session bundles? If so, describe them with pricing.",
          'What\'s your booking process? <span style="color:#6b7280;">(online booking link, phone call, email request?)</span>',
          "Any cancellation or rescheduling policies clients should know upfront?",
        ],
        mediaQs: [
          '5–10 photos of your workspace, studio, or you working with clients <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          'Any before/after or results photos — client permission required <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          'Any video testimonials or promotional clips <span style="color:#C41E3A;font-weight:600;">[attach or share link]</span>',
          'Any graphics or promotional banners you already use <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
        ],
      };

    case "ecommerce":
      return {
        subject: "Let's build your online store — a few quick questions",
        intro:
          "Welcome! Your online store is being set up. To get it looking and selling like you, I need a few details. This takes about 10–15 minutes — just reply with your answers and files attached.",
        aboutQs: [
          "What's your full business name, and what do you sell?",
          "Where are you based, and do you ship locally, nationally, or internationally?",
          "How long have you been selling? Is this a new store or migrating from another platform?",
          'Who is your ideal customer? <span style="color:#6b7280;">(e.g. young adults, fitness enthusiasts, home cooks, gift buyers)</span>',
        ],
        brandQs: [
          'Your logo — PNG or SVG, transparent background preferred <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
          'Brand lifestyle or product photography — high-res <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          "What colors represent your brand? <span style=\"color:#6b7280;\">(e.g. 'earthy tones and cream', 'bold black and yellow')</span>",
          "Three words that describe your brand personality",
        ],
        servicesQs: [
          "List your products with names, short descriptions, and prices <span style=\"color:#6b7280;\">(e.g. 'Whey Protein Powder, 2lbs, $45 — vanilla & chocolate variants')</span>",
          "Do you offer bundles, subscriptions, or discount codes? Describe them.",
          'What\'s your shipping setup? <span style="color:#6b7280;">(flat rate, free over X, calculated, local pickup?)</span>',
          "Any return or exchange policy you want displayed?",
        ],
        mediaQs: [
          'High-quality photos of each product — multiple angles preferred <span style="color:#C41E3A;font-weight:600;">[attach files or share folder]</span>',
          'Lifestyle photos showing products in use <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          'Any unboxing or promotional video content <span style="color:#C41E3A;font-weight:600;">[attach or share link]</span>',
          'Customer review screenshots or testimonials you\'d like featured <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
        ],
      };

    case "reservations":
      return {
        subject: "Let's build your booking website — a few quick questions",
        intro:
          "Welcome! Your reservation website is being set up. To make it work seamlessly for your guests, I need a few details. This takes about 10–15 minutes — just reply with your answers and files attached.",
        aboutQs: [
          'What\'s your business name, and what type of reservations do you take? <span style="color:#6b7280;">(e.g. restaurant, villa, tour, event space)</span>',
          "Where are you located? Do you have multiple locations?",
          "How long have you been operating? Any awards, ratings, or press you're proud of?",
          'Who is your typical guest or customer? <span style="color:#6b7280;">(e.g. couples, families, corporate groups, tourists)</span>',
        ],
        brandQs: [
          'Your logo — PNG or SVG, transparent background preferred <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
          'Professional photos of your space, venue, or experience <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          "What colors or aesthetic represent your brand? <span style=\"color:#6b7280;\">(e.g. 'warm terracotta and linen', 'modern dark wood and white')</span>",
          "Three words that describe the experience guests can expect",
        ],
        servicesQs: [
          "List the types of reservations available and capacity/pricing <span style=\"color:#6b7280;\">(e.g. 'Dinner for 2, Fri–Sun, $0 deposit required')</span>",
          "Do you offer packages, add-ons, or exclusive experiences? Describe them.",
          'What\'s your booking process? <span style="color:#6b7280;">(online form, phone, third-party platform like OpenTable?)</span>',
          "What are your cancellation, deposit, or no-show policies?",
        ],
        mediaQs: [
          '10–20 high-quality photos of your venue, space, or experience <span style="color:#C41E3A;font-weight:600;">[attach files or share folder]</span>',
          'Photos of your menu, products, or offerings if applicable <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          'Any video walkthroughs, reels, or promotional clips <span style="color:#C41E3A;font-weight:600;">[attach or share link]</span>',
          'Guest review screenshots or press features you\'d like highlighted <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
        ],
      };

    case "hybrid_local":
      return {
        subject:
          "Let's build your local business website — a few quick questions",
        intro:
          "Welcome! Your website is being set up to help your local business grow online. To make it feel right for your community, I need a few details. This takes about 10–15 minutes — just reply with your answers and files attached.",
        aboutQs: [
          "What's your business name, and what do you do?",
          "What city/neighborhood are you in? Do you serve customers in-store, on-location, or online?",
          "How long have you been in business? Any specializations or certifications worth highlighting?",
          'Who is your ideal customer? <span style="color:#6b7280;">(e.g. local homeowners, walk-in shoppers, service area residents)</span>',
        ],
        brandQs: [
          'Your logo — PNG or SVG, transparent background preferred <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
          'Photos of your storefront, team, or work in action <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          "What colors feel like 'you'? <span style=\"color:#6b7280;\">(e.g. 'classic navy and red', 'warm orange and charcoal')</span>",
          "Three words that describe your business or how customers feel after working with you",
        ],
        servicesQs: [
          "List your main services or products with brief descriptions and pricing <span style=\"color:#6b7280;\">(e.g. 'Oil Change, 30 min, $49 — includes top-up check')</span>",
          "Do you offer promotions, membership plans, or loyalty programs? Describe them.",
          'How do customers typically contact or book you? <span style="color:#6b7280;">(walk-in, phone, website form, Google Maps?)</span>',
          "What are your hours of operation and location(s)?",
        ],
        mediaQs: [
          '5–15 photos of your business, team, products, or work <span style="color:#C41E3A;font-weight:600;">[attach files or share folder]</span>',
          'Before/after photos of your work if applicable — customer permission required <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          'Any video content, reels, or walkthroughs <span style="color:#C41E3A;font-weight:600;">[attach or share link]</span>',
          'Customer review screenshots you\'d like featured on the site <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
        ],
      };

    case "lead_gen_services":
    default:
      return {
        subject:
          "Let's build your service business website — a few quick questions",
        intro:
          "Welcome! Your website is being set up. To make it feel authentically you and drive real leads, I need a few details. This takes about 10–15 minutes — just reply with your answers and files attached.",
        aboutQs: [
          "What's your full name and business name?",
          "What city/area do you serve? Do you work locally, regionally, or remotely?",
          "How long have you been in business? Any certifications, awards, or credentials worth highlighting?",
          'Who is your ideal client? <span style="color:#6b7280;">(e.g. homeowners, small businesses, startups, property managers)</span>',
        ],
        brandQs: [
          'Your logo — PNG or SVG, transparent background preferred <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
          'A professional photo of yourself or your team — high-res, good lighting <span style="color:#C41E3A;font-weight:600;">[attach file]</span>',
          "What colors feel like 'you'? <span style=\"color:#6b7280;\">(e.g. 'bold blue and white', 'earthy green and tan')</span>",
          "Three words that describe your service style or brand vibe",
        ],
        servicesQs: [
          "List your main services with a short description of each <span style=\"color:#6b7280;\">(e.g. 'Residential Cleaning, 3-hr deep clean, starting at $150')</span>",
          "Do you offer packages, maintenance plans, or recurring contracts?",
          'How do potential clients typically reach you or request a quote? <span style="color:#6b7280;">(phone, web form, email, referral?)</span>',
          "What makes you different from competitors in your area?",
        ],
        mediaQs: [
          '5–15 photos of your work, team, equipment, or job sites <span style="color:#C41E3A;font-weight:600;">[attach files or share folder]</span>',
          'Before/after photos of completed work — client permission required <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
          'Any video testimonials, walkthroughs, or promotional clips <span style="color:#C41E3A;font-weight:600;">[attach or share link]</span>',
          'Customer review screenshots or referral quotes you\'d like featured <span style="color:#C41E3A;font-weight:600;">[attach files]</span>',
        ],
      };
  }
}

function sectionHtml(title: string, items: string[], note?: string): string {
  const noteHtml = note
    ? `<p style="margin:0 0 8px;font-size:14px;color:#6b7280;font-style:italic;">${note}</p>`
    : "";
  const listItems = items.map((q) => `<li>${q}</li>`).join("\n      ");
  return `
    <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:#CD7F32;letter-spacing:0.5px;text-transform:uppercase;border-bottom:2px solid #CD7F32;padding-bottom:6px;">${title}</h2>
    ${noteHtml}
    <ol style="margin:0 0 28px;padding-left:20px;color:#374151;font-size:15px;line-height:2.2;">
      ${listItems}
    </ol>`;
}

export function buildTenantIntakeHtml({
  firstName,
  businessType,
}: TenantIntakeTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  const content = getIntakeContent(businessType);
  return layout(
    content.subject,
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
      ${content.intro}
    </p>
    ${sectionHtml("About Your Business", content.aboutQs)}
    ${sectionHtml("Your Brand", content.brandQs, "Please attach files or share a Google Drive / Dropbox link where noted.")}
    ${sectionHtml("Your Services", content.servicesQs)}
    ${sectionHtml("Photos &amp; Media", content.mediaQs, "Attach directly or send a shared folder link.")}
    <p style="margin:0 0 0;font-size:15px;color:#374151;line-height:1.7;background-color:#f9fafb;border-left:4px solid #CD7F32;padding:16px 20px;border-radius:4px;">
      Just reply to this email with your answers — no form to fill out. If you have files to share, attach them directly or send a Google Drive / Dropbox link.
    </p>
    <p style="margin:24px 0 0;font-size:15px;color:#374151;">
      — The RD Tech Bridge Team
    </p>`,
  );
}

// ─── Generic notification ─────────────────────────────────────────────────────

export interface NotificationPayload {
  subject: string;
  heading: string;
  body: string;
  /** Optional CTA button. */
  cta?: { label: string; href: string };
}

export function buildNotificationHtml({
  heading,
  body,
  cta,
}: NotificationPayload): string {
  return layout(
    heading,
    `<h1 style="margin:0 0 16px;font-size:24px;color:#111827;font-weight:700;">${heading}</h1>
    <div style="font-size:15px;color:#374151;line-height:1.7;">${body}</div>
    ${cta ? primaryButton(cta.href, cta.label) : ""}`,
  );
}
