"use client";
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { getStoredAuthToken } from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";

interface Approval {
  id: number;
  approvalStatus: string;
  approvedByUserId?: number;
  approvedAt?: string;
  rejectedAt?: string;
  expiresAt?: string;
}

interface MarketingRequest {
  id: number;
  businessKey: string;
  platform: string;
  toolName: string;
  status: string;
  requestedByUserId: number;
  requestPayload: Record<string, unknown>;
  createdAt: string;
  approval: Approval | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  dry_run_created: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  executing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  executed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

export function MarketingRequestsTable() {
  const { selectedClient } = useSidebar();
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  // Reject-with-reason modal state
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const token = getStoredAuthToken();
  const tenantId = selectedClient?.tenant_id;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "x-tenant-id": String(tenantId) } : {}),
  };

  const load = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/marketing/requests${qs}`, { headers, cache: "no-store" } as RequestInit)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setRequests(d.requests || []);
      })
      .catch(() => setError("Failed to load requests"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function doAction(id: number, action: "approve" | "execute", body: Record<string, unknown> = {}) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/marketing/requests/${id}/${action}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Action '${action}' failed`);
      } else {
        toast.success(action === "approve" ? "Request approved." : "Request executed.");
        load();
      }
    } catch {
      toast.error("Action failed — check your connection.");
    } finally {
      setActionLoading(null);
    }
  }

  async function submitReject() {
    if (rejectTarget === null) return;
    const id = rejectTarget;
    setRejectTarget(null);
    setActionLoading(id);
    try {
      const res = await fetch(`/api/marketing/requests/${id}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Rejection failed.");
      } else {
        toast.success("Request rejected.");
        load();
      }
    } catch {
      toast.error("Rejection failed — check your connection.");
    } finally {
      setActionLoading(null);
      setRejectReason("");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
      {/* Reject-with-reason modal */}
      {rejectTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Reject request #{rejectTarget}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Optionally provide a reason. This will be saved with the audit record.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-red-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Ad Action Requests
        </h3>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            <option value="">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="executed">Executed</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="text-sm text-brand-500 hover:text-brand-600 disabled:opacity-50 px-2"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading…</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
          No action requests yet.
        </p>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Tool</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Details</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Created</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 align-top">
                  <td className="py-3 pr-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{r.id}</td>
                  <td className="py-3 pr-3 font-medium text-gray-800 dark:text-white/90">
                    {r.toolName?.replace(/_/g, " ")}
                  </td>
                  <td className="py-3 pr-3 text-gray-600 dark:text-gray-400 text-xs max-w-[200px]">
                    {r.requestPayload && Object.entries(r.requestPayload)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.status === "pending_approval" && (
                        <>
                          <button
                            onClick={() => doAction(r.id, "approve")}
                            disabled={actionLoading === r.id}
                            className="rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectTarget(r.id); setRejectReason(""); }}
                            disabled={actionLoading === r.id}
                            className="rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <button
                          onClick={() => doAction(r.id, "execute")}
                          disabled={actionLoading === r.id}
                          className="rounded-lg bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-400 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading === r.id ? "Executing…" : "Execute"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
