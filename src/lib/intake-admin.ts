export function buildLatestIntakeAdminPath(params: {
  websiteId?: number | null;
  tenantId?: number | null;
}): string | null {
  const searchParams = new URLSearchParams();

  if (typeof params.websiteId === "number" && params.websiteId > 0) {
    searchParams.set("websiteId", String(params.websiteId));
  }

  if (typeof params.tenantId === "number" && params.tenantId > 0) {
    searchParams.set("tenantId", String(params.tenantId));
  }

  const query = searchParams.toString();
  return query ? `/api/intake/admin/latest?${query}` : null;
}