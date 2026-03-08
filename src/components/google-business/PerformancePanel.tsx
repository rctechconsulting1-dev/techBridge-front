/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const METRIC_LABELS: Record<string, string> = {
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "Maps (Desktop)",
    BUSINESS_IMPRESSIONS_MOBILE_MAPS: "Maps (Mobile)",
    BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "Search (Desktop)",
    BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "Search (Mobile)",
    WEBSITE_CLICKS: "Website Clicks",
    CALL_CLICKS: "Call Clicks",
    BUSINESS_DIRECTION_REQUESTS: "Direction Requests",
    BUSINESS_CONVERSATIONS: "Messages",
};

const METRIC_COLORS: Record<string, string> = {
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "#3b82f6",
    BUSINESS_IMPRESSIONS_MOBILE_MAPS: "#6366f1",
    BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "#8b5cf6",
    BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "#a78bfa",
    WEBSITE_CLICKS: "#10b981",
    CALL_CLICKS: "#f59e0b",
    BUSINESS_DIRECTION_REQUESTS: "#ef4444",
    BUSINESS_CONVERSATIONS: "#06b6d4",
};

const METRIC_ICONS: Record<string, string> = {
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "🗺",
    BUSINESS_IMPRESSIONS_MOBILE_MAPS: "📍",
    BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "🔍",
    BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "📱",
    WEBSITE_CLICKS: "🌐",
    CALL_CLICKS: "📞",
    BUSINESS_DIRECTION_REQUESTS: "🧭",
    BUSINESS_CONVERSATIONS: "💬",
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
    if (values.length < 2) return null;
    const max = Math.max(...values, 1);
    const W = 140;
    const H = 44;
    const pad = 3;
    const step = (W - pad * 2) / (values.length - 1);
    const pts = values
        .map((v, i) => `${pad + i * step},${H - pad - ((v / max) * (H - pad * 2))}`)
        .join(" ");
    const area = `${pad},${H - pad} ${pts} ${W - pad},${H - pad}`;
    const id = `g-${color.replace("#", "")}`;
    return (
        <svg width={W} height={H} className="overflow-visible w-full">
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <polygon points={area} fill={`url(#${id})`} />
            <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface MetricSeries {
    metric: string;
    values: number[];
    dates: string[];
    total: number;
    trend: number; // % change first half vs second half
}

function trendArrow(pct: number) {
    if (pct > 5) return <span className="text-green-500 text-xs font-semibold">▲ {pct.toFixed(0)}%</span>;
    if (pct < -5) return <span className="text-red-500 text-xs font-semibold">▼ {Math.abs(pct).toFixed(0)}%</span>;
    return <span className="text-gray-400 text-xs">—</span>;
}

export function PerformancePanel({ locationId }: { locationId: string }) {
    const [data, setData] = useState<MetricSeries[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(30);

    const fetchPerformance = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/google/performance?locationId=${locationId}&days=${days}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

            // The response is { multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [...] }] }
            const rawSeries: any[] =
                json.multiDailyMetricTimeSeries?.[0]?.dailyMetricTimeSeries ?? [];

            const parsed: MetricSeries[] = rawSeries.map((item: any) => {
                const datedValues: any[] = item.timeSeries?.datedValues ?? [];
                const values = datedValues.map((d: any) => parseInt(d.value ?? "0", 10));
                const dates = datedValues.map((d: any) => {
                    const { year, month, day } = d.date;
                    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                });
                const mid = Math.floor(values.length / 2);
                const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0);
                const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0);
                const trend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
                return {
                    metric: item.dailyMetric,
                    values,
                    dates,
                    total: values.reduce((a, b) => a + b, 0),
                    trend,
                };
            });

            setData(parsed);
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    }, [locationId, days]);

    useEffect(() => { fetchPerformance(); }, [fetchPerformance]);

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
                Performance metrics require Google Business Profile API access approval.{" "}
                <a href="https://developers.google.com/my-business/content/prereqs#request-access" target="_blank" rel="noopener noreferrer" className="underline">
                    Request access →
                </a>
            </p>
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
    );

    const viewsMetrics = data.filter((d) => d.metric.includes("IMPRESSIONS"));
    const actionMetrics = data.filter((d) => !d.metric.includes("IMPRESSIONS"));
    const totalViews = viewsMetrics.reduce((a, m) => a + m.total, 0);
    const totalActions = actionMetrics.reduce((a, m) => a + m.total, 0);

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalViews.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Views</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalActions.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Actions</p>
                    </div>
                </div>
                {/* Date range selector */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                days === d
                                    ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Profile Views */}
            {viewsMetrics.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Profile Views</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {viewsMetrics.map((m) => {
                            const color = METRIC_COLORS[m.metric] ?? "#6b7280";
                            return (
                                <div key={m.metric} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-lg">{METRIC_ICONS[m.metric]}</span>
                                        {trendArrow(m.trend)}
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {m.total.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{METRIC_LABELS[m.metric]}</p>
                                    <Sparkline values={m.values} color={color} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Customer Actions */}
            {actionMetrics.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Customer Actions</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {actionMetrics.map((m) => {
                            const color = METRIC_COLORS[m.metric] ?? "#6b7280";
                            return (
                                <div key={m.metric} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-lg">{METRIC_ICONS[m.metric]}</span>
                                        {trendArrow(m.trend)}
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {m.total.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{METRIC_LABELS[m.metric]}</p>
                                    <Sparkline values={m.values} color={color} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {data.length === 0 && (
                <p className="text-center text-gray-400 py-12">No performance data available for this period.</p>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-600">
                Data from Business Profile Performance API · Last {days} days
            </p>
        </div>
    );
}
