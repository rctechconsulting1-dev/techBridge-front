import { NextRequest, NextResponse } from "next/server";
import { POST as NextS3UploadPost } from "next-s3-upload/route";

type UploadScope = "branding" | "asset" | "page" | "upload";

const ALLOWED_SCOPES: UploadScope[] = ["branding", "asset", "page", "upload"];

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

const buildS3Key = (req: NextRequest, filename: string): string => {
	const scope = (req.nextUrl.searchParams.get("scope") || "upload") as UploadScope;
	const websiteId = toPositiveInteger(req.nextUrl.searchParams.get("websiteId"));
	const pageId = toPositiveInteger(req.nextUrl.searchParams.get("pageId"));

	const safeName = sanitizeFileName(filename || "upload");
	const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

	if (scope === "branding" && websiteId) {
		return `assets/client-${websiteId}/branding/${uniquePrefix}-${safeName}`;
	}

	if (scope === "asset" && websiteId) {
		return `assets/client-${websiteId}/content/${uniquePrefix}-${safeName}`;
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
	const scope = (req.nextUrl.searchParams.get("scope") || "upload") as UploadScope;
	const websiteId = toPositiveInteger(req.nextUrl.searchParams.get("websiteId"));
	const pageId = toPositiveInteger(req.nextUrl.searchParams.get("pageId"));

	if (!ALLOWED_SCOPES.includes(scope)) {
		return NextResponse.json(
			{ error: `Invalid upload scope: ${scope}` },
			{ status: 400 },
		);
	}

	if ((scope === "branding" || scope === "asset" || scope === "upload") && !websiteId && !pageId) {
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