"use client";

/**
 * AI Leads page — lists captured leads from the public chat widget.
 *
 * PATTERN for all AI Agent admin pages:
 *   1. Read `selectedClient` from useSidebar() for websiteId / tenantId context
 *   2. Use a dedicated hook (useAiLeads, useAiAgentConfig, etc.) for data + mutations
 *   3. Wrap content in <PageBreadcrumb> + <ComponentCard>
 *   4. Use toast() for user-facing feedback
 */

import { useState } from "react";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import EntitlementGate from "@/components/common/EntitlementGate";
import { useAiLeads } from "@/hooks/useAiLeads";
import type { AiLead, AiLeadStatus } from "@/types/aiAgent";

const STATUS_LABELS: Record<AiLeadStatus, string> = {
  new:       "New",
  contacted: "Contacted",
  converted: "Converted",
  dismissed: "Dismissed",
};

const STATUS_COLORS: Record<AiLeadStatus, string> = {
  new:       "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

export default function AiLeadsPage() {
  const [statusFilter, setStatusFilter] = useState<AiLeadStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { leads, total, loading, error, reload, updateStatus } = useAiLeads({
    status: statusFilter || undefined,
  });

  async function handleStatusChange(lead: AiLead, next: AiLeadStatus) {
    const ok = await updateStatus(lead.id, next);
    if (ok) toast.success(`Lead marked as "${STATUS_LABELS[next]}".`);
    else toast.error("Failed to update lead status.");
  }

  return (
    <EntitlementGate
      requiredModules={["custom_ai_agent"]}
      pageTitle="AI Leads"
    >
      <>
        <PageBreadcrumb pageTitle="AI Leads" />

      <ComponentCard title={`Leads${total ? ` (${total})` : ""}`}>
        {/* Filters */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Filter by status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AiLeadStatus | "")}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All</option>
            {(Object.keys(STATUS_LABELS) as AiLeadStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <button
            onClick={reload}
            disabled={loading}
            className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Empty */}
        {!loading && !error && leads.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No leads yet. Once visitors chat on your site, they'll appear here.
          </p>
        )}

        {/* Lead list */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {leads.map((lead) => (
            <div key={lead.id} className="py-4">
              {/* Header row */}
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-gray-800 dark:text-white">
                    {lead.visitor_name ?? "Unknown visitor"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {lead.visitor_email ?? "—"} · {lead.visitor_phone ?? "—"}
                  </p>
                  {lead.initial_question && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      "{lead.initial_question}"
                    </p>
                  )}
                </div>

                {/* Status badge + changer */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>

                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead, e.target.value as AiLeadStatus)}
                    className="rounded border border-gray-200 bg-white py-0.5 pl-2 pr-6 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {(Object.keys(STATUS_LABELS) as AiLeadStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                  className="shrink-0 text-xs text-brand-500 hover:underline"
                >
                  {expanded === lead.id ? "Hide" : "View"} conversation
                </button>
              </div>

              {/* Conversation transcript */}
              {expanded === lead.id && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  {lead.conversation.length === 0 ? (
                    <p className="text-xs text-gray-400">No conversation recorded.</p>
                  ) : (
                    <ol className="space-y-2">
                      {lead.conversation.map((msg, i) => (
                        <li key={i} className={`text-sm ${msg.role === "user" ? "text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                          <span className="font-medium capitalize">{msg.role}:</span>{" "}
                          {msg.content}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-gray-300 dark:text-gray-600">
                {new Date(lead.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </ComponentCard>
      </>
    </EntitlementGate>
  );
}
