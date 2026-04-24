import useSWR, { SWRResponse } from "swr";
import { getApiBaseUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth-context";

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  business_type: string | null;
  status: string | null;
  website_id: number | null;
  owner_user_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  primary_domain: string | null;
  website_domain: string | null;
  created_at: string | null;
}

interface UseTenantsResponse {
  data: Tenant[] | undefined;
  error: Error | null;
  isLoading: boolean;
}

export const useTenants = (enabled = false): UseTenantsResponse => {
  const token = getStoredAuthToken();
  const url = enabled && token ? `${getApiBaseUrl()}/tenants` : null;

  const swrResponse: SWRResponse<Tenant[], Error> = useSWR(url, {
    revalidateOnFocus: false,
  });

  return {
    data: swrResponse.data,
    error: swrResponse.error ?? null,
    isLoading: !swrResponse.error && !swrResponse.data,
  };
};
