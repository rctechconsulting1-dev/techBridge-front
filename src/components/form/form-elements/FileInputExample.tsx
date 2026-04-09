"use client";
import React, { useState } from "react";
import Image from "next/image";
import ComponentCard from "../../common/ComponentCard";
import FileInput from "../input/FileInput";
import Label from "../Label";
import { compressImage, addGeolocationExif } from "@/lib/image-processing";
import { useS3Upload } from "@/hooks/useS3Upload";
import Input from "../input/InputField";


export default function FileInputExample() {
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [compressedFile, setCompressedFile] = useState<File | undefined>();
  const [fileWithExif, setFileWithExif] = useState<File | undefined>();
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { uploadToS3 } = useS3Upload();
    const [formData, setFormData] = useState({
    latitude: '',
    longitude: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setUploading(true);
      
      try {
        // Compress the image to under target size
        const compressed = await compressImage(file, { targetBytes: 100 * 1024 });
        setCompressedFile(compressed);
        
        // Add geolocation EXIF data
        const latitude = formData.latitude ? parseFloat(formData.latitude) : 34.0522;
        const longitude = formData.longitude ? parseFloat(formData.longitude) : -118.2437;
        const fileWithGeo = await addGeolocationExif(compressed, latitude, longitude);
        setFileWithExif(fileWithGeo);
        
        // Upload to S3
        const { url } = await uploadToS3(fileWithGeo);

        setUploadedUrl(url);
      } catch (error) {
        console.error("Error processing image:", error);
      } finally {
        setUploading(false);
      }
    }
  };



  return (
    <ComponentCard title="File Input">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
            <div>
              <Label>Latitude</Label>
              <Input
                type="text"
                name="latitude"
                placeholder="ex. 40.7128"
                required={true}
                value={formData.latitude}
                onChange={(e) => handleInputChange("latitude", e.target.value)}
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                type="text"
                name="longitude"
                placeholder="ex. -74.0060"
                required={true}
                value={formData.longitude}
                onChange={(e) => handleInputChange("longitude", e.target.value)}
              />
            </div>
          </div>
      <div>
        <Label>Upload file</Label>
        <FileInput onChange={handleFileChange} className="custom-class"/>
        {uploading && <p>Processing and uploading...</p>}
        {imageFile && <p>Original file: {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)</p>}
        {compressedFile && <p>Compressed file: {compressedFile.name} ({(compressedFile.size / 1024).toFixed(2)} KB)</p>}
        {fileWithExif && <p>File with EXIF: {fileWithExif.name} ({(fileWithExif.size / 1024).toFixed(2)} KB)</p>}
        {uploadedUrl && (
          <div>
            <p>✅ Uploaded successfully!</p>
            <Image
              src={uploadedUrl}
              alt="Uploaded"
              width={200}
              height={200}
              style={{ maxWidth: '200px', marginTop: '10px', height: 'auto' }}
            />
          </div>
        )}
      </div>
    </ComponentCard>
  );
}
