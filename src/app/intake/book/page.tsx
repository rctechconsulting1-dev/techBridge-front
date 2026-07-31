"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BookingPicker } from "@/components/intake/BookingPicker";

function BookPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch("/api/intake/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? "valid" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  if (status === "loading") {
    return <p className="p-8 text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  }

  if (status === "invalid" || !token) {
    return (
      <p className="p-8 text-sm text-gray-500 dark:text-gray-400">
        Invalid or expired link. Please request a new one.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Book Your Kickoff Call
      </h1>
      <BookingPicker token={token} />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-500 dark:text-gray-400">Loading…</p>}>
      <BookPageInner />
    </Suspense>
  );
}
