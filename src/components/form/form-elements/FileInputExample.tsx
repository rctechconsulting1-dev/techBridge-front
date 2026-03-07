"use client";
import React, { useState } from "react";
import Image from "next/image";
import ComponentCard from "../../common/ComponentCard";
import FileInput from "../input/FileInput";
import Label from "../Label";
import { imageCompressor } from '@mbs-dev/react-image-compressor';
import * as piexifjs from 'piexifjs';
import { useS3Upload } from "next-s3-upload";
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

  // Function to convert image to JPEG if needed
  const convertToJpeg = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement("img");

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const jpegFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg'
            });
            resolve(jpegFile);
          } else {
            reject(new Error('Failed to convert image to JPEG'));
          }
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Function to add EXIF geolocation data
  const addGeolocationExif = async (file: File, latitude: number, longitude: number): Promise<File> => {
    // First, ensure the file is JPEG
    const jpegFile = await convertToJpeg(file);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          
          // Convert ArrayBuffer to base64 more efficiently
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192; // Process in chunks to avoid stack overflow
          
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          
          const base64 = btoa(binary);
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          
          // Create EXIF data with GPS coordinates
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gpsIfd: Record<number | string, any> = {};
          gpsIfd[piexifjs.GPSIFD.GPSLatitude] = piexifjs.GPSHelper.degToDmsRational(Math.abs(latitude));
          gpsIfd[piexifjs.GPSIFD.GPSLatitudeRef] = latitude >= 0 ? 'N' : 'S';
          gpsIfd[piexifjs.GPSIFD.GPSLongitude] = piexifjs.GPSHelper.degToDmsRational(Math.abs(longitude));
          gpsIfd[piexifjs.GPSIFD.GPSLongitudeRef] = longitude >= 0 ? 'E' : 'W';
          
          const exifDict = {
            'GPS': gpsIfd,
            '0th': {},
            'Exif': {},
            '1st': {},
            'thumbnail': undefined
          };
          
          const exifBytes = piexifjs.dump(exifDict);
          const newDataUrl = piexifjs.insert(exifBytes, dataUrl);
          
          // Convert back to File
          fetch(newDataUrl)
            .then(res => res.blob())
            .then(blob => {
              const newFile = new File([blob], jpegFile.name, { type: 'image/jpeg' });
              resolve(newFile);
            })
            .catch(error => reject(error));
        } catch (error) {
          console.error('Error in addGeolocationExif:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(jpegFile);
    });
  };

  // Function to compress image progressively until under 1MB (accounting for EXIF overhead)
  const compressImageUnder1MB = async (file: File): Promise<File> => {
    const targetSize = 100 * 1024; // 100KB in bytes
    const exifOverhead = 50 * 1024; // Reserve ~50KB for EXIF data
    const compressionTarget = targetSize - exifOverhead; // Target smaller size to account for EXIF
    
  let quality = 0.8;
  let compressed: File = await imageCompressor(file, quality) as File;
  
  // If already under target, return as is
  if (compressed.size <= compressionTarget) {
    return compressed;
  }
  
  // Progressive compression with more aggressive steps for large files
  while (compressed.size > compressionTarget && quality > 0.1) {
    // Use larger quality steps for files significantly over target
    const sizeRatio = compressed.size / compressionTarget;
    const qualityStep = sizeRatio > 2 ? 0.2 : 0.1;
    
    quality = Math.max(0.1, quality - qualityStep);
    compressed = await imageCompressor(file, quality) as File;
  }
  
  return compressed;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setUploading(true);
      
      try {
        // Compress the image to under 1MB
        const compressed = await compressImageUnder1MB(file);
        setCompressedFile(compressed);
        
        // Add geolocation EXIF data (example coordinates: Los Angeles)
        const latitude = formData.latitude ? parseFloat(formData.latitude) : 34.0522; // Default to LA if not provided
        const longitude = formData.longitude ? parseFloat(formData.longitude) : -118.2437; // Default to LA if not provided
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
