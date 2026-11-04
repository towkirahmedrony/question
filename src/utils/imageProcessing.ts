import { MAX_IMAGE_BYTES } from './imageValidation.ts';

/**
 * Canvas helpers for mobile photos.
 *
 * Native Camera results are decoded through their WebView `webPath` with an
 * <img> element. Using the WebView loader avoids CapacitorHttp intercepting a
 * local file URL, and the browser applies EXIF orientation while decoding.
 */

const drawImageToJpeg = async (
  image: HTMLImageElement,
  label: string,
  maxEdge: number,
  quality: number
): Promise<Blob> => {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser could not prepare the image.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), 'image/jpeg', quality)
  );

  if (!blob) throw new Error(`"${label}" could not be converted to JPEG.`);
  return blob;
};

const loadImageFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be decoded as an image.`));
    };
    image.src = url;
  });

const loadImageUrl = (src: string, label: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`"${label}" could not be read.`));
    image.src = src;
  });

/** Renders an image file to a downscaled white-backed JPEG. */
export const renderImageToJpeg = async (
  file: File,
  maxEdge = 1800,
  quality = 0.85
): Promise<Blob> => {
  const image = await loadImageFile(file);
  return drawImageToJpeg(image, file.name, maxEdge, quality);
};

/** Turns a WebView-served native photo URL into an extractable JPEG File. */
export const renderImageUrlToJpegFile = async (
  url: string,
  name: string,
  maxEdge = 1800,
  quality = 0.85
): Promise<File> => {
  const image = await loadImageUrl(url, name);
  const blob = await drawImageToJpeg(image, name, maxEdge, quality);
  const baseName = name.replace(/\.[^.]+$/, '') || 'image';

  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
};

/**
 * Shrinks an oversized photo to a JPEG under the extraction limit.
 * Small files are returned untouched so format and quality are preserved.
 */
export const compressImageFile = async (file: File, maxEdge = 1800): Promise<File> => {
  if (file.size <= MAX_IMAGE_BYTES) return file;

  const blob = await renderImageToJpeg(file, maxEdge);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';

  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
};
