/**
 * HTML email templates for RC TechBridge.
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
                    <span style="font-size:28px;font-weight:800;color:#CD7F32;">C</span>
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
                RC TechBridge &middot; Helping businesses grow online
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                You received this email because you have an account at RC TechBridge.
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

export function buildWelcomeHtml({ firstName }: WelcomeTemplateOptions): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  return layout(
    "Welcome to RC TechBridge!",
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
      Welcome to <strong>RC TechBridge</strong> — your all-in-one platform for managing your online presence, client sites, and business growth.
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
      — The RC TechBridge Team
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
    "Verify your email – RC TechBridge",
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
    "Reset your password – RC TechBridge",
    `<h1 style="margin:0 0 8px;font-size:26px;color:#111827;font-weight:700;">${greeting}</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
      We received a request to reset the password for your RC TechBridge account.
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
