import { toApiUrl, methodToBackendMethod } from "@/lib/api";

export const fetcher = async <T>(
  url: string,
  method: string = "GET",
  token?: string,
  payload?: T,
  additionalHeaders?: Record<string, string>,
) => {
  const resolvedUrl = toApiUrl(url);
  const resolvedMethod = methodToBackendMethod(method);

  const res = await fetch(resolvedUrl, {
    method: resolvedMethod,
    headers: {
      "Content-Type": "application/json",
      ...additionalHeaders, // Spread any additional headers passed in
    },
    credentials: 'include',
    body: payload ? JSON.stringify(payload) : null,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Fetch error:', {
      status: res.status,
      statusText: res.statusText,
      url: resolvedUrl,
      method: resolvedMethod,
      errorText: errorText
    });
    throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
  }

  // Check if the response body is empty
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};
