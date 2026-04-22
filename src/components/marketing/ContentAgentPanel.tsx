"use client";
import React, { useEffect, useState } from "react";
import { getStoredAuthToken } from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Opportunity {
  query: string;
  impressions: number;
  clicks: number;
  ctrPct: number;
  position: number;
}

interface GeneratedCopy {
  headlines: string[];
  descriptions: string[];
  warnings?: string[];
  model?: string;
  draftId?: number | null;
}
// ── Helpers ──────────────────────────────────────────────────────────────────

function CharBadge({ text, max }: { text: string; max: number }) {
  const len = text.length;
  const over = len > max;
  return (
    <span
      className={`shrink-0 text-xs font-mono px-1.5 py-0.5 rounded ${
        over
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      }`}
    >
      {len}/{max}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleClick() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={handleClick}
      className="shrink-0 text-xs text-gray-400 hover:text-brand-500 transition-colors"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContentAgentPanel() {
  const { selectedClient } = useSidebar();
  const token = getStoredAuthToken();
  const tenantId = selectedClient?.tenant_id;

  const authHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "x-tenant-id": String(tenantId) } : {}),
  };

  // Opportunities state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [oppsError, setOppsError] = useState<string | null>(null);

  // Form state
  const [campaignGoal, setCampaignGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("professional");
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);

  // Generation state
  const [result, setResult] = useState<GeneratedCopy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft actions
  const [draftAction, setDraftAction] = useState<"approved" | "rejected" | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);

  // ── Fetch opportunities on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    setOppsLoading(true);
    fetch("/api/marketing/content/opportunities?dateRange=LAST_30_DAYS", {
      headers: authHeaders,
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.opportunities) setOpportunities(d.opportunities);
        else setOppsError(d.error || "Could not load opportunities.");
      })
      .catch(() => setOppsError("Request failed."))
      .finally(() => setOppsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // ── Pre-fill form from an SC opportunity ────────────────────────────────────
  function selectOpportunity(opp: Opportunity) {
    setSelectedQuery(opp.query);
    setCampaignGoal(`Generate clicks for "${opp.query}"`);
    setKeywords(opp.query);
    setResult(null);
    setError(null);
    setDraftAction(null);
    document.getElementById("content-agent-form")?.scrollIntoView({ behavior: "smooth" });
  }

  // ── Generate ad copy ────────────────────────────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignGoal.trim() && !selectedQuery) {
      setError("Enter a campaign goal or select a keyword from the opportunities above.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setDraftAction(null);

    const scOpp = selectedQuery
      ? opportunities.find((o) => o.query === selectedQuery)
      : null;

    try {
      const res = await fetch("/api/marketing/content", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          campaignGoal: campaignGoal.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
          keywords: keywords.trim()
            ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
            : undefined,
          tone,
          keyword: selectedQuery || undefined,
          scContext: scOpp
            ? {
                query: scOpp.query,
                impressions: scOpp.impressions,
                ctr: scOpp.ctrPct / 100,
                position: scOpp.position,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Content generation failed");
      } else {
        setResult({
          headlines: data.headlines || data.data?.headlines || [],
          descriptions: data.descriptions || data.data?.descriptions || [],
          warnings: data.warnings || data.data?.warnings || [],
          model: data.model || data.data?.model,
          draftId: data.draftId ?? null,
        });
      }
    } catch {
      setError("Request failed — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // ── Approve / reject draft ───────────────────────────────────────────────────
  async function handleDraftAction(action: "approved" | "rejected") {
    if (!result?.draftId) return;
    setDraftSaving(true);
    try {
      const res = await fetch(`/api/marketing/content/drafts/${result.draftId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) setDraftAction(action);
    } finally {
      setDraftSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Keyword Opportunities ── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Keyword Opportunities
          </h3>
          <span className="text-xs text-gray-400">High impressions · Low CTR · Last 30 days</span>
        </div>

        {oppsLoading && (
          <p className="text-sm text-gray-400 animate-pulse">Loading opportunities…</p>
        )}
        {oppsError && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{oppsError}</p>
        )}
        {!oppsLoading && !oppsError && opportunities.length === 0 && (
          <p className="text-sm text-gray-400">
            No keywords with ≥10 impressions and ≤10% CTR found in the last 30 days.
          </p>
        )}
        {opportunities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 font-medium">Keyword</th>
                  <th className="pb-2 font-medium text-right">Impressions</th>
                  <th className="pb-2 font-medium text-right">CTR</th>
                  <th className="pb-2 font-medium text-right">Position</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {opportunities.map((opp) => (
                  <tr key={opp.query} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 text-gray-800 dark:text-white/80 max-w-[200px] truncate">
                      {opp.query}
                    </td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                      {opp.impressions.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                      {opp.ctrPct.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                      {opp.position.toFixed(1)}
                    </td>
                    <td className="py-2 pl-4">
                      <button
                        onClick={() => selectOpportunity(opp)}
                        className="text-xs font-medium text-brand-500 hover:text-brand-600 whitespace-nowrap"
                      >
                        Generate →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Generate Form ── */}
      <div
        id="content-agent-form"
        className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6"
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-5">
          Generate Google Ad Copy
          {selectedQuery && (
            <span className="ml-2 text-sm font-normal text-brand-500">
              — &ldquo;{selectedQuery}&rdquo;
            </span>
          )}
        </h3>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Goal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              placeholder="e.g. Get more electrician service calls in Pasadena"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Homeowners in LA County needing electrical repairs"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Keywords <span className="text-gray-400 text-xs">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="electrician, panel upgrade, EV charger installation"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="professional">Professional</option>
              <option value="urgent">Urgent</option>
              <option value="friendly">Friendly</option>
              <option value="local">Local & Trustworthy</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 transition-colors"
            >
              {loading ? "Generating…" : "Generate Ad Copy"}
            </button>
            {(selectedQuery || campaignGoal) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedQuery(null);
                  setCampaignGoal("");
                  setKeywords("");
                  setResult(null);
                  setError(null);
                  setDraftAction(null);
                }}
                className="px-4 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* ── Generated Results ── */}
        {result && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {result.model && <span>Model: {result.model}</span>}
              {result.draftId && (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Saved as draft #{result.draftId}
                </span>
              )}
            </div>

            {result.warnings && result.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                {result.warnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            )}

            {result.headlines.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Headlines{" "}
                  <span className="text-xs font-normal text-gray-400">(max 30 chars)</span>
                </h4>
                <ul className="space-y-1.5">
                  {result.headlines.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-800 dark:text-white/90 flex-1">{h}</span>
                      <CharBadge text={h} max={30} />
                      <CopyButton text={h} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.descriptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Descriptions{" "}
                  <span className="text-xs font-normal text-gray-400">(max 90 chars)</span>
                </h4>
                <ul className="space-y-1.5">
                  {result.descriptions.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-800 dark:text-white/90 flex-1">{d}</span>
                      <CharBadge text={d} max={90} />
                      <CopyButton text={d} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.draftId && !draftAction && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleDraftAction("approved")}
                  disabled={draftSaving}
                  className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 transition-colors"
                >
                  {draftSaving ? "Saving…" : "Approve"}
                </button>
                <button
                  onClick={() => handleDraftAction("rejected")}
                  disabled={draftSaving}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-red-400 disabled:opacity-50 text-gray-600 dark:text-gray-300 hover:text-red-600 text-sm font-medium py-2 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
            {draftAction && (
              <p className="text-sm text-center font-medium text-gray-500 dark:text-gray-400">
                Draft marked as{" "}
                <span
                  className={
                    draftAction === "approved"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500 dark:text-red-400"
                  }
                >
                  {draftAction}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
