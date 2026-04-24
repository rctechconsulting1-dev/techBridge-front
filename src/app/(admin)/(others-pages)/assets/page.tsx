"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import ComponentCard from "../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Button from "../../../../components/ui/button/Button";
import { useSidebar } from "../../../../context/SidebarContext";
import BulkAssetUploader, { BulkAssetUploaderRef } from "../../../../components/form/form-elements/BulkAssetUploader";
import { useGetAssets } from "../../../../hooks/useImage";
import { mutateUpdate } from "../../../../hooks/useMutateUpdate";
import Image from "next/image";
import type { IntakeStoredSubmission } from "@/lib/intake-types";
import { buildLatestIntakeAdminPath } from "@/lib/intake-admin";


export default function AssetsPage() {
    const { selectedClient } = useSidebar();
    const [isNewAsset, setIsNewAsset] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
    const [assetDrafts, setAssetDrafts] = useState<Record<number, { altText: string; title: string }>>({});
    const [assetSavingId, setAssetSavingId] = useState<number | null>(null);
    const [assetMessage, setAssetMessage] = useState<string | null>(null);
    const [intakeSyncing, setIntakeSyncing] = useState(false);
    const [latestIntakeSubmission, setLatestIntakeSubmission] = useState<IntakeStoredSubmission | null>(null);
    const [latestIntakeLoading, setLatestIntakeLoading] = useState(false);
    const [latestIntakeError, setLatestIntakeError] = useState<string | null>(null);
    const fileInputRef = useRef<BulkAssetUploaderRef>(null);
    const syncedWebsiteIdsRef = useRef<Record<number, boolean>>({});

    //SWR
    const { assets, isLoading, error, refetchAssets } = useGetAssets(selectedClient?.website_id || null);

    const imageUploadLocation = {
        table: "/asset",
        id: selectedClient?.website_id || 0,
    };

    const hasSelectedClient = Boolean(selectedClient?.website_id);

    useEffect(() => {
        // Switching clients while editing/uploading can accidentally attach images to the wrong website.
        // Reset the upload form and close it whenever website context changes.
        setIsNewAsset(false);
        setResetTrigger((prev) => prev + 1);
        setSaveError(null);
        setEditingAssetId(null);
        setAssetDrafts({});
        setAssetMessage(null);
    }, [selectedClient?.website_id]);

    useEffect(() => {
        const websiteId = selectedClient?.website_id;
        const tenantId = selectedClient?.tenant_id || selectedClient?.id;
        const requestPath = buildLatestIntakeAdminPath({ websiteId, tenantId });

        if (!requestPath) {
            setLatestIntakeSubmission(null);
            setLatestIntakeError(null);
            return;
        }

        const loadLatestIntake = async () => {
            setLatestIntakeLoading(true);
            setLatestIntakeError(null);

            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
                const response = await fetch(requestPath, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    cache: "no-store",
                });

                if (response.status === 404) {
                    setLatestIntakeSubmission(null);
                    return;
                }

                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error ?? `Failed to load intake uploads (${response.status})`);
                }

                const data = (await response.json()) as IntakeStoredSubmission;
                setLatestIntakeSubmission(data);
            } catch (error) {
                setLatestIntakeError(
                    error instanceof Error ? error.message : "Failed to load intake uploads.",
                );
                setLatestIntakeSubmission(null);
            } finally {
                setLatestIntakeLoading(false);
            }
        };

        void loadLatestIntake();
    }, [selectedClient?.id, selectedClient?.tenant_id, selectedClient?.website_id]);

    const handleSave = async () => {
        if (!hasSelectedClient) {
            console.error("No selected client found. Select a client before saving assets.");
            return;
        }

        setSaveError(null);
        try {
            await fileInputRef.current?.handleSaveImages();
            await refetchAssets();
            setIsNewAsset(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save images.";
            setSaveError(message);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // You might want to add a toast notification here
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const getImageMeta = (caption?: string | null, title?: string | null, description?: string | null) => {
        if (title || description) {
            return {
                title: title || "",
                description: description || "",
            };
        }

        if (!caption) {
            return { title: "", description: "" };
        }

        const [legacyTitle, ...legacyDescriptionParts] = caption.split("|");
        return {
            title: legacyTitle?.trim() || "",
            description: legacyDescriptionParts.join("|").trim() || "",
        };
    };

    const intakeFiles = latestIntakeSubmission?.files ?? [];
    const isImageFile = (url: string, filename: string) => {
        const value = `${url} ${filename}`.toLowerCase();
        return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].some((ext) => value.includes(ext));
    };
    const buildCaption = (title: string, description: string) => {
        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();

        if (!trimmedTitle && !trimmedDescription) {
            return null;
        }

        if (!trimmedDescription) {
            return trimmedTitle;
        }

        return `${trimmedTitle}|${trimmedDescription}`;
    };

    const startEditingAsset = (assetId: number, altText: string, title: string) => {
        setAssetDrafts((prev) => ({
            ...prev,
            [assetId]: {
                altText,
                title,
            },
        }));
        setEditingAssetId(assetId);
        setAssetMessage(null);
    };

    const updateAssetDraft = (assetId: number, field: "altText" | "title", value: string) => {
        setAssetDrafts((prev) => ({
            ...prev,
            [assetId]: {
                altText: prev[assetId]?.altText ?? "",
                title: prev[assetId]?.title ?? "",
                [field]: value,
            },
        }));
    };

    const saveAssetMetadata = async (
        assetId: number,
        imageId: number | null,
        description: string,
    ) => {
        if (!imageId) {
            setAssetMessage("This asset is missing an image record, so metadata cannot be updated.");
            return;
        }

        const draft = assetDrafts[assetId] ?? { altText: "", title: "" };

        setAssetSavingId(assetId);
        setAssetMessage(null);

        const result = await mutateUpdate({
            path: `/image/${imageId}`,
            method: "PATCH",
            payload: {
                alt_text: draft.altText.trim() || null,
                caption: buildCaption(draft.title, description),
            },
        });

        if (result.error) {
            setAssetMessage(typeof result.error === "string" ? result.error : "Failed to save asset metadata.");
            setAssetSavingId(null);
            return;
        }

        await refetchAssets();
        setAssetSavingId(null);
        setEditingAssetId(null);
        setAssetMessage("Asset metadata updated.");
    };

    const syncQuestionnaireUploadsToAssets = useCallback(async () => {
        const websiteId = selectedClient?.website_id || null;
        const tenantId = selectedClient?.tenant_id || selectedClient?.id || null;

        if (!websiteId || !latestIntakeSubmission || intakeSyncing || syncedWebsiteIdsRef.current[websiteId]) {
            return;
        }

        setIntakeSyncing(true);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
            const response = await fetch(
                `/api/intake/admin/sync-assets?websiteId=${encodeURIComponent(String(websiteId))}${tenantId ? `&tenantId=${encodeURIComponent(String(tenantId))}` : ""}`,
                {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    cache: "no-store",
                },
            );

            const body = await response.json().catch(() => ({}));

            if (response.status === 404) {
                syncedWebsiteIdsRef.current[websiteId] = true;
                return;
            }

            if (!response.ok) {
                throw new Error(body.error ?? `Failed to index questionnaire uploads (${response.status})`);
            }

            syncedWebsiteIdsRef.current[websiteId] = true;
            if (typeof body.created === "number" && body.created > 0) {
                setAssetMessage(`Indexed ${body.created} questionnaire upload${body.created === 1 ? "" : "s"} into All Assets.`);
                await refetchAssets();
            }
        } catch (error) {
            setAssetMessage(error instanceof Error ? error.message : "Failed to index questionnaire uploads.");
        } finally {
            setIntakeSyncing(false);
        }
    }, [intakeSyncing, latestIntakeSubmission, refetchAssets, selectedClient?.id, selectedClient?.tenant_id, selectedClient?.website_id]);

    useEffect(() => {
        syncedWebsiteIdsRef.current = {};
    }, [selectedClient?.website_id]);

    useEffect(() => {
        void syncQuestionnaireUploadsToAssets();
    }, [syncQuestionnaireUploadsToAssets]);



    return (
        <>
            <PageBreadcrumb pageTitle="Main Forms" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="space-y-6">
                    <ComponentCard title="Upload">
                        <div className="space-y-6">
                            {!hasSelectedClient && (
                                <p className="text-sm text-red-600">
                                    Select a client from the search bar before uploading assets.
                                </p>
                            )}
                            {hasSelectedClient && (
                                <p className="text-sm text-gray-600">
                                    Uploading for: <span className="font-medium">{selectedClient?.name || `Website ${selectedClient?.website_id}`}</span>
                                </p>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => setIsNewAsset(!isNewAsset)}
                                disabled={!hasSelectedClient}
                            >
                                {isNewAsset ? "Cancel" : "Upload New Asset"}
                            </Button>
                        </div>
                        {isNewAsset && (
                            <div>
                                <BulkAssetUploader
                                    ref={fileInputRef}
                                    imageUploadLocation={imageUploadLocation}
                                    resetTrigger={resetTrigger}
                                    idFieldName="website_id"
                                    uploadScope="asset"
                                />
                                {saveError && (
                                    <p className="mt-3 text-sm text-red-600">{saveError}</p>
                                )}
                                <Button onClick={handleSave} className="mt-4" disabled={!hasSelectedClient}>Save</Button>
                            </div>
                        )}
                    </ComponentCard>
                </div>
                <div className="space-y-6">
                    <ComponentCard title="Questionnaire Uploads">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Files uploaded through the website questionnaire appear here even if they have not been indexed into the main asset library yet.
                            </p>
                            {intakeSyncing && <p>Indexing questionnaire uploads into All Assets...</p>}
                            {latestIntakeLoading && <p>Loading questionnaire uploads...</p>}
                            {latestIntakeError && <p>Error loading questionnaire uploads: {latestIntakeError}</p>}
                            {!latestIntakeLoading && !latestIntakeError && intakeFiles.length === 0 && (
                                <p>No questionnaire uploads found.</p>
                            )}
                            {intakeFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                    {intakeFiles.map((file) => (
                                        <div key={`${file.questionId}-${file.url}`} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                            <div className="aspect-square relative bg-gray-50 h-24 w-24">
                                                {isImageFile(file.url, file.filename) ? (
                                                    <Image
                                                        src={file.url}
                                                        alt={file.filename}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-500">
                                                        File
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <p className="text-xs font-medium text-gray-800 truncate">
                                                    {file.filename}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-600 truncate">
                                                    {file.category ?? file.questionId}
                                                </p>
                                                <div className="mt-2 flex items-center gap-1">
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                                    >
                                                        Open
                                                    </a>
                                                    <button
                                                        onClick={() => copyToClipboard(file.url)}
                                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ComponentCard>
                    <ComponentCard title="All Assets">
                        <div className="space-y-6">
                            {assetMessage && <p className="text-sm text-gray-600">{assetMessage}</p>}
                            {isLoading && <p>Loading assets...</p>}
                            {error && <p>Error loading assets: {error.message}</p>}
                            {assets && assets.length === 0 && <p>No assets found.</p>}
                            {assets && assets.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {assets.map((asset) => (
                                        (() => {
                                            const imageMeta = getImageMeta(asset.image?.caption, asset.image?.title, asset.image?.description);
                                            const isEditing = editingAssetId === asset.id;
                                            const draft = assetDrafts[asset.id] ?? {
                                                altText: asset.image?.alt_text || "",
                                                title: imageMeta.title,
                                            };

                                            return (
                                        <div key={asset.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                            <div className="aspect-square relative bg-gray-50 h-24 w-24">
                                                <Image 
                                                    src={asset.image?.url || ""} 
                                                    alt={asset.image?.alt_text || "Asset Image"} 
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="p-2">
                                                <div className="mb-1">
                                                    <p className="text-xs text-gray-600 mb-1">URL:</p>
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-xs text-gray-800 truncate flex-1 bg-gray-50 px-1 py-1 rounded" >
                                                            {asset.image?.url}
                                                        </p>
                                                        <button
                                                            onClick={() => copyToClipboard(asset.image?.url || "")}
                                                            className="px-1 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                </div>
                                                {asset.image?.alt_text && (
                                                    <p className="text-xs text-gray-600 truncate">
                                                        <span className="font-medium">Alt:</span> {asset.image.alt_text}
                                                    </p>
                                                )}
                                                {imageMeta.title && (
                                                    <p className="text-xs text-gray-600 truncate">
                                                        <span className="font-medium">Title:</span> {imageMeta.title}
                                                    </p>
                                                )}
                                                {imageMeta.description && (
                                                    <p className="text-xs text-gray-600 truncate">
                                                        <span className="font-medium">Description:</span> {imageMeta.description}
                                                    </p>
                                                )}
                                                <div className="mt-3 border-t border-gray-100 pt-3">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <div>
                                                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                                                    Title
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={draft.title}
                                                                    onChange={(event) => updateAssetDraft(asset.id, "title", event.target.value)}
                                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                                                    Alt Text
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={draft.altText}
                                                                    onChange={(event) => updateAssetDraft(asset.id, "altText", event.target.value)}
                                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void saveAssetMetadata(asset.id, asset.image?.id ?? null, imageMeta.description)}
                                                                    disabled={assetSavingId === asset.id}
                                                                    className="rounded bg-[#CD7F32] px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    {assetSavingId === asset.id ? "Saving..." : "Save"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingAssetId(null)}
                                                                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingAsset(asset.id, asset.image?.alt_text || "", imageMeta.title)}
                                                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Edit Title / Alt
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                            );
                                        })()
                                    ))}
                                </div>
                            )}
                        </div>
                    </ComponentCard>
                </div>
            </div>
        </>
    )
}