import { NextRequest, NextResponse } from "next/server";
import { POST as NextS3UploadPost } from "next-s3-upload/route";
import { verifyAuth } from "@/lib/route-auth";

type UploadScope = "branding" | "asset" | "page" | "upload" | "intake";

const ALLOWED_SCOPES: UploadScope[] = ["branding", "asset", "page", "upload", "intake"];

const INTAKE_CATEGORIES = ["logo", "team", "work", "products", "facility", "documents", "general"] as const;
type IntakeCategory = (typeof INTAKE_CATEGORIES)[number];

const CONTENT_CATEGORIES = ["team", "work", "products", "facility", "general"] as const;
type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/svg+xml",
	"image/gif",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const toPositiveInteger = (value: string | null): number | null => {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const sanitizeFileName = (name: string) =>
	name
		.replace(/[^0-9a-zA-Z!_.*'()\-/]/g, " ")
		.trim()
		.replace(/\s+/g, "-");

const resolveContentCategory = (raw: string | null): ContentCategory => {
	if (raw && (CONTENT_CATEGORIES as readonly string[]).includes(raw)) {
		return raw as ContentCategory;
	}
	return "general";
};

const resolveIntakeCategory = (raw: string | null): IntakeCategory => {
	if (raw && (INTAKE_CATEGORIES as readonly string[]).includes(raw)) {
		return raw as IntakeCategory;
	}
	return "general";
};

const buildS3Key = (req: NextRequest, filename: string): string => {
	const scope = (req.nextUrl.searchParams.get("scope") || "upload") as UploadScope;
	const websiteId = toPositiveInteger(req.nextUrl.searchParams.get("websiteId"));
	const pageId = toPositiveInteger(req.nextUrl.searchParams.get("pageId"));
	const rawCategory = req.nextUrl.searchParams.get("category");

	const safeName = sanitizeFileName(filename || "upload");
	const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

	if (scope === "branding" && websiteId) {
		return `assets/client-${websiteId}/branding/${uniquePrefix}-${safeName}`;
	}

	if (scope === "asset" && websiteId) {
		const category = resolveContentCategory(rawCategory);
		return `assets/client-${websiteId}/content/${category}/${uniquePrefix}-${safeName}`;
	}

	if (scope === "intake" && websiteId) {
		const category = resolveIntakeCategory(rawCategory);
		return `assets/client-${websiteId}/intake/${category}/${uniquePrefix}-${safeName}`;
	}

	if (scope === "page" && pageId) {
		return `pages/page-${pageId}/${uniquePrefix}-${safeName}`;
	}

	if (websiteId) {
		return `uploads/client-${websiteId}/${uniquePrefix}-${safeName}`;
	}

	if (pageId) {
		return `uploads/page-${pageId}/${uniquePrefix}-${safeName}`;
	}

	throw new Error(`Missing required scoped identifier for upload scope: ${scope}`);
};

const postHandler = NextS3UploadPost.configure({
	key: buildS3Key,
});

export const POST = async (req: NextRequest) => {
	// --- Auth guard ---
	const auth = await verifyAuth(req);
	if (!auth.ok) {
		return auth.response;
	}

	// --- Server-side file validation ---
	const contentType = req.headers.get("content-type") || "";
	const contentLength = req.headers.get("content-length");

	if (contentLength) {
		const size = parseInt(contentLength, 10);
		if (!Number.isNaN(size) && size > MAX_FILE_SIZE_BYTES) {
			return NextResponse.json(
				{ error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` },
				{ status: 413 },
			);
		}
	}

	// For multipart uploads next-s3-upload handles the file extraction,
	// but we validate the declared MIME in the query/body where possible.
	const filetype = req.nextUrl.searchParams.get("filetype");
	if (filetype && !ALLOWED_MIME_TYPES.has(filetype) && !contentType.includes("multipart/form-data")) {
		return NextResponse.json(
			{ error: `File type "${filetype}" is not allowed. Accepted: ${[...ALLOWED_MIME_TYPES].join(", ")}` },
			{ status: 415 },
		);
	}

	// --- Scope + ID validation ---
	const scope = (req.nextUrl.searchParams.get("scope") || "upload") as UploadScope;
	const websiteId = toPositiveInteger(req.nextUrl.searchParams.get("websiteId"));
	const pageId = toPositiveInteger(req.nextUrl.searchParams.get("pageId"));

	if (!ALLOWED_SCOPES.includes(scope)) {
		return NextResponse.json(
			{ error: `Invalid upload scope: ${scope}` },
			{ status: 400 },
		);
	}

	if ((scope === "branding" || scope === "asset" || scope === "upload" || scope === "intake") && !websiteId && !pageId) {
		return NextResponse.json(
			{ error: "websiteId or pageId is required for tenant-scoped uploads." },
			{ status: 400 },
		);
	}

	if (scope === "page" && !pageId) {
		return NextResponse.json(
			{ error: "pageId is required when scope=page." },
			{ status: 400 },
		);
	}

	return postHandler(req);
};