"use client";
import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import Image from "next/image";
import ComponentCard from "../../common/ComponentCard";
import FileInput from "../input/FileInput";
import Label from "../Label";
import { useS3Upload } from "@/hooks/useS3Upload";
import Input from "../input/InputField";
import { compressImage, addGeolocationExif } from "@/lib/image-processing";
import { mutateUpdate } from "../../../hooks/useMutateUpdate";

interface ImageData {
  id: number;
  label: string;
  altText?: string;
  caption?: string;
  original?: File;
  compressed?: File;
  withExif?: File;
  uploadedUrl?: string;
  uploading: boolean;
}

export interface MultipleFileInputRef {
  handleSaveImages: () => Promise<void>;
}

type UploadScope = 'asset' | 'page' | 'branding';

interface MultipleFileInputProps {
  imageUploadLocation: { table: string; id: number };
  resetTrigger?: number;
  idFieldName?: string;
  uploadScope?: UploadScope;
  websiteId?: number;
}

export default forwardRef<MultipleFileInputRef, MultipleFileInputProps>(function MultipleFileInputExample({
  imageUploadLocation,
  resetTrigger,
  idFieldName = 'page_id',
  uploadScope,
  websiteId,
}, ref) {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: ''
  });

  const [images, setImages] = useState<ImageData[]>([
    { id: 1, label: "Image 1", altText: "", caption: "", uploading: false },
    { id: 2, label: "Image 2", altText: "", caption: "", uploading: false },
    { id: 3, label: "Image 3", altText: "", caption: "", uploading: false },
    { id: 4, label: "Image 4", altText: "", caption: "", uploading: false },
    { id: 5, label: "Image 5", altText: "", caption: "", uploading: false },
    { id: 6, label: "Image 6", altText: "", caption: "", uploading: false },
  ]);

  const { uploadToS3 } = useS3Upload();

  const handleSaveImages = useCallback(async () => {
    if (!imageUploadLocation.id) {
      console.error('No upload context ID provided for image association');
      return;
    }

    const uploadedImages = images.filter(img => img.uploadedUrl);
    
    if (uploadedImages.length === 0) {
      return;
    }

    const imagePayload = uploadedImages.map(img => ({
      url: img.uploadedUrl,
      alt_text: img.altText || null,
      caption: img.caption || null,
    }));

    try {
      // Step 1: Create image entries
      const imageResponse = await mutateUpdate({
        path: "/image",
        method: "POST",
        payload: imagePayload,
        additionalHeaders: {
          Prefer: "return=representation",
        },
      });
      
      if (imageResponse.error) {
        throw new Error(`Failed to create images: ${imageResponse.error}`);
      }
      
      // Step 2: Create page_image relationships
      if (imageResponse.response && Array.isArray(imageResponse.response)) {
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
          throw new Error(`Failed to create page-image relationships: ${relationshipResponse.error}`);
        }

        if (idFieldName === 'page_id' && websiteId) {
          // Also index page-uploaded images into the client Asset Library so they are discoverable in Assets.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const assetPayload = imageResponse.response.map((img: any) => ({
            website_id: websiteId,
            image_id: img.id,
          }));

          const assetResponse = await mutateUpdate({
            path: '/asset',
            method: 'POST',
            payload: assetPayload,
          });

          if (assetResponse.error) {
            console.warn('Failed to index uploaded page images into assets:', assetResponse.error);
          }
        }
      } else {
        throw new Error('Invalid response format from image creation');
      }
    } catch (error) {
      console.error('Image save operation failed:', error);
      throw error;
    }
  }, [images, imageUploadLocation, idFieldName, websiteId]);

  useImperativeHandle(ref, () => ({
    handleSaveImages
  }), [handleSaveImages]);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = async (imageId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!imageUploadLocation.id) {
      console.error('Cannot upload image: no selected website/page context.');
      return;
    }

    // Update uploading state
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, uploading: true, original: file } : img
    ));

    try {
      // Compress the image
      const compressed = await compressImage(file);

      // Add geolocation EXIF data
      const latitude = formData.latitude ? parseFloat(formData.latitude) : 34.0522; // Default to LA
      const longitude = formData.longitude ? parseFloat(formData.longitude) : -118.2437; // Default to LA
      const fileWithGeo = await addGeolocationExif(compressed, latitude, longitude);

      // Include upload context so API route can generate deterministic S3 keys.
      const searchParams = new URLSearchParams();
      if (uploadScope && imageUploadLocation.id > 0) {
        searchParams.set('scope', uploadScope);
      }

      if (idFieldName === 'website_id' && imageUploadLocation.id > 0) {
        if (!searchParams.has('scope')) {
          searchParams.set('scope', 'asset');
        }
        searchParams.set('websiteId', String(imageUploadLocation.id));
      } else if (idFieldName === 'page_id' && imageUploadLocation.id > 0) {
        if (!searchParams.has('scope')) {
          searchParams.set('scope', 'page');
        }
        searchParams.set('pageId', String(imageUploadLocation.id));
      }

      const endpointUrl = searchParams.toString()
        ? `/api/s3-upload?${searchParams.toString()}`
        : '/api/s3-upload';

      // Upload to S3
      const { url } = await uploadToS3(fileWithGeo, {
        endpoint: {
          request: {
            url: endpointUrl,
          },
        },
      });

      // Update image data
      setImages(prev => prev.map(img =>
        img.id === imageId ? {
          ...img,
          compressed,
          withExif: fileWithGeo,
          uploadedUrl: url,
          uploading: false
        } : img
      ));
    } catch (error) {
      console.error(`Error processing image ${imageId}:`, error);
      // Reset uploading state on error
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, uploading: false } : img
      ));
    }
  };

  useEffect(() => {
    if (resetTrigger) {
      // Reset all state when resetTrigger changes
      setFormData({
        latitude: '',
        longitude: ''
      });
      setImages([
        { id: 1, label: "Image 1", uploading: false },
        { id: 2, label: "Image 2", uploading: false },
        { id: 3, label: "Image 3", uploading: false },
        { id: 4, label: "Image 4", uploading: false },
        { id: 5, label: "Image 5", uploading: false },
        { id: 6, label: "Image 6", uploading: false },
      ]);
    }
  }, [resetTrigger]);

  const handleImageInfoChange = (field: string, value: string, index: number) => {
    setImages(prev => prev.map((img, i) => {
      if (i === index) {
        return { ...img, [field]: value };
      }
      return img;
    }));
  };

  return (
    <ComponentCard title="Multiple Image Upload">
      <div className="space-y-6">
        {/* GPS Coordinates Input */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          <div>
            <Label>Latitude</Label>
            <Input
              type="text"
              name="latitude"
              placeholder="ex. 34.0522"
              value={formData.latitude}
              onChange={(e) => handleInputChange("latitude", e.target.value)}
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input
              type="text"
              name="longitude"
              placeholder="ex. -118.2437"
              value={formData.longitude}
              onChange={(e) => handleInputChange("longitude", e.target.value)}
            />
          </div>
        </div>

        {/* Image Upload Sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {images.map((image, index) => (
            <div key={image.id} className="border rounded-lg p-4 space-y-3">
              <div>
                <div>
                  <Label>Alt-Text</Label>
                  <Input
                    type="text"
                    name="altText"
                    placeholder="ex. Beautiful sunset"
                    value={images[index].altText || ""}
                    onChange={(e) => handleImageInfoChange("altText", e.target.value, index)}
                  />
                </div>
                <div>
                  <Label>Caption</Label>
                  <Input
                    type="text"
                    name="caption"
                    placeholder="ex. A beautiful sunset"
                    value={images[index].caption || ""}
                    onChange={(e) => handleImageInfoChange("caption", e.target.value, index)}
                  />
                </div>
              </div>
              <FileInput
                onChange={(e) => handleFileChange(image.id, e)}
                className="custom-class"
              />

              {image.uploading && <p className="text-blue-500">Processing and uploading...</p>}

              {image.original && (
                <p className="text-sm">Original: {image.original.name} ({(image.original.size / 1024).toFixed(2)} KB)</p>
              )}

              {image.compressed && (
                <p className="text-sm">Compressed: ({(image.compressed.size / 1024).toFixed(2)} KB)</p>
              )}

              {image.withExif && (
                <p className="text-sm">With EXIF: ({(image.withExif.size / 1024).toFixed(2)} KB)</p>
              )}

              {image.uploadedUrl && (
                <div>
                  <p className="text-green-500 text-sm">✅ Uploaded successfully!</p>
                  <Image
                    src={image.uploadedUrl}
                    alt={`Uploaded ${image.label}`}
                    width={150}
                    height={150}
                    style={{ maxWidth: '150px', height: 'auto', borderRadius: '8px' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ComponentCard>
  );
});
