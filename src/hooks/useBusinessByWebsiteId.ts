import useSWR, { SWRResponse } from "swr";
import { Database } from "../../database.types";
import { getApiBaseUrl } from "@/lib/api";

/**
 * Represents a single row in the `business_listing` table.
 */
export type BusinessListingRow = Database["public"]["Tables"]["business_listing"]["Row"];

export const useBusinessByWebsiteId = (websiteId: number | null): {
    business: BusinessListingRow | null;
    isLoading: boolean;
    error: Error | undefined;
    mutate: () => void;
} => {
    const res: SWRResponse = useSWR(
        websiteId ? `${getApiBaseUrl()}/business-listings?website_id=${websiteId}` : null,
        {
            revalidateOnFocus: false,
        }
    );

    return {
        business: res?.data ? res.data[0] : null,
        isLoading: websiteId ? !res.error && !res.data : false,
        error: res.error,
        mutate: res.mutate,
    };
}