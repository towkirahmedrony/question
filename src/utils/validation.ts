import type {
  DifficultyLevel,
  ExamReference,
  ImportQuestionPayload,
  QuestionData,
  QuestionItem,
  ReferenceSourceKind,
  SourceType,
  ValidationStatus,
} from '../types/question';

export interface ValidationResult {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

/** Mirrors the backend's supported values, so a bad value is caught locally too. */
export const SOURCE_TYPE_VALUES: SourceType[] = [
  'board_exam',
  'admission',
  'college_test',
  'model_test',
  'textbook',
  'guidebook',
  'school_exam',
  'university_exam',
  'unknown',
];

export const DIFFICULTY_VALUES: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];

export const REFERENCE_KIND_VALUES: ReferenceSourceKind[] = [
  'board',
  'college',
  'university',
  'school',
  'admission',
  'book',
  'unknown',
];

const TAXONOMY_WARNINGS = new Set(['Subject not assigned.', 'Chapter not assigned.']);
const YEAR_PATTERN = /^(?:19|20)\d{2}(?:\s*[-–]\s*\d{2,4})?$/;

const unique = (values: string[]): string[] => Array.from(new Set(values));

const referenceName = (reference: ExamReference): string => {
  const value = reference.board ?? reference.institution_name ?? '';
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * Validates one extracted question against the Phase 2 reliability rules.
 * Curriculum ids are warnings here because extraction cannot know them; the
 * import check below turns them into hard errors.
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

  if (q.confidence === 'low') {
    warnings.push('Low extraction confidence — verify the question text, options and answer key.');
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

  let status: ValidationStatus = 'valid';
  if (errors.length > 0) {
    status = 'invalid';
  } else if (warnings.length > 0) {
    status = 'warning';
  }

  return { status, errors, warnings };
}

const validateReferences = (
  references: ExamReference[] | undefined,
  errors: string[],
  warnings: string[]
): void => {
  if (!references || references.length === 0) {
    warnings.push('No exam reference added; the source cannot be traced from the question bank.');
    return;
  }

  references.forEach((reference, index) => {
    const position = index + 1;

    if (reference.source_kind && !REFERENCE_KIND_VALUES.includes(reference.source_kind)) {
      errors.push(`Reference #${position} has an unsupported source kind.`);
    }

    if (!referenceName(reference) && !reference.institution_id) {
      errors.push(`Reference #${position} needs a board or institution name.`);
    }

    if (reference.year && !YEAR_PATTERN.test(String(reference.year).trim())) {
      warnings.push(`Reference #${position} year "${reference.year}" is not a 4-digit year.`);
    }
  });
};

/**
 * Stricter check used before anything is submitted to the backend.
 *
 * Everything the API or the database would reject is an error here, so a batch
 * never reaches the server half-valid. English text is required because the
 * importer's job is a bilingual question bank.
 */
export function validateForImport(q: Partial<QuestionItem>): ValidationResult {
  const base = validateQuestion(q);

  const errors = [...base.errors];
  const warnings = base.warnings.filter((warning) => !TAXONOMY_WARNINGS.has(warning));

  if (q.body && !q.body.text_en?.trim()) {
    errors.push('Question text in English (text_en) is required for import.');
  }

  const correctCount = (q.options ?? []).filter((option) => option.isCorrect).length;
  if ((q.options?.length ?? 0) >= 2 && correctCount !== 1) {
    errors.push('Exactly one option must be marked as the correct answer.');
  }

  if (!q.subject_id) errors.push('Select a subject before importing.');
  if (!q.chapter_id) errors.push('Select a chapter before importing.');
  if (!q.topic_id) warnings.push('No topic selected; the question will not be linked to a topic.');

  if (!q.source_type || !SOURCE_TYPE_VALUES.includes(q.source_type)) {
    errors.push('Select a valid source type.');
  }

  if (!q.difficulty_level || !DIFFICULTY_VALUES.includes(q.difficulty_level)) {
    errors.push('Select a valid difficulty level.');
  }

  validateReferences(q.exam_references, errors, warnings);

  const uniqueErrors = unique(errors);
  const uniqueWarnings = unique(warnings);

  const status: ValidationStatus =
    uniqueErrors.length > 0 ? 'invalid' : uniqueWarnings.length > 0 ? 'warning' : 'valid';

  return { status, errors: uniqueErrors, warnings: uniqueWarnings };
}

const cleanReference = (reference: ExamReference): ExamReference => {
  const cleaned: ExamReference = {};

  for (const [key, value] of Object.entries(reference)) {
    if (typeof value !== 'string') {
      if (value !== undefined && value !== null) {
        (cleaned as Record<string, unknown>)[key] = value;
      }
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) (cleaned as Record<string, unknown>)[key] = trimmed;
  }

  return cleaned;
};

/**
 * Convert frontend QuestionItem into the exportable JSON that matches the
 * admin panel's question format.
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
    source_type: q.source_type || 'unknown',
    exam_references: Array.isArray(q.exam_references)
      ? q.exam_references.map(cleanReference)
      : [],
    tags: Array.from(new Set(q.tags.map((tag) => tag.trim()).filter(Boolean))),
    ...(q.source_metadata && Object.keys(q.source_metadata).length > 0
      ? { source_metadata: q.source_metadata }
      : {}),
    ...(q.subject_id ? { subject_id: q.subject_id } : {}),
    ...(q.chapter_id ? { chapter_id: q.chapter_id } : {}),
    ...(q.topic_id ? { topic_id: q.topic_id } : {}),
  };
}

/**
 * Builds the payload submitted to the backend. Unlike the export helper this
 * always carries `subject_id`/`chapter_id` as strings, so a missing selection is
 * a local validation error instead of a malformed request.
 */
export function buildImportPayload(q: QuestionItem): ImportQuestionPayload {
  const formatted = formatQuestionForExport(q);

  return {
    ...formatted,
    subject_id: q.subject_id ?? '',
    chapter_id: q.chapter_id ?? '',
  };
}
