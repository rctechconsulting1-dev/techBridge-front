import { useS3Upload as useBaseS3Upload } from "next-s3-upload";
import { getStoredAuthToken } from "@/lib/auth-context";

/**
 * Wraps next-s3-upload's `useS3Upload` to automatically inject the
 * auth token into every upload request so the server-side auth guard
 * in `/api/s3-upload` can verify the caller.
 */
export const useS3Upload = () => {
	const base = useBaseS3Upload();

	const uploadToS3: typeof base.uploadToS3 = (file, options) => {
		const token = getStoredAuthToken();

		const existingHeaders =
			(options?.endpoint?.request?.headers as Record<string, string>) ?? {};

		return base.uploadToS3(file, {
			...options,
			endpoint: {
				...options?.endpoint,
				request: {
					...options?.endpoint?.request,
					headers: {
						...existingHeaders,
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
				},
			},
		});
	};

	return {
		...base,
		uploadToS3,
	};
};
