import { Camera, MediaTypeSelection, type MediaResult } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { isNativeApp } from './platform';
import { classifyImagePickError, pickedImageName, type ImagePickSource } from '../utils/imagePick';
import { validateImageFile, type ImageValidationReason } from '../utils/imageValidation';
import { compressImageFile, renderImageUrlToJpegFile } from '../utils/imageProcessing';

/**
 * Native camera and gallery selection.
 *
 * The plugin returns native URIs, not File objects. Each result is read through
 * its WebView-served path and wrapped in a File so the existing classification,
 * preview, compression and extraction pipeline stays unchanged.
 */

const MAX_IMAGES_PER_PICK = 12;
const PICK_QUALITY = 85;
const PICK_MAX_EDGE = 1800;
const PICK_JPEG_QUALITY = 0.85;

export interface ImagePickRejection {
  name: string;
  reason: ImageValidationReason | 'read';
}

export type NativeImagePickResult =
  | { status: 'picked'; files: File[]; rejected: ImagePickRejection[] }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'failed'; message: string };

const readFileFromMedia = async (
  media: MediaResult,
  source: ImagePickSource,
  index: number
): Promise<File> => {
  const path = media.webPath ?? (media.uri ? Capacitor.convertFileSrc(media.uri) : '');
  if (!path) throw new Error('The selected photo did not include a readable path.');

  // Native URIs are not browser File objects; the WebView image loader decodes
  // the local path and the canvas turns it into an extractable JPEG File.
  return renderImageUrlToJpegFile(
    path,
    pickedImageName(source, index, 'image/jpeg'),
    PICK_MAX_EDGE,
    PICK_JPEG_QUALITY
  );
};

/** Accepts a native photo, compressing it first when it exceeds the server limit. */
const preparePickedFile = async (
  file: File
): Promise<{ file: File } | { reason: ImageValidationReason }> => {
  let candidate = file;
  const initial = validateImageFile(candidate);

  if ('reason' in initial && initial.reason === 'size') {
    candidate = await compressImageFile(candidate, PICK_MAX_EDGE);
  }

  const finalValidation = validateImageFile(candidate);
  if ('reason' in finalValidation) return { reason: finalValidation.reason };

  return { file: candidate };
};

export const pickNativeImages = async (
  source: ImagePickSource
): Promise<NativeImagePickResult> => {
  if (!isNativeApp()) return { status: 'unavailable' };

  try {
    if (source === 'camera') {
      const permissions = await Camera.checkPermissions();
      if (permissions.camera === 'denied') return { status: 'denied' };
    }

    const media: MediaResult[] =
      source === 'camera'
        ? [
            await Camera.takePhoto({
              quality: PICK_QUALITY,
              correctOrientation: true,
              saveToGallery: false,
            }),
          ]
        : (
            await Camera.chooseFromGallery({
              mediaType: MediaTypeSelection.Photo,
              allowMultipleSelection: true,
              limit: MAX_IMAGES_PER_PICK,
              quality: PICK_QUALITY,
              correctOrientation: true,
            })
          ).results;

    const files: File[] = [];
    const rejected: ImagePickRejection[] = [];

    for (let index = 0; index < media.length; index += 1) {
      let file: File;

      try {
        file = await readFileFromMedia(media[index], source, index);
      } catch {
        rejected.push({ name: `${source} ${index + 1}`, reason: 'read' });
        continue;
      }

      try {
        const prepared = await preparePickedFile(file);
        if ('reason' in prepared) rejected.push({ name: file.name, reason: prepared.reason });
        else files.push(prepared.file);
      } catch {
        rejected.push({ name: file.name, reason: 'read' });
      }
    }

    return { status: 'picked', files, rejected };
  } catch (error) {
    const failure = classifyImagePickError(error);

    if (failure === 'failed') {
      return {
        status: 'failed',
        message: error instanceof Error ? error.message : 'The photo picker failed.',
      };
    }

    return { status: failure };
  }
};
