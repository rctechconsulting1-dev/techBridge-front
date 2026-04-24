"use client";

import { useEffect, useState } from "react";

type FulfillmentStatus =
  | "unfulfilled"
  | "submitted"
  | "failed"
  | "skipped"
  | null;

interface StatusPayload {
  fulfillment_status: FulfillmentStatus;
}

interface Props {
  sessionId: string;
  primaryColor: string;
}

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 14; // ~35 seconds total

export default function FulfillmentStatus({ sessionId, primaryColor }: Props) {
  const [status, setStatus] = useState<FulfillmentStatus>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval>;

    async function poll() {
      if (cancelled) return;

      try {
        const res = await fetch(
          `/api/stripe/order-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        const data: StatusPayload = await res.json();

        if (!cancelled) {
          setStatus(data.fulfillment_status);

          // Stop polling once we reach a terminal state
          const done = ["submitted", "failed", "skipped"].includes(
            data.fulfillment_status ?? "",
          );
          if (done) {
            clearInterval(intervalId);
          } else {
            setAttempts((n) => n + 1);
          }
        }
      } catch {
        if (!cancelled) setAttempts((n) => n + 1);
      }
    }

    poll();
    intervalId = setInterval(() => {
      setAttempts((n) => {
        if (n >= MAX_ATTEMPTS) {
          clearInterval(intervalId);
          return n;
        }
        poll();
        return n;
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionId]);

  if (status === "submitted") {
    return (
      <div
        className="mb-8 rounded-lg border px-4 py-3 text-left text-sm"
        style={{
          borderColor: `${primaryColor}40`,
          backgroundColor: `${primaryColor}0d`,
          color: "#374151",
        }}
      >
        <p className="mb-1 font-semibold" style={{ color: primaryColor }}>
          Order sent to fulfillment
        </p>
        <p>
          Your order has been received by our print partner and will ship soon.
          You&apos;ll receive a tracking email once it&apos;s on its way.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800">
        <p className="mb-1 font-semibold">
          There was a problem with your order
        </p>
        <p>
          Your payment was successful but we ran into an issue sending your
          order to the printer. Our team has been notified and will process it
          manually — you won&apos;t be charged again.
        </p>
        <p className="mt-2 text-xs text-red-500">
          If you don&apos;t hear from us within 24 hours, please contact
          support.
        </p>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <p className="mb-8 text-sm text-gray-400">
        A confirmation email will be sent to you shortly.
      </p>
    );
  }

  // unfulfilled / null / still polling
  if (attempts >= MAX_ATTEMPTS) {
    return (
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
        <p className="mb-1 font-semibold">Still processing your order</p>
        <p>
          It&apos;s taking a little longer than expected. Check your email —
          you&apos;ll receive a confirmation once your order is confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 animate-spin text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <p className="font-medium text-gray-700">Processing your order…</p>
      </div>
      <p className="mt-1 text-gray-500">
        We&apos;re confirming your order with our print partner.
      </p>
    </div>
  );
}
