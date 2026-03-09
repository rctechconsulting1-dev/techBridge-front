 
"use client";
import React from "react";

export function ConnectGoogleBusinessModal({
    clientName, onClose, onConnect,
}: {
    clientName: string;
    onClose: () => void;
    onConnect: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Connect Google Business Profile
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You&apos;re about to connect {clientName}&apos;s Google Business Profile.
                        This will allow you to manage their business presence on Google.
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                            <strong>Note:</strong> You&apos;ll need the appropriate permissions from Google
                            to manage this business profile.
                        </p>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConnect}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                    >
                        Connect Now
                    </button>
                </div>
            </div>
        </div>
    );
}
