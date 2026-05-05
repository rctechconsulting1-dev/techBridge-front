"use client";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getStoredAuthToken } from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";

// ── Types ────────────────────────────────────────────────────────────────────

type Platform = "analytics" | "google-ads" | "search-console";

interface MarketingConnection {
  id: number;
  platform: Platform;
  business_key: string;
  external_account_id: string;
  external_manager_account_id: string | null;
  display_name: string | null;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}

interface PlatformConfig {
  platform: Platform;
  label: string;
  description: string;
  placeholder: string;
  hint: string;
  managerLabel?: string;
  managerPlaceholder?: string;
}

// ── Platform definitions ──────────────────────────────────────────────────────

const DEFAULT_BUSINESS_KEY = "default";

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: "analytics",
    label: "GA4 Analytics",
    description: "Connect your Google Analytics 4 property to view traffic and conversion data.",
    placeholder: "properties/123456789",
    hint: "GA4 Property ID — found in Google Analytics → Admin → Property Settings",
  },
  {
    platform: "google-ads",
    label: "Google Ads",
    description: "Connect your Google Ads account to view campaign performance and manage budgets.",
    placeholder: "123-456-7890",
    hint: "Google Ads Customer ID — shown at the top-right of your Google Ads account",
    managerLabel: "Manager Account ID (optional)",
    managerPlaceholder: "789-012-3456",
  },
  {
    platform: "search-console",
    label: "Search Console",
    description: "Connect your verified Search Console property to view search query data.",
    placeholder: "https://www.example.com/",
    hint: "The verified site URL exactly as it appears in Google Search Console",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(tenantId: number | string) {
  const token = getStoredAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-tenant-id": String(tenantId),
  };
}

// ── Sub-component: PlatformCard ───────────────────────────────────────────────

interface PlatformCardProps {
  config: PlatformConfig;
  connection: MarketingConnection | undefined;
  tenantId: number | string;
  businessKey: string;
  onSaved: (conn: MarketingConnection) => void;
  onDisabled: (id: number) => void;
}

