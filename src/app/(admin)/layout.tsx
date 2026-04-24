"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import BillingStatusBanner from "@/components/common/BillingStatusBanner";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import Button from "../../components/ui/button/Button";
import { useRouter } from "next/navigation";
import { SWRConfig } from "swr";
import { fetcher } from "../../hooks/fetcher";
import "@mdxeditor/editor/style.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
    setActiveUser,
    setSelectedClient,
  } = useSidebar();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const user = await apiClient.getSession();
        if (!user) {
          router.push("/signin");
          return;
        }
        setSession(user);
        setActiveUser(user || null);

        // Preserve an explicitly selected tenant context (e.g. set when admin
        // creates or selects a tenant). Only fall back to the session user when
        // no tenant context with a website_id is already stored locally.
        const storedClientJson = localStorage.getItem("selected_client");
        const storedClient = storedClientJson
          ? (() => {
              try {
                return JSON.parse(storedClientJson);
              } catch {
                return null;
              }
            })()
          : null;

        if (storedClient?.website_id) {
          setSelectedClient({
            ...storedClient,
            role: user.role,
            memberships: user.memberships,
            enabledModules: user.enabledModules,
            enabledFeatures: user.enabledFeatures,
          });
        } else {
          setSelectedClient(user || null);
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
        router.push("/signin");
      }
    };

    fetchSession();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {session ? (
        <SWRConfig value={{ fetcher }}>
          {/* Sidebar and Backdrop */}
          <AppSidebar />
          <Backdrop />
          {/* Main Content Area */}
          <div
            className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
          >
            {/* Header */}
            <AppHeader session={session} />
            {/* Billing Status Banner */}
            <BillingStatusBanner />
            {/* Page Content */}
            <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
              {children}
            </div>
          </div>
        </SWRConfig>
      ) : (
        <>
          <div className="flex h-screen flex-col items-center justify-center">
            <Button
              className="w-40"
              size="sm"
              onClick={() => router.push("/signin?next=/admin")}
            >
              Sign in
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
