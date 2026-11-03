import type { PreparedUnit } from '../types/import';
import { ApiError, apiRequest } from './apiClient';
import { buildExtractionBatches } from './extractionBatching';
import { chunkText, mergePlainTextParts } from './sourceProcessing';

/**
 * Backend AI extraction for the Question Importer.
 *
 * Every prepared unit (a text chunk or a page image) is sent to
 * `POST /ai/extract-questions` with the caller's Supabase bearer token. The
 * provider key stays on the server; this module only receives the Structured
 * Plain Text document.
 */

const REQUEST_TIMEOUT_MS = 120_000;
const RETRY_DELAY_MS = 1_200;

interface ExtractionSourceDto {
  source_id: string;
  file_name: string;
  kind: 'text' | 'image';
  text?: string;
  mime_type?: string;
  data?: string;
}

interface ExtractionResponseDto {
  model?: string;
  plain_text?: string;
  question_count?: number;
  sources?: Array<{ source_id: string; file_name: string; status: 'extracted' | 'empty' }>;
  warnings?: string[];
}

export interface ExtractionFailure {
  sourceId: string;
  name: string;
  error: string;
}

export interface ExtractionRunResult {
  plainText: string;
  warnings: string[];
  failures: ExtractionFailure[];
  /** True when the caller cancelled; everything collected so far is kept. */
  cancelled: boolean;
}

export interface ExtractionRunOptions {
  onProgress?: (progress: { current: number; total: number; label: string }) => void;
  signal?: AbortSignal;
}

interface ExtractionJob extends PreparedUnit {
  sourceName: string;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const toDto = (unit: PreparedUnit): ExtractionSourceDto =>
  unit.kind === 'text'
    ? {
        source_id: unit.id,
        file_name: unit.name,
        kind: 'text',
        text: unit.text ?? '',
      }
    : {
        source_id: unit.id,
        file_name: unit.name,
        kind: 'image',
        mime_type: unit.mime_type ?? 'image/jpeg',
        data: unit.data ?? '',
      };

/** 429 and 5xx are worth one retry; auth and validation failures are not. */
const isRetryable = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 429 || error.status >= 500);

const isRateLimited = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 429;

const requestExtraction = async (
  units: PreparedUnit[],
  signal?: AbortSignal
): Promise<ExtractionResponseDto> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await apiRequest<ExtractionResponseDto>('/ai/extract-questions', {
        method: 'POST',
        timeoutMs: REQUEST_TIMEOUT_MS,
        signal,
        body: { sources: units.map(toDto) },
      });
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || signal?.aborted) throw error;
      await delay(RETRY_DELAY_MS);
    }
  }

  throw lastError;
};

/**
 * Builds one job per unit. Text is chunked so a large TXT/PDF never exceeds the
 * model budget; images keep one page per unit.
 */
const buildJobs = (units: PreparedUnit[]): ExtractionJob[] => {
  const jobs: ExtractionJob[] = [];

  for (const unit of units) {
    if (unit.kind === 'image') {
      jobs.push({ ...unit, sourceName: unit.name });
      continue;
    }

    const chunks = chunkText(unit.text ?? '');
    chunks.forEach((chunk, index) => {
      jobs.push({
        ...unit,
        id: chunks.length > 1 ? `${unit.id}_part_${index + 1}` : unit.id,
        name:
          chunks.length > 1
            ? `${unit.name} (part ${index + 1}/${chunks.length})`
            : unit.name,
        text: chunk,
        sourceName: unit.name,
      });
    });
  }

  return jobs;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'This source could not be extracted.';

/**
 * Runs every prepared unit through the backend in order.
 *
 * Units are batched (up to the server limits) so a long PDF does not spend one
 * rate-limited request per page. If a batch fails, its units are retried one by
 * one so a single bad page does not discard the rest of the file.
 *
 * A failed page or file does not discard the rest: its error is returned so the
 * UI can offer a retry, and the questions already extracted are preserved.
 * Aborting stops at the next request and returns what was collected so far.
 */
export const runExtraction = async (
  units: PreparedUnit[],
  options: ExtractionRunOptions = {}
): Promise<ExtractionRunResult> => {
  const batches = buildExtractionBatches(buildJobs(units));
  const parts: string[] = [];
  const warnings: string[] = [];
  const failures: ExtractionFailure[] = [];
  let cancelled = false;

  const collect = (response: ExtractionResponseDto) => {
    const plainText = typeof response.plain_text === 'string' ? response.plain_text : '';

    if (plainText.trim()) parts.push(plainText);
    for (const warning of response.warnings ?? []) {
      if (warning && !warnings.includes(warning)) warnings.push(warning);
    }
  };

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];

    if (options.signal?.aborted) {
      cancelled = true;
      break;
    }

    options.onProgress?.({
      current: index + 1,
      total: batches.length,
      label: batch.label,
    });

    try {
      collect(await requestExtraction(batch.units, options.signal));
    } catch (error) {
      if (options.signal?.aborted) {
        cancelled = true;
        break;
      }

      // Isolate a bad unit instead of failing the whole batch with it. A rate
      // limit is not unit-specific, so retrying each page would only waste quota.
      if (batch.units.length > 1 && !isRateLimited(error)) {
        for (const unit of batch.units) {
          if (options.signal?.aborted) {
            cancelled = true;
            break;
          }

          options.onProgress?.({
            current: index + 1,
            total: batches.length,
            label: unit.name,
          });

          try {
            collect(await requestExtraction([unit], options.signal));
          } catch (unitError) {
            if (options.signal?.aborted) {
              cancelled = true;
              break;
            }

            failures.push({
              sourceId: unit.sourceId,
              name: unit.name,
              error: errorMessage(unitError),
            });
          }
        }

        continue;
      }

      for (const unit of batch.units) {
        failures.push({
          sourceId: unit.sourceId,
          name: unit.name,
          error: errorMessage(error),
        });
      }
    }

    if (cancelled) break;
  }

  return {
    plainText: mergePlainTextParts(parts),
    warnings,
    failures,
    cancelled,
  };
};
