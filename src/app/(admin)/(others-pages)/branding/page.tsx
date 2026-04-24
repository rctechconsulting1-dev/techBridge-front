"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useS3Upload } from "@/hooks/useS3Upload";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { useSidebar } from "@/context/SidebarContext";
import { mutateUpdate } from "@/hooks/useMutateUpdate";
import { useGetAssets } from "@/hooks/useImage";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId } from "@/lib/auth-context";
import { buildLatestIntakeAdminPath } from "@/lib/intake-admin";
import type { IntakeStoredSubmission } from "@/lib/intake-types";

type BrandField = "logo_url" | "favicon_url";
type ExtraBrandField = "small_logo_url" | "large_logo_url";

type BrandingSettings = {
  logo_url: string | null;
  favicon_url: string | null;
};

const defaultSettings: BrandingSettings = {
  logo_url: null,
  favicon_url: null,
};

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const activeTenantId = getActiveTenantId();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantId ? { "x-tenant-id": String(activeTenantId) } : {}),
  };
};

export default function BrandingPage() {
  const { selectedClient } = useSidebar();
  const searchParams = useSearchParams();
  const selectedTenantId =
    Number(selectedClient?.tenant_id || selectedClient?.id || 0) || null;
  const selectedWebsiteId = selectedClient?.website_id ?? null;
  const hasSelectedClient = Boolean(selectedWebsiteId);

  const { uploadToS3 } = useS3Upload();
  const { assets, isLoading: isLoadingAssets, error: assetsError, refetchAssets } = useGetAssets(selectedWebsiteId);

  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isUploadingField, setIsUploadingField] = useState<BrandField | null>(null);
  const [isUploadingExtraField, setIsUploadingExtraField] = useState<ExtraBrandField | null>(null);
  const [extraBrandingUrls, setExtraBrandingUrls] = useState<Record<ExtraBrandField, string | null>>({
    small_logo_url: null,
    large_logo_url: null,
  });
  const [intakeLogoUrl, setIntakeLogoUrl] = useState<string | null>(null);
  const [intakeLogoFilename, setIntakeLogoFilename] = useState<string | null>(null);
  const [latestIntakeSubmission, setLatestIntakeSubmission] =
    useState<IntakeStoredSubmission | null>(null);
  const [intakeLogoLoading, setIntakeLogoLoading] = useState(false);
  const [intakeLogoMessage, setIntakeLogoMessage] = useState<string | null>(null);
  const intakeLogoAppliedRef = useRef(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const smallLogoInputRef = useRef<HTMLInputElement>(null);
  const largeLogoInputRef = useRef<HTMLInputElement>(null);

  const brandingAssets = useMemo(
    () =>
      (assets || []).filter((asset) =>
        asset.image?.url?.includes("/branding/"),
      ),
    [assets],
  );

  const loadBrandingSettings = useCallback(async (websiteId: number) => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setSettings(defaultSettings);
        return;
      }

      const data = await response.json();
      setSettings({
        logo_url: data?.logo_url || null,
        favicon_url: data?.favicon_url || null,
      });
    } catch (error) {
      console.error("Failed to load branding settings:", error);
      setSettings(defaultSettings);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedWebsiteId) {
      setSettings(defaultSettings);
      setExtraBrandingUrls({
        small_logo_url: null,
        large_logo_url: null,
      });
      setIntakeLogoUrl(null);
      setIntakeLogoFilename(null);
      return;
    }

    loadBrandingSettings(selectedWebsiteId);
  }, [selectedWebsiteId, loadBrandingSettings]);

  useEffect(() => {
    const latestByAltText: Record<string, string> = {};

    // Find the latest upload URL for each extra branding slot label.
    [...brandingAssets]
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .forEach((asset) => {
        const label = asset.image?.alt_text || "";
        const url = asset.image?.url || "";

        if (!url) {
          return;
        }

        if (!latestByAltText[label]) {
          latestByAltText[label] = url;
        }
      });

    const nextSmallLogo = latestByAltText["Brand Small Logo"] || null;
    const nextLargeLogo = latestByAltText["Brand Large Logo"] || null;

    setExtraBrandingUrls((prev) => {
      if (
        prev.small_logo_url === nextSmallLogo &&
        prev.large_logo_url === nextLargeLogo
      ) {
        return prev;
      }

      return {
        small_logo_url: nextSmallLogo,
        large_logo_url: nextLargeLogo,
      };
    });
  }, [brandingAssets]);

  const loadLatestIntakeLogo = useCallback(async (websiteId?: number | null) => {
    setIntakeLogoLoading(true);
    setIntakeLogoMessage(null);

    const requestPath = buildLatestIntakeAdminPath({
      websiteId,
      tenantId: selectedTenantId,
    });

    if (!requestPath) {
      setLatestIntakeSubmission(null);
      setIntakeLogoUrl(null);
      setIntakeLogoFilename(null);
      setIntakeLogoLoading(false);
      return;
    }

    try {
      const response = await fetch(requestPath, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (response.status === 404) {
        setLatestIntakeSubmission(null);
        setIntakeLogoUrl(null);
        setIntakeLogoFilename(null);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load intake (${response.status})`);
      }

      const data = (await response.json()) as IntakeStoredSubmission;
      setLatestIntakeSubmission(data);
      const logoFile = data.files.find((file) => file.questionId === "logo");
      setIntakeLogoUrl(logoFile?.url ?? null);
      setIntakeLogoFilename(logoFile?.filename ?? null);
    } catch (error) {
      setLatestIntakeSubmission(null);
      setIntakeLogoMessage(
        error instanceof Error
          ? error.message
          : "Failed to load intake branding assets.",
      );
    } finally {
      setIntakeLogoLoading(false);
    }
  }, [selectedTenantId]);

  const saveBrandField = useCallback(async (field: BrandField, value: string | null) => {
    if (!selectedWebsiteId) {
      return;
    }

    const response = await fetch(`${getApiBaseUrl()}/site-settings/${selectedWebsiteId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ [field]: value }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save ${field}`);
    }
  }, [selectedWebsiteId]);

  const createBrandAssetRecord = useCallback(async (url: string, label: string) => {
    if (!selectedWebsiteId) {
      return;
    }

    const imageResponse = await mutateUpdate({
      path: "/image",
      method: "POST",
      payload: {
        url,
        alt_text: label,
        caption: "branding",
      },
      additionalHeaders: {
        Prefer: "return=representation",
      },
    });

    if (imageResponse.error || !imageResponse.response) {
      throw new Error(`Failed creating branding image: ${String(imageResponse.error)}`);
    }

    const responsePayload = imageResponse.response;
    const imageId = Array.isArray(responsePayload)
      ? responsePayload[0]?.id
      : (responsePayload as { id?: number }).id;

    if (!imageId) {
      throw new Error("Image API did not return an id");
    }

    const assetResponse = await mutateUpdate({
      path: "/asset",
      method: "POST",
      payload: {
        website_id: selectedWebsiteId,
        image_id: imageId,
      },
    });

    if (assetResponse.error) {
      throw new Error(`Failed creating branding asset relation: ${String(assetResponse.error)}`);
    }
  }, [selectedWebsiteId]);

  const handleUploadBrandField = useCallback(async (field: BrandField, file: File) => {
    if (!selectedWebsiteId) {
      console.error("No selected client/website available for branding upload.");
      return;
    }

    setIsUploadingField(field);

    try {
      const endpointUrl = `/api/s3-upload?scope=branding&websiteId=${selectedWebsiteId}`;
      const { url } = await uploadToS3(file, {
        endpoint: {
          request: {
            url: endpointUrl,
          },
        },
      });

      const fieldLabel = field === "logo_url" ? "Brand Logo" : "Brand Favicon";
      await saveBrandField(field, url);
      await createBrandAssetRecord(url, fieldLabel);

      setSettings((prev) => ({
        ...prev,
        [field]: url,
      }));

      await refetchAssets();
    } catch (error) {
      console.error(`Failed uploading ${field}:`, error);
    } finally {
      setIsUploadingField(null);
    }
  }, [createBrandAssetRecord, refetchAssets, saveBrandField, selectedWebsiteId, uploadToS3]);

  const handleRemoveBrandField = useCallback(async (field: BrandField) => {
    try {
      await saveBrandField(field, null);
      setSettings((prev) => ({ ...prev, [field]: null }));
    } catch (error) {
      console.error(`Failed removing ${field}:`, error);
    }
  }, [saveBrandField]);

  const applyIntakeLogo = useCallback(async () => {
    if (!intakeLogoUrl) {
      return;
    }

    if (settings.logo_url === intakeLogoUrl) {
      setIntakeLogoMessage("The intake logo is already set as the current brand logo.");
      return;
    }

    setIsUploadingField("logo_url");
    setIntakeLogoMessage(null);

    try {
      await saveBrandField("logo_url", intakeLogoUrl);
      await createBrandAssetRecord(intakeLogoUrl, "Brand Logo");
      setSettings((prev) => ({ ...prev, logo_url: intakeLogoUrl }));
      await refetchAssets();
      setIntakeLogoMessage("Intake logo applied. Review it below.");
    } catch (error) {
      setIntakeLogoMessage(
        error instanceof Error ? error.message : "Failed to apply intake logo.",
      );
    } finally {
      setIsUploadingField(null);
    }
  }, [createBrandAssetRecord, intakeLogoUrl, refetchAssets, saveBrandField, settings.logo_url]);

  const handleInputChange = (field: BrandField, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void handleUploadBrandField(field, file);
    event.currentTarget.value = "";
  };

  useEffect(() => {
    if (!selectedWebsiteId) {
      return;
    }

    void loadLatestIntakeLogo(selectedWebsiteId);
  }, [loadLatestIntakeLogo, selectedWebsiteId]);

  useEffect(() => {
    const shouldPrefill = searchParams.get("prefillFromIntake") === "1";
    if (
      !shouldPrefill ||
      !intakeLogoUrl ||
      !!settings.logo_url ||
      intakeLogoAppliedRef.current
    ) {
      return;
    }

    intakeLogoAppliedRef.current = true;
    void applyIntakeLogo();
  }, [applyIntakeLogo, intakeLogoUrl, searchParams, settings.logo_url]);

  const handleUploadExtraBrandField = useCallback(async (field: ExtraBrandField, file: File) => {
    if (!selectedWebsiteId) {
      console.error("No selected client/website available for branding upload.");
      return;
    }

    setIsUploadingExtraField(field);

    try {
      const endpointUrl = `/api/s3-upload?scope=branding&websiteId=${selectedWebsiteId}`;
      const { url } = await uploadToS3(file, {
        endpoint: {
          request: {
            url: endpointUrl,
          },
        },
      });

      const label = field === "small_logo_url" ? "Brand Small Logo" : "Brand Large Logo";
      await createBrandAssetRecord(url, label);
      setExtraBrandingUrls((prev) => ({
        ...prev,
        [field]: url,
      }));
      await refetchAssets();
    } catch (error) {
      console.error(`Failed uploading ${field}:`, error);
    } finally {
      setIsUploadingExtraField(null);
    }
  }, [createBrandAssetRecord, refetchAssets, selectedWebsiteId, uploadToS3]);

  const handleExtraInputChange = (field: ExtraBrandField, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void handleUploadExtraBrandField(field, file);
    event.currentTarget.value = "";
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Branding" />

      {!hasSelectedClient && (
        <ComponentCard title="Branding Setup">
          <p className="text-sm text-red-600">
            Select a client from the top search bar first. Branding uploads always attach to the selected client.
          </p>
        </ComponentCard>
      )}

      {hasSelectedClient && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <ComponentCard title="Brand Kit">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Managing branding for <span className="font-medium">{selectedClient?.name || `Website ${selectedWebsiteId}`}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Recommended: logo as SVG/PNG and favicon as square PNG/ICO.
                </p>
              </div>

              {latestIntakeSubmission ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Intake brand direction
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Use these tenant preferences while choosing logos, colors, and visual tone.
                      </p>
                    </div>
                    <Link
                      href="/site-settings?prefillFromIntake=1"
                      className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Open Color Settings
                    </Link>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Color Preference
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                        {typeof latestIntakeSubmission.answers.brand_colors === "string" && latestIntakeSubmission.answers.brand_colors.trim()
                          ? latestIntakeSubmission.answers.brand_colors
                          : "No color preference submitted."}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Brand Words
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                        {typeof latestIntakeSubmission.answers.brand_words === "string" && latestIntakeSubmission.answers.brand_words.trim()
                          ? latestIntakeSubmission.answers.brand_words
                          : "No brand words submitted."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Intake logo
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {intakeLogoLoading
                        ? "Checking latest intake submission..."
                        : intakeLogoUrl
                          ? `Latest upload: ${intakeLogoFilename ?? "logo file"}`
                          : "No logo was uploaded in the latest intake submission."}
                    </p>
                  </div>
                  {intakeLogoUrl ? (
                    <Button
                      variant="outline"
                      onClick={() => void applyIntakeLogo()}
                      disabled={isUploadingField !== null || isLoadingSettings}
                    >
                      Use Intake Logo
                    </Button>
                  ) : null}
                </div>
                {intakeLogoMessage ? (
                  <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                    {intakeLogoMessage}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">Logo</p>
                  <div className="mb-3 flex min-h-24 items-center justify-center rounded bg-gray-50">
                    {settings.logo_url ? (
                      <Image src={settings.logo_url} alt="Brand Logo" width={180} height={72} className="h-auto max-h-20 w-auto" />
                    ) : (
                      <p className="text-xs text-gray-500">No logo uploaded</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleInputChange("logo_url", event)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingField !== null || isLoadingSettings}
                    >
                      {isUploadingField === "logo_url" ? "Uploading..." : settings.logo_url ? "Replace Logo" : "Upload Logo"}
                    </Button>
                    {settings.logo_url && (
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveBrandField("logo_url")}
                        disabled={isUploadingField !== null || isLoadingSettings}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">Favicon</p>
                  <div className="mb-3 flex min-h-24 items-center justify-center rounded bg-gray-50">
                    {settings.favicon_url ? (
                      <Image src={settings.favicon_url} alt="Favicon" width={48} height={48} className="h-12 w-12 rounded" />
                    ) : (
                      <p className="text-xs text-gray-500">No favicon uploaded</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleInputChange("favicon_url", event)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={isUploadingField !== null || isLoadingSettings}
                    >
                      {isUploadingField === "favicon_url" ? "Uploading..." : settings.favicon_url ? "Replace Favicon" : "Upload Favicon"}
                    </Button>
                    {settings.favicon_url && (
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveBrandField("favicon_url")}
                        disabled={isUploadingField !== null || isLoadingSettings}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard title="Additional Logo Slots">
              <div className="mt-1 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">Small Logo</p>
                  <div className="mb-3 flex min-h-24 items-center justify-center rounded bg-gray-50">
                    {extraBrandingUrls.small_logo_url ? (
                      <Image
                        src={extraBrandingUrls.small_logo_url}
                        alt="Small Logo"
                        width={120}
                        height={60}
                        className="h-auto max-h-16 w-auto"
                      />
                    ) : (
                      <p className="text-xs text-gray-500">No small logo uploaded</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={smallLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleExtraInputChange("small_logo_url", event)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => smallLogoInputRef.current?.click()}
                      disabled={isUploadingExtraField !== null}
                    >
                      {isUploadingExtraField === "small_logo_url"
                        ? "Uploading..."
                        : extraBrandingUrls.small_logo_url
                          ? "Replace Small Logo"
                          : "Upload Small Logo"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">Large Logo</p>
                  <div className="mb-3 flex min-h-24 items-center justify-center rounded bg-gray-50">
                    {extraBrandingUrls.large_logo_url ? (
                      <Image
                        src={extraBrandingUrls.large_logo_url}
                        alt="Large Logo"
                        width={200}
                        height={80}
                        className="h-auto max-h-20 w-auto"
                      />
                    ) : (
                      <p className="text-xs text-gray-500">No large logo uploaded</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={largeLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleExtraInputChange("large_logo_url", event)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => largeLogoInputRef.current?.click()}
                      disabled={isUploadingExtraField !== null}
                    >
                      {isUploadingExtraField === "large_logo_url"
                        ? "Uploading..."
                        : extraBrandingUrls.large_logo_url
                          ? "Replace Large Logo"
                          : "Upload Large Logo"}
                    </Button>
                  </div>
                </div>
              </div>
            </ComponentCard>
          </div>

          <div className="space-y-6">
            <ComponentCard title="Branding Library">
              <div className="space-y-4">
                {isLoadingAssets && <p>Loading branding assets...</p>}
                {assetsError && <p>Error loading assets: {assetsError.message}</p>}
                {!isLoadingAssets && brandingAssets.length === 0 && (
                  <p>No branding assets found for this client yet.</p>
                )}

                {brandingAssets.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {brandingAssets.map((asset) => (
                      <div key={asset.id} className="overflow-hidden rounded border border-gray-200 bg-white">
                        <div className="relative h-24 w-full bg-gray-50">
                          <Image
                            src={asset.image?.url || ""}
                            alt={asset.image?.alt_text || "Branding Asset"}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs text-gray-600">{asset.image?.url}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ComponentCard>
          </div>
        </div>
      )}
    </>
  );
}
