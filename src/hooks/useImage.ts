import useSWR, { SWRResponse } from "swr";
import { Database } from "../../database.types";
import { getApiBaseUrl } from "@/lib/api";

export type Image = Database["public"]["Tables"]["image"]["Row"] & {
    title?: string | null;
    description?: string | null;
};
export type Asset = Database["public"]["Tables"]["asset"]["Row"] & {
    image: Image;
};

export const useGetAssets = (
    websiteId: number | null,
    page: number = 0,
    pageSize: number = 10
): {
    assets: Asset[] | null;
    isLoading: boolean;
    error: Error | undefined;
    refetchAssets: () => Promise<Asset[] | null | undefined>;
} => {
    const res: SWRResponse = useSWR(
        websiteId ? `${getApiBaseUrl()}/assets?website_id=${websiteId}&page=${page}&page_size=${pageSize}` : null,
        {
            revalidateOnFocus: false,
        }
    );
    return {
        assets: res?.data || null,
        isLoading: !res.error && !res.data,
        error: res.error,
        refetchAssets: () => res.mutate(),
    };

}
