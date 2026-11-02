import type {
  DifficultyLevel,
  ExamReference,
  QuestionItem,
  SourceMetadata,
  SourceType,
  UploadedImage,
} from '../types/question';
import { apiRequest } from './apiClient';
import {
  DIFFICULTY_VALUES,
  SOURCE_TYPE_VALUES,
  validateQuestion,
} from '../utils/validation';

/**
 * Backend Gemini extraction for the AI Question Importer.
 *
 * Images are sent inline to `POST /ai/extract-questions` with the caller's
 * Supabase bearer token. The Gemini key stays on the server; this module only
 * knows the sanitised question payload the backend returns.
 */

export interface ExtractionOptions {
  sourceHint?: {
    institution?: string;
    exam_name?: string;
    year?: string | number;
    subject?: string;
  };
  generateMissingExplanations?: boolean;
}

export interface ExtractionImageStatus {
  image_id: string;
  file_name: string;
  status: 'extracted' | 'empty';
  question_count: number;
}

export interface ExtractionRejection {
  index: number;
  source_image_index: number;
  reason: string;
}

export interface ExtractionResult {
  success: true;
  model: string;
  questions: QuestionItem[];
  images: ExtractionImageStatus[];
  rejected: ExtractionRejection[];
  warnings: string[];
  batchSourceInfo: {
    detected_institution?: string;
    detected_exam_name?: string;
    detected_year?: string;
  };
}

/** Server limits, mirrored here so an oversized upload fails before the request. */
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ExtractedQuestionDto {
  type?: string;
  body?: { text_bn?: string; text_en?: string; image_url?: string | null };
  options?: Array<{ id?: number; text_bn?: string; text_en?: string; isCorrect?: boolean }>;
  explanation?: { bn?: string; en?: string };
  difficulty_level?: string;
  source_type?: string;
  exam_references?: ExamReference[];
  tags?: string[];
  source_metadata?: SourceMetadata;
  requires_manual_answer_verification?: boolean;
  uncertain_ocr_flags?: string[];
  source_image_index?: number;
}

interface ExtractionResponseDto {
  model?: string;
  images?: ExtractionImageStatus[];
  questions?: ExtractedQuestionDto[];
  rejected?: ExtractionRejection[];
  batch_source_info?: {
    institution?: string;
    exam_name?: string;
    year?: string;
  };
  warnings?: string[];
}

interface EncodedImage {
  image_id: string;
  file_name: string;
  mime_type: string;
  data: string;
  source: UploadedImage;
}

/**
 * Convert a File object to clean base64 string
 */
