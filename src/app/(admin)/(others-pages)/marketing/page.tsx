"use client";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { CampaignPerformancePanel } from "@/components/marketing/CampaignPerformancePanel";
import { AnalyticsPanel } from "@/components/marketing/AnalyticsPanel";
import { SearchConsolePanel } from "@/components/marketing/SearchConsolePanel";
import { BudgetChangeForm } from "@/components/marketing/BudgetChangeForm";
import { useSidebar } from "@/context/SidebarContext";

export default function MarketingPerformancePage() {
  const { selectedClient } = useSidebar();

  if (!selectedClient) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        Select a client to view marketing performance.
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Marketing Performance" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <CampaignPerformancePanel />
          <AnalyticsPanel />
          <SearchConsolePanel />
        </div>
        <div>
          <BudgetChangeForm />
        </div>
      </div>
    </div>
  );
}
