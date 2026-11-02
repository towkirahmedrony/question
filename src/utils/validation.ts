import type { QuestionItem, QuestionData } from '../types/question';

export interface ValidationResult {
  status: 'valid' | 'warning' | 'invalid';
  errors: string[];
  warnings: string[];
}

/**
 * Validates a single question against the required bilingual schema rules and Phase 2 reliability standards.
 */
export function validateQuestion(q: Partial<QuestionItem>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Question Body
  if (!q.body?.text_bn?.trim()) {
    errors.push('Question text in Bengali (text_bn) is required.');
  }

  if (!q.body?.text_en?.trim()) {
    warnings.push('Question text in English (text_en) is empty (bilingual text recommended).');
  }

  // Options validation
  if (!q.options || q.options.length < 2) {
    errors.push('At least 2 options are required for an MCQ (4 recommended).');
  } else {
    const correctOptions = q.options.filter((opt) => opt.isCorrect);

    if (correctOptions.length === 0) {
      errors.push('No correct option is selected. An exact answer must be confirmed before approval.');
    } else if (correctOptions.length > 1) {
      warnings.push('Multiple options are marked as correct (standard MCQ expects exactly one).');
    }

    const emptyBnOptions = q.options.filter((opt) => !opt.text_bn?.trim());
    if (emptyBnOptions.length > 0) {
      errors.push(`${emptyBnOptions.length} option(s) are missing Bengali text.`);
    }

    const emptyEnOptions = q.options.filter((opt) => !opt.text_en?.trim());
    if (emptyEnOptions.length > 0) {
      warnings.push(`${emptyEnOptions.length} option(s) are missing English text.`);
    }
  }

  // Flag for manual answer verification from Gemini OCR
  if (q.requires_manual_answer_verification) {
    warnings.push('Answer not explicitly printed on paper or was ambiguous — requires manual review.');
  }

  // OCR uncertainty flags
  if (q.uncertain_ocr_flags && q.uncertain_ocr_flags.length > 0) {
    q.uncertain_ocr_flags.forEach((flag) => {
      warnings.push(`OCR Warning: ${flag}`);
    });
  }

  // Explanation
  if (!q.explanation?.bn?.trim() && !q.explanation?.en?.trim()) {
    warnings.push('No solution explanation provided.');
  }

  // Taxonomy
  if (!q.subject_id) {
    warnings.push('Subject not assigned.');
  }
  if (!q.chapter_id) {
    warnings.push('Chapter not assigned.');
  }

  let status: 'valid' | 'warning' | 'invalid' = 'valid';
  if (errors.length > 0) {
    status = 'invalid';
  } else if (warnings.length > 0) {
    status = 'warning';
  }

  return { status, errors, warnings };
}

/**
 * Convert frontend QuestionItem into clean exportable QuestionData matching exact backend schema
 */
export function formatQuestionForExport(q: QuestionItem): QuestionData {
  return {
    type: 'mcq',
    body: {
      text_bn: q.body.text_bn.trim(),
      text_en: q.body.text_en.trim(),
      image_url: q.body.image_url ? q.body.image_url.trim() : null,
    },
    options: q.options.map((opt, idx) => ({
      id: idx + 1,
      text_bn: opt.text_bn.trim(),
      text_en: opt.text_en.trim(),
      isCorrect: Boolean(opt.isCorrect),
    })),
    explanation: {
      bn: q.explanation.bn.trim(),
      en: q.explanation.en.trim(),
    },
    difficulty_level: q.difficulty_level || 'medium',
    source_type: q.source_type || 'board_exam',
    exam_references: Array.isArray(q.exam_references) ? q.exam_references.filter(Boolean) : [],
    tags: Array.isArray(q.tags) ? q.tags.filter(Boolean) : [],
    ...(q.source_metadata && Object.keys(q.source_metadata).length > 0
      ? { source_metadata: q.source_metadata }
      : {}),
    ...(q.subject_id ? { subject_id: q.subject_id } : {}),
    ...(q.chapter_id ? { chapter_id: q.chapter_id } : {}),
    ...(q.topic_id ? { topic_id: q.topic_id } : {}),
  };
}
