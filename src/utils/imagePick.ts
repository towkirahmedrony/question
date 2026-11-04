export type ImagePickSource = 'camera' | 'gallery';

export type ImagePickFailure = 'cancelled' | 'denied' | 'unavailable' | 'failed';

/**
 * Maps native picker errors to outcomes the UI can explain.
 *
 * Android and the Capacitor Camera plugin report cancellation and permission
 * denial as plain Error messages, so this is intentionally message-based.
 */
export const classifyImagePickError = (error: unknown): ImagePickFailure => {
  const message = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();

  if (/cancel|dismiss/.test(message)) return 'cancelled';
  if (/denied|permission|not authorized|not allowed/.test(message)) return 'denied';
  if (/not implemented|not available|unsupported|not supported/.test(message)) return 'unavailable';
  return 'failed';
};

export const extensionForImageMime = (mimeType: string): string => {
  const mime = mimeType.toLowerCase();

  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
};

/** A stable, readable file name for a native photo. */
export const pickedImageName = (
  source: ImagePickSource,
  index: number,
  mimeType: string,
  now = new Date()
): string => {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
  return `${source}-${stamp}-${index + 1}.${extensionForImageMime(mimeType)}`;
};
