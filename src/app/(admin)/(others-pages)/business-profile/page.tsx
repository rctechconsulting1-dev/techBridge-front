"use client";

/**
 * Business Profile admin page — /business-profile
 *
 * Single-screen editor for the canonical SEO and content signals
 * that feed every built-in page SEO Assistant.  On first visit the
 * form is seeded from the latest intake submission so nothing starts
 * blank.  After saving it becomes the authoritative source and all
 * per-page SEO Assistants read from here first.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import { buildLatestIntakeAdminPath } from "@/lib/intake-admin";
import type { IntakeStoredSubmission } from "@/lib/intake-types";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConversionMode = "call" | "email" | "appointment" | "reservation" | "checkout";

type BusinessProfile = {
  id?: number;
  tenant_id?: number;
  website_id?: number;
  target_keyword_primary: string;
  target_cities: string[];
  priority_services: string[];
  ideal_customer: string;
  differentiator: string;
  trust_signals: string;
  brand_voice_words: string[];
  primary_conversion_mode: ConversionMode | "";
  seeded_from_intake?: boolean;
  seeded_at?: string | null;
  updated_at?: string;
};

type FormState = {
  target_keyword_primary: string;
  target_cities_raw: string;       // comma/newline separated for textarea editing
  priority_services_raw: string;
  ideal_customer: string;
  differentiator: string;
  trust_signals: string;
  brand_voice_words_raw: string;
  primary_conversion_mode: ConversionMode | "";
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CONVERSION_MODES: Array<{ value: ConversionMode; label: string }> = [
  { value: "call",        label: "Call — drive direct phone leads" },
  { value: "email",       label: "Email — drive form or email inquiries" },
  { value: "appointment", label: "Appointment — drive scheduled consultations" },
  { value: "reservation", label: "Reservation — drive venue or event reservations" },
  { value: "checkout",    label: "Checkout — drive direct product purchase" },
];

const REQUIRED_FIELDS: Array<keyof FormState> = [
  "target_keyword_primary",
  "target_cities_raw",
  "priority_services_raw",
];

// ─── Intake helpers ───────────────────────────────────────────────────────────

const pickIntakeAnswer = (
  submission: IntakeStoredSubmission | null,
  ...keys: string[]
): string => {
  if (!submission?.answers) return "";
  for (const key of keys) {
    const val = submission.answers[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (Array.isArray(val) && val.length > 0) return val.join(", ");
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "number") return String(val);
  }
  return "";
};

const seedFormFromIntake = (
  submission: IntakeStoredSubmission,
): Partial<FormState> => ({
  target_cities_raw: pickIntakeAnswer(
    submission,
    "location",
    "service_area_details",
    "hours_locations",
  ),
  priority_services_raw: pickIntakeAnswer(
    submission,
    "service_list",
    "appointment_types",
    "product_list",
    "reservation_types",
    "service_product_list",
    "primary_offerings",
  ),
  ideal_customer: pickIntakeAnswer(submission, "ideal_client"),
  differentiator: pickIntakeAnswer(submission, "differentiator"),
  trust_signals: [
    pickIntakeAnswer(submission, "credentials"),
    pickIntakeAnswer(submission, "years_in_business")
      ? `${pickIntakeAnswer(submission, "years_in_business")} years in business`
      : "",
    pickIntakeAnswer(submission, "has_insurance") === "true" ||
    submission.answers["has_insurance"] === true
      ? "Licensed & insured"
      : "",
    pickIntakeAnswer(submission, "google_business_url"),
  ]
    .filter(Boolean)
    .join(". "),
});

// ─── Form helpers ─────────────────────────────────────────────────────────────

const rawToArray = (raw: string): string[] =>
  raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const arrayToRaw = (arr: string[]): string => arr.join("\n");

const profileToForm = (profile: BusinessProfile): FormState => ({
  target_keyword_primary: profile.target_keyword_primary,
  target_cities_raw:       arrayToRaw(profile.target_cities),
  priority_services_raw:   arrayToRaw(profile.priority_services),
  ideal_customer:          profile.ideal_customer,
  differentiator:          profile.differentiator,
  trust_signals:           profile.trust_signals,
  brand_voice_words_raw:   arrayToRaw(profile.brand_voice_words),
  primary_conversion_mode: profile.primary_conversion_mode,
});

const EMPTY_FORM: FormState = {
  target_keyword_primary: "",
  target_cities_raw:      "",
  priority_services_raw:  "",
  ideal_customer:         "",
  differentiator:         "",
  trust_signals:          "",
  brand_voice_words_raw:  "",
  primary_conversion_mode: "",
};

// ─── Shared style tokens ──────────────────────────────────────────────────────

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessProfilePage() {
  const { selectedClient } = useSidebar();
  const websiteId = Number(selectedClient?.website_id || 0) || null;
  const selectedTenantId =
    Number(selectedClient?.tenant_id || getActiveTenantId() || 0) || null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profileExists, setProfileExists] = useState(false);
  const [seededFromIntake, setSeededFromIntake] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [missingIntakeFields, setMissingIntakeFields] = useState<string[]>([]);

  const authHeaders = useCallback((): HeadersInit => {
    const token = getStoredAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(selectedTenantId ? { "x-tenant-id": String(selectedTenantId) } : {}),
    };
  }, [selectedTenantId]);

  // ── Load: try profile first, fall back to intake seed ───────────────────────
  useEffect(() => {
    if (!websiteId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const headers = authHeaders();

      // 1. Try existing profile
      try {
        const profileRes = await fetch(
          `/api/business-profile?websiteId=${websiteId}`,
          { headers, cache: "no-store" },
        );

        if (profileRes.ok) {
          const profile = (await profileRes.json()) as BusinessProfile;
          if (!cancelled) {
            setForm(profileToForm(profile));
            setProfileExists(true);
            setSeededFromIntake(profile.seeded_from_intake ?? false);
            setLastSaved(profile.updated_at ?? null);
            setIsLoading(false);
          }
          return;
        }
        // 404 means not created yet — fall through to intake seed
      } catch {
        // network error — still try intake
      }

      // 2. Seed from latest intake submission
      const intakePath = buildLatestIntakeAdminPath({ websiteId, tenantId: selectedTenantId });
      if (!intakePath) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const intakeRes = await fetch(intakePath, { headers, cache: "no-store" });
        if (intakeRes.ok) {
          const submission = (await intakeRes.json()) as IntakeStoredSubmission;
          if (!cancelled) {
            const seed = seedFormFromIntake(submission);
            setForm((prev) => ({ ...prev, ...seed }));
            setSeededFromIntake(true);

            // flag which key profile fields are still empty after seeding
            const missing: string[] = [];
            if (!seed.target_keyword_primary) missing.push("Primary keyword");
            if (!seed.target_cities_raw) missing.push("Target city / service area");
            if (!seed.priority_services_raw) missing.push("Priority services");
            if (!seed.ideal_customer) missing.push("Ideal customer");
            if (!seed.differentiator) missing.push("Differentiator");
            setMissingIntakeFields(missing);
          }
        }
      } catch {
        // intake unavailable — form stays empty, user fills manually
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [authHeaders, selectedTenantId, websiteId]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!websiteId) {
      toast.error("Select a tenant first.");
      return;
    }

    const missing = REQUIRED_FIELDS.filter((f) => !form[f]?.trim());
    if (missing.length > 0) {
      toast.error("Fill in the required fields before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const body = {
        target_keyword_primary:  form.target_keyword_primary.trim() || null,
        target_cities:           rawToArray(form.target_cities_raw),
        priority_services:       rawToArray(form.priority_services_raw),
        ideal_customer:          form.ideal_customer.trim() || null,
        differentiator:          form.differentiator.trim() || null,
        trust_signals:           form.trust_signals.trim() || null,
        brand_voice_words:       rawToArray(form.brand_voice_words_raw),
        primary_conversion_mode: form.primary_conversion_mode || null,
        seeded_from_intake:      seededFromIntake && !profileExists,
      };

      const res = await fetch(`/api/business-profile?websiteId=${websiteId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Save failed.");
      }

      const saved = (await res.json()) as BusinessProfile;
      setLastSaved(saved.updated_at ?? new Date().toISOString());
      setProfileExists(true);
      setMissingIntakeFields([]);
      toast.success("Business profile saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }, [authHeaders, form, profileExists, seededFromIntake, websiteId]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!selectedClient) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Business Profile" />
        <ComponentCard title="No Active Tenant">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Select a tenant in the sidebar to manage their business profile.
          </p>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Business Profile" />

      {/* Header card */}
      <ComponentCard
        title="Business Profile"
        desc="The single source of truth for SEO signals shared across all built-in page editors. Fill this once and every page's SEO Assistant reads from here first."
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            These fields power the keyword targeting, audience framing, and trust
            copy used by the Home, Services, About, and Shop SEO Assistants.
            Instead of answering the same questions four times, update this profile
            once and all pages stay in sync.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/built-in-pages"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              ← Back to Built-in Pages
            </Link>
            {lastSaved && (
              <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                Last saved {new Date(lastSaved).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </ComponentCard>

      {/* Missing intake banner */}
      {missingIntakeFields.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Missing intake answers — fill these manually:</p>
          <p className="mt-1 text-xs">{missingIntakeFields.join(" · ")}</p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Once you save this profile the SEO Assistant on every page will stop asking
            for these fields individually.
          </p>
        </div>
      )}

      {/* Seeded-from-intake notice */}
      {seededFromIntake && !profileExists && !isLoading && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
          Fields pre-filled from the latest intake submission. Review, adjust, and save
          to lock this in as the authoritative business profile.
        </div>
      )}

      {isLoading ? (
        <ComponentCard title="Loading…">
          <p className="text-sm text-gray-500">Loading business profile…</p>
        </ComponentCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* SEO Targeting */}
          <ComponentCard title="SEO Targeting">
            <div className="space-y-4">
              <div>
                <label className={LABEL}>
                  Primary keyword <span className="text-red-500">*</span>
                </label>
                <input
                  className={INPUT}
                  placeholder="e.g. electrician sacramento"
                  value={form.target_keyword_primary}
                  onChange={(e) => set("target_keyword_primary")(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  The core local keyword this business should rank for.
                </p>
              </div>
              <div>
                <label className={LABEL}>
                  Target cities / service areas <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`${INPUT} min-h-24`}
                  placeholder={"Sacramento\nRoseville\nEast Sacramento"}
                  value={form.target_cities_raw}
                  onChange={(e) => set("target_cities_raw")(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  One city or area per line (or comma-separated).
                </p>
              </div>
            </div>
          </ComponentCard>

          {/* Services */}
          <ComponentCard title="Priority Services">
            <div className="space-y-4">
              <div>
                <label className={LABEL}>
                  Services / products to lead with <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`${INPUT} min-h-32`}
                  placeholder={"Panel upgrades\nEV charger installation\nOutdoor lighting"}
                  value={form.priority_services_raw}
                  onChange={(e) => set("priority_services_raw")(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  One service per line. The SEO Assistant uses this to populate hero
                  copy and keyword support across all pages.
                </p>
              </div>
              <div>
                <label className={LABEL}>Primary conversion goal</label>
                <select
                  className={INPUT}
                  value={form.primary_conversion_mode}
                  onChange={(e) => set("primary_conversion_mode")(e.target.value as ConversionMode | "")}
                >
                  <option value="">— select —</option>
                  {CONVERSION_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </ComponentCard>

          {/* Audience & Positioning */}
          <ComponentCard title="Audience & Positioning">
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Ideal customer</label>
                <textarea
                  className={`${INPUT} min-h-24`}
                  placeholder="Homeowners in Sacramento who need a licensed electrician for safety upgrades or new construction."
                  value={form.ideal_customer}
                  onChange={(e) => set("ideal_customer")(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Differentiator</label>
                <textarea
                  className={`${INPUT} min-h-24`}
                  placeholder="Why should someone choose this business over competitors?"
                  value={form.differentiator}
                  onChange={(e) => set("differentiator")(e.target.value)}
                />
              </div>
            </div>
          </ComponentCard>

          {/* Trust & Brand */}
          <ComponentCard title="Trust & Brand Voice">
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Trust signals</label>
                <textarea
                  className={`${INPUT} min-h-24`}
                  placeholder="Licensed & insured, 15 years in business, Google 4.9 ★ (200+ reviews), NABCEP certified"
                  value={form.trust_signals}
                  onChange={(e) => set("trust_signals")(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Licenses, certifications, insurance, years in business, review stats.
                </p>
              </div>
              <div>
                <label className={LABEL}>Brand voice words</label>
                <textarea
                  className={`${INPUT} min-h-20`}
                  placeholder={"reliable\ntransparent\nneighborhood-first"}
                  value={form.brand_voice_words_raw}
                  onChange={(e) => set("brand_voice_words_raw")(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  3–6 adjectives that should shape AI-generated copy tone.
                  One per line or comma-separated.
                </p>
              </div>
            </div>
          </ComponentCard>
        </div>
      )}

      {/* Save bar */}
      {!isLoading && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/30">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {profileExists
              ? "Changes save to the business profile and take effect in all SEO Assistants immediately."
              : "Saving creates the business profile for this tenant for the first time."}
          </p>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || !websiteId}
            className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : profileExists ? "Save Changes" : "Create Profile"}
          </button>
        </div>
      )}
    </div>
  );
}
