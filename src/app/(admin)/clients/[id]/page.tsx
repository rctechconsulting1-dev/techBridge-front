"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { apiClient } from "@/lib/api-client";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
  enterprise: "Enterprise",
};

const MODULE_LABELS: Record<string, string> = {
  website_core: "Website Core",
  seo_content: "SEO Content",
  lead_capture: "Lead Capture",
  calendar_appointments: "Calendar / Appointments",
  checkout_ecommerce: "Checkout / Ecommerce",
  reservations: "Reservations",
  google_business_management: "Google Business",
  sms_leads_and_comms: "SMS Leads and Comms",
  google_ads_optimization: "Google Ads Optimization",
  custom_ai_agent: "Custom AI Agent",
};

type ClientDetail = {
  id: number;
  name: string;
  slug: string;
  business_type: string;
  status: string;
  plan_key: string | null;
  default_currency: string;
  timezone: string;
  created_at: string;
  seat_limit: number | null;
  seat_used: number;
  primary_domain: string | null;
  website_domain: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  invite_status: "not_sent" | "sent" | "partial_failure" | "failed" | null;
  invite_attempt_count: number | null;
  last_sent_at: string | null;
  last_error: string | null;
  enabled_modules: string[];
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    apiClient
      .get<ClientDetail[]>("/tenants")
      .then((response) => {
        if (!mounted) return;
        const match = (Array.isArray(response) ? response : []).find(
          (tenant) => String(tenant.id) === String(id),
        );
        setClient(match ?? null);
      })
      .catch((loadError) => {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load client.",
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const formatTimestamp = (value: string | null) => {
    if (!value) return "Never";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={client?.name ?? "Client"} />

      <ComponentCard title={client?.name ?? "Client"}>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Read-only client overview. To change the plan, toggle modules, edit
          owner details, or resend the invite, use{" "}
          <Link href="/tenants" className="text-brand-500 hover:underline">
            Tenants
          </Link>
          .
        </p>

        {loading && (
          <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
        )}

        {!loading && error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && !client && (
          <p className="py-8 text-center text-sm text-gray-400">
            Client not found.
          </p>
        )}

        {!loading && !error && client && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Overview
              </h3>
              <dl className="space-y-1 text-sm">
                <Row label="Status" value={client.status} capitalize />
                <Row
                  label="Plan"
                  value={
                    client.plan_key
                      ? (PLAN_LABELS[client.plan_key] ?? client.plan_key)
                      : "—"
                  }
                />
                <Row label="Business type" value={client.business_type} />
                <Row
                  label="Domain"
                  value={client.primary_domain ?? client.website_domain ?? "—"}
                />
                <Row
                  label="Seats"
                  value={`${client.seat_used}${client.seat_limit ? ` / ${client.seat_limit}` : ""}`}
                />
                <Row label="Timezone" value={client.timezone} />
                <Row label="Currency" value={client.default_currency} />
                <Row label="Created" value={formatTimestamp(client.created_at)} />
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Owner
              </h3>
              <dl className="space-y-1 text-sm">
                <Row label="Name" value={client.owner_name ?? "—"} />
                <Row label="Email" value={client.owner_email ?? "—"} />
                <Row label="Phone" value={client.owner_phone ?? "—"} />
                <Row
                  label="Invite status"
                  value={(client.invite_status ?? "not_sent").replace(/_/g, " ")}
                  capitalize
                />
                <Row
                  label="Invite attempts"
                  value={String(client.invite_attempt_count ?? 0)}
                />
                <Row
                  label="Last sent"
                  value={formatTimestamp(client.last_sent_at)}
                />
                {client.last_error && (
                  <Row label="Last error" value={client.last_error} />
                )}
              </dl>
            </section>

            <section className="md:col-span-2">
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Modules
              </h3>
              {client.enabled_modules?.length ? (
                <div className="flex flex-wrap gap-2">
                  {client.enabled_modules.map((moduleKey) => (
                    <span
                      key={moduleKey}
                      className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {MODULE_LABELS[moduleKey] ?? moduleKey}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No modules enabled.</p>
              )}
            </section>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd
        className={`text-right text-gray-800 dark:text-gray-100 ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
