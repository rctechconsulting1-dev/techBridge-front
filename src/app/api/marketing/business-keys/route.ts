import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization");
  const res = await fetch(`${getApiBaseUrl()}/marketing/business-keys`, {
    headers: {
      ...(token ? { Authorization: token } : {}),
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
