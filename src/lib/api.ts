const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

const RESOURCE_PATH_MAP: Record<string, string> = {
  '/page': '/pages',
  '/website': '/websites',
  '/business_listing': '/business-listings',
  '/image': '/images',
  '/user': '/users',
  '/page_image': '/page-images',
  '/seo_metadata': '/seo-metadata',
  '/asset': '/assets',
};

const normalizePath = (path: string) => RESOURCE_PATH_MAP[path] || path;

export const getApiBaseUrl = (): string => {
  const rawBaseUrl = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
  if (typeof window !== 'undefined' && /^https?:\/\//i.test(rawBaseUrl)) {
    return '/api';
  }
  return rawBaseUrl;
};

export const toApiUrl = (pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const base = getApiBaseUrl();
  const [rawPath, rawQuery = ''] = pathOrUrl.split('?');
  const normalizedPath = normalizePath(rawPath);
  const query = new URLSearchParams(rawQuery);

  const websiteIdEq = query.get('website_id');
  if (websiteIdEq?.startsWith('eq.')) {
    query.set('website_id', websiteIdEq.replace('eq.', ''));
  }

  const emailLike = query.get('email');
  if (emailLike?.startsWith('like.')) {
    query.delete('email');
    query.set('email_like', emailLike.replace('like.', '').replace('*', ''));
  }

  const queryString = query.toString();
  return `${base}${normalizedPath}${queryString ? `?${queryString}` : ''}`;
};

export const methodToBackendMethod = (method: string) => {
  if (method.toUpperCase() === 'PATCH') {
    return 'PUT';
  }
  return method.toUpperCase();
};
