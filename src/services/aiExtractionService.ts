import type { QuestionItem, UploadedImage } from '../types/question';
import { validateQuestion } from '../utils/validation';

export interface ExtractionOptions {
  sourceHint?: {
    institution?: string;
    exam_name?: string;
    year?: string | number;
    subject_id?: string;
  };
  generateMissingExplanations?: boolean;
  apiBaseUrl?: string;
}

export interface ExtractionResult {
  success: boolean;
  questions: QuestionItem[];
  batchSourceInfo?: {
    detected_institution?: string;
    detected_exam_name?: string;
    detected_year?: string | number;
    detected_subject?: string;
  };
  error?: string;
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
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1/ai/extract-questions';

/**
 * Call the secure backend Gemini extraction endpoint.
 */
export async function extractQuestionsViaBackendApi(
  images: UploadedImage[],
  options: ExtractionOptions = {},
  onProgress?: (progress: string) => void
): Promise<ExtractionResult> {
  const apiUrl = options.apiBaseUrl || DEFAULT_API_URL;
  if (onProgress) onProgress('Preparing and encoding images for extraction...');

  // Prepare base64 data for all images
  const imagePayloads: { base64Data: string; mimeType: string; fileName: string; imageId: string }[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    let base64 = img.base64Data;
    let mime = img.type || 'image/jpeg';

    if (!base64 && img.rawFile) {
      const converted = await convertFileToBase64(img.rawFile);
      base64 = converted.base64Data;
      mime = converted.mimeType;
    }

    if (!base64) {
      // Fallback: try fetching the object URL if rawFile is unavailable
      try {
        const response = await fetch(img.previewUrl);
        const blob = await response.blob();
        const converted = await convertFileToBase64(new File([blob], img.name, { type: blob.type }));
        base64 = converted.base64Data;
        mime = converted.mimeType;
      } catch {
        throw new Error(`Unable to load image data for "${img.name}"`);
      }
    }

    imagePayloads.push({
      base64Data: base64,
      mimeType: mime,
      fileName: img.name,
      imageId: img.id,
    });
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: imagePayloads,
      sourceHint: options.sourceHint,
      generateMissingExplanations: options.generateMissingExplanations !== false,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded (HTTP 429): Too many extraction requests. Please wait a minute before retrying.');
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || `Server returned error (${response.status})`);
  }

  const result = await response.json();
  const rawData = result.data || result;
  const rawQuestions: any[] = rawData.questions || [];

  // Map to QuestionItem format with validation
  const mappedQuestions: QuestionItem[] = rawQuestions.map((q, idx) => {
    const sourceImg = imagePayloads[q.source_image_index] || imagePayloads[0];
    const item: QuestionItem = {
      id: `q_extracted_${Date.now()}_${idx}`,
      type: 'mcq',
      body: {
        text_bn: q.body?.text_bn || '',
        text_en: q.body?.text_en || '',
        image_url: q.body?.image_url || null,
      },
      options: (q.options || []).map((opt: any, optIdx: number) => ({
        id: opt.id || optIdx + 1,
        text_bn: opt.text_bn || '',
        text_en: opt.text_en || '',
        isCorrect: Boolean(opt.isCorrect),
      })),
      explanation: {
        bn: q.explanation?.bn || '',
        en: q.explanation?.en || '',
      },
      difficulty_level: q.difficulty_level || 'medium',
      source_type: q.source_type || 'board_exam',
      exam_references: Array.isArray(q.exam_references) ? q.exam_references : [],
      tags: Array.isArray(q.tags) ? q.tags : [],
      source_metadata: q.source_metadata || rawData.batch_source_info ? {
        institution: q.source_metadata?.institution || rawData.batch_source_info?.detected_institution,
        exam_name: q.source_metadata?.exam_name || rawData.batch_source_info?.detected_exam_name,
        year: q.source_metadata?.year || rawData.batch_source_info?.detected_year,
      } : undefined,
      requires_manual_answer_verification: Boolean(q.requires_manual_answer_verification),
      uncertain_ocr_flags: Array.isArray(q.uncertain_ocr_flags) ? q.uncertain_ocr_flags : [],
      source_image_id: sourceImg?.imageId,
      source_image_name: sourceImg?.fileName,
      source_image_index: q.source_image_index || 0,
      validation_status: 'valid',
      validation_errors: [],
      validation_warnings: [],
      reviewed: false,
    };

    const val = validateQuestion(item);
    item.validation_status = val.status;
    item.validation_errors = val.errors;
    item.validation_warnings = val.warnings;

    return item;
  });

  return {
    success: true,
    questions: mappedQuestions,
    batchSourceInfo: rawData.batch_source_info,
  };
}
