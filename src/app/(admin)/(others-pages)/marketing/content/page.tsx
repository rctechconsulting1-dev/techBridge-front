"use client";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { ContentAgentPanel } from "@/components/marketing/ContentAgentPanel";
import { useSidebar } from "@/context/SidebarContext";

export default function MarketingContentPage() {
  const { selectedClient } = useSidebar();

  if (!selectedClient) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        Select a client to generate ad content.
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Ad Content Generator" />
      <div className="max-w-2xl">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Generate Google Ads headlines and descriptions using AI. Copy the results directly into your
          Google Ads campaigns. The content-agent uses brand voice context for{" "}
          <span className="font-medium">{selectedClient.name}</span>.
        </p>
        <ContentAgentPanel />
      </div>
    </div>
  );
}
