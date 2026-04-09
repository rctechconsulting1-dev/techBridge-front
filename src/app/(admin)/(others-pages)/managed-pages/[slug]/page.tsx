import { notFound, redirect } from "next/navigation";
import { isOptionalSystemPageSlug } from "@/lib/page-management";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ManagedPageRedirect({ params }: Props) {
  const { slug } = await params;
  const normalizedSlug = String(slug || "").trim().toLowerCase();

  if (!isOptionalSystemPageSlug(normalizedSlug)) {
    notFound();
  }

  redirect(`/main-page?managed=${encodeURIComponent(normalizedSlug)}`);
}
