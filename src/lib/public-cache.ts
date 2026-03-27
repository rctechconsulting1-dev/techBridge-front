export const SITE_REVALIDATE_SECONDS = 60;

export const getWebsiteCacheTag = (
  websiteId: number | string,
): string => `website:${websiteId}`;

export const getWebsiteResourceCacheTag = (
  websiteId: number | string,
  resource: string,
): string => `website:${websiteId}:${resource}`;
