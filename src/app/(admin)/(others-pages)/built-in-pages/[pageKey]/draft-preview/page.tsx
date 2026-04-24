import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DraftPreviewClient from "./DraftPreviewClient";
import { BUILT_IN_PAGE_KEYS } from "@/lib/builtInPageContent";
import type { BuiltInPageKey } from "@/lib/cms-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ pageKey: string }>;
  searchParams: Promise<{ websiteId?: string; tenantId?: string }>;
}

export const metadata: Metadata = {
  title: "Built-in Page Draft Preview",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BuiltInPageDraftPreviewPage({ params, searchParams }: Props) {
  const { pageKey: rawPageKey } = await params;
  const { websiteId: rawWebsiteId, tenantId: rawTenantId } = await searchParams;

  const pageKey = BUILT_IN_PAGE_KEYS.includes(rawPageKey as BuiltInPageKey)
    ? (rawPageKey as BuiltInPageKey)
    : null;

  if (!pageKey || !rawWebsiteId) {
    notFound();
  }

  const tenantId = rawTenantId ? Number(rawTenantId) : null;

  if (rawTenantId && (!tenantId || Number.isNaN(tenantId))) {
    notFound();
  }

  return (
    <DraftPreviewClient
      pageKey={pageKey}
      websiteId={rawWebsiteId}
      tenantId={tenantId}
    />
  );
}