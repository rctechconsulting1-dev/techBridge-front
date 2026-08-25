"use client";
import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import LeadCaptureModal from "@/components/leads/LeadCaptureModal";
import LeadActionsModal from "@/components/leads/LeadActionsModal";
import Pagination from "@/components/tables/Pagination";

const PAGE_SIZE = 25;

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [actionLead, setActionLead] = useState<OutreachLead | null>(null);

  const loadLeads = async (targetPage = page) => {
    setIsLoadingLeads(true);
    setListError(null);
    try {
      const response = await apiClient.getOutreachLeads({
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        tier: tierFilter || undefined,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      setLeads(Array.isArray(response?.leads) ? (response.leads as unknown as OutreachLead[]) : []);
      setTotal(typeof response?.total === "number" ? response.total : 0);
    } catch (err) {
      setListError(getErrorMessage(err, "Failed to load leads"));
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // LeadActionsModal is handed a static `lead` snapshot (set once when
  // "Manage" is clicked). loadLeads() alone only refreshes the `leads`
  // array, not that snapshot, so actions that keep the modal open (saving
  // an email, logging a touch) would otherwise leave it showing stale data
  // until the operator closed and reopened it. Refetch the one open lead
  // alongside the list so the modal re-renders with fresh data immediately.
  //
  // LeadActionsModal's `onUpdated` prop is `() => void` and is called
  // fire-and-forget (not awaited) right before `onClose()` in the
  // send/status-update flows — so by the time this async function's
  // `await`s resolve, the operator may have already closed the modal (or
  // opened a different lead). Capture the target id up front and apply the
  // refetched row via the functional setState form, which reads the
  // *current* state rather than this closure's stale snapshot, so a
  // late-arriving response can't resurrect a closed modal or clobber a
  // different lead's data.
  const refreshActionLead = async () => {
    const targetId = actionLead?.id;
    await loadLeads();
    if (!targetId) return;
    try {
      const fresh = await apiClient.getOutreachLead(targetId);
      setActionLead((current) => (current && current.id === targetId ? (fresh as OutreachLead) : current));
    } catch {
      // Leave actionLead as-is if the refetch fails; the list still updated.
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
      loadLeads(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, statusFilter, sourceFilter, tierFilter, page]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value);
    setPage(1);
  };

  const handleTierFilterChange = (value: string) => {
    setTierFilter(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
            <Select options={STATUS_OPTIONS} placeholder="All statuses" onChange={handleStatusFilterChange} />
          </div>
          <div className="w-48">
            <Select options={SOURCE_OPTIONS} placeholder="All sources" onChange={handleSourceFilterChange} />
          </div>
          <div className="w-40">
            <Select options={TIER_OPTIONS} placeholder="All tiers" onChange={handleTierFilterChange} />
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

        {total > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total.toLocaleString()} lead{total === 1 ? "" : "s"}
            </p>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
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
          onUpdated={refreshActionLead}
        />
      )}
    </div>
  );
}
