/**
 * Client-side image limits for the single-image extraction flow.
 *
 * Mirrors the backend's `ai.extract` limits so an invalid photo is rejected
 * before it is read and sent, while the server stays the authority.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export const ACCEPTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ImageValidationReason = 'type' | 'size' | 'empty';

export interface ImageFileLike {
  name: string;
  type: string;
  size: number;
}

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; reason: ImageValidationReason };

/** Normalises the legacy `image/jpg` alias to the canonical JPEG type. */
export const normalizeImageMimeType = (mimeType: string): string =>
  mimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimeType.toLowerCase();

export const validateImageFile = (file: ImageFileLike): ImageValidationResult => {
  const mimeType = normalizeImageMimeType(file.type || '');

  if (!(ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, reason: 'type' };
  }

  if (file.size <= 0) return { ok: false, reason: 'empty' };

  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: 'size' };

  return { ok: true };
};
