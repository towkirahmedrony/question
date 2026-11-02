import type { ExamReference, ReferenceSourceKind, SourceType } from '../types/question';

/** Reference kinds, in the order the editor offers them. */
export const REFERENCE_KIND_ORDER: ReferenceSourceKind[] = [
  'board',
  'college',
  'university',
  'school',
  'admission',
  'book',
  'unknown',
];

/** Question `source_type` -> default kind for a new reference (admin panel rule). */
export const referenceKindForSourceType = (sourceType: SourceType): ReferenceSourceKind => {
  switch (sourceType) {
    case 'board_exam':
      return 'board';
    case 'college_test':
      return 'college';
    case 'admission':
      return 'admission';
    case 'textbook':
    case 'guidebook':
      return 'book';
    case 'school_exam':
      return 'school';
    case 'university_exam':
      return 'university';
    default:
      return 'unknown';
  }
};

/** Board references are named in `board`, every other kind in `institution_name`. */
export const referenceName = (reference: ExamReference): string => {
  const value = reference.board ?? reference.institution_name ?? '';
  return typeof value === 'string' ? value.trim() : '';
};

export const formatReferenceLabel = (reference: ExamReference): string => {
  const parts = [referenceName(reference), reference.exam_name ?? '', reference.year ?? '']
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);

  return parts.join(' • ');
};
