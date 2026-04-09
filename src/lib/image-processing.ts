import { imageCompressor } from "@mbs-dev/react-image-compressor";
import * as piexifjs from "piexifjs";

export interface CompressOptions {
	/** Target file size in bytes before EXIF overhead. Default: 450 KB (500 KB minus 50 KB EXIF). */
	targetBytes?: number;
	/** Starting quality 0–1. Default: 0.8 */
	startQuality?: number;
	/** Minimum quality floor. Default: 0.1 */
	minQuality?: number;
}

const DEFAULT_TARGET = 500 * 1024;
const EXIF_OVERHEAD = 50 * 1024;

/**
 * Convert any image File to JPEG. No-ops if the file is already JPEG.
 */
export const convertToJpeg = (file: File): Promise<File> => {
	return new Promise((resolve, reject) => {
		if (file.type === "image/jpeg" || file.type === "image/jpg") {
			resolve(file);
			return;
		}

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const img = document.createElement("img");

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Failed to convert image to JPEG"));
						return;
					}
					resolve(
						new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
							type: "image/jpeg",
						}),
					);
				},
				"image/jpeg",
				0.9,
			);
		};

		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = URL.createObjectURL(file);
	});
};

/**
 * Inject GPS EXIF data into a JPEG file. Converts to JPEG first if needed.
 */
export const addGeolocationExif = async (
	file: File,
	latitude: number,
	longitude: number,
): Promise<File> => {
	const jpegFile = await convertToJpeg(file);

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const arrayBuffer = reader.result as ArrayBuffer;
				const uint8Array = new Uint8Array(arrayBuffer);
				let binary = "";
				const chunkSize = 8192;

				for (let i = 0; i < uint8Array.length; i += chunkSize) {
					const chunk = uint8Array.subarray(i, i + chunkSize);
					binary += String.fromCharCode.apply(null, Array.from(chunk));
				}

				const base64 = btoa(binary);
				const dataUrl = `data:image/jpeg;base64,${base64}`;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const gpsIfd: Record<number | string, any> = {};
				gpsIfd[piexifjs.GPSIFD.GPSLatitude] =
					piexifjs.GPSHelper.degToDmsRational(Math.abs(latitude));
				gpsIfd[piexifjs.GPSIFD.GPSLatitudeRef] = latitude >= 0 ? "N" : "S";
				gpsIfd[piexifjs.GPSIFD.GPSLongitude] =
					piexifjs.GPSHelper.degToDmsRational(Math.abs(longitude));
				gpsIfd[piexifjs.GPSIFD.GPSLongitudeRef] = longitude >= 0 ? "E" : "W";

				const exifDict = {
					GPS: gpsIfd,
					"0th": {},
					Exif: {},
					"1st": {},
					thumbnail: undefined,
				};

				const exifBytes = piexifjs.dump(exifDict);
				const newDataUrl = piexifjs.insert(exifBytes, dataUrl);

				fetch(newDataUrl)
					.then((res) => res.blob())
					.then((blob) =>
						resolve(new File([blob], jpegFile.name, { type: "image/jpeg" })),
					)
					.catch((error) => reject(error));
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(jpegFile);
	});
};

/**
 * Progressively compress an image to fit under `targetBytes`.
 * Returns the original file if compression fails entirely.
 */
export const compressImage = async (
	file: File,
	options: CompressOptions = {},
): Promise<File> => {
	const {
		targetBytes = DEFAULT_TARGET,
		startQuality = 0.8,
		minQuality = 0.1,
	} = options;

	const compressionTarget = targetBytes - EXIF_OVERHEAD;

	let quality = startQuality;
	let compressed = (await imageCompressor(file, quality)) as File | null;

	if (!compressed) {
		return file;
	}

	if (compressed.size <= compressionTarget) {
		return compressed;
	}

	while (compressed.size > compressionTarget && quality > minQuality) {
		const sizeRatio = compressed.size / compressionTarget;
		const qualityStep = sizeRatio > 2 ? 0.2 : 0.1;

		quality = Math.max(minQuality, quality - qualityStep);
		const next = (await imageCompressor(file, quality)) as File | null;
		if (!next) {
			break;
		}
		compressed = next;
	}

	return compressed;
};
