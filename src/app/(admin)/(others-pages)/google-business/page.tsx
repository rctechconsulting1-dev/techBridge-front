"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useBusinessByWebsiteId } from "@/hooks/useBusinessByWebsiteId";
import React, { useEffect, useState } from "react";
import { useSidebar } from "../../../../context/SidebarContext";
import { GoogleBusinessProfileView } from "../../../../components/google-business/GoogleBusinessProfileView";
import { GoogleBusinessConnectCTA } from "../../../../components/google-business/GoogleBusinessConnectCTA";
import { ConnectGoogleBusinessModal } from "../../../../components/google-business/ConnectGoogleBusinessModal";
import { CreatePostModal } from "../../../../components/google-business/CreatePostModal";
import { createGoogleBusinessPost, formatPostForAPI } from "../../../../utils/googleApi";

// Add proper TypeScript types
interface OAuthStatus {
    type: 'success' | 'error';
    message: string;
}

import type { Post } from "@/types/googleBusiness";

export default function GoogleBusinessPage() {
    const { selectedClient } = useSidebar();
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

    const { business, error, isLoading } = useBusinessByWebsiteId(
        selectedClient?.website_id
    );

    // Handle OAuth callback status
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        if (success === 'connected') {
            setOauthStatus({ type: 'success', message: 'Google account connected successfully!' });
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
            setOauthStatus({ type: 'error', message: `OAuth error: ${error}` });
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleCreatePost = async (postData: Post[]) => {
        try {
            const validPosts = postData.filter(post => {
                if (!post.summary || post.summary.trim() === '') {
                    console.warn('Skipping post with empty summary');
                    return false;
                }
                return true;
            });

            if (validPosts.length === 0) {
                console.error('No valid posts to create');
                alert('Please add content to at least one post');
                return;
            }

            const results = await Promise.allSettled(
                validPosts.map(async (post) => {
                    const formattedPost = formatPostForAPI(post);
                    if (!business) {
                        throw new Error("Business data is not available.");
                    }
                    if (!business.gmb_Id) {
                        throw new Error("Google Business location ID is missing.");
                    }
                    return await createGoogleBusinessPost(
                        business.gmb_Id,
                        formattedPost,
                        business.id
                    );
                })
            );

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected');

            if (successful > 0) {
                setOauthStatus({ type: 'success', message: `Successfully created ${successful} post(s)!` });
            }

            if (failed.length > 0) {
                console.error(`Failed to create ${failed.length} post(s)`);
                failed.forEach((result, index) => {
                    console.error(`Post ${index + 1} error:`, result.reason);
                });
                setOauthStatus({ type: 'error', message: `Failed to create ${failed.length} post(s). Check console for details.` });
            }

            setShowCreatePostModal(false);
        } catch (error) {
            console.error("Error creating posts:", error);
            setOauthStatus({ type: 'error', message: 'Error creating posts. Please try again.' });
        }
    };

    if (!selectedClient) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Google Business Profile" />
                <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                    <div className="mx-auto w-full max-w-[630px] text-center">
                        <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
                            No Client Selected
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                            Please select a client from the sidebar to manage their Google Business Profile.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Google Business Profile" />
                <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                    <div className="mx-auto w-full max-w-[630px] text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading business data...</p>
                    </div>
                </div>
            </div>
        );
    }

        if (selectedClient?.website_id) {
            <div>
                <PageBreadcrumb pageTitle="Google Business Profile" />
                <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                    <div className="mx-auto w-full max-w-[630px] text-center">
                        <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
                            No Business Id
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                            Please add a Google Business Profile to your client to manage their posts and information.
                        </p>
                    </div>
                </div>
            </div>
    }
    if (error) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Google Business Profile" />
                <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                    <div className="mx-auto w-full max-w-[630px] text-center">
                        <h3 className="mb-4 font-semibold text-red-600 text-theme-xl sm:text-2xl">
                            Error Loading Business Data
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                            {error.message || "Failed to load business information."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const hasGmbId = business?.gmb_Id;

    return (
        <div>
            <PageBreadcrumb pageTitle="Google Business Profile" />
            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                {hasGmbId ? (
                    <GoogleBusinessProfileView
                        business={business}
                        onCreatePost={() => setShowCreatePostModal(true)}
                    />
                ) : (
                    <GoogleBusinessConnectCTA
                        clientName={selectedClient.name}
                        onConnect={() => setShowConnectModal(true)}
                    />
                )}
            </div>

            {/* Connect Modal */}
            {showConnectModal && (
                <ConnectGoogleBusinessModal
                    clientName={selectedClient.name}
                    onClose={() => setShowConnectModal(false)}
                    onConnect={async () => {
                        try {
                            const response = await fetch('/api/auth/google/connect', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    clientId: selectedClient.id
                                })
                            });

                            if (response.ok) {
                                const { authUrl } = await response.json();
                                window.location.href = authUrl;
                            } else {
                                console.error('Failed to initiate Google OAuth flow');
                                setOauthStatus({ type: 'error', message: 'Failed to initiate Google OAuth flow' });
                            }
                        } catch (error) {
                            console.error('Error initiating Google OAuth:', error);
                            setOauthStatus({ type: 'error', message: 'Error initiating Google OAuth' });
                        }
                    }}
                />
            )}

            {/* Create Post Modal */}
            {showCreatePostModal && (
                <CreatePostModal
                    clientName={selectedClient.name}
                    onClose={() => setShowCreatePostModal(false)}
                    onCreatePost={handleCreatePost}
                />
            )}

            {/* OAuth Status Banner */}
            {oauthStatus && (
                <div className={`mb-4 p-4 rounded-lg ${oauthStatus.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    <div className="flex justify-between items-center">
                        <span>{oauthStatus.message}</span>
                        <button
                            onClick={() => setOauthStatus(null)}
                            className="text-sm opacity-70 hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

