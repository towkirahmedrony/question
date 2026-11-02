import React from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import { BookOpen, FolderTree, Tag, RefreshCw } from 'lucide-react';

interface TaxonomySelectorProps {
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  onChangeSubject: (subjectId: string) => void;
  onChangeChapter: (chapterId: string) => void;
  onChangeTopic: (topicId: string) => void;
}

const displayName = (
  node: { name_bn?: string | null; name_en?: string | null },
  language: 'en' | 'bn'
): string => {
  if (language === 'bn') return node.name_bn || node.name_en || '';
  return node.name_en || node.name_bn || '';
};

/**
 * Dependent Subject -> Chapter -> Topic selectors backed by the live
 * curriculum. Chapters and topics load only after their parent is chosen, and a
 * parent change clears the child selection.
 */
export const TaxonomySelector: React.FC<TaxonomySelectorProps> = ({
  subjectId,
  chapterId,
  topicId,
  onChangeSubject,
  onChangeChapter,
  onChangeTopic,
}) => {
  const { t, language } = useLanguage();
  const {
    subjects,
    chapters,
    topics,
    isLoadingSubjects,
    isLoadingChapters,
    isLoadingTopics,
    error,
  } = useTaxonomyOptions(subjectId, chapterId);

  const handleSubjectSelect = (newSubjectId: string) => {
    onChangeSubject(newSubjectId);
    onChangeChapter('');
    onChangeTopic('');
  };

  const handleChapterSelect = (newChapterId: string) => {
    onChangeChapter(newChapterId);
    onChangeTopic('');
  };

  return (
    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <FolderTree className="w-4 h-4 text-indigo-600" />
          <span>Curriculum Taxonomy</span>
        </div>
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          {t.tax_live_badge}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
          <RefreshCw className="w-3 h-3" />
          <span>
            {t.tax_load_error} {error}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Subject Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.tax_subject}</span>
          </label>
          <select
            value={subjectId || ''}
            onChange={(e) => handleSubjectSelect(e.target.value)}
            disabled={isLoadingSubjects}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {isLoadingSubjects ? t.tax_loading : t.tax_select_subject}
            </option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {displayName(subject, language)}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.tax_chapter}</span>
          </label>
          <select
            value={chapterId || ''}
            onChange={(e) => handleChapterSelect(e.target.value)}
            disabled={!subjectId || isLoadingChapters || chapters.length === 0}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {isLoadingChapters
                ? t.tax_loading
                : subjectId && chapters.length === 0
                  ? t.tax_no_chapters
                  : t.tax_select_chapter}
            </option>
            {chapters.map((chapter, index) => (
              <option key={chapter.id} value={chapter.id}>
                {`${index + 1}. ${displayName(chapter, language)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Topic Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.tax_topic}</span>
          </label>
          <select
            value={topicId || ''}
            onChange={(e) => onChangeTopic(e.target.value)}
            disabled={!chapterId || isLoadingTopics || topics.length === 0}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {isLoadingTopics
                ? t.tax_loading
                : chapterId && topics.length === 0
                  ? t.tax_no_topics
                  : t.tax_select_topic}
            </option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {displayName(topic, language)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
