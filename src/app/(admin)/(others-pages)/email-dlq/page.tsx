"use client";

import { useState } from "react";
import EntitlementGate from "@/components/common/EntitlementGate";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";

type DlqItem = {
  id: string;
  createdAt: string;
  websiteId?: string | null;
  tenantId?: string | null;
  to: string;
  subject: string;
  heading: string;
  attempts: number;
  error: string;
};

export default function EmailDlqPage() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState<DlqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!adminKey.trim()) {
      setError("Enter EMAIL_DLQ_ADMIN_KEY to access dead-letter queue operations.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/email/dlq?limit=100", {
        method: "GET",
        headers: {
          "x-email-dlq-admin-key": adminKey,
        },
        cache: "no-store",
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: DlqItem[];
      };

      if (!res.ok) {
        setError(payload.error || `Failed to load DLQ items (${res.status})`);
        setItems([]);
        return;
      }

      setItems(Array.isArray(payload.items) ? payload.items : []);
      setMessage("DLQ items refreshed.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load DLQ items.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const replayItem = async (id: string) => {
    if (!adminKey.trim()) {
      setError("Enter EMAIL_DLQ_ADMIN_KEY before replaying.");
      return;
    }

    setReplayingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/email/dlq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-dlq-admin-key": adminKey,
        },
        body: JSON.stringify({ id }),
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error || `Replay failed (${res.status})`);
        return;
      }

      setMessage(`Replayed DLQ item ${id}.`);
      await fetchItems();
    } catch (replayError) {
      setError(replayError instanceof Error ? replayError.message : "Replay failed.");
    } finally {
      setReplayingId(null);
    }
  };

  return (
    <EntitlementGate
      requiredRoles={["admin", "platform_admin"]}
      pageTitle="Email DLQ"
    >
      <div>
        <PageBreadcrumb pageTitle="Email DLQ" />
        <div className="space-y-6">
          <ComponentCard
            title="Dead-Letter Queue Operations"
            desc="Inspect and replay failed email notifications captured by the reliability pipeline."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Enter EMAIL_DLQ_ADMIN_KEY"
              />
              <button
                type="button"
                onClick={fetchItems}
                disabled={loading}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load DLQ"}
              </button>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-gray-700 dark:text-gray-200">{message}</p> : null}

            {items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-300">
                No dead-letter items loaded.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.subject}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          to: {item.to} | attempts: {item.attempts}
                        </p>
                        <p className="mt-1 text-xs text-red-600">{item.error}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => replayItem(item.id)}
                        disabled={replayingId === item.id}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {replayingId === item.id ? "Replaying..." : "Replay"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                      created: {new Date(item.createdAt).toLocaleString()}
                      {item.websiteId ? ` | website: ${item.websiteId}` : ""}
                      {item.tenantId ? ` | tenant: ${item.tenantId}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ComponentCard>
        </div>
      </div>
    </EntitlementGate>
  );
}
