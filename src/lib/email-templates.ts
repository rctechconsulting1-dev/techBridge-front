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
  | "universal"
  | "lead_gen_services"
  | "appointments"
  | "ecommerce"
  | "reservations"
  | "hybrid_local"
  | string; // fallback for unknown future types

export interface TenantIntakeTemplateOptions {
  firstName?: string;
  tenantName?: string;
  businessType?: BusinessType;
  /** URL to the online intake questionnaire form. */
  intakeUrl?: string;
  /** Shared Google Drive folder link for logo/photo/brand asset uploads. */
  driveFolderUrl?: string;
}

interface IntakeContent {
  subject: string;
  intro: string;
  aboutQs: string[];
  brandQs: string[];
  servicesQs: string[];
  mediaQs: string[];
  onlinePresenceQs: string[];
  automationQs: string[];
  setupQs: string[];
}

function getIntakeContent(businessType?: BusinessType, hasDriveFolder?: boolean): IntakeContent {
  void businessType;

  const brandAssetLine = hasDriveFolder
    ? "Your logo and any brand photos — see the shared folder link below to upload"
    : "Your logo and any brand photos — we'll follow up separately on how to share these";
  const workPhotosLine = hasDriveFolder
    ? "5–15 photos of your work, products, team, venue, or business — add these to the shared folder"
    : "5–15 photos of your work, products, team, venue, or business — we'll follow up separately on how to share these";
  const beforeAfterLine = hasDriveFolder
    ? "Any before/after shots, customer result photos, or portfolio images — add these to the shared folder"
    : "Any before/after shots, customer result photos, or portfolio images — we'll follow up separately on how to share these";
  const videoLine = hasDriveFolder
    ? 'Any video content, walkthroughs, testimonials, reels, or promo clips <span style="color:#6b7280;">(paste links, or add video files to the shared folder)</span>'
    : 'Any video content, walkthroughs, testimonials, reels, or promo clips <span style="color:#6b7280;">(paste links here)</span>';

  return {
    subject: "Let's build your website — a few quick questions",
    intro:
      "Welcome! Your website is being set up using our universal onboarding flow. To make it match your business and conversion goals, we need a few details. This takes about 10–15 minutes.",
    aboutQs: [
      "What is your full business name, and what should we call you internally?",
      "What city, neighborhood, service area, or regions do you serve?",
      "How long have you been in business, and what credentials, licenses, or trust signals should we highlight?",
      'Who is your ideal customer, and what kind of jobs, bookings, or purchases do you want more of? <span style="color:#6b7280;">(for example: emergency repairs, recurring bookings, online orders, reservations)</span>',
    ],
    brandQs: [
      brandAssetLine,
      "What colors or overall style feel right for your brand?",
      "Three words that describe your business, service style, or customer experience",
    ],
    servicesQs: [
      "List your main services, products, or reservation types with short descriptions and any pricing guidance you want shown",
      "Do you offer packages, memberships, subscriptions, deposits, upsells, or add-ons?",
      'What is the main action you want people to take on the site? <span style="color:#6b7280;">(call, submit a form, book, reserve, buy online, visit in person)</span>',
      "What policies, guarantees, shipping details, cancellation rules, deposits, or return terms should customers know upfront?",
    ],
    mediaQs: [
      workPhotosLine,
      beforeAfterLine,
      videoLine,
      "Paste any existing customer testimonials or reviews you want featured on the site",
    ],
    onlinePresenceQs: [
      'Do you have a Google Business Profile? Paste the URL — and please grant Manager access to <strong>rctechsolutions1@gmail.com</strong> so we can connect reviews and performance data',
      'Facebook business page URL (if you have one)',
      'Instagram profile URL or handle (if you have one)',
      'Yelp profile URL (if you have one)',
      'Any other review or directory profiles — Angi, Thumbtack, BBB, HomeAdvisor, etc.',
      'Are you currently running Google Ads or Local Services Ads (LSA)?',
      'Do you use any booking, scheduling, or CRM software? <span style="color:#6b7280;">(e.g. Jobber, ServiceTitan, Calendly, Housecall Pro)</span>',
    ],
    automationQs: [
      "What tasks or parts of running your business feel repetitive or manual right now?",
      "What software or tools do you currently use for day-to-day operations?",
      'Would you be interested in text-message follow-ups, AI-assisted content/customer responses, or ad campaign optimization? <span style="color:#6b7280;">(just a general sense — no commitment)</span>',
    ],
    setupQs: [
      'Do you have an existing website we should reference or pull content from?',
      'Do you have a domain name you want to use? <span style="color:#6b7280;">(e.g. yourbusiness.com)</span>',
      'Who is your domain registrar? <span style="color:#6b7280;">(e.g. GoDaddy, Namecheap, Google Domains)</span>',
      'When do you want your site to go live? <span style="color:#6b7280;">(e.g. ASAP, within 2 weeks, flexible)</span>',
    ],
  };
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
  tenantName,
  businessType,
  intakeUrl,
  driveFolderUrl,
}: TenantIntakeTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  const content = getIntakeContent(businessType, Boolean(driveFolderUrl));
  const tenantLabel = tenantName?.trim() ? tenantName.trim() : "your website";

  const ctaBlock = intakeUrl
    ? `${primaryButton(intakeUrl, "Start Your Questionnaire")}
    <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">
      Or copy and paste this URL into your browser:
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">
      <a href="${intakeUrl}" style="color:#CD7F32;">${intakeUrl}</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
      This link expires in 7 days. If it expires, contact us and we'll send a new one.
    </p>`
    : `<p style="margin:0 0 0;font-size:15px;color:#374151;line-height:1.7;background-color:#f9fafb;border-left:4px solid #CD7F32;padding:16px 20px;border-radius:4px;">
      Just reply to this email with your answers — no form to fill out. If you have files to share, attach them directly or send a Google Drive / Dropbox link.
    </p>`;

  const driveFolderBlock = driveFolderUrl
    ? `<div style="margin:0 0 24px;padding:16px 20px;background-color:#fff7ed;border-left:4px solid #CD7F32;border-radius:4px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">
        Upload your logo, photos, and brand assets here:
      </p>
      <p style="margin:0;font-size:14px;word-break:break-all;">
        <a href="${driveFolderUrl}" style="color:#CD7F32;">${driveFolderUrl}</a>
      </p>
    </div>`
    : "";

  return layout(
    content.subject,
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
      ${content.intro}
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      This questionnaire is for <strong>${tenantLabel}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      Below is a preview of the questions we'll ask. Click the button to fill out the form online.
    </p>
    ${driveFolderBlock}
    ${sectionHtml("About Your Business", content.aboutQs)}
    ${sectionHtml("Your Brand", content.brandQs, driveFolderUrl ? "Upload files to the shared folder above." : undefined)}
    ${sectionHtml("Your Services", content.servicesQs)}
    ${sectionHtml("Online Presence &amp; Platforms", content.onlinePresenceQs)}
    ${sectionHtml("Automation &amp; Workflows", content.automationQs)}
    ${sectionHtml("Photos &amp; Media", content.mediaQs, driveFolderUrl ? "Upload files to the shared folder above." : undefined)}
    ${sectionHtml("Website Setup &amp; Launch", content.setupQs)}
    ${ctaBlock}
    <p style="margin:24px 0 0;font-size:15px;color:#374151;">
      — The RD TechBridge Team
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

// ─── Billing invite ───────────────────────────────────────────────────────────

export interface BillingInviteTemplateOptions {
  firstName?: string;
  planName: string;
  priceFormatted: string;
  checkoutUrl: string;
}

export function buildBillingInviteHtml({
  firstName,
  planName,
  priceFormatted,
  checkoutUrl,
}: BillingInviteTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  return layout(
    `Subscribe to ${planName} – RD TechBridge`,
    `<h1 style="margin:0 0 16px;font-size:24px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;">
      Your account has been set up and you&rsquo;ve been assigned the <strong>${planName}</strong> plan.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
      To activate your subscription at <strong>${priceFormatted}/month</strong>, click the button below to complete your payment setup through our secure payment partner, Stripe.
    </p>
    <p style="font-size:13px;color:#6b7280;margin:0 0 16px;">
      Note: Subscriptions require a <strong>4‑month minimum</strong> commitment. A one-time setup fee may apply depending on the selected plan.
    </p>
    ${primaryButton(checkoutUrl, "Activate My Subscription")}
    <p style="font-size:13px;color:#9ca3af;margin:0;">
      This link is unique to your account. If you have any questions, reply to this email or contact our support team.
    </p>`,
  );
}

// ─── Prospect invite (combined intake + billing) ──────────────────────────────

export interface ProspectInviteTemplateOptions {
  firstName?: string;
  tenantName: string;
  planName: string;
  priceFormatted: string;
  checkoutUrl: string;
  intakeUrl: string;
}

export function buildProspectInviteHtml({
  firstName,
  tenantName,
  planName,
  priceFormatted,
  checkoutUrl,
  intakeUrl,
}: ProspectInviteTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";

  return layout(
    `Let's get ${tenantName} started`,
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
      We're ready to get started on <strong>${tenantName}</strong> on the <strong>${planName}</strong> plan (${priceFormatted}/month). There are two quick things to take care of:
    </p>
    <h2 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#CD7F32;">1. Answer a few questions</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      This takes about 10-15 minutes and helps us build your site to match your business.
    </p>
    ${primaryButton(intakeUrl, "Start Your Questionnaire")}
    <h2 style="margin:32px 0 8px;font-size:17px;font-weight:700;color:#CD7F32;">2. Activate your plan</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Set up billing for the ${planName} plan whenever is convenient for you.
    </p>
    ${primaryButton(checkoutUrl, "Activate Your Plan")}
    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
      Note: Subscriptions require a <strong>4‑month minimum</strong> commitment. A one-time setup fee may apply depending on the selected plan.
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Once you've completed the questionnaire, we'll send you a link to book your kickoff call.
    </p>
    <p style="margin:24px 0 0;font-size:15px;color:#374151;">
      — The RD TechBridge Team
    </p>`,
  );
}
