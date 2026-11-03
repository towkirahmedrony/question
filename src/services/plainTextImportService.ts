import type { ImportBatchResult, PlainTextParseResult } from '../types/import';
import { apiRequest } from './apiClient';

/**
 * Plain-text import contract.
 *
 * The approved Structured Plain Text is the only question content sent to the
 * backend. Subject, chapter and topic come from the importer's dropdowns.
 */

export interface ImportPlainTextOptions {
  text: string;
  subjectId: string;
  chapterId: string;
  topicId?: string;
  dryRun: boolean;
  sourceLabel?: string | null;
  subjectLabels?: string[];
}

export const importPlainText = async ({
  text,
  subjectId,
  chapterId,
  topicId,
  dryRun,
  sourceLabel,
  subjectLabels,
}: ImportPlainTextOptions): Promise<ImportBatchResult> =>
  apiRequest<ImportBatchResult>('/content/questions/import-text', {
    method: 'POST',
    timeoutMs: 120_000,
    body: {
      text,
      subject_id: subjectId,
      chapter_id: chapterId,
      ...(topicId ? { topic_id: topicId } : {}),
      dry_run: dryRun,
      source_label: sourceLabel ?? null,
      subject_labels: subjectLabels ?? [],
    },
  });

/** Preview-only parse: the same validation the import endpoint runs. */
export const parsePlainText = async (text: string): Promise<PlainTextParseResult> =>
  apiRequest<PlainTextParseResult>('/content/questions/parse-text', {
    method: 'POST',
    timeoutMs: 60_000,
    body: { text },
  });
