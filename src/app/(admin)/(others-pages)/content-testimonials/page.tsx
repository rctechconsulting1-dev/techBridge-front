"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import type { Testimonial } from "@/lib/cms-types";

type TestimonialFormState = {
  quote: string;
  author_name: string;
  author_title: string;
  avatar_url: string;
  star_rating: number;
  sort_order: number;
  is_published: boolean;
};

const DEFAULT_FORM: TestimonialFormState = {
  quote: "",
  author_name: "",
  author_title: "",
  avatar_url: "",
  star_rating: 5,
  sort_order: 0,
  is_published: true,
};

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const authHeaders = () => ({
  "Content-Type": "application/json",
  ...(getStoredAuthToken()
    ? { Authorization: `Bearer ${getStoredAuthToken()}` }
    : {}),
  ...(getActiveTenantId() ? { "x-tenant-id": String(getActiveTenantId()) } : {}),
});

export default function TestimonialsContentPage() {
  const { selectedClient } = useSidebar();
  const websiteId = Number(selectedClient?.website_id || 0) || null;
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<TestimonialFormState>(DEFAULT_FORM);

  const loadTestimonials = useCallback(async (wid: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/testimonials?website_id=${wid}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load testimonials (${res.status})`);
      }
      const payload = (await res.json()) as Testimonial[];
      setItems(payload);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load testimonials.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!websiteId) {
      setItems([]);
      return;
    }
    void loadTestimonials(websiteId);
  }, [loadTestimonials, websiteId]);

  const resetEditor = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const startNew = () => {
    setEditingId("new");
    setForm({
      ...DEFAULT_FORM,
      sort_order: items.length,
    });
  };

  const startEdit = (item: Testimonial) => {
    setEditingId(item.id);
    setForm({
      quote: item.quote || "",
      author_name: item.author_name || "",
      author_title: item.author_title || "",
      avatar_url: item.avatar_url || "",
      star_rating: Number(item.star_rating || 5),
      sort_order: Number(item.sort_order || 0),
      is_published: item.is_published !== false,
    });
  };

  const saveItem = async () => {
    if (!websiteId) {
      toast.error("Select a tenant first.");
      return;
    }
    if (editingId === null) {
      toast.error("Select a testimonial to edit or click Add Testimonial first.");
      return;
    }
    if (!form.quote.trim()) {
      toast.error("Quote is required.");
      return;
    }
    if (!form.author_name.trim()) {
      toast.error("Author name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const method = editingId === "new" ? "POST" : "PUT";
      const url =
        editingId === "new"
          ? `${getApiBaseUrl()}/testimonials`
          : `${getApiBaseUrl()}/testimonials/${editingId}`;

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          website_id: websiteId,
          quote: form.quote.trim(),
          author_name: form.author_name.trim(),
          author_title: form.author_title.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          star_rating: Math.max(1, Math.min(5, Number(form.star_rating) || 5)),
          sort_order: Number(form.sort_order) || 0,
          is_published: form.is_published,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to save testimonial (${res.status})`);
      }

      toast.success(editingId === "new" ? "Testimonial created." : "Testimonial updated.");
      resetEditor();
      await loadTestimonials(websiteId);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Failed to save testimonial.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!websiteId) {
      return;
    }
    if (!window.confirm("Delete this testimonial?")) {
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/testimonials/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to delete testimonial (${res.status})`);
      }
      toast.success("Testimonial deleted.");
      if (editingId === id) {
        resetEditor();
      }
      await loadTestimonials(websiteId);
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : "Failed to delete testimonial.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Testimonials" />

      {!websiteId ? (
        <ComponentCard title="No Active Tenant">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Select a tenant in the sidebar first to manage testimonial records.
          </p>
        </ComponentCard>
      ) : null}

      <ComponentCard
        title="Testimonials Collection"
        desc="These records feed Home and About testimonial sections. Keep them truthful, concise, and published only when client-approved."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/built-in-pages/home"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Open Home Editor
          </Link>
          <Link
            href="/built-in-pages/about"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Open About Editor
          </Link>
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-[#CD7F32] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b06d2b]"
          >
            Add Testimonial
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading testimonials…</p>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                No testimonials yet. Add client-approved quotes before enabling testimonial-heavy Home variants.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {item.author_name}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            item.is_published
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          }`}
                        >
                          {item.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                      {item.author_title ? (
                        <p className="mt-1 text-xs text-gray-500">{item.author_title}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {item.quote}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Rating: {item.star_rating}/5</span>
                    <span>Sort: {item.sort_order}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {editingId === null ? "New Testimonial" : editingId === "new" ? "Create Testimonial" : "Edit Testimonial"}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Keep the quote natural. Do not rewrite it into SEO copy.
            </p>
            {editingId === null ? (
              <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                Click Add Testimonial to create a new record, or choose Edit on an existing testimonial before saving.
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </p>
            ) : null}
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Quote</label>
                <textarea
                  className={`${INPUT} min-h-32`}
                  value={form.quote}
                  onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Author Name</label>
                <input
                  className={INPUT}
                  value={form.author_name}
                  onChange={(event) => setForm((current) => ({ ...current, author_name: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Author Title</label>
                <input
                  className={INPUT}
                  value={form.author_title}
                  onChange={(event) => setForm((current) => ({ ...current, author_title: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Avatar URL</label>
                <input
                  className={INPUT}
                  value={form.avatar_url}
                  onChange={(event) => setForm((current) => ({ ...current, avatar_url: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Star Rating</label>
                  <input
                    className={INPUT}
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={form.star_rating}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        star_rating: Math.max(1, Math.min(5, Number(event.target.value) || 5)),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort Order</label>
                  <input
                    className={INPUT}
                    type="number"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sort_order: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, is_published: event.target.checked }))
                  }
                />
                Published
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={resetEditor}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveItem()}
                disabled={saving || !websiteId || editingId === null}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b06d2b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId === null ? "Choose Item First" : editingId === "new" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}