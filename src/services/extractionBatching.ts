import type { PreparedUnit } from '../types/import';

/**
 * Groups prepared units into extraction requests.
 *
 * One unit per request is wasteful and hits the per-user rate limit on a long
 * PDF. The server accepts several sources per call, so units are packed while
 * staying under the same limits the backend enforces.
 */

export const MAX_BATCH_SOURCES = 8;
export const MAX_BATCH_TEXT_CHARS = 120_000;
export const MAX_BATCH_IMAGE_BYTES = 20 * 1024 * 1024;

export interface ExtractionBatch {
  units: PreparedUnit[];
  label: string;
}

/** Approximate decoded size of an inline base64 image. */
export const estimateBase64Bytes = (data: string): number =>
  Math.ceil((data.length * 3) / 4);

const textChars = (unit: PreparedUnit): number =>
  unit.kind === 'text' ? (unit.text ?? '').length : 0;

const imageBytes = (unit: PreparedUnit): number =>
  unit.kind === 'image' ? estimateBase64Bytes(unit.data ?? '') : 0;

const describe = (units: PreparedUnit[]): string =>
  units.length === 1 ? units[0].name : `${units[0].name} (+${units.length - 1} more)`;

export const buildExtractionBatches = (units: PreparedUnit[]): ExtractionBatch[] => {
  const batches: ExtractionBatch[] = [];
  let current: PreparedUnit[] = [];
  let currentTextChars = 0;
  let currentImageBytes = 0;

  const flush = () => {
    if (current.length === 0) return;

    batches.push({ units: current, label: describe(current) });
    current = [];
    currentTextChars = 0;
    currentImageBytes = 0;
  };

  for (const unit of units) {
    const nextTextChars = currentTextChars + textChars(unit);
    const nextImageBytes = currentImageBytes + imageBytes(unit);

    const exceeds =
      current.length + 1 > MAX_BATCH_SOURCES ||
      nextTextChars > MAX_BATCH_TEXT_CHARS ||
      nextImageBytes > MAX_BATCH_IMAGE_BYTES;

    if (current.length > 0 && exceeds) flush();

    current.push(unit);
    currentTextChars += textChars(unit);
    currentImageBytes += imageBytes(unit);
  }

  flush();
  return batches;
};
