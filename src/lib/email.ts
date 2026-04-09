/**
 * Email service using Resend.
 *
 * Required env vars:
 *   RESEND_API_KEY      – API key from resend.com
 *   RESEND_FROM_EMAIL   – Verified sender address (e.g. "RC TechBridge <noreply@yourdomain.com>")
 *   NEXT_PUBLIC_APP_URL – Public base URL used to build links (e.g. https://app.yourdomain.com)
 */

import {
  buildWelcomeHtml,
  buildVerifyHtml,
  buildResetPasswordHtml,
  buildNotificationHtml,
  buildBillingInviteHtml,
  buildTenantIntakeHtml,
  type NotificationPayload,
} from "@/lib/email-templates";
import { getApiBaseUrl, getAppBaseUrl } from "@/lib/api";
import { getResendClient } from "@/lib/resend-client";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "RD TechBridge <noreply@rdtechbridge.com>";

const APP_URL = getAppBaseUrl();
const BACKEND_API_BASE = getApiBaseUrl();
const OPS_INGEST_KEY = process.env.OPS_METRICS_INGEST_KEY || "";

type TenantEmailProfile = {
  available?: boolean;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  sendingDomain?: string;
  emailMode?: string;
  dkimVerified?: boolean;
  spfVerified?: boolean;
};

export type NotificationSendContext = {
  websiteId?: string | number;
  tenantId?: string | number;
};

const normalizeEmailValue = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeFromAddress = (
  fromName: string | undefined,
  fromEmail: string | undefined,
): string | null => {
  const normalizedEmail = normalizeEmailValue(fromEmail);
  if (!normalizedEmail) {
    return null;
  }

  if (normalizedEmail.includes("<") && normalizedEmail.includes(">")) {
    return normalizedEmail;
  }

  const normalizedName = normalizeEmailValue(fromName);
  return normalizedName
    ? `${normalizedName} <${normalizedEmail}>`
    : normalizedEmail;
};

const fetchTenantEmailProfile = async ({
  websiteId,
}: NotificationSendContext): Promise<TenantEmailProfile | null> => {
  if (
    typeof websiteId === "undefined" ||
    websiteId === null ||
    `${websiteId}`.trim() === ""
  ) {
    return null;
  }

  if (!OPS_INGEST_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${BACKEND_API_BASE}/email/profile/internal?websiteId=${encodeURIComponent(String(websiteId))}`,
      {
        method: "GET",
        headers: {
          "x-ops-ingest-key": OPS_INGEST_KEY,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      profile?: TenantEmailProfile;
    };

    return payload.profile ?? null;
  } catch {
    return null;
  }
};

export const resolveNotificationSenderForContext = async (
  context: NotificationSendContext,
): Promise<{ from: string; replyTo?: string }> => {
  const profile = await fetchTenantEmailProfile(context);
  if (!profile || profile.available === false) {
    return { from: FROM_EMAIL };
  }

  const brandedFrom = normalizeFromAddress(profile.fromName, profile.fromEmail);
  const preferredReplyTo =
    normalizeEmailValue(profile.replyTo) ??
    normalizeEmailValue(profile.fromEmail) ??
    undefined;

  if (
    brandedFrom &&
    normalizeEmailValue(profile.sendingDomain) &&
    profile.spfVerified === true &&
    profile.dkimVerified === true
  ) {
    return {
      from: brandedFrom,
      ...(preferredReplyTo ? { replyTo: preferredReplyTo } : {}),
    };
  }

  return {
    from: FROM_EMAIL,
    ...(preferredReplyTo ? { replyTo: preferredReplyTo } : {}),
  };
};

// ─── HMAC token helpers ───────────────────────────────────────────────────────
// Provides lightweight signed tokens stored entirely in the URL (no DB needed).

const VERIFY_TOKEN_SECRET =
  process.env.EMAIL_VERIFY_SECRET ?? "change-me-in-production";

const RESET_TOKEN_SECRET =
  process.env.EMAIL_RESET_SECRET ?? "change-me-in-production-reset";

const INTAKE_TOKEN_SECRET =
  process.env.EMAIL_INTAKE_SECRET ?? "change-me-in-production-intake";

async function hmacSign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return Buffer.from(sigBuffer).toString("base64url");
}

async function hmacVerify(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSign(secret, payload);
  return expected === signature;
}

/** Encode an HMAC-signed token: `base64url(payload).signature` */
export async function createSignedToken(
  secret: string,
  data: Record<string, unknown>,
  ttlSeconds = 86400,
): Promise<string> {
  const payload = Buffer.from(
    JSON.stringify({
      ...data,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    }),
  ).toString("base64url");
  const sig = await hmacSign(secret, payload);
  return `${payload}.${sig}`;
}

export type TokenPayload = Record<string, unknown> & { exp: number };

/** Verify and decode a signed token. Returns null if invalid or expired. */
export async function verifySignedToken(
  secret: string,
  token: string,
): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const valid = await hmacVerify(secret, payload, sig);
  if (!valid) return null;
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as TokenPayload;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Public-facing token factories ───────────────────────────────────────────

/** Build a 24-hour email verification token for a user. */
export async function createVerificationToken(
  email: string,
  userId?: string,
): Promise<string> {
  return createSignedToken(
    VERIFY_TOKEN_SECRET,
    { email, userId },
    60 * 60 * 24, // 24 h
  );
}

/** Build a 1-hour password-reset token for a user. */
export async function createPasswordResetToken(
  email: string,
  userId?: string,
): Promise<string> {
  return createSignedToken(
    RESET_TOKEN_SECRET,
    { email, userId },
    60 * 60, // 1 h
  );
}

/** Verify an email verification token. */
export async function verifyVerificationToken(
  token: string,
): Promise<TokenPayload | null> {
  return verifySignedToken(VERIFY_TOKEN_SECRET, token);
}

/** Verify a password-reset token. */
export async function verifyPasswordResetToken(
  token: string,
): Promise<TokenPayload | null> {
  return verifySignedToken(RESET_TOKEN_SECRET, token);
}

// ─── Email senders ────────────────────────────────────────────────────────────

export interface SendWelcomeEmailOptions {
  to: string;
  firstName?: string;
  websiteId?: string | number;
  tenantId?: string | number;
}

export async function sendWelcomeEmail({
  to,
  firstName,
  websiteId,
  tenantId,
}: SendWelcomeEmailOptions) {
  const sender = await resolveNotificationSenderForContext({ websiteId, tenantId });

  return getResendClient().emails.send({
    from: sender.from,
    to,
    subject: "RC TechBridge: Welcome to your account",
    html: buildWelcomeHtml({ firstName }),
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
  });
}

export interface SendVerifyEmailOptions {
  to: string;
  firstName?: string;
  /** Pre-generated token. If omitted, one will be created automatically. */
  token?: string;
  userId?: string;
}

export async function sendVerifyEmail({
  to,
  firstName,
  token,
  userId,
}: SendVerifyEmailOptions) {
  const verifyToken = token ?? (await createVerificationToken(to, userId));
  const verifyUrl = `${APP_URL}/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;

  return getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your email – RC TechBridge",
    html: buildVerifyHtml({ firstName, verifyUrl }),
  });
}

