"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { apiClient } from "@/lib/api-client";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
  enterprise: "Enterprise",
};

type ClientListItem = {
  id: number;
  name: string;
  status: string;
  plan_key: string | null;
  owner_name: string | null;
  owner_email: string | null;
  primary_domain: string | null;
  website_domain: string | null;
  payment_completed_at: string | null;
  invite_status: "not_sent" | "sent" | "partial_failure" | "failed" | null;
  enabled_modules: string[];
};

const statusBadgeClasses = (status: string) => {
  switch (status) {
    case "active":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "suspended":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let mounted = true;

    apiClient
      .get<ClientListItem[]>("/tenants")
      .then((response) => {
        if (mounted) setClients(Array.isArray(response) ? response : []);
      })
      .catch((loadError) => {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load clients.",
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return clients;

    return clients.filter((client) =>
      [client.name, client.owner_name ?? "", client.owner_email ?? ""].some(
        (value) => value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [clients, searchTerm]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Clients" />

      <ComponentCard title={`Clients${clients.length ? ` (${clients.length})` : ""}`}>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Read-only overview of every client tenant. To change a plan, toggle
          modules, or resend an invite, use{" "}
          <Link href="/tenants" className="text-brand-500 hover:underline">
            Tenants
          </Link>
          .
        </p>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or owner…"
          className="mb-4 w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left text-sm">
            <thead className="text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Modules</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Invite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No clients found.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-gray-800 hover:underline dark:text-white"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {client.plan_key
                        ? (PLAN_LABELS[client.plan_key] ?? client.plan_key)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClasses(client.status)}`}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {client.primary_domain ?? client.website_domain ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          client.payment_completed_at
                            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {client.payment_completed_at ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {client.enabled_modules?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {client.owner_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize dark:text-gray-300">
                      {(client.invite_status ?? "not_sent").replace(/_/g, " ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ComponentCard>
    </div>
  );
}
