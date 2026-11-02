/**
 * Porokh AI Question Importer - core schema.
 *
 * `QuestionData` matches what the admin panel and porokh-backend persist:
 * bilingual body/options, structured `exam_references` objects (not free text),
 * and the curriculum ids. `isCorrect` is the stored answer-key flag and is
 * passed through unchanged.
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

/** Values accepted by the `questions_source_type_check` constraint. */
export type SourceType =
  | 'board_exam'
  | 'admission'
  | 'college_test'
  | 'model_test'
  | 'textbook'
  | 'guidebook'
  | 'school_exam'
  | 'university_exam'
  | 'unknown';

export type ReferenceSourceKind =
  | 'board'
  | 'college'
  | 'university'
  | 'school'
  | 'admission'
  | 'book'
  | 'unknown';

/** One entry of `questions.exam_references` (JSONB). */
export interface ExamReference {
  source_kind?: ReferenceSourceKind;
  board?: string;
  institution_name?: string;
  institution_id?: string;
  unit_id?: string;
  unit_name?: string;
  exam_name?: string;
  year?: string;
  eiin?: string;
  code?: string;
}

export interface QuestionOption {
  id: number;
  text_bn: string;
  text_en: string;
  isCorrect: boolean;
}

export interface QuestionBody {
  text_bn: string;
  text_en: string;
  image_url: string | null;
}

export interface QuestionExplanation {
  bn: string;
  en: string;
}

export interface SourceMetadata {
  institution?: string;
  exam_name?: string;
  year?: number | string;
}

export type ValidationStatus = 'valid' | 'warning' | 'invalid';

export type ExtractionConfidence = 'high' | 'medium' | 'low';

/**
 * Exact question schema the importer submits.
 *
 * `subject_id` and `chapter_id` are required at submission time; the export
 * helper keeps them optional so a JSON download of an unfinished batch is still
 * honest about what is missing.
 */
export interface QuestionData {
  type: 'mcq';
  body: QuestionBody;
  options: QuestionOption[];
  explanation: QuestionExplanation;
  difficulty_level: DifficultyLevel;
  source_type: SourceType;
  exam_references: ExamReference[];
  tags: string[];
  source_metadata?: SourceMetadata;
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
}

/** Payload sent to `POST /content/questions/import`. */
export interface ImportQuestionPayload extends QuestionData {
  subject_id: string;
  chapter_id: string;
}

/**
 * QuestionItem with UI state for frontend review and batch management
 */
export interface QuestionItem extends QuestionData {
  id: string; // Temporary client-side UUID
  question_number?: string; // Number printed on the paper, kept for traceability
  source_image_id?: string; // Reference to uploaded image ID
  source_image_name?: string; // Reference to uploaded image filename
  source_image_index?: number; // Always 0 in the single-image flow
  confidence?: ExtractionConfidence; // Backend-derived extraction confidence
  validation_status: ValidationStatus;
  validation_errors: string[];
  validation_warnings: string[];
  requires_manual_answer_verification?: boolean; // Flagged when the OCR model did not detect an unambiguous printed answer
  uncertain_ocr_flags?: string[]; // Visual flags for smudged or uncertain text/equations
  is_duplicate?: boolean;
  reviewed: boolean;
}

export interface UploadedImage {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'extracted' | 'empty' | 'error';
  errorMessage?: string;
  extractedQuestionCount?: number;
  base64Data?: string;
  rawFile?: File;
}

export interface BatchSummaryStats {
  total: number;
  valid: number;
  warning: number;
  invalid: number;
  duplicates: number;
  pendingReview: number;
  needsAnswerKey: number;
}

export interface MockBatchHistory {
  id: string;
  batchNumber: string;
  date: string;
  subjectNameBn: string;
  subjectNameEn: string;
  totalQuestions: number;
  validCount: number;
  status: 'imported' | 'partially_imported' | 'draft';
  sourceName: string;
}

/** Per-question outcome returned by the backend import endpoint. */
export type ImportRowStatus = 'imported' | 'duplicate' | 'failed' | 'invalid';

export interface ImportRowResult {
  index: number;
  status: ImportRowStatus;
  question_id?: string;
  existing_question_id?: string;
  errors: string[];
  warnings: string[];
}

export interface ImportCounts {
  total: number;
  imported: number;
  duplicate: number;
  failed: number;
  invalid: number;
}

export interface ImportBatchResult {
  batch_id: string | null;
  dry_run: boolean;
  counts: ImportCounts;
  results: ImportRowResult[];
}

export type ImportBatchStatus = 'completed' | 'partial' | 'failed' | 'duplicate';

/** One import batch row in the history view. */
export interface ImportHistoryEntry {
  batch_id: string;
  imported_at: string;
  total: number;
  imported: number;
  duplicate: number;
  failed: number;
  invalid: number;
  status: ImportBatchStatus;
  source_label: string | null;
  subject_labels: string[];
}
