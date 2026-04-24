"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useS3Upload } from "@/hooks/useS3Upload";
import { getApiBaseUrl } from "@/lib/api";

const API_URL = getApiBaseUrl();

interface MediaItem {
    id: string;
    url: string;
    name: string;
    uploading?: boolean;
}

export interface GmbPostPayload {
    summary: string;
    topicType: "STANDARD" | "EVENT" | "OFFER";
    languageCode: string;
    media: { mediaFormat: "PHOTO"; sourceUrl: string }[];
    callToAction?: { actionType: string; url: string };
    scheduleTime?: string;
}

interface Props {
    clientName: string;
    websiteId?: number | null;
    authHeaders: Record<string, string>;
    onClose: () => void;
    onSubmit: (post: GmbPostPayload) => Promise<void>;
}

const TOPIC_TYPES = [
    { value: "STANDARD", label: "Update" },
    { value: "EVENT",    label: "Event"  },
    { value: "OFFER",    label: "Offer"  },
] as const;

const CTA_TYPES = [
    { value: "NONE",         label: "No button"     },
    { value: "LEARN_MORE",   label: "Learn More"    },
    { value: "BOOK",         label: "Book"          },
    { value: "ORDER_ONLINE", label: "Order Online"  },
    { value: "BUY",          label: "Buy"           },
    { value: "SIGN_UP",      label: "Sign Up"       },
    { value: "CALL",         label: "Call"          },
];

