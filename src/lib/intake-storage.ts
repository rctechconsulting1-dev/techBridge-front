import {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { IntakeStoredSubmission } from "@/lib/intake-types";

const DEFAULT_BUCKET = "techconsulting-rc";

const getBucket = () => process.env.S3_UPLOAD_BUCKET || DEFAULT_BUCKET;

const getS3Client = () =>
  new S3Client({
    region:
      process.env.S3_UPLOAD_REGION ||
      process.env.NEXT_PUBLIC_S3_REGION ||
      "us-west-1",
    credentials: {
      accessKeyId: process.env.S3_UPLOAD_KEY || "",
      secretAccessKey: process.env.S3_UPLOAD_SECRET || "",
    },
  });

export const resolveIntakeClientId = (
  tenantId: number,
  websiteId?: number | null,
): number => websiteId ?? tenantId;

const resolveIntakeClientIds = (
  tenantId?: number | null,
  websiteId?: number | null,
): number[] => {
  const ids = [websiteId ?? null, tenantId ?? null].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
  );

  return Array.from(new Set(ids));
};

const latestKeyForClient = (clientId: number) =>
  `assets/client-${clientId}/intake/submissions/latest.json`;

const archiveKeyForClient = (clientId: number, submittedAt: string) => {
  const safeTimestamp = submittedAt.replace(/[:.]/g, "-");
  return `assets/client-${clientId}/intake/submissions/${safeTimestamp}.json`;
};

const toUtf8 = async (body: unknown): Promise<string> => {
  if (!body || typeof body !== "object") {
    throw new Error("Response body missing");
  }

  const streamBody = body as { transformToString?: (encoding?: string) => Promise<string> };
  if (typeof streamBody.transformToString === "function") {
    return streamBody.transformToString("utf-8");
  }

  throw new Error("Unsupported S3 response body");
};

export async function saveIntakeSubmission(
  submission: IntakeStoredSubmission,
): Promise<void> {
  const clientIds = resolveIntakeClientIds(submission.tenantId, submission.websiteId);
  const bucket = getBucket();
  const s3 = getS3Client();
  const payload = JSON.stringify(submission, null, 2);

  await Promise.all(
    clientIds.flatMap((clientId) => [
      s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: latestKeyForClient(clientId),
          Body: payload,
          ContentType: "application/json",
        }),
      ),
      s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: archiveKeyForClient(clientId, submission.submittedAt),
          Body: payload,
          ContentType: "application/json",
        }),
      ),
    ]),
  );
}

export async function saveLatestIntakeSubmission(
  submission: IntakeStoredSubmission,
): Promise<void> {
  const clientIds = resolveIntakeClientIds(submission.tenantId, submission.websiteId);
  const bucket = getBucket();
  const s3 = getS3Client();
  const payload = JSON.stringify(submission, null, 2);

  await Promise.all(
    clientIds.map((clientId) =>
      s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: latestKeyForClient(clientId),
          Body: payload,
          ContentType: "application/json",
        }),
      ),
    ),
  );
}

export async function getLatestIntakeSubmission(params: {
  tenantId?: number | null;
  websiteId?: number | null;
}): Promise<IntakeStoredSubmission | null> {
  const clientIds = resolveIntakeClientIds(params.tenantId, params.websiteId);

  if (clientIds.length === 0) {
    return null;
  }

  const bucket = getBucket();
  const s3 = getS3Client();

  for (const clientId of clientIds) {
    try {
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: latestKeyForClient(clientId),
        }),
      );

      const raw = await toUtf8(response.Body);
      const submission = JSON.parse(raw) as IntakeStoredSubmission;

      // Guard against cross-tenant leakage when websiteIds are shared across tenants.
      // If the caller specified a tenantId, the stored submission must match it.
      if (
        typeof params.tenantId === "number" &&
        params.tenantId > 0 &&
        typeof submission.tenantId === "number" &&
        submission.tenantId !== params.tenantId
      ) {
        continue;
      }

      return submission;
    } catch (error) {
      if (error instanceof NoSuchKey) {
        continue;
      }

      const message = error instanceof Error ? error.message : "";
      if (message.includes("NoSuchKey") || message.includes("The specified key does not exist")) {
        continue;
      }

      throw error;
    }
  }

  return null;
}