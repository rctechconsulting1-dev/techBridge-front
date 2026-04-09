import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyIntakeToken } from "@/lib/email";
import { sendNotificationEmail } from "@/lib/email";
import { getApiBaseUrl } from "@/lib/api";
import { saveIntakeSubmission } from "@/lib/intake-storage";
import type { IntakeStoredSubmission } from "@/lib/intake-types";

const answerSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string()), z.boolean(), z.number(), z.null()]),
);

const fileRefSchema = z.object({
  questionId: z.string(),
  url: z.string().url(),
  filename: z.string(),
  category: z.string().optional(),
});

const schema = z.object({
  token: z.string().min(1),
  answers: answerSchema,
  files: z.array(fileRefSchema).optional().default([]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { token, answers, files } = parsed.data;
  let assetIndexWarning: string | null = null;

  // Verify the intake token
  const payload = await verifyIntakeToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired intake link. Please request a new one." },
      { status: 401 },
    );
  }

  const { email, tenantId, businessType, websiteId } = payload as unknown as {
    email: string;
    tenantId: number;
    businessType?: string;
    websiteId?: number;
  };

  const submission: IntakeStoredSubmission = {
    version: 1,
    source: "submitted",
    submittedAt: new Date().toISOString(),
    tenantId,
    websiteId: websiteId ?? null,
    email,
    businessType: (businessType ?? "universal") as IntakeStoredSubmission["businessType"],
    answers,
    files,
  };

  try {
    await saveIntakeSubmission(submission);
  } catch (error) {
    console.error("[intake/submit] Failed to persist intake submission:", error);
    return NextResponse.json(
      { error: "Unable to save intake submission. Please try again." },
      { status: 500 },
    );
  }

  try {
    const assetIndexResponse = await fetch(`${getApiBaseUrl()}/intake-assets/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        files,
      }),
    });

    if (!assetIndexResponse.ok) {
      const errorBody = await assetIndexResponse.json().catch(() => ({}));
      throw new Error(
        errorBody.error ?? `Intake asset indexing failed (${assetIndexResponse.status})`,
      );
    }
  } catch (error) {
    console.error("[intake/submit] Failed to index intake assets:", error);
    assetIndexWarning =
      error instanceof Error
        ? error.message
        : "Uploaded files could not be indexed automatically.";
  }

  // Build a formatted summary for admin notification
  const answerLines = Object.entries(answers)
    .filter(([, v]) => v !== null && v !== "")
    .map(([key, value]) => {
      const display = Array.isArray(value) ? value.join(", ") : String(value);
      return `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top;">${key.replace(/_/g, " ")}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;">${display}</td>
      </tr>`;
    })
    .join("\n");

  const fileLines = files.length
    ? files
        .map(
          (f) =>
            `<li><a href="${f.url}" style="color:#CD7F32;">${f.filename}</a> (${f.category ?? "general"})</li>`,
        )
        .join("\n")
    : "<li>No files uploaded</li>";

  const bodyHtml = `
    <p>Tenant <strong>#${tenantId}</strong> (${email}) submitted their intake questionnaire.</p>
    <p><strong>Intake profile:</strong> ${businessType ?? "universal"}</p>
    <h3 style="margin:16px 0 8px;color:#CD7F32;">Answers</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${answerLines}
    </table>
    <h3 style="margin:16px 0 8px;color:#CD7F32;">Uploaded Files</h3>
    <ul style="font-size:14px;">${fileLines}</ul>
  `;

  // Send notification to admin
  try {
    await sendNotificationEmail(
      process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "admin@rdtechbridge.com",
      {
        subject: `Intake questionnaire submitted — Tenant #${tenantId}`,
        heading: "New Intake Submission",
        body: bodyHtml,
      },
    );
  } catch (err) {
    console.error("[intake/submit] Failed to send admin notification:", err);
    // Don't fail the submission if notification fails
  }

  return NextResponse.json({
    success: true,
    message: assetIndexWarning
      ? "Thank you! Your questionnaire has been submitted successfully. Uploaded files may take a little longer to appear in admin."
      : "Thank you! Your questionnaire has been submitted successfully.",
    tenantId,
    ...(assetIndexWarning ? { warning: assetIndexWarning } : {}),
  });
}
