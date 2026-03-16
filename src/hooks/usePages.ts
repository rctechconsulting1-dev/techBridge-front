import useSWR from "swr";
import { Database } from "../../database.types";
import { getApiBaseUrl } from "@/lib/api";

export type Pages = Database["public"]["Tables"]["page"]["Row"][];

export const useGetPages = (websiteId: number | null) : {
    pages: Pages | [];
    isLoading: boolean;
    error: Error | undefined;
    refreshPages: () => Promise<Pages | undefined>;
} => {
    // Fetch pages from the API
    const { data, error, isLoading, mutate } = useSWR(
        websiteId ? `${getApiBaseUrl()}/pages?website_id=${websiteId}` : null,
        {
        revalidateOnFocus: false,
        }
    );
    
    return {
        pages: data || [],
        isLoading,
        error,
        refreshPages: async () => {
            const refreshed = await mutate();
            return (refreshed as Pages | undefined) ?? undefined;
        },
    };
}
