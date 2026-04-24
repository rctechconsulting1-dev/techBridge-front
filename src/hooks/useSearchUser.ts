import { Database } from "./../../database.types";
import useSWR, { SWRResponse } from "swr";
import { getApiBaseUrl } from "@/lib/api";
import { getStoredAuthToken, getActiveTenantId } from "@/lib/auth-context";

// Define the type for the user table in the Database
export type UserTable = Database["public"]["Tables"]["user"]["Row"];

// Define the type for the SWR response data
interface UseSearchUserResponse {
  data: UserTable[] | undefined;
  error: Error | null;
  isLoading: boolean;
}

const authFetcher = async (url: string): Promise<UserTable[]> => {
  const token = getStoredAuthToken();
  const activeTenantId = getActiveTenantId();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (activeTenantId) headers["x-tenant-id"] = String(activeTenantId);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);
  return res.json();
};

export const useSearchUser = (
  searchValue: string,
  fetchAll = false,
): UseSearchUserResponse => {
  const token = getStoredAuthToken();
  const activeTenantId = getActiveTenantId();
  let url: string | null = null;
  if (token && activeTenantId) {
    if (fetchAll && !searchValue) {
      url = `${getApiBaseUrl()}/users`;
    } else if (searchValue) {
      url = `${getApiBaseUrl()}/users?email_like=${encodeURIComponent(searchValue)}`;
    }
  }
  const swrResponse: SWRResponse<UserTable[], Error> = useSWR(
    url,
    authFetcher,
    {
      revalidateOnFocus: false,
    },
  );

  return {
    data: swrResponse.data,
    error: swrResponse.error ?? null,
    isLoading: !swrResponse.error && !swrResponse.data,
  };
};
