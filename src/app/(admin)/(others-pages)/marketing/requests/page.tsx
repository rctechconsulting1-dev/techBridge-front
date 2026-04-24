"use client";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { MarketingRequestsTable } from "@/components/marketing/MarketingRequestsTable";
import { useSidebar } from "@/context/SidebarContext";

export default function MarketingRequestsPage() {
  const { selectedClient } = useSidebar();

  if (!selectedClient) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        Select a client to view ad requests.
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Ad Requests" />
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Budget changes go through a dry-run → approval → execute workflow. A second user must approve
          any pending request before it can be executed against Google Ads.
        </p>
        <MarketingRequestsTable />
      </div>
    </div>
  );
}
