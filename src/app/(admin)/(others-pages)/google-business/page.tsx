"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EntitlementGate from "@/components/common/EntitlementGate";
import { useBusinessByWebsiteId } from "@/hooks/useBusinessByWebsiteId";
import React, { useEffect, useState } from "react";
import { useSidebar } from "../../../../context/SidebarContext";
import { GoogleBusinessProfileView } from "../../../../components/google-business/GoogleBusinessProfileView";
import { CreatePostModal } from "../../../../components/google-business/CreatePostModal";
import { createGoogleBusinessPost, formatPostForAPI } from "../../../../utils/googleApi";
import type { Post } from "@/types/google-business";
import { getApiBaseUrl } from "@/lib/api";

interface OAuthStatus { type: 'success' | 'error'; message: string; }
interface GmbLocation { locationId: string; name: string; title: string; address: string; accountId: string; }

const API_URL = getApiBaseUrl();

export default function GoogleBusinessPage() {
    const { selectedClient } = useSidebar();
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [locations, setLocations] = useState<GmbLocation[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [linkingLocation, setLinkingLocation] = useState(false);
    const [apiBlocked, setApiBlocked] = useState(false);
    const [manualLocationId, setManualLocationId] = useState('');
    const [manualAccountId, setManualAccountId] = useState('');
    const [agencyConnected, setAgencyConnected] = useState<boolean | null>(null);
    const [agencyConnecting, setAgencyConnecting] = useState(false);
    const [pendingLocationPick, setPendingLocationPick] = useState(false);

    const { business, error, isLoading, mutate } = useBusinessByWebsiteId(selectedClient?.website_id);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const errorParam = urlParams.get('error');
        if (success === 'connected') {
            window.history.replaceState({}, document.title, window.location.pathname);
            setOauthStatus({ type: 'success', message: 'RC Tech Google account connected!' });
            setPendingLocationPick(true);
        } else if (errorParam) {
            setOauthStatus({ type: 'error', message: `OAuth error: ${errorParam}` });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        fetch(`${API_URL}/agency-google-token`)
            .then(r => r.json())
            .then(d => setAgencyConnected(d.connected === true))
            .catch(() => setAgencyConnected(false));
    }, []);

    useEffect(() => {
        if (pendingLocationPick && agencyConnected && !isLoading) {
            setPendingLocationPick(false);
            if (business?.id) openLocationPicker();
        }
         
    }, [pendingLocationPick, agencyConnected, isLoading, business?.id]);

    const connectAgencyGoogle = async () => {
        setAgencyConnecting(true);
        try {
            const res = await fetch('/api/auth/google/connect', { method: 'POST' });
            if (!res.ok) throw new Error('connect failed');
            const { authUrl } = await res.json();
            window.location.href = authUrl;
        } catch {
            setOauthStatus({ type: 'error', message: 'Failed to start Google OAuth. Try again.' });
            setAgencyConnecting(false);
        }
    };

    const openLocationPicker = async () => {
        setShowLocationPicker(true);
        setLoadingLocations(true);
        setApiBlocked(false);
        try {
            const res = await fetch(`${API_URL}/google/locations`);
            if (res.status === 429 || res.status === 403) {
                setApiBlocked(true);
                setLoadingLocations(false);
                return;
            }
            const data = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const locs: GmbLocation[] = (data.locations || []).map((l: any) => ({
                locationId: l.name?.split('/').pop() || '',
                name: l.name || '',
                title: l.title || l.locationName || '',
                address: l.storefrontAddress?.addressLines?.join(', ') || '',
                accountId: l.name?.split('/')[1] || '',
            }));
            setLocations(locs);
        } catch {
            setApiBlocked(true);
        }
        setLoadingLocations(false);
    };

    const handleLinkLocation = async (loc: GmbLocation) => {
        if (!business?.id) return;
        setLinkingLocation(true);
        try {
            await fetch(`${API_URL}/business-listings/${business.id}/gmb`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gmb_Id: loc.locationId, accountId: loc.accountId }),
            });
            await mutate();
            setShowLocationPicker(false);
            setOauthStatus({ type: 'success', message: `Linked to "${loc.title}"!` });
        } catch {
            setOauthStatus({ type: 'error', message: 'Failed to link location.' });
        }
        setLinkingLocation(false);
    };

    const handleManualLink = async () => {
        if (!manualLocationId.trim() || !business?.id) return;
        setLinkingLocation(true);
        try {
            await fetch(`${API_URL}/business-listings/${business.id}/gmb`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gmb_Id: manualLocationId.trim(),
                    ...(manualAccountId.trim() ? { accountId: manualAccountId.trim() } : {}),
                }),
            });
            await mutate();
            setShowLocationPicker(false);
            setManualLocationId('');
            setManualAccountId('');
            setOauthStatus({ type: 'success', message: 'Location linked successfully!' });
        } catch {
            setOauthStatus({ type: 'error', message: 'Failed to link location.' });
        }
        setLinkingLocation(false);
    };

    const handleCreatePost = async (postData: Post[]) => {
        try {
            const validPosts = postData.filter(post => post.summary?.trim());
            if (validPosts.length === 0) {
                alert('Please add content to at least one post');
                return;
            }
            const results = await Promise.allSettled(
                validPosts.map(async (post) => {
                    const formattedPost = formatPostForAPI(post);
                    if (!business?.gmb_Id) throw new Error('Google Business location ID is missing.');
                    return await createGoogleBusinessPost(business.gmb_Id, formattedPost, business.id);
                })
            );
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected');
            if (successful > 0) setOauthStatus({ type: 'success', message: `Created ${successful} post(s)!` });
            if (failed.length > 0) setOauthStatus({ type: 'error', message: `Failed to create ${failed.length} post(s).` });
            setShowCreatePostModal(false);
        } catch {
            setOauthStatus({ type: 'error', message: 'Error creating posts. Please try again.' });
        }
    };

    if (!selectedClient) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Google Business Profile" />
                <EntitlementGate requiredModules={["google_business_management"]} pageTitle="Google Business Profile">
                    <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                        <div className="mx-auto w-full max-w-[630px] text-center">
                            <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">No Client Selected</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">Please select a client from the sidebar to manage their Google Business Profile.</p>
                        </div>
                    </div>
                </EntitlementGate>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Google Business Profile" />
                <EntitlementGate requiredModules={["google_business_management"]} pageTitle="Google Business Profile">
                    <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                        <div className="mx-auto w-full max-w-[630px] text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                        </div>
                    </div>
                </EntitlementGate>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Google Business Profile" />
                <EntitlementGate requiredModules={["google_business_management"]} pageTitle="Google Business Profile">
                    <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                        <div className="mx-auto w-full max-w-[630px] text-center">
                            <h3 className="mb-4 font-semibold text-red-600 text-theme-xl sm:text-2xl">Error</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">{error.message}</p>
                        </div>
                    </div>
                </EntitlementGate>
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb pageTitle="Google Business Profile" />
            <EntitlementGate requiredModules={["google_business_management"]} pageTitle="Google Business Profile">

            {/* Agency not connected banner */}
            {agencyConnected === false && (
                <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center justify-between">
                    <div>
                        <p className="font-medium text-blue-800">RC Tech Google account not connected</p>
                        <p className="text-sm text-blue-600">Connect once to manage all client GMB profiles.</p>
                    </div>
                    <button
                        onClick={connectAgencyGoogle}
                        disabled={agencyConnecting}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium"
                    >
                        {agencyConnecting ? 'Redirecting…' : 'Connect Google'}
                    </button>
                </div>
            )}

            {/* OAuth status banner */}
            {oauthStatus && (
                <div className={`mb-4 p-4 rounded-lg flex justify-between items-center ${
                    oauthStatus.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                    <span>{oauthStatus.message}</span>
                    <button onClick={() => setOauthStatus(null)} className="text-sm opacity-70 hover:opacity-100 ml-4">×</button>
                </div>
            )}

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                {business?.gmb_Id ? (
                    <GoogleBusinessProfileView
                        business={business}
                        onCreatePost={() => setShowCreatePostModal(true)}
                    />
                ) : (
                    <div className="mx-auto w-full max-w-[630px] text-center">
                        <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
                            No GMB Location Linked
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base mb-6">
                            Link a Google Business Profile location to {selectedClient.name}.
                        </p>
                        {agencyConnected ? (
                            <button
                                onClick={openLocationPicker}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Pick Location
                            </button>
                        ) : (
                            <p className="text-sm text-gray-400">Connect the RC Tech Google account first (see banner above).</p>
                        )}
                    </div>
                )}
            </div>

            {/* Location picker modal */}
            {showLocationPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Link GMB Location</h3>
                            <button onClick={() => setShowLocationPicker(false)} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
                        </div>
                        {loadingLocations ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            </div>
                        ) : apiBlocked ? (
                            <div className="flex-1 overflow-y-auto">
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                    Automatic location fetch is unavailable (Google API quota limit). Enter the location ID manually below.
                                </div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location ID</label>
                                <input
                                    type="text"
                                    value={manualLocationId}
                                    onChange={e => setManualLocationId(e.target.value)}
                                    placeholder="e.g. 04658615360713100265"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account ID (optional)</label>
                                <input
                                    type="text"
                                    value={manualAccountId}
                                    onChange={e => setManualAccountId(e.target.value)}
                                    placeholder="e.g. 123456789"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleManualLink}
                                    disabled={!manualLocationId.trim() || linkingLocation}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium text-sm"
                                >
                                    {linkingLocation ? 'Saving…' : 'Link Location'}
                                </button>
                            </div>
                        ) : locations.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No locations found.</p>
                        ) : (
                            <ul className="flex-1 overflow-y-auto space-y-2">
                                {locations.map(loc => (
                                    <li key={loc.locationId}>
                                        <button
                                            onClick={() => handleLinkLocation(loc)}
                                            disabled={linkingLocation}
                                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-60"
                                        >
                                            <p className="font-medium text-gray-800">{loc.title}</p>
                                            <p className="text-xs text-gray-500">{loc.address}</p>
                                            <p className="text-xs text-gray-400 font-mono">{loc.locationId}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Create Post Modal */}
            {showCreatePostModal && (
                <CreatePostModal
                    clientName={selectedClient.name}
                    onClose={() => setShowCreatePostModal(false)}
                    onCreatePost={handleCreatePost}
                />
            )}
            </EntitlementGate>
        </div>
    );
}

