"use client";
import React, { useState } from "react";
import { getStoredAuthToken } from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";

interface DryRunPreview {
  campaignName?: string;
  currentBudget?: number;
  proposedBudget?: number;
  changeAmount?: number;
  message?: string;
  [key: string]: unknown;
}

interface DryRunResult {
  request: { id: number; status: string };
  approval: { id: number; expiresAt: string };
  dryRunPreview: DryRunPreview;
}

type Step = "form" | "preview" | "done";

export function BudgetChangeForm() {
  const { selectedClient } = useSidebar();
  const [step, setStep] = useState<Step>("form");
  const [campaignName, setCampaignName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const token = getStoredAuthToken();
  const tenantId = selectedClient?.tenant_id;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "x-tenant-id": String(tenantId) } : {}),
  };

  async function handleDryRun(e: React.FormEvent) {
    e.preventDefault();
    const budget = parseFloat(newBudget);
    if (!campaignName.trim() || isNaN(budget) || budget <= 0) {
      setError("Campaign name and a positive budget are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/dry-run", {
        method: "POST",
        headers,
        body: JSON.stringify({
          businessKey: "rnr-electrician", // resolved server-side from marketing_connection
          campaignName: campaignName.trim(),
          newDailyBudget: budget,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.detail || "Dry-run failed");
      } else {
        setDryRunResult(data);
        setStep("preview");
      }
    } catch {
      setError("Request failed — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForApproval() {
    // The dry-run already created a pending_approval record in the DB.
    setStep("done");
    setSuccessMsg(
      `Request #${dryRunResult?.request?.id} submitted for approval. It will appear in the Ad Requests queue.`,
    );
  }

  function handleReset() {
    setStep("form");
    setCampaignName("");
    setNewBudget("");
    setDryRunResult(null);
    setError(null);
    setSuccessMsg(null);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-5">
        Request Budget Change
      </h3>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-4">
          {error}
        </div>
      )}

      {step === "form" && (
        <form onSubmit={handleDryRun} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Exact campaign name from Google Ads"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Daily Budget (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="15.00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-7 pr-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 transition-colors"
          >
            {loading ? "Running preview…" : "Preview Change"}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            This will run a dry-run preview before any changes are applied.
          </p>
        </form>
      )}

      {step === "preview" && dryRunResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Preview — No changes applied yet
            </p>
            <dl className="text-sm space-y-1">
              {dryRunResult.dryRunPreview?.campaignName && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Campaign</dt>
                  <dd className="font-medium text-gray-800 dark:text-white/90">
                    {dryRunResult.dryRunPreview.campaignName}
                  </dd>
                </div>
              )}
              {dryRunResult.dryRunPreview?.currentBudget !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Current Budget</dt>
                  <dd className="font-medium text-gray-800 dark:text-white/90">
                    ${dryRunResult.dryRunPreview.currentBudget?.toFixed(2)}
                  </dd>
                </div>
              )}
              {dryRunResult.dryRunPreview?.proposedBudget !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Proposed Budget</dt>
                  <dd className="font-semibold text-brand-600 dark:text-brand-400">
                    ${dryRunResult.dryRunPreview.proposedBudget?.toFixed(2)}
                  </dd>
                </div>
              )}
              {dryRunResult.dryRunPreview?.message && (
                <div className="pt-2 text-gray-600 dark:text-gray-400">
                  {dryRunResult.dryRunPreview.message}
                </div>
              )}
            </dl>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitForApproval}
              className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2.5 transition-colors"
            >
              Submit for Approval
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            A second admin must approve this request before it executes.
          </p>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-400">
            {successMsg}
          </div>
          <button
            onClick={handleReset}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Request Another Change
          </button>
        </div>
      )}
    </div>
  );
}
