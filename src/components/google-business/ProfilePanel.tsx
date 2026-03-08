/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS: Record<string, string> = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
};

function formatTime(t?: { hours?: number; minutes?: number }): string {
    if (!t) return "";
    const h = t.hours ?? 0;
    const m = t.minutes ?? 0;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function ProfilePanel({ locationId }: { locationId: string }) {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [editWebsite, setEditWebsite] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/google/profile-info?locationId=${locationId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setProfile(data);
            setEditWebsite(data.websiteUri ?? "");
            setEditDescription(data.profile?.description ?? "");
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    }, [locationId]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const saveProfile = async () => {
        setSaving(true);
        setSaveMsg(null);
        try {
            const fields: any = {};
            const masks: string[] = [];

            if (editWebsite.trim() !== (profile?.websiteUri ?? "")) {
                fields.websiteUri = editWebsite.trim();
                masks.push("websiteUri");
            }
            if (editDescription.trim() !== (profile?.profile?.description ?? "")) {
                fields.profile = { description: editDescription.trim() };
                masks.push("profile.description");
            }

            if (masks.length === 0) {
                setEditing(false);
                setSaving(false);
                return;
            }

            const res = await fetch(`${API_URL}/google/profile-info`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locationId, updateMask: masks.join(","), ...fields }),
            });

            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error((d as any).error || `HTTP ${res.status}`);
            }
            await fetchProfile();
            setEditing(false);
            setSaveMsg({ ok: true, text: "Profile updated successfully!" });
            setTimeout(() => setSaveMsg(null), 5000);
        } catch (e: any) {
            setSaveMsg({ ok: false, text: `Error: ${e.message}` });
        }
        setSaving(false);
    };

    const isQuotaError = (msg: string | null) =>
        msg && (msg.includes("429") || msg.includes("quota") || msg.includes("QUOTA") || msg.includes("403"));

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
    );

    if (isQuotaError(error)) return (
        <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
            <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Google API quota limit reached</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
                Profile info requires Google Business Profile API access.{" "}
                <a href="https://developers.google.com/my-business/content/prereqs#request-access" target="_blank" rel="noopener noreferrer" className="underline">
                    Request access →
                </a>
            </p>
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
    );

    if (!profile) return null;

    // Build hours map
    const hourMap: Record<string, { open: string; close: string }[]> = {};
    for (const period of profile.regularHours?.periods ?? []) {
        const day = period.openDay;
        if (!hourMap[day]) hourMap[day] = [];
        hourMap[day].push({
            open: formatTime(period.openTime),
            close: formatTime(period.closeTime),
        });
    }

    // Build address string
    const addr = profile.storefrontAddress;
    const addressStr = addr
        ? [
            ...(addr.addressLines ?? []),
            addr.locality,
            addr.administrativeArea,
            addr.postalCode,
          ].filter(Boolean).join(", ")
        : null;

    // Categories
    const categories: string[] = [
        profile.categories?.primaryCategory?.displayName,
        ...(profile.categories?.additionalCategories ?? []).map((c: any) => c.displayName),
    ].filter(Boolean);

    return (
        <div className="space-y-5">
            {/* Save message toast */}
            {saveMsg && (
                <div className={`p-3 rounded-lg text-sm border ${saveMsg.ok ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300" : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"}`}>
                    {saveMsg.text}
                </div>
            )}

            {/* Title row */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{profile.title}</h3>
                <div className="flex gap-3">
                    {editing && (
                        <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 font-medium transition-colors"
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    )}
                    <button
                        onClick={() => { setEditing(!editing); setSaveMsg(null); }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {editing ? "Cancel" : "✏ Edit"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: details */}
                <div className="space-y-5">
                    {/* Address */}
                    {addressStr && (
                        <Field label="Address">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{addressStr}</p>
                        </Field>
                    )}

                    {/* Phone */}
                    {profile.phoneNumbers?.primaryPhone && (
                        <Field label="Phone">
                            <a href={`tel:${profile.phoneNumbers.primaryPhone}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                {profile.phoneNumbers.primaryPhone}
                            </a>
                        </Field>
                    )}

                    {/* Website */}
                    <Field label="Website">
                        {editing ? (
                            <input
                                type="url"
                                value={editWebsite}
                                onChange={(e) => setEditWebsite(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            />
                        ) : profile.websiteUri ? (
                            <a href={profile.websiteUri} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                                {profile.websiteUri}
                            </a>
                        ) : (
                            <p className="text-sm text-gray-400">Not set</p>
                        )}
                    </Field>

                    {/* Categories */}
                    {categories.length > 0 && (
                        <Field label="Categories">
                            <div className="flex flex-wrap gap-1.5">
                                {categories.map((c, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs rounded-full font-medium">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </Field>
                    )}

                    {/* Description */}
                    <Field label="Business Description">
                        {editing ? (
                            <div>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={5}
                                    maxLength={750}
                                    placeholder="Describe your business (max 750 characters)…"
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
                                />
                                <p className="text-xs text-gray-400 text-right mt-1">{editDescription.length}/750</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {profile.profile?.description || <span className="text-gray-400">No description set</span>}
                            </p>
                        )}
                    </Field>
                </div>

                {/* Right: hours */}
                <div>
                    <Field label="Business Hours">
                        <div className="space-y-0.5">
                            {DAY_ORDER.map((day) => {
                                const slots = hourMap[day];
                                const isToday = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase() === day;
                                return (
                                    <div
                                        key={day}
                                        className={`flex justify-between text-sm py-2 px-2 rounded-lg ${isToday ? "bg-blue-50 dark:bg-blue-900/20 font-semibold" : ""}`}
                                    >
                                        <span className={`w-28 ${isToday ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
                                            {DAY_LABELS[day]}
                                            {isToday && <span className="ml-1 text-xs text-blue-500">(today)</span>}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {slots?.length
                                                ? slots.map((h) => `${h.open} – ${h.close}`).join(", ")
                                                : <span className="text-gray-400">Closed</span>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Field>

                    {/* Note about editing hours */}
                    {editing && (
                        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 italic">
                            Business hours can be updated directly in Google Business Profile manager.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
            {children}
        </div>
    );
}