export async function convertFileToBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data url prefix if present
      const base64Data = result.includes(';base64,') ? result.split(';base64,')[1] : result;
      resolve({
        base64Data,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/** Approximate decoded size of base64 content. */
const base64Bytes = (base64: string): number => {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const encodeImage = async (image: UploadedImage): Promise<EncodedImage> => {
  const mimeType = (image.type || 'image/jpeg').toLowerCase();

  if (!ACCEPTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`"${image.name}" is not a supported image type. Use JPG, PNG or WEBP.`);
  }

  let data = image.base64Data ?? '';
  let mime = mimeType;

  if (!data && image.rawFile) {
    const converted = await convertFileToBase64(image.rawFile);
    data = converted.base64Data;
    mime = converted.mimeType.toLowerCase();
  }

  if (!data) {
    const response = await fetch(image.previewUrl);
    const blob = await response.blob();
    const converted = await convertFileToBase64(new File([blob], image.name, { type: blob.type }));
    data = converted.base64Data;
    mime = converted.mimeType.toLowerCase();
  }

  if (!data) throw new Error(`Unable to load image data for "${image.name}".`);

  if (base64Bytes(data) > MAX_IMAGE_BYTES) {
    throw new Error(`"${image.name}" is larger than 6MB. Please upload a smaller photo.`);
  }

  return {
    image_id: image.id,
    file_name: image.name,
    mime_type: mime.includes('png') ? 'image/png' : mime.includes('webp') ? 'image/webp' : 'image/jpeg',
    data,
    source: image,
  };
};

const asDifficulty = (value: unknown): DifficultyLevel =>
  DIFFICULTY_VALUES.includes(value as DifficultyLevel) ? (value as DifficultyLevel) : 'medium';

const asSourceType = (value: unknown): SourceType =>
  SOURCE_TYPE_VALUES.includes(value as SourceType) ? (value as SourceType) : 'unknown';

const toQuestionItem = (
  dto: ExtractedQuestionDto,
  index: number,
  images: EncodedImage[],
  batch: NonNullable<ExtractionResponseDto['batch_source_info']>
): QuestionItem => {
  const imageIndex =
    typeof dto.source_image_index === 'number' &&
    dto.source_image_index >= 0 &&
    dto.source_image_index < images.length
      ? dto.source_image_index
      : 0;
  const sourceImage = images[imageIndex];

  const metadata = dto.source_metadata ?? {};
  const sourceMetadata: SourceMetadata = {
    institution: metadata.institution ?? batch.institution,
    exam_name: metadata.exam_name ?? batch.exam_name,
    year: metadata.year ?? batch.year,
  };

  const item: QuestionItem = {
    id: `q_extracted_${Date.now()}_${index}`,
    type: 'mcq',
    body: {
      text_bn: dto.body?.text_bn ?? '',
      text_en: dto.body?.text_en ?? '',
      image_url: dto.body?.image_url ?? null,
    },
    options: (dto.options ?? []).map((option, position) => ({
      id: position + 1,
      text_bn: option.text_bn ?? '',
      text_en: option.text_en ?? '',
      isCorrect: option.isCorrect === true,
    })),
    explanation: {
      bn: dto.explanation?.bn ?? '',
      en: dto.explanation?.en ?? '',
    },
    difficulty_level: asDifficulty(dto.difficulty_level),
    source_type: asSourceType(dto.source_type),
    exam_references: Array.isArray(dto.exam_references) ? dto.exam_references : [],
    tags: Array.isArray(dto.tags) ? dto.tags : [],
    ...(sourceMetadata.institution || sourceMetadata.exam_name || sourceMetadata.year
      ? { source_metadata: sourceMetadata }
      : {}),
    requires_manual_answer_verification: dto.requires_manual_answer_verification === true,
    uncertain_ocr_flags: Array.isArray(dto.uncertain_ocr_flags) ? dto.uncertain_ocr_flags : [],
    source_image_id: sourceImage?.image_id,
    source_image_name: sourceImage?.file_name,
    source_image_index: imageIndex,
    validation_status: 'valid',
    validation_errors: [],
    validation_warnings: [],
    reviewed: false,
  };

  const validation = validateQuestion(item);
  item.validation_status = validation.status;
  item.validation_errors = validation.errors;
  item.validation_warnings = validation.warnings;

  return item;
};

/**
 * Calls the backend Gemini extraction endpoint for the supplied images.
 *
 * The backend enforces authentication, the `questions.manage` permission, the
 * rate limit and its own timeout; this function adds a client deadline and maps
 * the sanitised response into the review interface's `QuestionItem`.
 */
export async function extractQuestionsViaBackendApi(
  images: UploadedImage[],
  options: ExtractionOptions = {},
  onProgress?: (progress: string) => void
): Promise<ExtractionResult> {
  if (images.length === 0) throw new Error('Please select at least one image.');
  if (images.length > MAX_IMAGES) throw new Error(`Maximum ${MAX_IMAGES} images per extraction.`);

  const encodedImages: EncodedImage[] = [];
  let totalBytes = 0;

  for (let index = 0; index < images.length; index += 1) {
    onProgress?.(`Encoding image ${index + 1} of ${images.length}...`);
    const encoded = await encodeImage(images[index]);
    totalBytes += base64Bytes(encoded.data);

    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('These images are too large together. Remove one or upload smaller photos.');
    }

    encodedImages.push(encoded);
  }

  onProgress?.(
    `Sending ${encodedImages.length} image(s) to Gemini for bilingual extraction...`
  );

  const response = await apiRequest<ExtractionResponseDto>('/ai/extract-questions', {
    method: 'POST',
    timeoutMs: REQUEST_TIMEOUT_MS,
    body: {
      images: encodedImages.map(({ image_id, file_name, mime_type, data }) => ({
        image_id,
        file_name,
        mime_type,
        data,
      })),
      source_hint: options.sourceHint
        ? {
            institution: options.sourceHint.institution,
            exam_name: options.sourceHint.exam_name,
            year:
              options.sourceHint.year === undefined
                ? undefined
                : String(options.sourceHint.year),
            subject: options.sourceHint.subject,
          }
        : undefined,
      generate_missing_explanations: options.generateMissingExplanations !== false,
    },
  });

  const batch = response.batch_source_info ?? {};
  const questions = (response.questions ?? []).map((dto, index) =>
    toQuestionItem(dto, index, encodedImages, batch)
  );

  onProgress?.(`Validated ${questions.length} question(s). Opening review...`);

  return {
    success: true,
    model: response.model ?? 'gemini-2.5-flash',
    questions,
    images: response.images ?? [],
    rejected: response.rejected ?? [],
    warnings: response.warnings ?? [],
    batchSourceInfo: {
      detected_institution: batch.institution,
      detected_exam_name: batch.exam_name,
      detected_year: batch.year,
    },
  };
}
