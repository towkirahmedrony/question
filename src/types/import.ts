/**
 * Multi-format import types.
 *
 * The importer accepts pasted text and files, converts them into readable text
 * or page images, and works with one approval artefact: the canonical
 * Structured Plain Text document. Question JSON is never a user-facing format.
 */

export type ImportSourceKind = 'text' | 'image' | 'pdf' | 'csv' | 'txt';

export type SourceStatus = 'pending' | 'processing' | 'ready' | 'done' | 'error';

/** One selected input shown in the file list. */
export interface ImportSource {
  id: string;
  name: string;
  kind: ImportSourceKind;
  mimeType: string;
  size: number;
  status: SourceStatus;
  error?: string;
  previewUrl?: string;
  rawFile?: File;
  pageCount?: number;
  questionCount?: number;
  /** Cleaned readable text for csv/txt/pdf text pages. */
  text?: string;
}

export type PreparedUnitKind = 'text' | 'image';

/** One extraction call's worth of content. */
export interface PreparedUnit {
  id: string;
  name: string;
  kind: PreparedUnitKind;
  text?: string;
  mime_type?: string;
  data?: string;
  sourceId: string;
}

export interface ParseIssue {
  question: number;
  line: number;
  messages: string[];
}

export interface ReferenceCheck {
  institution_input: string;
  unit_input?: string;
  questions: number;
  status:
    | 'ok'
    | 'institution_not_found'
    | 'institution_ambiguous'
    | 'unit_not_found'
    | 'unit_ambiguous';
  message: string;
  suggestions?: string[];
}

export interface PlainTextParseResult {
  questions: Array<Record<string, unknown>>;
  errors: ParseIssue[];
  warnings: ParseIssue[];
  counts: { total: number; valid: number; invalid: number };
  reference_checks: ReferenceCheck[];
}

export interface ImportRowResult {
  index: number;
  status: 'imported' | 'duplicate' | 'failed' | 'invalid';
  question_id?: string;
  existing_question_id?: string;
  errors: string[];
  warnings: string[];
}

export interface ImportBatchResult {
  batch_id: string | null;
  dry_run: boolean;
  counts: {
    total: number;
    imported: number;
    duplicate: number;
    failed: number;
    invalid: number;
  };
  results: ImportRowResult[];
  parse: {
    counts: { total: number; valid: number; invalid: number };
    errors: ParseIssue[];
    warnings: ParseIssue[];
    reference_checks: ReferenceCheck[];
  };
}
