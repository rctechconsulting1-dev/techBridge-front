"use client";
import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import { apiClient } from "@/lib/api-client";
import LeadCaptureModal from "@/components/leads/LeadCaptureModal";
import LeadActionsModal from "@/components/leads/LeadActionsModal";

export interface OutreachLead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  license_number: string | null;
  source: string;
  trade: string | null;
  city: string | null;
  tier: string;
  rating: number | null;
  review_count: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "needs_email_lookup", label: "Needs email lookup" },
  { value: "ready_to_send", label: "Ready to send" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "not_interested", label: "Not interested" },
  { value: "converted", label: "Converted" },
  { value: "do_not_contact", label: "Do not contact" },
];

const SOURCE_OPTIONS = [
  { value: "google_maps", label: "Google Maps" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "craigslist", label: "Craigslist" },
  { value: "cslb", label: "CSLB" },
];

const TIER_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

export default function LeadsPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [actionLead, setActionLead] = useState<OutreachLead | null>(null);

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    setListError(null);
    try {
      const response = await apiClient.getOutreachLeads({
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        tier: tierFilter || undefined,
      });
      setLeads(Array.isArray(response) ? (response as OutreachLead[]) : []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const user = await apiClient.getSession();
        const role = user?.role;
        if (role === "admin" || role === "platform_admin") {
          setIsAuthorized(true);
        }
      } finally {
        setLoadingSession(false);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      loadLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, statusFilter, sourceFilter, tierFilter]);

  if (loadingSession) {
    return <div className="text-sm text-gray-500 dark:text-gray-300">Loading leads...</div>;
  }

  if (!isAuthorized) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Leads" />
        <ComponentCard title="Access Restricted" desc="Only admin roles can view the leads tracker.">
          <p className="text-sm text-red-600 dark:text-red-400">You do not have permission to view this page.</p>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Leads" />
      <ComponentCard title="Cold Outreach Leads" desc="Capture, track, and follow up on cold outreach leads.">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Select options={STATUS_OPTIONS} placeholder="All statuses" onChange={setStatusFilter} />
          </div>
          <div className="w-48">
            <Select options={SOURCE_OPTIONS} placeholder="All sources" onChange={setSourceFilter} />
          </div>
          <div className="w-40">
            <Select options={TIER_OPTIONS} placeholder="All tiers" onChange={setTierFilter} />
          </div>
          <Button onClick={() => setIsCaptureOpen(true)}>Capture leads</Button>
        </div>

        {listError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{listError}</p>}
        {isLoadingLeads && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2 pr-4">Business</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Rating</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4">{lead.business_name}</td>
                  <td className="py-2 pr-4">
                    {lead.email || lead.phone || "—"}
                  </td>
                  <td className="py-2 pr-4">{lead.source}</td>
                  <td className="py-2 pr-4">{lead.tier}</td>
                  <td className="py-2 pr-4">{lead.status}</td>
                  <td className="py-2 pr-4">
                    {lead.rating ? `${lead.rating} (${lead.review_count ?? 0})` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Button size="sm" variant="outline" onClick={() => setActionLead(lead)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !isLoadingLeads && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No leads yet. Click &quot;Capture leads&quot; to add some.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ComponentCard>
      <LeadCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onSaved={loadLeads}
      />
      {actionLead && (
        <LeadActionsModal
          lead={actionLead}
          onClose={() => setActionLead(null)}
          onUpdated={loadLeads}
        />
      )}
    </div>
  );
}
