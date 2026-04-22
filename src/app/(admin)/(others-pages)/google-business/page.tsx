"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EntitlementGate from "@/components/common/EntitlementGate";
import { useBusinessByWebsiteId } from "@/hooks/useBusinessByWebsiteId";
import React, { useEffect, useState } from "react";
import { useSidebar } from "../../../../context/SidebarContext";
import { GoogleBusinessProfileView } from "../../../../components/google-business/GoogleBusinessProfileView";
import { CreatePostModal } from "../../../../components/google-business/CreatePostModal";
import { getApiBaseUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth-context";

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
    const [tokenExpired, setTokenExpired] = useState(false);
    const [manualLocationId, setManualLocationId] = useState('');
    const [manualAccountId, setManualAccountId] = useState('');
    const [agencyConnected, setAgencyConnected] = useState<boolean | null>(null);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
    const [agencyConnecting, setAgencyConnecting] = useState(false);
    const [pendingLocationPick, setPendingLocationPick] = useState(false);

    const { business, error, isLoading, mutate } = useBusinessByWebsiteId(selectedClient?.website_id);

    // Auth headers for all backend-rc calls
    const authHeaders = React.useMemo(() => {
        const token = getStoredAuthToken();
        const tenantId = selectedClient?.tenant_id;
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(tenantId ? { 'x-tenant-id': String(tenantId) } : {}),
        };
    }, [selectedClient?.tenant_id]);

    // Parse success/error from URL once on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const errorParam = urlParams.get('error');
        if (success === 'connected') {
            window.history.replaceState({}, document.title, window.location.pathname);
            // Claim the pending OAuth token data from the httpOnly cookie and save to backend
            fetch('/api/auth/google/claim')
                .then(r => r.json())
                .then(async (claim) => {
                    if (claim.ok && claim.data) {
                        const { accessToken, refreshToken, googleAccountId, agencyEmail, tenantId: claimTenantId, expiresAt } = claim.data as Record<string, string | null>;
                        const token = getStoredAuthToken();
                        const tid = claimTenantId ?? String(selectedClient?.tenant_id ?? '');
                        await fetch(`${API_URL}/agency-google-token`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                ...(tid ? { 'x-tenant-id': tid } : {}),
                            },
                            body: JSON.stringify({ accessToken, refreshToken, googleAccountId, agencyEmail, expiresAt }),
                        });
                    }
                })
                .catch(() => {})
                .finally(() => {
                    setOauthStatus({ type: 'success', message: 'Google account connected! You can now manage all your GMB locations.' });
                    setTokenExpired(false);
                    setPendingLocationPick(true);
                });
        } else if (errorParam) {
            setOauthStatus({ type: 'error', message: `OAuth error: ${errorParam}` });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check agency connection status — runs when we know the tenant
    useEffect(() => {
        if (!selectedClient?.tenant_id) return;
        const token = getStoredAuthToken();
        fetch(`${API_URL}/agency-google-token`, {
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                'x-tenant-id': String(selectedClient.tenant_id),
            },
        })            .then(r => r.json())
            .then(d => {
                setAgencyConnected(d.connected === true);
                setConnectedEmail(d.agency_email ?? null);
            })
            .catch(() => setAgencyConnected(false));
    }, [selectedClient?.tenant_id]);

    useEffect(() => {
        if (pendingLocationPick && agencyConnected && !isLoading) {
            setPendingLocationPick(false);
            if (business?.id) openLocationPicker();
        }
        // Re-check connection status after successful OAuth redirect
        if (pendingLocationPick && selectedClient?.tenant_id && agencyConnected === null) {
            fetch(`${API_URL}/agency-google-token`, { headers: authHeaders })
                .then(r => r.json())
                .then(d => {
                    setAgencyConnected(d.connected === true);
                    setConnectedEmail(d.agency_email ?? null);
                })
                .catch(() => {});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingLocationPick, agencyConnected, isLoading, business?.id, selectedClient?.tenant_id]);

    const connectAgencyGoogle = async () => {
        setAgencyConnecting(true);
        try {
            const res = await fetch('/api/auth/google/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId: selectedClient?.tenant_id ?? null }),
            });
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
        setTokenExpired(false);
        try {
            const res = await fetch(`${API_URL}/google/locations`, { headers: authHeaders });
            if (res.status === 429 || res.status === 403) {
                setApiBlocked(true);
                setLoadingLocations(false);
                return;
            }
            if (res.status === 401) {
                setTokenExpired(true);
                setAgencyConnected(false);
                setConnectedEmail(null);
                setLoadingLocations(false);
                setShowLocationPicker(false);
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
                headers: authHeaders,
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
                headers: authHeaders,
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

    const handleCreatePost = async (postData: import('@/components/google-business/CreatePostModal').GmbPostPayload) => {
        if (!business?.gmb_Id) throw new Error('No GMB location linked. Pick a location first.');
        const res = await fetch(`${API_URL}/google/post`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                locationId: business.gmb_Id,
                postData,
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { error?: string }).error || `Post failed: ${res.status}`);
        }
        setShowCreatePostModal(false);
        setOauthStatus({ type: 'success', message: postData.scheduleTime ? 'Post scheduled!' : 'Post published!' });
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
                        <p className="font-medium text-blue-800">Google account not connected</p>
                        <p className="text-sm text-blue-600">Connect your Google account to manage all client GMB profiles from one place.</p>
                    </div>
                    <button
                        onClick={connectAgencyGoogle}
                        disabled={agencyConnecting}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
                        {agencyConnecting ? 'Redirecting…' : 'Connect Google'}
                    </button>
                </div>
            )}
            {/* Connected account chip */}
            {agencyConnected === true && connectedEmail && (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                        <span className="text-sm text-green-800 font-medium">Connected as <span className="font-semibold">{connectedEmail}</span></span>
                    </div>
                    <button
                        onClick={connectAgencyGoogle}
                        className="text-xs text-green-700 hover:underline"
                    >
                        Switch account
                    </button>
                </div>
            )}

            {/* Token expired warning */}
            {tokenExpired && (
                <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-center justify-between">
                    <span className="text-sm text-yellow-800 font-medium">⚠️ Google token expired or revoked. Please reconnect your account.</span>
                    <button
                        onClick={connectAgencyGoogle}
                        disabled={agencyConnecting}
                        className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-xs font-medium"
                    >
                        {agencyConnecting ? 'Redirecting…' : 'Reconnect Google'}
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
                    websiteId={selectedClient.website_id}
                    authHeaders={authHeaders}
                    onClose={() => setShowCreatePostModal(false)}
                    onSubmit={handleCreatePost}
                />
            )}
            </EntitlementGate>
        </div>
    );
}

