"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useS3Upload } from "@/hooks/useS3Upload";
import Label from "../Label";
import Input from "../input/InputField";
import { compressImage, addGeolocationExif } from "@/lib/image-processing";
import { mutateUpdate } from "../../../hooks/useMutateUpdate";

interface BulkImageData {
  id: number;
  file: File;
  altText: string;
  title: string;
  description: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

type UploadScope = "asset" | "branding";

export interface BulkAssetUploaderRef {
  handleSaveImages: () => Promise<void>;
}

interface BulkAssetUploaderProps {
  imageUploadLocation: { table: string; id: number };
  idFieldName?: string;
  resetTrigger?: number;
  uploadScope?: UploadScope;
}

const buildLegacyCaption = (item: BulkImageData): string | null => {
  const title = item.title.trim();
  const description = item.description.trim();

  if (!title && !description) {
    return null;
  }

  if (!title) {
    return description;
  }

  if (!description) {
    return title;
  }

  return `${title} | ${description}`;
};

const supportsImageTitleDescription =
  process.env.NEXT_PUBLIC_IMAGE_METADATA_V2 === "true";

const MAX_PARALLEL_UPLOADS = 3;
const SINGLE_UPLOAD_TIMEOUT_MS = 120000;

export default forwardRef<BulkAssetUploaderRef, BulkAssetUploaderProps>(
  function BulkAssetUploader(
    {
      imageUploadLocation,
      idFieldName = "website_id",
      resetTrigger,
      uploadScope = "asset",
    },
    ref,
  ) {
    const [images, setImages] = useState<BulkImageData[]>([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [coords, setCoords] = useState({ latitude: "", longitude: "" });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const nextIdRef = useRef(1);

    const { uploadToS3 } = useS3Upload();

    const uploadedCount = useMemo(
      () => images.filter((img) => Boolean(img.uploadedUrl)).length,
      [images],
    );

    const uploadingCount = useMemo(
      () => images.filter((img) => img.uploading).length,
      [images],
    );

    const pendingCount = useMemo(
      () => images.filter((img) => !img.uploadedUrl && !img.uploading).length,
      [images],
    );

    const endpointUrl = useMemo(() => {
      const query = new URLSearchParams();

      query.set("scope", uploadScope);
      if (idFieldName === "website_id") {
        query.set("websiteId", String(imageUploadLocation.id));
      }

      return `/api/s3-upload?${query.toString()}`;
    }, [idFieldName, imageUploadLocation.id, uploadScope]);

    const uploadSingle = async (id: number, file: File) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, uploading: true, error: undefined } : img,
        ),
      );

      try {
        const compressed = await compressImage(file);
        const latitude = coords.latitude ? parseFloat(coords.latitude) : 34.0522;
        const longitude = coords.longitude ? parseFloat(coords.longitude) : -118.2437;
        const withExif = await addGeolocationExif(compressed, latitude, longitude);

        const uploadPromise = uploadToS3(withExif, {
          endpoint: {
            request: { url: endpointUrl },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Upload timed out after 120 seconds"));
          }, SINGLE_UPLOAD_TIMEOUT_MS);
        });

        const { url } = await Promise.race([uploadPromise, timeoutPromise]);

        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  uploading: false,
                  uploadedUrl: url,
                }
              : img,
          ),
        );
      } catch (error) {
        console.error("Failed upload:", error);
        const message = error instanceof Error ? error.message : "Upload failed";
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  uploading: false,
                  error: message,
                }
              : img,
          ),
        );
      }
    };

    const enqueueFiles = async (files: File[]) => {
      if (!imageUploadLocation.id) {
        console.error("Select a client before uploading assets.");
        return;
      }

      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        return;
      }

      setIsProcessingBatch(true);

      const batchItems = imageFiles.map((file) => {
        const id = nextIdRef.current;
        nextIdRef.current += 1;

        return {
          id,
          file,
          altText: "",
          title: file.name.replace(/\.[^/.]+$/, ""),
          description: "",
          uploading: false,
        };
      });

      setImages((prev) => [...prev, ...batchItems]);

      const queue = batchItems.map((item) => ({ id: item.id, file: item.file }));
      const workers = Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, queue.length) }).map(
        async () => {
          while (queue.length > 0) {
            const item = queue.shift();
            if (!item) {
              return;
            }

            await uploadSingle(item.id, item.file);
          }
        },
      );

      await Promise.allSettled(workers);

      setIsProcessingBatch(false);
    };

    const onChooseFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputEl = event.currentTarget;
      const selected = Array.from(event.target.files || []);
      if (selected.length > 0) {
        await enqueueFiles(selected);
      }
      if (inputEl) {
        inputEl.value = "";
      }
    };

    const onDropFiles = async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      const dropped = Array.from(event.dataTransfer.files || []);
      if (dropped.length > 0) {
        await enqueueFiles(dropped);
      }
    };

    const handleSaveImages = useCallback(async () => {
      if (!imageUploadLocation.id) {
        console.error("No upload context ID provided for image association");
        return;
      }

      const uploadedImages = images.filter((img) => img.uploadedUrl);
      if (images.length === 0) {
        throw new Error("No images selected. Add images before saving.");
      }

      if (uploadingCount > 0) {
        throw new Error(`Please wait for uploads to finish. ${uploadingCount} image(s) still uploading.`);
      }

      const failedImages = images.filter((img) => img.error);
      if (failedImages.length > 0) {
        throw new Error(`There are ${failedImages.length} failed image upload(s). Retry or remove them before saving.`);
      }

      if (uploadedImages.length !== images.length) {
        const remaining = images.length - uploadedImages.length;
        throw new Error(`Only ${uploadedImages.length}/${images.length} images are uploaded. ${remaining} image(s) are still pending.`);
      }

      if (uploadedImages.length === 0) {
        return;
      }

      const imagePayload = uploadedImages.map((img) => {
        const basePayload = {
          url: img.uploadedUrl,
          alt_text: img.altText.trim() || null,
          caption: buildLegacyCaption(img),
        };

        if (!supportsImageTitleDescription) {
          return basePayload;
        }

        return {
          ...basePayload,
          title: img.title.trim() || null,
          description: img.description.trim() || null,
          // Keep legacy caption populated during rollout for backward compatibility.
          caption: img.description.trim() || null,
        };
      });

      const imageResponse = await mutateUpdate({
        path: "/image",
        method: "POST",
        payload: imagePayload,
        additionalHeaders: {
          Prefer: "return=representation",
        },
      });

      if (imageResponse.error || !Array.isArray(imageResponse.response)) {
        throw new Error(`Failed to create image rows: ${String(imageResponse.error)}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const relationshipPayload = imageResponse.response.map((img: any) => ({
        [idFieldName]: imageUploadLocation.id,
        image_id: img.id,
      }));

      const relationshipResponse = await mutateUpdate({
        path: imageUploadLocation.table,
        method: "POST",
        payload: relationshipPayload,
      });

      if (relationshipResponse.error) {
        throw new Error(`Failed to create image relationships: ${String(relationshipResponse.error)}`);
      }
    }, [idFieldName, imageUploadLocation.id, imageUploadLocation.table, images, uploadingCount]);

    useImperativeHandle(
      ref,
      () => ({
        handleSaveImages,
      }),
      [handleSaveImages],
    );

    useEffect(() => {
      if (resetTrigger) {
        setImages([]);
        setCoords({ latitude: "", longitude: "" });
        nextIdRef.current = 1;
      }
    }, [resetTrigger]);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          <div>
            <Label>Latitude</Label>
            <Input
              type="text"
              name="latitude"
              placeholder="ex. 34.0522"
              value={coords.latitude}
              onChange={(e) => setCoords((prev) => ({ ...prev, latitude: e.target.value }))}
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input
              type="text"
              name="longitude"
              placeholder="ex. -118.2437"
              value={coords.longitude}
              onChange={(e) => setCoords((prev) => ({ ...prev, longitude: e.target.value }))}
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onChooseFiles}
          className="hidden"
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={onDropFiles}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
          }`}
        >
          <p className="text-sm text-gray-700">Drag and drop images here, or</p>
          <button
            type="button"
            className="mt-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingBatch}
          >
            {isProcessingBatch ? "Uploading..." : "Choose multiple images"}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            S3 uses one upload call per image. Save to database stays batched in two calls.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
          {images.length} selected, {uploadedCount} uploaded, {uploadingCount} uploading, {pendingCount} pending
          <p className="mt-1 text-xs text-gray-500">
            {supportsImageTitleDescription
              ? "Title and Description are stored in separate fields (metadata v2 enabled)."
              : "Title and Description are combined into caption until metadata v2 is enabled."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {images.map((img) => (
            <div key={img.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="lg:col-span-1">
                  <p className="truncate text-xs text-gray-500">{img.file.name}</p>
                  <div className="mt-2 relative h-24 w-full overflow-hidden rounded bg-gray-100">
                    {img.uploadedUrl ? (
                      <Image
                        src={img.uploadedUrl}
                        alt={img.altText || img.file.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-500">
                        {img.uploading ? "Uploading..." : "Pending"}
                      </div>
                    )}
                  </div>
                  {img.error && <p className="mt-1 text-xs text-red-600">{img.error}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    {img.error && (
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        onClick={() => void uploadSingle(img.id, img.file)}
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                      onClick={() =>
                        setImages((prev) => prev.filter((item) => item.id !== img.id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <div>
                    <Label>Alt Text</Label>
                    <Input
                      type="text"
                      name={`alt-${img.id}`}
                      value={img.altText}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((item) =>
                            item.id === img.id ? { ...item, altText: e.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      type="text"
                      name={`title-${img.id}`}
                      value={img.title}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((item) =>
                            item.id === img.id ? { ...item, title: e.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      type="text"
                      name={`desc-${img.id}`}
                      value={img.description}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((item) =>
                            item.id === img.id
                              ? { ...item, description: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {images.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No images selected yet.
            </div>
          )}
        </div>
      </div>
    );
  },
);
