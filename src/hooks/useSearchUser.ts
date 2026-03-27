import { Database } from "./../../database.types";
import useSWR, { SWRResponse } from "swr";
import { getApiBaseUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth-context";

// Define the type for the user table in the Database
export type UserTable = Database["public"]["Tables"]["user"]["Row"];

// Define the type for the SWR response data
interface UseSearchUserResponse {
  data: UserTable[] | undefined;
  error: Error | null;
  isLoading: boolean;
}

export const useSearchUser = (
  searchValue: string,
  fetchAll = false,
): UseSearchUserResponse => {
  const token = getStoredAuthToken();
  let url: string | null = null;
  if (token) {
    if (fetchAll && !searchValue) {
      url = `${getApiBaseUrl()}/users`;
    } else if (searchValue) {
      url = `${getApiBaseUrl()}/users?email_like=${encodeURIComponent(searchValue)}`;
    }
  }
  const swrResponse: SWRResponse<UserTable[], Error> = useSWR(url, {
    revalidateOnFocus: false,
  });

  return {
    data: swrResponse.data,
    error: swrResponse.error ?? null,
    isLoading: !swrResponse.error && !swrResponse.data,
  };
};
