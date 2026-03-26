import { NextRequest, NextResponse } from "next/server";
import { notifyOpsAlert } from "@/lib/ops-alerts";
import { triggerLeadNotification } from "@/lib/lead-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: string | number;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    startAt?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.contactName || !body.contactEmail) {
    return NextResponse.json(
      { error: "contactName and contactEmail are required" },
      { status: 400 },
    );
  }

  const payload = {
    websiteId: body.websiteId,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    startAt: body.startAt,
    notes: body.notes,
    metadata: body.metadata || {},
  };

  const apiBase = getBackendApiBase();

  try {
    const response = await fetch(`${apiBase}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      await notifyOpsAlert(
        {
          source: "booking_create_proxy",
          message: "Booking creation failed",
          severity: response.status >= 500 ? "error" : "warning",
          details: {
            status: response.status,
            response: data,
            durationMs: Date.now() - startedAt,
            websiteId:
              typeof body.websiteId === "undefined" ? undefined : String(body.websiteId),
          },
        },
        {
          dedupeKey: `booking_create_proxy:${response.status}:${String(body.websiteId || "unknown")}`,
        },
      );
    }

    if (response.ok) {
      try {
        const notification = await triggerLeadNotification({
          origin: req.nextUrl.origin,
          websiteId: body.websiteId,
          tenantId:
            typeof (data as { booking?: { tenant_id?: string | number } }).booking?.tenant_id === "undefined"
              ? undefined
              : String((data as { booking?: { tenant_id?: string | number } }).booking?.tenant_id),
          bookingId: (data as { booking?: { id?: string | number } }).booking?.id,
          contactName: body.contactName,
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone,
          startAt: body.startAt,
          notes: body.notes,
          metadata: body.metadata,
          source:
            typeof body.metadata?.source === "string"
              ? body.metadata.source
              : "booking_create_proxy",
        });

        if (!notification.ok && notification.status !== 202) {
          await notifyOpsAlert(
            {
              source: "booking_create_proxy",
              message: "Lead notification delivery failed after booking creation",
              severity: "warning",
              details: {
                notificationStatus: notification.status,
                notificationResponse: notification.data,
                websiteId:
                  typeof body.websiteId === "undefined" ? undefined : String(body.websiteId),
                bookingId: (data as { booking?: { id?: string | number } }).booking?.id,
              },
            },
            {
              dedupeKey: `booking_create_proxy:lead_notify:${String(body.websiteId || "unknown")}`,
            },
          );
        }
      } catch (error) {
        await notifyOpsAlert(
          {
            source: "booking_create_proxy",
            message: "Lead notification dispatch threw after booking creation",
            severity: "warning",
            details: {
              error: error instanceof Error ? error.message : "unknown",
              websiteId:
                typeof body.websiteId === "undefined" ? undefined : String(body.websiteId),
            },
          },
          {
            dedupeKey: `booking_create_proxy:lead_notify:exception:${String(body.websiteId || "unknown")}`,
          },
        );
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    await notifyOpsAlert(
      {
        source: "booking_create_proxy",
        message: "Booking creation request failed before backend response",
        severity: "error",
        details: {
          error: error instanceof Error ? error.message : "unknown",
          durationMs: Date.now() - startedAt,
          websiteId:
            typeof body.websiteId === "undefined" ? undefined : String(body.websiteId),
        },
      },
      {
        dedupeKey: `booking_create_proxy:network:${String(body.websiteId || "unknown")}`,
      },
    );

    return NextResponse.json(
      { error: "Booking request could not be processed" },
      { status: 502 },
    );
  }
}
