import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyIntakeToken } from "@/lib/email";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const INTAKE_CATEGORIES = [
  "logo",
  "team",
  "work",
  "products",
  "facility",
  "documents",
  "general",
] as const;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const schema = z.object({
  token: z.string().min(1),
  filename: z.string().min(1).max(255),
  contentType: z.string().refine((ct) => ALLOWED_MIME_TYPES.has(ct), {
    message: "File type not allowed",
  }),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE_BYTES).optional(),
  category: z
    .enum(INTAKE_CATEGORIES)
    .optional()
    .default("general"),
});

const sanitizeFileName = (name: string) =>
  name
    .replace(/[^0-9a-zA-Z!_.*'()\-/]/g, " ")
    .trim()
    .replace(/\s+/g, "-");

function getS3Client() {
  return new S3Client({
    region: process.env.S3_UPLOAD_REGION || process.env.NEXT_PUBLIC_S3_REGION || "us-west-1",
    credentials: {
      accessKeyId: process.env.S3_UPLOAD_KEY || "",
      secretAccessKey: process.env.S3_UPLOAD_SECRET || "",
    },
  });
}

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

  const { token, filename, contentType, category } = parsed.data;

  // Verify intake token (replaces JWT auth for this endpoint)
  const payload = await verifyIntakeToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired intake link." },
      { status: 401 },
    );
  }

  const { tenantId, websiteId } = payload as unknown as {
    tenantId: number;
    websiteId?: number;
  };

  const clientId = websiteId ?? tenantId;
  const safeName = sanitizeFileName(filename || "upload");
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `assets/client-${clientId}/intake/${category}/${uniquePrefix}-${safeName}`;

  const bucket = process.env.S3_UPLOAD_BUCKET || "techconsulting-rc";

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(getS3Client(), command, {
      expiresIn: 300, // 5 minutes
    });

    const region = process.env.S3_UPLOAD_REGION || process.env.NEXT_PUBLIC_S3_REGION || "us-west-1";
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      url: presignedUrl,
      key,
      publicUrl,
    });
  } catch (err) {
    console.error("[intake/upload] Failed to generate pre-signed URL:", err);
    return NextResponse.json(
      { error: "Failed to prepare upload. Please try again." },
      { status: 500 },
    );
  }
}
