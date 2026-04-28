/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { ReviewsPanel } from "./ReviewsPanel";
import { PerformancePanel } from "./PerformancePanel";
import { ProfilePanel } from "./ProfilePanel";

type Tab = "reviews" | "performance" | "profile" | "posts";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
        id: "reviews",
        label: "Reviews",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        ),
    },
    {
        id: "performance",
        label: "Performance",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        id: "profile",
        label: "Profile",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
    {
        id: "posts",
        label: "Posts",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        ),
    },
];

export function GoogleBusinessProfileView({
    business,
    authHeaders,
    onCreatePost,
}: {
    business: any;
    authHeaders: Record<string, string>;
    onCreatePost: () => void;
}) {
    const [tab, setTab] = useState<Tab>("reviews");

    const googleDashboardUrl = `https://business.google.com/dashboard/l/${business.gmb_Id}`;

    return (
        <div className="space-y-0">
            {/* Business header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{business.name}</h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            ID: {business.gmb_Id}
                        </span>
                        <a
                            href={googleDashboardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            Open in Google
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full self-start sm:self-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    Connected
                </span>
            </div>

            {/* Tab nav */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="flex gap-0 overflow-x-auto" aria-label="GMB tabs">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                                tab === t.id
                                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                    : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab panels */}
            {tab === "reviews" && <ReviewsPanel locationId={business.gmb_Id} placeId={business.place_id ?? null} />}
            {tab === "performance" && <PerformancePanel locationId={business.gmb_Id} authHeaders={authHeaders} />}
            {tab === "profile" && <ProfilePanel locationId={business.gmb_Id} authHeaders={authHeaders} />}

            {tab === "posts" && (
                <div className="space-y-5">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Create a Post</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Publish updates, offers, and events to your Google Business Profile. Posts appear in Google Search and Maps.
                        </p>
                        <button
                            onClick={onCreatePost}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-sm transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create New Post
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
