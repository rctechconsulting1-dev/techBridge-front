import { Database } from './../../database.types';
import useSWR, { SWRResponse } from "swr";
import { getApiBaseUrl } from '@/lib/api';
import { getStoredAuthToken } from '@/lib/auth-context';

// Define the type for the user table in the Database
export type UserTable = Database["public"]["Tables"]["user"]["Row"];

// Define the type for the SWR response data
interface UseSearchUserResponse {
    data: UserTable[] | undefined;
    error: Error | null;
    isLoading: boolean;
}

export const useSearchUser = (searchValue: string): UseSearchUserResponse => {
    const token = getStoredAuthToken();
    // Fetch user data based on the search value
    const swrResponse: SWRResponse<UserTable[], Error> = useSWR(
        searchValue && token
            ? `${getApiBaseUrl()}/users?email_like=${encodeURIComponent(searchValue)}`
            : null,
        {
            revalidateOnFocus: false,
        }
    );

    return {
        data: swrResponse.data,
        error: swrResponse.error ?? null, // Convert undefined to null
        isLoading: !swrResponse.error && !swrResponse.data,
    };
};
