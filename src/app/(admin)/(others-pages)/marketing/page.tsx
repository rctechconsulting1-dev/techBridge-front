"use client";
import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { CampaignPerformancePanel } from "@/components/marketing/CampaignPerformancePanel";
import { AnalyticsPanel } from "@/components/marketing/AnalyticsPanel";
import { SearchConsolePanel } from "@/components/marketing/SearchConsolePanel";
import { BudgetChangeForm } from "@/components/marketing/BudgetChangeForm";
import { MarketingConnectionsPanel } from "@/components/marketing/MarketingConnectionsPanel";
import { useSidebar } from "@/context/SidebarContext";

type Tab = "dashboard" | "connections";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "connections", label: "Connections" },
];

export default function MarketingPerformancePage() {
  const { selectedClient } = useSidebar();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

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

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
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
      )}

      {activeTab === "connections" && <MarketingConnectionsPanel />}
    </div>
  );
}
