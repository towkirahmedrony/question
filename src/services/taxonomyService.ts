import { apiRequest } from './apiClient';

/** Curriculum node as returned by the existing content taxonomy endpoints. */
export interface CurriculumNodeRecord {
  id: string;
  name_bn?: string | null;
  name_en?: string | null;
  sequence?: number | null;
  is_active?: boolean | null;
  subject_id?: string | null;
  chapter_id?: string | null;
}

const isActive = (node: CurriculumNodeRecord): boolean => node.is_active !== false;

const bySequenceThenName = (left: CurriculumNodeRecord, right: CurriculumNodeRecord): number =>
  (left.sequence ?? 0) - (right.sequence ?? 0) ||
  (left.name_en ?? '').localeCompare(right.name_en ?? '');

const normalizeList = (value: unknown): CurriculumNodeRecord[] => {
  if (!Array.isArray(value)) return [];

  return (value as CurriculumNodeRecord[])
    .filter((node) => node && typeof node.id === 'string')
    .filter(isActive)
    .sort(bySequenceThenName);
};

let subjectsPromise: Promise<CurriculumNodeRecord[]> | null = null;
const chaptersBySubject = new Map<string, Promise<CurriculumNodeRecord[]>>();
const topicsByChapter = new Map<string, Promise<CurriculumNodeRecord[]>>();

const cached = (
  cache: Map<string, Promise<CurriculumNodeRecord[]>>,
  key: string,
  load: () => Promise<CurriculumNodeRecord[]>
): Promise<CurriculumNodeRecord[]> => {
  const existing = cache.get(key);
  if (existing) return existing;

  const promise = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, promise);
  return promise;
};

/** Active subjects, newest curriculum first request per session only. */
export const loadSubjects = (): Promise<CurriculumNodeRecord[]> => {
  if (!subjectsPromise) {
    subjectsPromise = apiRequest<unknown>('/content/taxonomy/subjects')
      .then(normalizeList)
      .catch((error: unknown) => {
        subjectsPromise = null;
        throw error;
      });
  }

  return subjectsPromise;
};

export const loadChapters = (subjectId: string): Promise<CurriculumNodeRecord[]> => {
  if (!subjectId) return Promise.resolve([]);

  return cached(chaptersBySubject, subjectId, () =>
    apiRequest<unknown>(
      `/content/taxonomy/chapters?subjectId=${encodeURIComponent(subjectId)}`
    ).then(normalizeList)
  );
};

export const loadTopics = (chapterId: string): Promise<CurriculumNodeRecord[]> => {
  if (!chapterId) return Promise.resolve([]);

  return cached(topicsByChapter, chapterId, () =>
    apiRequest<unknown>(
      `/content/taxonomy/topics?chapterId=${encodeURIComponent(chapterId)}`
    ).then(normalizeList)
  );
};
