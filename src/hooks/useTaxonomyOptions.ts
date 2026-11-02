import { useEffect, useState } from 'react';
import { readErrorMessage } from '../services/apiClient';
import {
  loadChapters,
  loadSubjects,
  loadTopics,
  type CurriculumNodeRecord,
} from '../services/taxonomyService';

export interface TaxonomyOptions {
  subjects: CurriculumNodeRecord[];
  chapters: CurriculumNodeRecord[];
  topics: CurriculumNodeRecord[];
  isLoadingSubjects: boolean;
  isLoadingChapters: boolean;
  isLoadingTopics: boolean;
  error: string | null;
}

/**
 * Dependent subject -> chapter -> topic options for one question.
 *
 * A subject change immediately clears the downstream lists so the editor can
 * never submit a chapter that belongs to the previously selected subject.
 */
export const useTaxonomyOptions = (subjectId?: string, chapterId?: string): TaxonomyOptions => {
  const [subjects, setSubjects] = useState<CurriculumNodeRecord[]>([]);
  const [chapters, setChapters] = useState<CurriculumNodeRecord[]>([]);
  const [topics, setTopics] = useState<CurriculumNodeRecord[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingSubjects(true);

    loadSubjects()
      .then((list) => {
        if (active) setSubjects(list);
      })
      .catch((cause: unknown) => {
        if (active) setError(readErrorMessage(cause, 'Subjects could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoadingSubjects(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setTopics([]);

    if (!subjectId) {
      setChapters([]);
      return () => {
        active = false;
      };
    }

    setIsLoadingChapters(true);

    loadChapters(subjectId)
      .then((list) => {
        if (active) setChapters(list);
      })
      .catch((cause: unknown) => {
        if (active) setError(readErrorMessage(cause, 'Chapters could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoadingChapters(false);
      });

    return () => {
      active = false;
    };
  }, [subjectId]);

  useEffect(() => {
    let active = true;

    if (!chapterId) {
      setTopics([]);
      return () => {
        active = false;
      };
    }

    setIsLoadingTopics(true);

    loadTopics(chapterId)
      .then((list) => {
        if (active) setTopics(list);
      })
      .catch((cause: unknown) => {
        if (active) setError(readErrorMessage(cause, 'Topics could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoadingTopics(false);
      });

    return () => {
      active = false;
    };
  }, [chapterId]);

  return {
    subjects,
    chapters,
    topics,
    isLoadingSubjects,
    isLoadingChapters,
    isLoadingTopics,
    error,
  };
};