const PlatformCard: React.FC<PlatformCardProps> = ({
  config,
  connection,
  tenantId,
  businessKey,
  onSaved,
  onDisabled,
}) => {
  const [editing, setEditing] = useState(!connection || connection.status === "disabled");
  const [accountId, setAccountId] = useState(connection?.external_account_id ?? "");
  const [managerId, setManagerId] = useState(connection?.external_manager_account_id ?? "");
  const [displayName, setDisplayName] = useState(connection?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Reset form when connection prop changes
  useEffect(() => {
    setAccountId(connection?.external_account_id ?? "");
    setManagerId(connection?.external_manager_account_id ?? "");
    setDisplayName(connection?.display_name ?? "");
    setEditing(!connection || connection.status === "disabled");
  }, [connection]);

  const handleSave = async () => {
    const trimmed = accountId.trim();
    if (!trimmed) {
      toast.error("Account ID is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/connections", {
        method: "POST",
        headers: authHeaders(tenantId),
        body: JSON.stringify({
          platform: config.platform,
          business_key: businessKey || DEFAULT_BUSINESS_KEY,
          external_account_id: trimmed,
          external_manager_account_id: managerId.trim() || undefined,
          display_name: displayName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save connection.");
        return;
      }
      toast.success(`${config.label} connection saved.`);
      onSaved(data.connection as MarketingConnection);
      setEditing(false);
    } catch {
      toast.error("Network error — could not save connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!connection) return;
    setDisabling(true);
    try {
      const res = await fetch(`/api/marketing/connections/${connection.id}`, {
        method: "DELETE",
        headers: authHeaders(tenantId),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to disable connection.");
        return;
      }
      toast.success(`${config.label} connection disabled.`);
      onDisabled(connection.id);
      setEditing(true);
    } catch {
      toast.error("Network error — could not disable connection.");
    } finally {
      setDisabling(false);
    }
  };

  const isActive = connection?.status === "active";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {config.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
        </div>
        {isActive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0 ml-4">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        )}
        {connection?.status === "disabled" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400 shrink-0 ml-4">
            Disabled
          </span>
        )}
      </div>

      {/* Active connection summary (not editing) */}
      {isActive && !editing && (
        <div className="mb-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {connection.display_name && (
              <p className="text-sm font-medium text-gray-800 dark:text-white/80 truncate">
                {connection.display_name}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
              {connection.external_account_id}
            </p>
            {connection.external_manager_account_id && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">
                Manager: {connection.external_manager_account_id}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium"
            >
              Edit
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={handleDisable}
              disabled={disabling}
              className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
            >
              {disabling ? "Disabling…" : "Disable"}
            </button>
          </div>
        </div>
      )}

      {/* Edit / Add form */}
      {editing && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Account ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder={config.placeholder}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{config.hint}</p>
          </div>

          {config.managerLabel && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {config.managerLabel}
              </label>
              <input
                type="text"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                placeholder={config.managerPlaceholder}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`e.g. ${config.label} – My Business`}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : isActive ? "Update" : "Save Connection"}
            </button>
            {isActive && (
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export function MarketingConnectionsPanel() {
  const { selectedClient } = useSidebar();
  const [connections, setConnections] = useState<MarketingConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessKey, setBusinessKey] = useState("");
  const [knownKeys, setKnownKeys] = useState<string[]>([]);

  const fetchConnections = useCallback(async () => {
    if (!selectedClient?.tenant_id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/connections", {
        headers: authHeaders(selectedClient.tenant_id),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load connections.");
        return;
      }
      const loaded: MarketingConnection[] = data.connections ?? [];
      setConnections(loaded);
      // Pre-fill the business key from the first active connection that isn't "default"
      const activeKey = loaded.find(
        (c) => c.status === "active" && c.business_key && c.business_key !== DEFAULT_BUSINESS_KEY,
      )?.business_key;
      if (activeKey) setBusinessKey(activeKey);
    } catch {
      setError("Network error — could not load connections.");
    } finally {
      setLoading(false);
    }
  }, [selectedClient?.tenant_id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Fetch known business keys for autocomplete (auth-only, no tenant scope)
  useEffect(() => {
    const token = getStoredAuthToken();
    fetch("/api/marketing/business-keys", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.keys)) setKnownKeys(data.keys);
      })
      .catch(() => {/* non-critical */});
  }, []);

  const handleSaved = (saved: MarketingConnection) => {
    setConnections((prev) => {
      const existing = prev.findIndex((c) => c.id === saved.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = saved;
        return updated;
      }
      // Also replace any same-platform connection (upsert may have replaced it)
      const withoutSamePlatform = prev.filter((c) => c.platform !== saved.platform);
      return [...withoutSamePlatform, saved];
    });
  };

  const handleDisabled = (id: number) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "disabled" as const } : c)),
    );
  };

  if (!selectedClient) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        Select a client to manage marketing connections.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Marketing Connections
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Register this tenant&apos;s external platform accounts. Once connected, the dashboard
          panels will pull live data automatically.
        </p>
      </div>

      {/* Business Key — the ads-mcp config key (e.g. "rnr-electrician") */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 px-5 py-4">
        <label className="block text-sm font-semibold text-gray-800 dark:text-white/90 mb-1">
          Business Key <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          The ads-mcp configuration key for this tenant (e.g.{" "}
          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">rnr-electrician</code>
          ). This must match an entry in the ads-mcp <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">local-dev-config.json</code>.
        </p>
        <input
          type="text"
          list="business-key-suggestions"
          value={businessKey}
          onChange={(e) => setBusinessKey(e.target.value)}
          placeholder="e.g. rnr-electrician"
          className="w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
        />
        {knownKeys.length > 0 && (
          <datalist id="business-key-suggestions">
            {knownKeys.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        )}
      </div>

      {loading && (
        <div className="text-sm text-gray-400 dark:text-gray-500">Loading connections…</div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {PLATFORM_CONFIGS.map((cfg) => {
            // Prefer the active connection; fall back to the most-recent disabled one
            const active = connections.find(
              (c) => c.platform === cfg.platform && c.status === "active",
            );
            const fallback = connections
              .filter((c) => c.platform === cfg.platform)
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
            return (
              <PlatformCard
                key={cfg.platform}
                config={cfg}
                connection={active ?? fallback}
                tenantId={selectedClient.tenant_id}
                businessKey={businessKey}
                onSaved={handleSaved}
                onDisabled={handleDisabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
