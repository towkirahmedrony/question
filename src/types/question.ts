/**
 * Porokh AI Question Importer - Core TypeScript Schema
 * Matching the exact bilingual question format requirement.
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type SourceType = 'board_exam' | 'admission' | 'school' | 'other';

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

/**
 * Exact question schema matching Porokh import requirements
 */
export interface QuestionData {
  type: 'mcq';
  body: QuestionBody;
  options: QuestionOption[];
  explanation: QuestionExplanation;
  difficulty_level: DifficultyLevel;
  source_type: SourceType;
  exam_references: string[];
  tags: string[];
  source_metadata?: SourceMetadata;
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
}

/**
 * QuestionItem with UI state for frontend review and batch management
 */
export interface QuestionItem extends QuestionData {
  id: string; // Temporary client-side UUID
  source_image_id?: string; // Reference to uploaded image ID
  source_image_name?: string; // Reference to uploaded image filename
  source_image_index?: number; // Order index in the uploaded image sequence
  validation_status: 'valid' | 'warning' | 'invalid';
  validation_errors: string[];
  validation_warnings: string[];
  requires_manual_answer_verification?: boolean; // Flagged when Gemini OCR did not detect an unambiguous printed answer
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
  status: 'pending' | 'processing' | 'extracted' | 'error';
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
