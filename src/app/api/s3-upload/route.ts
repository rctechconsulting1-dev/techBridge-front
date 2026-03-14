import { NextRequest } from "next/server";
import { POST as NextS3UploadPost } from "next-s3-upload/route";

const sanitizeFileName = (name: string) =>
	name
		.replace(/[^0-9a-zA-Z!_.*'()\-/]/g, " ")
		.trim()
		.replace(/\s+/g, "-");

const buildS3Key = (req: NextRequest, filename: string): string => {
	const scope = req.nextUrl.searchParams.get("scope");
	const websiteId = req.nextUrl.searchParams.get("websiteId");
	const pageId = req.nextUrl.searchParams.get("pageId");

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

	return `uploads/${uniquePrefix}-${safeName}`;
};

export const POST = NextS3UploadPost.configure({
	key: buildS3Key,
});