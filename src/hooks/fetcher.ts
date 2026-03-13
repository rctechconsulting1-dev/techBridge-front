import { toApiUrl, methodToBackendMethod } from "@/lib/api";

const normalizePayloadKeys = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePayloadKeys(item)) as T;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    Object.entries(obj).forEach(([key, val]) => {
      const nextKey = key === "xUrl" ? "x_url" : key;
      normalized[nextKey] = normalizePayloadKeys(val);
    });

    return normalized as T;
  }

  return value;
};

export const fetcher = async <T>(
  url: string,
  method: string = "GET",
  token?: string,
  payload?: T,
  additionalHeaders?: Record<string, string>,
) => {
  const resolvedUrl = toApiUrl(url);
  const resolvedMethod = methodToBackendMethod(method);
  const normalizedPayload = payload ? normalizePayloadKeys(payload) : payload;

  const res = await fetch(resolvedUrl, {
    method: resolvedMethod,
    headers: {
      "Content-Type": "application/json",
      ...additionalHeaders, // Spread any additional headers passed in
    },
    credentials: 'include',
    body: normalizedPayload ? JSON.stringify(normalizedPayload) : null,
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
