import useSWR from "swr";
import { UserTable } from "./useSearchUser";
import { getApiBaseUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth-context";

export const useUser = (userId: number | null) => {
    const token = getStoredAuthToken();
    const userUrl = userId && token ? `${getApiBaseUrl()}/users/${userId}` : null;

    const res = useSWR<UserTable | null>(userUrl, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
    });
    return {
        user: res.data,
        isLoading: !res.error && !res.data,
        error: res.error,
    };
}