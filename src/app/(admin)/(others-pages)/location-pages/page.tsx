"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { useSidebar } from "@/context/SidebarContext";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import { useContentAgent } from "@/hooks/useContentAgent";
import type { Service } from "@/lib/cms-types";
import type { LocationPagePresentation } from "@/lib/cms-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function authHeaders(tenantId?: number | null) {
  const token = getStoredAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "x-tenant-id": String(tenantId) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LocationPageCopyResponse {
  heroHeadline?: string;
  heroBody?: string;
  bodyContent?: string;
  whyUs?: string;
  ctaHeadline?: string;
  ctaBody?: string;
  metaTitle?: string;
  metaDescription?: string;
  nearbyAreas?: string[];
}

interface ExistingLocationPage {
  id: number;
  title: string | null;
  slug: string | null;
  is_published: boolean;
  presentation?: {
    locationData?: LocationPagePresentation;
  } | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LocationPagesPage() {
  const { selectedClient } = useSidebar();
  const websiteId = Number(selectedClient?.website_id || 0) || null;
  const tenantId =
    Number(selectedClient?.tenant_id || getActiveTenantId() || 0) || null;

  // Services
  const [services, setServices] = useState<Service[]>([]);
  const [existingPages, setExistingPages] = useState<ExistingLocationPage[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [city, setCity] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [selectedServiceSlug, setSelectedServiceSlug] = useState("");
  const [nearbyAreasText, setNearbyAreasText] = useState("");
  const [generatedCopy, setGeneratedCopy] = useState<LocationPageCopyResponse | null>(null);

  const { trigger, isLoading: isGenerating } = useContentAgent();

  // Load services and existing location pages
  useEffect(() => {
    if (!websiteId) {
      setServices([]);
      setExistingPages([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingServices(true);
      try {
        const headers = authHeaders(tenantId);
        const [servicesRes, pagesRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/services?website_id=${websiteId}`, {
            cache: "no-store",
            headers,
          }),
          fetch(
            `${getApiBaseUrl()}/pages?website_id=${websiteId}&template_type=location`,
            { cache: "no-store", headers },
          ),
        ]);
        if (cancelled) return;
        const svcs = servicesRes.ok ? await servicesRes.json() : [];
        const pgs = pagesRes.ok ? await pagesRes.json() : [];
        setServices(Array.isArray(svcs) ? svcs : []);
        setExistingPages(Array.isArray(pgs) ? pgs : []);
      } catch {
        if (!cancelled) toast.error("Failed to load data.");
      } finally {
        if (!cancelled) setIsLoadingServices(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [websiteId, tenantId]);

  // Auto-derive citySlug from city name
  const handleCityChange = (value: string) => {
    setCity(value);
    setCitySlug(toSlug(value));
  };

  const selectedService = services.find((s) => s.slug === selectedServiceSlug);

  const handleGenerate = async () => {
    if (!city || !selectedServiceSlug || !selectedService) {
      toast.warning("Enter a city and select a service first.");
      return;
    }
    const nearbyAreas = nearbyAreasText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const result = await trigger({
        websiteId: websiteId ?? undefined,
        mode: "location_page",
        city,
        service: selectedService.title,
        businessName: selectedClient?.business_name ?? undefined,
        industry: selectedClient?.industry ?? undefined,
        servicesOffered: services.map((s) => s.title),
        mustInclude: nearbyAreas,
      });
      setGeneratedCopy(result as LocationPageCopyResponse);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    }
  };

  const handleSave = async (publish = false) => {
    if (!websiteId || !generatedCopy) return;
    if (!city || !selectedServiceSlug || !selectedService) {
      toast.warning("City and service are required to save.");
      return;
    }

    const serviceSlug = selectedService.slug ?? toSlug(selectedService.title);
    const slug = `${serviceSlug}-in-${citySlug}`;
    const nearbyAreas = nearbyAreasText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const locationData: LocationPagePresentation = {
      city,
      citySlug,
      service: selectedService.title,
      serviceSlug,
      heroHeadline: generatedCopy.heroHeadline ?? null,
      heroBody: generatedCopy.heroBody ?? null,
      bodyContent: generatedCopy.bodyContent ?? null,
      whyUs: generatedCopy.whyUs ?? null,
      ctaHeadline: generatedCopy.ctaHeadline ?? null,
      ctaBody: generatedCopy.ctaBody ?? null,
      nearbyAreas: generatedCopy.nearbyAreas?.length
        ? generatedCopy.nearbyAreas
        : nearbyAreas.length
          ? nearbyAreas
          : null,
    };

    const payload = {
      title: generatedCopy.heroHeadline ?? `${selectedService.title} in ${city}`,
      slug,
      website_id: websiteId,
      page_type: "custom",
      template_type: "location",
      is_published: publish,
      is_main_nav: false,
      nav_placement: "hidden",
      nav_style: "direct",
      is_external_link: false,
      navigation_assignments: [],
      content: generatedCopy.bodyContent ?? "",
      meta_description: generatedCopy.metaDescription ?? "",
      meta_keywords: `${selectedService.title}, ${city}`,
      presentation: { locationData },
    };

    setIsSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/pages`, {
        method: "POST",
        headers: authHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error ?? "Failed to save page.");
      }
      const saved = await res.json();
      toast.success(`Location page "/${slug}" ${publish ? "published" : "saved as draft"}.`);
      setExistingPages((prev) => [
        ...prev,
        { id: saved.id, title: payload.title, slug, is_published: publish, presentation: payload.presentation },
      ]);
      // Reset form
      setCity("");
      setCitySlug("");
      setSelectedServiceSlug("");
      setNearbyAreasText("");
      setGeneratedCopy(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePage = async (pageId: number, slug: string | null) => {
    if (!confirm(`Delete location page "${slug}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/pages/${pageId}`, {
        method: "DELETE",
        headers: authHeaders(tenantId),
      });
      if (!res.ok) throw new Error("Delete failed.");
      setExistingPages((prev) => prev.filter((p) => p.id !== pageId));
      toast.success("Location page deleted.");
    } catch {
      toast.error("Failed to delete page.");
    }
  };

  const serviceOptions = [
    { value: "", label: "Select a service…" },
    ...services.map((s) => ({ value: s.slug ?? s.title, label: s.title })),
  ];

  const noWebsite = !websiteId;

  return (
    <div>
      <PageBreadcrumb pageTitle="Location Pages" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ── Left column: form ─────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <ComponentCard title="Create a Location Page">
            {noWebsite ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a client from the sidebar to manage location pages.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* City */}
                  <div>
                    <Label htmlFor="loc-city">City Name</Label>
                    <Input
                      id="loc-city"
                      placeholder="e.g. San Jose"
                      value={city}
                      onChange={(e) => handleCityChange(e.target.value)}
                    />
                  </div>

                  {/* City slug (auto but editable) */}
                  <div>
                    <Label htmlFor="loc-slug">City Slug</Label>
                    <Input
                      id="loc-slug"
                      placeholder="auto-derived"
                      value={citySlug}
                      onChange={(e) => setCitySlug(e.target.value)}
                    />
                  </div>
                </div>

                {/* Service */}
                <div>
                  <Label htmlFor="loc-service">Primary Service</Label>
                  {isLoadingServices ? (
                    <p className="text-sm text-gray-400">Loading services…</p>
                  ) : (
                    <Select
                      options={serviceOptions}
                      defaultValue={selectedServiceSlug}
                      onChange={setSelectedServiceSlug}
                    />
                  )}
                </div>

                {/* Nearby areas */}
                <div>
                  <Label htmlFor="loc-nearby">
                    Nearby Areas{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      (comma-separated, optional — AI will suggest if left blank)
                    </span>
                  </Label>
                  <Input
                    id="loc-nearby"
                    placeholder="e.g. Santa Clara, Milpitas, Sunnyvale"
                    value={nearbyAreasText}
                    onChange={(e) => setNearbyAreasText(e.target.value)}
                  />
                </div>

                {/* Page slug preview */}
                {city && selectedServiceSlug && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Page will be published at:{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      /{selectedServiceSlug}-in-{citySlug}
                    </code>
                  </p>
                )}

                <div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !city || !selectedServiceSlug}
                  >
                    {isGenerating ? "Generating…" : "Generate with AI"}
                  </Button>
                </div>
              </div>
            )}
          </ComponentCard>

          {/* ── Generated copy preview ──────────────────────── */}
          {generatedCopy && (
            <ComponentCard title="Generated Copy — Review & Save">
              <div className="flex flex-col gap-5 text-sm">
                <Field label="Hero Headline" value={generatedCopy.heroHeadline} />
                <Field label="Hero Body" value={generatedCopy.heroBody} />
                <Field label="Body Content" value={generatedCopy.bodyContent} multiline />
                <Field label="Why Us" value={generatedCopy.whyUs} multiline />
                <Field label="CTA Headline" value={generatedCopy.ctaHeadline} />
                <Field label="CTA Body" value={generatedCopy.ctaBody} />
                <Field label="Meta Title" value={generatedCopy.metaTitle} />
                <Field label="Meta Description" value={generatedCopy.metaDescription} />
                {generatedCopy.nearbyAreas && generatedCopy.nearbyAreas.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nearby Areas
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {generatedCopy.nearbyAreas.join(", ")}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving…" : "Publish"}
                  </Button>
                </div>
              </div>
            </ComponentCard>
          )}
        </div>

        {/* ── Right column: existing pages ──────────────────── */}
        <div>
          <ComponentCard title="Existing Location Pages">
            {noWebsite ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a client first.
              </p>
            ) : isLoadingServices ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : existingPages.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No location pages yet. Create one using the form.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {existingPages.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800 dark:text-gray-100 text-sm">
                        {p.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        /{p.slug}
                      </p>
                      <span
                        className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded ${
                          p.is_published
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                        }`}
                      >
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <button
                      className="shrink-0 text-red-500 hover:text-red-700 text-xs underline"
                      onClick={() => handleDeletePage(p.id, p.slug)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small display helper
// ---------------------------------------------------------------------------
function Field({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {multiline ? (
        <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 font-sans">
          {value}
        </pre>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">{value}</p>
      )}
    </div>
  );
}
