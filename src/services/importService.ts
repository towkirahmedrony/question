import { apiRequest } from './apiClient';
import type { ImportBatchResult, ImportHistoryEntry, ImportQuestionPayload } from '../types/question';

export interface SubmitImportOptions {
  questions: ImportQuestionPayload[];
  /** True runs the backend's validation + duplicate report without writing. */
  dryRun: boolean;
  sourceLabel?: string | null;
  subjectLabels?: string[];
}

export const submitImport = async ({
  questions,
  dryRun,
  sourceLabel,
  subjectLabels,
}: SubmitImportOptions): Promise<ImportBatchResult> =>
  apiRequest<ImportBatchResult>('/content/questions/import', {
    method: 'POST',
    body: {
      questions,
      dry_run: dryRun,
      source_label: sourceLabel ?? null,
      subject_labels: subjectLabels ?? [],
    },
  });

export const fetchImportHistory = async (): Promise<ImportHistoryEntry[]> => {
  const history = await apiRequest<ImportHistoryEntry[]>(
    '/content/questions/import-history?limit=50'
  );

  return Array.isArray(history) ? history : [];
};
