 
"use client";
import React from "react";

export function GoogleBusinessConnectCTA({ clientName, onConnect }: { clientName: string; onConnect: () => void; }) {
    return (
        <div className="mx-auto w-full max-w-[630px] text-center">
            <div className="mb-8">
                <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
                <h3 className="mb-4 font-semibold text-gray-800 text-2xl dark:text-white/90">
                    Connect Google Business Profile
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    Connect {clientName}&apos;s Google Business Profile to manage reviews, posts,
                    and business information directly from this dashboard.
                </p>
            </div>

            <button
                onClick={onConnect}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
            >
                Connect Google Business Profile
            </button>

            <div className="mt-8 text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    What you can do after connecting:
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        Manage and respond to customer reviews
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        Create and schedule Google My Business posts
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        Monitor business insights and analytics
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        Update business information and hours
                    </li>
                </ul>
            </div>
        </div>
    );
}