export function CreatePostModal({ clientName, websiteId, authHeaders, onClose, onSubmit }: Props) {
    const { uploadToS3 } = useS3Upload();

    const [topicType, setTopicType] = useState<"STANDARD" | "EVENT" | "OFFER">("STANDARD");
    const [content, setContent]     = useState("");
    const [postMode, setPostMode]   = useState<"now" | "schedule">("now");
    const [scheduleTime, setScheduleTime] = useState("");
    const [ctaType, setCtaType]     = useState("NONE");
    const [ctaUrl, setCtaUrl]       = useState("");
    const [mediaTab, setMediaTab]   = useState<"upload" | "assets">("upload");
    const [media, setMedia]         = useState<MediaItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]         = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [assets, setAssets]         = useState<any[]>([]);
    const [assetsLoading, setAssetsLoading] = useState(false);

    useEffect(() => {
        if (mediaTab !== "assets" || !websiteId) return;
        setAssetsLoading(true);
        fetch(`${API_URL}/assets?website_id=${websiteId}&page=0&page_size=50`, { headers: authHeaders })
            .then(r => r.json())
            .then(data => setAssets(Array.isArray(data) ? data : []))
            .catch(() => setAssets([]))
            .finally(() => setAssetsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaTab, websiteId]);

    const handleFileUpload = async (files: FileList | null) => {
        if (!files) return;
        for (const file of Array.from(files).slice(0, 10 - media.length)) {
            const tempId = `tmp-${Date.now()}-${Math.random()}`;
            setMedia(prev => [...prev, { id: tempId, url: "", name: file.name, uploading: true }]);
            try {
                const endpoint = `/api/s3-upload?scope=asset${websiteId ? `&websiteId=${websiteId}` : ""}&category=general`;
                const { url } = await uploadToS3(file, { endpoint: { request: { url: endpoint } } });
                setMedia(prev => prev.map(m => m.id === tempId ? { id: tempId, url, name: file.name } : m));
            } catch {
                setMedia(prev => prev.filter(m => m.id !== tempId));
            }
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toggleAsset = (asset: any) => {
        const url: string = asset.image?.url ?? "";
        if (!url) return;
        if (media.find(m => m.url === url)) {
            setMedia(prev => prev.filter(m => m.url !== url));
        } else if (media.length < 10) {
            setMedia(prev => [...prev, { id: `asset-${asset.id}`, url, name: asset.image?.alt_text || `Asset ${asset.id}` }]);
        }
    };

    const removeMedia = (id: string) => setMedia(prev => prev.filter(m => m.id !== id));

    const handleSubmit = async () => {
        if (!content.trim()) { setError("Post content is required."); return; }
        if (postMode === "schedule" && !scheduleTime) { setError("Choose a schedule time."); return; }
        if (ctaType !== "NONE" && !ctaUrl.trim()) { setError("Enter a URL for the button."); return; }
        setError(null);
        setSubmitting(true);
        try {
            const payload: GmbPostPayload = {
                summary: content.trim(),
                topicType,
                languageCode: "en-US",
                media: media.filter(m => m.url).map(m => ({ mediaFormat: "PHOTO" as const, sourceUrl: m.url })),
                ...(ctaType !== "NONE" ? { callToAction: { actionType: ctaType, url: ctaUrl.trim() } } : {}),
                ...(postMode === "schedule" && scheduleTime ? { scheduleTime: new Date(scheduleTime).toISOString() } : {}),
            };
            await onSubmit(payload);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create post.");
            setSubmitting(false);
        }
    };

    const anyUploading  = media.some(m => m.uploading);
    const minSchedule   = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create GMB Post</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{clientName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                    {/* Post type pills */}
                    <div className="flex gap-2">
                        {TOPIC_TYPES.map(t => (
                            <button key={t.value} onClick={() => setTopicType(t.value)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${topicType === t.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-400"}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Post Content</label>
                        <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={1500} rows={5}
                            placeholder="What's happening at your business?"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/1500</p>
                    </div>

                    {/* Images */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Images (optional)</label>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                                <button onClick={() => setMediaTab("upload")}
                                    className={`px-3 py-1 transition ${mediaTab === "upload" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                                    Upload
                                </button>
                                <button onClick={() => setMediaTab("assets")}
                                    className={`px-3 py-1 transition ${mediaTab === "assets" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                                    From Assets
                                </button>
                            </div>
                        </div>

                        {/* Selected thumbnails */}
                        {media.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {media.map(m => (
                                    <div key={m.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group flex-shrink-0">
                                        {m.uploading
                                            ? <div className="w-full h-full flex items-center justify-center bg-gray-100"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /></div>
                                            : <Image src={m.url} alt={m.name} fill className="object-cover" />
                                        }
                                        <button onClick={() => removeMedia(m.id)}
                                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {mediaTab === "upload" ? (
                            media.length < 10 && (
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition">
                                    <svg className="w-7 h-7 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-sm text-gray-500">Click to upload images</span>
                                    <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP up to 10MB · {10 - media.length} remaining</span>
                                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />
                                </label>
                            )
                        ) : assetsLoading ? (
                            <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                        ) : assets.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">No assets found for this client.</p>
                        ) : (
                            <div className="grid grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
                                {assets.filter(a => a.image?.url).map(asset => {
                                    const selected = media.some(m => m.url === asset.image?.url);
                                    return (
                                        <button key={asset.id} onClick={() => toggleAsset(asset)} title={asset.image?.alt_text || ""}
                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${selected ? "border-blue-500" : "border-transparent hover:border-gray-300"}`}>
                                            <Image src={asset.image.url} alt={asset.image.alt_text || ""} fill className="object-cover" />
                                            {selected && (
                                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-blue-700 drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* CTA */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Button (optional)</label>
                        <div className="flex gap-2">
                            <select value={ctaType} onChange={e => setCtaType(e.target.value)}
                                className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {CTA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            {ctaType !== "NONE" && (
                                <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://yoursite.com"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            )}
                        </div>
                    </div>

                    {/* When to post */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">When to post</label>
                        <div className="flex gap-3 mb-3">
                            <button onClick={() => setPostMode("now")}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${postMode === "now" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-400"}`}>
                                Post Now
                            </button>
                            <button onClick={() => setPostMode("schedule")}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${postMode === "schedule" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-400"}`}>
                                Schedule
                            </button>
                        </div>
                        {postMode === "schedule" && (
                            <input type="datetime-local" value={scheduleTime} min={minSchedule} onChange={e => setScheduleTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        )}
                    </div>

                    {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting || anyUploading || !content.trim()}
                        className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                        {(submitting || anyUploading) && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {anyUploading ? "Uploading…" : submitting ? "Posting…" : postMode === "now" ? "Publish Now" : "Schedule Post"}
                    </button>
                </div>
            </div>
        </div>
    );
}
