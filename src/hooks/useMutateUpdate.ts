import { mutate } from 'swr';
import type { Arguments } from 'swr';
import { fetcher } from './fetcher';
import { toApiUrl, methodToBackendMethod } from '@/lib/api';

// Define the type for the user table in the Database
type UpdateType = {
    path: string | null;
    method: 'PATCH' | 'PUT' | 'POST' | 'DELETE' | 'GET';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any;
    mutateKey?: string;
    additionalHeaders?: Record<string, string>;
    optimisticData?: unknown | ((current: unknown) => unknown);
    rollbackOnError?: boolean;
    populateCache?: boolean | ((result: unknown, current: unknown) => unknown);
    revalidate?: boolean | ((data: unknown, key: Arguments) => boolean);
}

type UseMutateUpdateResponse = {
    response: unknown | null;
    error: unknown | null;
};

export async function mutateUpdate({
    path,
    method,
    mutateKey,
    payload,
    additionalHeaders,
    optimisticData,
    rollbackOnError,
    populateCache,
    revalidate,
}: UpdateType): Promise<UseMutateUpdateResponse> {
    if (!path) {
        return { response: null, error: 'Path is required' };
    }

    let fullPath = toApiUrl(path);
    const normalizedMethod = methodToBackendMethod(method);

    if (normalizedMethod === 'PUT') {
        const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const pathUrl = new URL(fullPath, baseOrigin);

        if (pathUrl.pathname.endsWith('/users')) {
            const userId = pathUrl.searchParams.get('id');
            if (userId?.startsWith('eq.')) {
                fullPath = `${pathUrl.origin}${pathUrl.pathname}/${userId.replace('eq.', '')}`;
            }
        }

        if (pathUrl.pathname.endsWith('/business-listings')) {
            const businessId = pathUrl.searchParams.get('id');
            const websiteId = pathUrl.searchParams.get('website_id');

            if (businessId?.startsWith('eq.')) {
                fullPath = `${pathUrl.origin}${pathUrl.pathname}/${businessId.replace('eq.', '')}`;
            } else if (websiteId) {
                const websiteResponse = await fetcher<Array<{ id: number }>>(
                    `${pathUrl.origin}${pathUrl.pathname}?website_id=${websiteId.replace('eq.', '')}`,
                    'GET'
                );

                if (!websiteResponse || websiteResponse.length === 0) {
                    return { response: null, error: 'Business listing not found for website' };
                }

                fullPath = `${pathUrl.origin}${pathUrl.pathname}/${websiteResponse[0].id}`;
            }
        }
    }

    try {
        if (mutateKey) {
            const resolvedKey = toApiUrl(mutateKey);
            const res = await mutate(
                resolvedKey,
                async () => fetcher(fullPath, normalizedMethod, undefined, payload, additionalHeaders),
                {
                    optimisticData,
                    rollbackOnError: rollbackOnError ?? true,
                    populateCache: populateCache ?? true,
                    revalidate: revalidate ?? false,
                    throwOnError: true,
                }
            );
            return { response: res, error: null };
        }

        const res = await fetcher(fullPath, normalizedMethod, undefined, payload, additionalHeaders);
        return { response: res, error: null };
    } catch (error) {
        console.error('Error in mutateUpdate:', error);
        console.error('Error details:', {
            path,
            method,
            payload,
            fullPath,
            additionalHeaders
        });

        // Return a structured error response
        return { response: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