export interface SendResetPasswordEmailOptions {
  to: string;
  firstName?: string;
  /** Pre-generated token. If omitted, one will be created automatically. */
  token?: string;
  userId?: string;
  websiteId?: string | number;
  tenantId?: string | number;
}

export async function sendResetPasswordEmail({
  to,
  firstName,
  token,
  userId,
  websiteId,
  tenantId,
}: SendResetPasswordEmailOptions) {
  const resetToken = token ?? (await createPasswordResetToken(to, userId));
  const resetUrl = `${APP_URL}/reset-password/confirm?token=${encodeURIComponent(resetToken)}`;
  const sender = await resolveNotificationSenderForContext({ websiteId, tenantId });

  return getResendClient().emails.send({
    from: sender.from,
    to,
    subject: "RC TechBridge: Reset your password",
    html: buildResetPasswordHtml({ firstName, resetUrl }),
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
  });
}

export async function sendNotificationEmail(
  to: string,
  payload: NotificationPayload,
  context: NotificationSendContext = {},
) {
  const sender = await resolveNotificationSenderForContext(context);

  return getResendClient().emails.send({
    from: sender.from,
    to,
    subject: payload.subject,
    html: buildNotificationHtml(payload),
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
  });
}

export interface SendBillingInviteEmailOptions {
  to: string;
  firstName?: string;
  planName: string;
  priceFormatted: string;
  checkoutUrl: string;
}

export async function sendBillingInviteEmail({
  to,
  firstName,
  planName,
  priceFormatted,
  checkoutUrl,
}: SendBillingInviteEmailOptions) {
  return getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Activate your ${planName} subscription – RC TechBridge`,
    html: buildBillingInviteHtml({ firstName, planName, priceFormatted, checkoutUrl }),
  });
}

// ─── Tenant intake questionnaire ──────────────────────────────────────────────

/** Build a 7-day intake questionnaire token for a tenant owner. */
export async function createIntakeToken(
  email: string,
  tenantId: number,
  businessType = "universal",
  websiteId?: number,
  tenantName?: string,
): Promise<string> {
  return createSignedToken(
    INTAKE_TOKEN_SECRET,
    { email, tenantId, businessType, websiteId, tenantName },
    60 * 60 * 24 * 7, // 7 days
  );
}

/** Verify an intake questionnaire token. */
export async function verifyIntakeToken(
  token: string,
): Promise<TokenPayload | null> {
  return verifySignedToken(INTAKE_TOKEN_SECRET, token);
}

export interface SendIntakeEmailOptions {
  to: string;
  firstName?: string;
  tenantName?: string;
  tenantId: number;
  businessType?: string;
  websiteId?: number;
}

export async function sendIntakeEmail({
  to,
  firstName,
  tenantName,
  tenantId,
  businessType = "universal",
  websiteId,
}: SendIntakeEmailOptions) {
  const token = await createIntakeToken(
    to,
    tenantId,
    businessType,
    websiteId,
    tenantName,
  );
  const intakeUrl = `${APP_URL}/intake?token=${encodeURIComponent(token)}`;
  const sender = await resolveNotificationSenderForContext({ websiteId, tenantId });

  const content = buildTenantIntakeHtml({
    firstName,
    tenantName,
    businessType,
    intakeUrl,
  });

  const subjectSuffix = tenantName?.trim() ? ` for ${tenantName.trim()}` : "";

  return getResendClient().emails.send({
    from: sender.from,
    to,
    subject: `RC TechBridge: Complete your business profile${subjectSuffix}`,
    html: content,
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
  });
}
