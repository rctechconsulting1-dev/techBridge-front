/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

const API_URL = getApiBaseUrl();

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function StarRating({ rating, size = "sm" }: { rating: string | number; size?: "sm" | "lg" }) {
    const stars = typeof rating === "string" ? (STARS[rating] ?? 0) : Math.round(rating);
    const cls = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    return (
        <span className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className={`${cls} ${i <= stars ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </span>
    );
}

interface Review {
    reviewId: string;
    reviewer: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
    starRating: string;
    comment?: string;
    createTime: string;
    reviewReply?: { comment: string; updateTime: string };
}

function QuotaNotice() {
    return (
        <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
            <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Google API quota limit reached</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
                Reviews require Google Business Profile API access approval.{" "}
                <a href="https://developers.google.com/my-business/content/prereqs#request-access" target="_blank" rel="noopener noreferrer" className="underline">
                    Request access →
                </a>
            </p>
        </div>
    );
}

export function ReviewsPanel({ locationId }: { locationId: string }) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [meta, setMeta] = useState<{ averageRating?: number; totalReviewCount?: number }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [sortNewest, setSortNewest] = useState(true);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/google/reviews?locationId=${locationId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setReviews(data.reviews ?? []);
            setMeta({ averageRating: data.averageRating, totalReviewCount: data.totalReviewCount });
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    }, [locationId]);

    useEffect(() => { fetchReviews(); }, [fetchReviews]);

    const submitReply = async (reviewId: string) => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/google/reviews/${reviewId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locationId, comment: replyText }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error((d as any).error || `HTTP ${res.status}`);
            }
            setReviews((prev) =>
                prev.map((r) =>
                    r.reviewId === reviewId
                        ? { ...r, reviewReply: { comment: replyText, updateTime: new Date().toISOString() } }
                        : r
                )
            );
            setReplyingTo(null);
            setReplyText("");
        } catch (e: any) {
            alert(`Failed to post reply: ${e.message}`);
        }
        setSubmitting(false);
    };

    const isQuotaError = (msg: string | null) =>
        msg && (msg.includes("429") || msg.includes("quota") || msg.includes("QUOTA") || msg.includes("403"));

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
    );

    if (isQuotaError(error)) return <QuotaNotice />;
    if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>;

    const sorted = [...reviews].sort((a, b) =>
        sortNewest
            ? new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
            : new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
    );
    const filtered = filterRating ? sorted.filter((r) => (STARS[r.starRating] ?? 0) === filterRating) : sorted;

    return (
        <div className="space-y-5">
            {/* Summary header */}
            <div className="flex flex-wrap gap-6 items-start pb-5 border-b border-gray-200 dark:border-gray-700">
                {/* Average */}
                <div className="text-center min-w-[80px]">
                    <p className="text-4xl font-bold text-gray-900 dark:text-white leading-none mb-1">
                        {Number(meta.averageRating ?? 0).toFixed(1)}
                    </p>
                    <StarRating rating={meta.averageRating ?? 0} />
                    <p className="text-xs text-gray-500 mt-1">{meta.totalReviewCount ?? reviews.length} reviews</p>
                </div>

                {/* Rating breakdown bar */}
                <div className="flex-1 min-w-[180px] space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter((r) => (STARS[r.starRating] ?? 0) === star).length;
                        const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                        return (
                            <button
                                key={star}
                                onClick={() => setFilterRating(filterRating === star ? null : star)}
                                className={`flex items-center gap-2 w-full text-left group ${filterRating === star ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
                            >
                                <span className="text-xs text-gray-600 dark:text-gray-400 w-3">{star}</span>
                                <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-yellow-400 h-2 rounded-full transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-500 w-5 text-right">{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 items-end ml-auto">
                    <button onClick={fetchReviews} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <button onClick={() => setSortNewest(!sortNewest)} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                        Sort: {sortNewest ? "Newest first" : "Oldest first"}
                    </button>
                </div>
            </div>

            {/* Filter chip */}
            {filterRating && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {filterRating}-star reviews ({filtered.length})
                    </span>
                    <button onClick={() => setFilterRating(null)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                        Clear
                    </button>
                </div>
            )}

            {/* Review list */}
            {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-12">No reviews found.</p>
            )}

            {filtered.map((review) => (
                <div key={review.reviewId} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {review.reviewer?.profilePhotoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={review.reviewer.profilePhotoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm flex-shrink-0">
                                    {(review.reviewer?.displayName?.[0] ?? "A").toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                    {review.reviewer?.isAnonymous ? "Anonymous" : (review.reviewer?.displayName ?? "Anonymous")}
                                </p>
                                <StarRating rating={review.starRating} />
                            </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(review.createTime).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                    </div>

                    {review.comment && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.comment}</p>
                    )}

                    {/* Existing reply (not editing) */}
                    {review.reviewReply && replyingTo !== review.reviewId && (
                        <div className="ml-4 pl-3 border-l-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Owner reply</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{review.reviewReply.comment}</p>
                        </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === review.reviewId ? (
                        <div className="ml-4 space-y-2">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                placeholder="Write your reply…"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => submitReply(review.reviewId)}
                                    disabled={submitting || !replyText.trim()}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 font-medium transition-colors"
                                >
                                    {submitting ? "Posting…" : "Post Reply"}
                                </button>
                                <button
                                    onClick={() => { setReplyingTo(null); setReplyText(""); }}
                                    className="px-4 py-1.5 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setReplyingTo(review.reviewId); setReplyText(review.reviewReply?.comment ?? ""); }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-0"
                        >
                            {review.reviewReply ? "✏ Edit reply" : "↩ Reply"}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
