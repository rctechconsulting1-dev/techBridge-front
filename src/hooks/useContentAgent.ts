import useSWRMutation from 'swr/mutation';
import { getActiveTenantId, getStoredAuthToken } from '@/lib/auth-context';

type ContentAgentProps = {
  websiteId?: number;
  tenantId?: number;
  mode?: 'standard' | 'service_copy' | 'about_copy' | 'page_nav_copy' | 'site_settings_orchestrator' | 'built_in_page_seo' | 'location_page' | 'suggest_seo_answers';
  ourUrl?: string;
  city?: string;
  industry?: string;
  keyword?: string;
  pageKey?: 'home' | 'services' | 'about' | 'shop';
  competitor1Url?: string;
  competitor2Url?: string;
  service?: string;
  pageSlug?: string;
  pageTitle?: string;
  pageIntent?: string;
  pageGoal?: string;
  targetAudience?: string;
  primaryCta?: string;
  mustInclude?: string[];
  mustAvoid?: string[];
  servicesOffered?: string[];
  businessName?: string;
  aboutContext?: string;
  nearbyAreas?: string[];
  userChosenIdea?: string;
  content?: string;
  conversationHistory?: Record<string, unknown>[];
  rawContext?: string;
  conversionMode?: string;
};

async function fetchContentAgent(url: string, { arg }: { arg: ContentAgentProps }) {
  const token = getStoredAuthToken();
  const activeTenantId = arg.tenantId ?? getActiveTenantId();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(arg.websiteId ? { 'X-Website-Id': String(arg.websiteId) } : {}),
      ...(activeTenantId ? { 'X-Tenant-Id': String(activeTenantId) } : {}),
    },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : null) ||
      'Failed to fetch';
    throw new Error(message);
  }
  return res.json();
}

export const useContentAgent = ( ) =>{
    const { trigger, data, error, isMutating } = useSWRMutation(
        '/api/content-agent',
        fetchContentAgent
      );

    return {
        trigger, // call: trigger(formData)
        data,
        error,
        isLoading: isMutating,
      };
}
