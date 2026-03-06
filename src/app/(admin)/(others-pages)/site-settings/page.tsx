"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api";
import type { SiteSettings } from "@/lib/cms-types";

// ─── Types ───────────────────────────────────────────────────────────────────

type FormData = Partial<
  Omit<
    SiteSettings,
    "id" | "website_id" | "created_at" | "updated_at" | "footer_nav_links"
  >
>;

interface Service {
  id: number;
  title: string;
  slug: string;
  content: string | null;
}

interface TeamMember {
  id: number;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
}

type Tab = "settings" | "services" | "team";

// ─── Style constants ──────────────────────────────────────────────────────────

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";
const SECTION =
  "rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900";
const SECTION_TITLE =
  "mb-4 text-base font-semibold text-gray-800 dark:text-white";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("auth_token")
    : null;
}

function authHeaders() {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiteSettingsPage() {
  const [websiteId, setWebsiteId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("settings");

  // Settings state
  const [form, setForm] = useState<FormData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceEdit, setServiceEdit] = useState<number | "new" | null>(null);
  const [serviceForm, setServiceForm] = useState({
    title: "",
    slug: "",
    content: "",
  });
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Team state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamEdit, setTeamEdit] = useState<number | "new" | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    title: "",
    bio: "",
    photo_url: "",
    linkedin_url: "",
    sort_order: 0,
  });
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // ── Load settings ──
  const loadSettings = useCallback(async (wid: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/site-settings/${wid}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data: SiteSettings = await res.json();
        const {
          id: _id,
          website_id: _wid,
          created_at: _c,
          updated_at: _u,
          footer_nav_links: _fnl,
          ...editable
        } = data;
        void _id;
        void _wid;
        void _c;
        void _u;
        void _fnl;
        setForm(editable);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load services ──
  const loadServices = useCallback(async (wid: number) => {
    setServicesLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/services?website_id=${wid}`, {
        cache: "no-store",
      });
      if (res.ok) setServices(await res.json());
    } finally {
      setServicesLoading(false);
    }
  }, []);

  // ── Load team ──
  const loadTeam = useCallback(async (wid: number) => {
    setTeamLoading(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/team-members?website_id=${wid}`,
        { cache: "no-store" },
      );
      if (res.ok) setTeam(await res.json());
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    apiClient.getSession().then((user) => {
      const u = user as { website_id?: number } | null;
      const wid = u?.website_id ?? null;
      setWebsiteId(wid);
      if (wid) {
        loadSettings(wid);
        loadServices(wid);
        loadTeam(wid);
      } else {
        setLoading(false);
      }
    });
  }, [loadSettings, loadServices, loadTeam]);

  // ── Settings save ──
  const handleSave = async () => {
    if (!websiteId) return;
    setSaving(true);
    setSettingsError(null);
    setSaved(false);
    try {
      const res = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSettingsError(err?.error ?? `Error ${res.status}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        const secret = process.env.NEXT_PUBLIC_REVALIDATION_SECRET;
        if (secret) {
          await fetch("/api/revalidate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidation-secret": secret,
            },
            body: JSON.stringify({ websiteId: String(websiteId) }),
          });
        }
      }
    } catch (e) {
      setSettingsError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Services CRUD ──
  const startNewService = () => {
    setServiceForm({ title: "", slug: "", content: "" });
    setServiceEdit("new");
    setServiceError(null);
  };
  const startEditService = (s: Service) => {
    setServiceForm({ title: s.title, slug: s.slug, content: s.content ?? "" });
    setServiceEdit(s.id);
    setServiceError(null);
  };
  const cancelService = () => {
    setServiceEdit(null);
    setServiceError(null);
  };
  const setServiceField = (key: keyof typeof serviceForm, val: string) =>
    setServiceForm((f) => ({
      ...f,
      [key]: val,
      ...(key === "title" && serviceEdit === "new"
        ? { slug: slugify(val) }
        : {}),
    }));

  const saveService = async () => {
    if (!serviceForm.title.trim()) {
      setServiceError("Title is required.");
      return;
    }
    setServiceSaving(true);
    setServiceError(null);
    try {
      if (serviceEdit === "new") {
        const res = await fetch(`${getApiBaseUrl()}/services`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...serviceForm, website_id: websiteId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Service = await res.json();
        setServices((p) => [created, ...p]);
      } else {
        const res = await fetch(`${getApiBaseUrl()}/services/${serviceEdit}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(serviceForm),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Service = await res.json();
        setServices((p) => p.map((s) => (s.id === updated.id ? updated : s)));
      }
      cancelService();
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setServiceSaving(false);
    }
  };

  const deleteService = async (id: number) => {
    if (!confirm("Delete this service?")) return;
    const res = await fetch(`${getApiBaseUrl()}/services/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) setServices((p) => p.filter((s) => s.id !== id));
  };

  // ── Team CRUD ──
  const startNewTeam = () => {
    setTeamForm({
      name: "",
      title: "",
      bio: "",
      photo_url: "",
      linkedin_url: "",
      sort_order: 0,
    });
    setTeamEdit("new");
    setTeamError(null);
  };
  const startEditTeam = (m: TeamMember) => {
    setTeamForm({
      name: m.name,
      title: m.title ?? "",
      bio: m.bio ?? "",
      photo_url: m.photo_url ?? "",
      linkedin_url: m.linkedin_url ?? "",
      sort_order: m.sort_order,
    });
    setTeamEdit(m.id);
    setTeamError(null);
  };
  const cancelTeam = () => {
    setTeamEdit(null);
    setTeamError(null);
  };
  const setTeamField = (key: keyof typeof teamForm, val: string | number) =>
    setTeamForm((f) => ({ ...f, [key]: val }));

  const saveTeam = async () => {
    if (!teamForm.name.trim()) {
      setTeamError("Name is required.");
      return;
    }
    setTeamSaving(true);
    setTeamError(null);
    try {
      const payload = {
        ...teamForm,
        title: teamForm.title || null,
        bio: teamForm.bio || null,
        photo_url: teamForm.photo_url || null,
        linkedin_url: teamForm.linkedin_url || null,
      };
      if (teamEdit === "new") {
        const res = await fetch(`${getApiBaseUrl()}/team-members`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...payload, website_id: websiteId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: TeamMember = await res.json();
        setTeam((p) =>
          [...p, created].sort((a, b) => a.sort_order - b.sort_order),
        );
      } else {
        const res = await fetch(`${getApiBaseUrl()}/team-members/${teamEdit}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: TeamMember = await res.json();
        setTeam((p) =>
          p
            .map((m) => (m.id === updated.id ? updated : m))
            .sort((a, b) => a.sort_order - b.sort_order),
        );
      }
      cancelTeam();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setTeamSaving(false);
    }
  };

  const deleteTeam = async (id: number) => {
    if (!confirm("Delete this team member?")) return;
    const res = await fetch(`${getApiBaseUrl()}/team-members/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) setTeam((p) => p.filter((m) => m.id !== id));
  };

  // ── Guards ──
  if (loading)
    return <div className="p-8 text-gray-400">Loading settings…</div>;
  if (!websiteId)
    return (
      <div className="p-8 text-gray-500">
        No website linked to your account. Ask an admin to assign a{" "}
        <code>website_id</code>.
      </div>
    );

  const TABS: { id: Tab; label: string }[] = [
    { id: "settings", label: "Site Settings" },
    { id: "services", label: "Services" },
    { id: "team", label: "Team / About" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Site Editor
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Edit content shown on your public site.
          </p>
        </div>
        <Link
          href={`/sites/${websiteId}`}
          target="_blank"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Preview ↗
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === id
                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Settings tab ── */}
      {tab === "settings" && (
        <>
          {/* Hero */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Hero</p>
            <div className="space-y-4">
              <Field
                label="Headline"
                value={form.hero_headline ?? ""}
                onChange={(v) => set("hero_headline", v)}
              />
              <Field
                label="Subheadline"
                value={form.hero_subheadline ?? ""}
                onChange={(v) => set("hero_subheadline", v)}
                textarea
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="CTA Button Text"
                  value={form.hero_cta_text ?? ""}
                  onChange={(v) => set("hero_cta_text", v)}
                />
                <Field
                  label="CTA Button URL"
                  value={form.hero_cta_url ?? ""}
                  onChange={(v) => set("hero_cta_url", v)}
                />
              </div>
              <Field
                label="Background Image URL (optional)"
                value={form.hero_bg_image_url ?? ""}
                onChange={(v) => set("hero_bg_image_url", v)}
              />
            </div>
          </div>

          {/* Branding */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Branding</p>
            <div className="grid grid-cols-3 gap-4">
              <ColorField
                label="Primary Color"
                value={form.primary_color ?? "#CD7F32"}
                onChange={(v) => set("primary_color", v)}
              />
              <ColorField
                label="Secondary Color"
                value={form.secondary_color ?? "#ffffff"}
                onChange={(v) => set("secondary_color", v)}
              />
              <ColorField
                label="Accent Color"
                value={form.accent_color ?? "#C41E3A"}
                onChange={(v) => set("accent_color", v)}
              />
            </div>
            <div className="mt-4">
              <Field
                label="Logo URL (optional)"
                value={form.logo_url ?? ""}
                onChange={(v) => set("logo_url", v)}
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>CTA Section</p>
            <div className="space-y-4">
              <Field
                label="Headline"
                value={form.cta_headline ?? ""}
                onChange={(v) => set("cta_headline", v)}
              />
              <Field
                label="Body Text"
                value={form.cta_body ?? ""}
                onChange={(v) => set("cta_body", v)}
                textarea
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Button Text"
                  value={form.cta_button_text ?? ""}
                  onChange={(v) => set("cta_button_text", v)}
                />
                <Field
                  label="Button URL"
                  value={form.cta_button_url ?? ""}
                  onChange={(v) => set("cta_button_url", v)}
                />
              </div>
              <ColorField
                label="Background Color"
                value={form.cta_bg_color ?? "#CD7F32"}
                onChange={(v) => set("cta_bg_color", v)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Footer</p>
            <div className="space-y-4">
              <Field
                label="Tagline"
                value={form.footer_tagline ?? ""}
                onChange={(v) => set("footer_tagline", v)}
              />
              <Field
                label="Copyright Text"
                value={form.footer_copyright ?? ""}
                onChange={(v) => set("footer_copyright", v)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Facebook URL"
                  value={form.footer_social_facebook ?? ""}
                  onChange={(v) => set("footer_social_facebook", v)}
                />
                <Field
                  label="Instagram URL"
                  value={form.footer_social_instagram ?? ""}
                  onChange={(v) => set("footer_social_instagram", v)}
                />
                <Field
                  label="X (Twitter) URL"
                  value={form.footer_social_x ?? ""}
                  onChange={(v) => set("footer_social_x", v)}
                />
                <Field
                  label="LinkedIn URL"
                  value={form.footer_social_linkedin ?? ""}
                  onChange={(v) => set("footer_social_linkedin", v)}
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Contact Info</p>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Email"
                value={form.contact_email ?? ""}
                onChange={(v) => set("contact_email", v)}
              />
              <Field
                label="Phone"
                value={form.contact_phone ?? ""}
                onChange={(v) => set("contact_phone", v)}
              />
              <div className="col-span-2">
                <Field
                  label="Address"
                  value={form.address ?? ""}
                  onChange={(v) => set("address", v)}
                />
              </div>
              <div className="col-span-2">
                <Field
                  label="Google Maps Embed URL"
                  value={form.google_maps_url ?? ""}
                  onChange={(v) => set("google_maps_url", v)}
                  hint="Paste the src URL from Google Maps → Share → Embed a map"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pb-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#CD7F32] px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#b8702b] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <span className="text-sm font-medium text-green-600">
                ✓ Saved! Landing page will update within 60 s.
              </span>
            )}
            {settingsError && (
              <span className="text-sm text-red-600">{settingsError}</span>
            )}
          </div>
        </>
      )}

      {/* ── Services tab ── */}
      {tab === "services" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Appears on your public <strong>Services</strong> page.
            </p>
            {serviceEdit === null && (
              <button
                onClick={startNewService}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                + Add Service
              </button>
            )}
          </div>

          {/* Service form */}
          {serviceEdit !== null && (
            <div className="rounded-xl border border-[#CD7F32]/30 bg-orange-50/40 p-5 shadow-sm dark:bg-gray-800">
              <p className="mb-4 text-sm font-semibold tracking-wide text-[#CD7F32] uppercase">
                {serviceEdit === "new" ? "New Service" : "Edit Service"}
              </p>
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Title *</label>
                  <input
                    className={INPUT}
                    value={serviceForm.title}
                    onChange={(e) => setServiceField("title", e.target.value)}
                    placeholder="e.g. Web Design"
                  />
                </div>
                <div>
                  <label className={LABEL}>Slug</label>
                  <input
                    className={INPUT}
                    value={serviceForm.slug}
                    onChange={(e) =>
                      setServiceField("slug", slugify(e.target.value))
                    }
                    placeholder="e.g. web-design"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Auto-generated from title.
                  </p>
                </div>
                <div>
                  <label className={LABEL}>Description</label>
                  <textarea
                    className={INPUT}
                    rows={4}
                    value={serviceForm.content}
                    onChange={(e) => setServiceField("content", e.target.value)}
                    placeholder="Describe this service…"
                  />
                </div>
              </div>
              {serviceError && (
                <p className="mt-2 text-sm text-red-500">{serviceError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveService}
                  disabled={serviceSaving}
                  className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {serviceSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancelService}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Service list */}
          {servicesLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : services.length === 0 && serviceEdit === null ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
              No services yet. Click <strong>+ Add Service</strong> to get
              started.
            </div>
          ) : (
            <ul className="space-y-3">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {s.title}
                    </p>
                    {s.content && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {s.content.replace(/<[^>]+>/g, "")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">slug: {s.slug}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditService(s)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteService(s.id)}
                      className="rounded-md border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Team / About tab ── */}
      {tab === "team" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Appears on your public <strong>About</strong> page.
            </p>
            {teamEdit === null && (
              <button
                onClick={startNewTeam}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                + Add Member
              </button>
            )}
          </div>

          {/* Team form */}
          {teamEdit !== null && (
            <div className="rounded-xl border border-[#CD7F32]/30 bg-orange-50/40 p-5 shadow-sm dark:bg-gray-800">
              <p className="mb-4 text-sm font-semibold tracking-wide text-[#CD7F32] uppercase">
                {teamEdit === "new" ? "New Team Member" : "Edit Team Member"}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Name *</label>
                  <input
                    className={INPUT}
                    value={teamForm.name}
                    onChange={(e) => setTeamField("name", e.target.value)}
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div>
                  <label className={LABEL}>Role / Title</label>
                  <input
                    className={INPUT}
                    value={teamForm.title}
                    onChange={(e) => setTeamField("title", e.target.value)}
                    placeholder="e.g. Lead Developer"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Bio</label>
                  <textarea
                    className={INPUT}
                    rows={3}
                    value={teamForm.bio}
                    onChange={(e) => setTeamField("bio", e.target.value)}
                    placeholder="Short bio shown on the About page…"
                  />
                </div>
                <div>
                  <label className={LABEL}>Photo URL</label>
                  <input
                    className={INPUT}
                    value={teamForm.photo_url}
                    onChange={(e) => setTeamField("photo_url", e.target.value)}
                    placeholder="https://…"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Leave blank for initials avatar.
                  </p>
                </div>
                <div>
                  <label className={LABEL}>LinkedIn URL</label>
                  <input
                    className={INPUT}
                    value={teamForm.linkedin_url}
                    onChange={(e) =>
                      setTeamField("linkedin_url", e.target.value)
                    }
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
                <div>
                  <label className={LABEL}>Sort Order</label>
                  <input
                    className={INPUT}
                    type="number"
                    min={0}
                    value={teamForm.sort_order}
                    onChange={(e) =>
                      setTeamField("sort_order", Number(e.target.value))
                    }
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Lower = appears first.
                  </p>
                </div>
              </div>
              {teamError && (
                <p className="mt-2 text-sm text-red-500">{teamError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveTeam}
                  disabled={teamSaving}
                  className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {teamSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancelTeam}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Team list */}
          {teamLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : team.length === 0 && teamEdit === null ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
              No team members yet. Click <strong>+ Add Member</strong> to get
              started.
            </div>
          ) : (
            <ul className="space-y-3">
              {team.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#CD7F32] text-lg font-bold text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {m.name}
                      </p>
                      {m.title && (
                        <p className="text-sm text-[#CD7F32]">{m.title}</p>
                      )}
                      {m.bio && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {m.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditTeam(m)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTeam(m.id)}
                      className="rounded-md border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  textarea,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          className={INPUT}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={INPUT}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#CD7F32"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-gray-200 p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
