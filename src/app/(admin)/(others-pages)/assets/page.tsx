"use client";
import { useState, useRef, useEffect } from "react";
import ComponentCard from "../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Button from "../../../../components/ui/button/Button";
import { useSidebar } from "../../../../context/SidebarContext";
import BulkAssetUploader, { BulkAssetUploaderRef } from "../../../../components/form/form-elements/BulkAssetUploader";
import { useGetAssets } from "../../../../hooks/useImage";
import Image from "next/image";


export default function AssetsPage() {
    const { selectedClient } = useSidebar();
    const [isNewAsset, setIsNewAsset] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [saveError, setSaveError] = useState<string | null>(null);
    const fileInputRef = useRef<BulkAssetUploaderRef>(null);

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
    }, [selectedClient?.website_id]);

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
                    <ComponentCard title="All Assets">
                        <div className="space-y-6">
                            {isLoading && <p>Loading assets...</p>}
                            {error && <p>Error loading assets: {error.message}</p>}
                            {assets && assets.length === 0 && <p>No assets found.</p>}
                            {assets && assets.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {assets.map((asset) => (
                                        (() => {
                                            const imageMeta = getImageMeta(asset.image?.caption, asset.image?.title, asset.image?.description);

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