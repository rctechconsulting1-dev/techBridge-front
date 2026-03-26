import { NextResponse } from "next/server";

type CandidateResult =
  | { kind: "success"; response: Response; url: string }
  | { kind: "passthrough"; response: NextResponse }
  | { kind: "none" };

const DEFAULT_PASSTHROUGH_STATUSES = new Set([401, 402, 403, 409, 429]);

const toPassthroughJson = async (response: Response): Promise<unknown> => {
  const text = await response.text().catch(() => "");
  if (!text) {
    return { error: `Backend request failed (${response.status})` };
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
};

export const fetchFirstSuccessfulCandidate = async ({
  candidates,
  makeRequest,
  passthroughStatuses,
}: {
  candidates: string[];
  makeRequest: (url: string) => Promise<Response>;
  passthroughStatuses?: Set<number>;
}): Promise<CandidateResult> => {
  const effectiveStatuses =
    passthroughStatuses ?? DEFAULT_PASSTHROUGH_STATUSES;

  for (const url of candidates) {
    try {
      const response = await makeRequest(url);

      if (response.ok) {
        return { kind: "success", response, url };
      }

      if (effectiveStatuses.has(response.status)) {
        const payload = await toPassthroughJson(response);
        const next = NextResponse.json(payload, { status: response.status });
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          next.headers.set("Retry-After", retryAfter);
        }
        return { kind: "passthrough", response: next };
      }
    } catch {
      // Move to next candidate endpoint.
    }
  }

  return { kind: "none" };
};
