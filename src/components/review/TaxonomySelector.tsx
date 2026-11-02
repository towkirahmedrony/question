import React, { useMemo } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { MOCK_TAXONOMY } from '../../data/mockTaxonomy';
import { BookOpen, FolderTree, Tag } from 'lucide-react';

interface TaxonomySelectorProps {
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  onChangeSubject: (subjectId: string) => void;
  onChangeChapter: (chapterId: string) => void;
  onChangeTopic: (topicId: string) => void;
}

export const TaxonomySelector: React.FC<TaxonomySelectorProps> = ({
  subjectId,
  chapterId,
  topicId,
  onChangeSubject,
  onChangeChapter,
  onChangeTopic,
}) => {
  const { t, language } = useLanguage();

  const selectedSubject = useMemo(() => {
    return MOCK_TAXONOMY.find((s) => s.id === subjectId);
  }, [subjectId]);

  const availableChapters = useMemo(() => {
    return selectedSubject ? selectedSubject.chapters : [];
  }, [selectedSubject]);

  const selectedChapter = useMemo(() => {
    return availableChapters.find((c) => c.id === chapterId);
  }, [availableChapters, chapterId]);

  const availableTopics = useMemo(() => {
    return selectedChapter ? selectedChapter.topics : [];
  }, [selectedChapter]);

  const handleSubjectSelect = (newSubId: string) => {
    onChangeSubject(newSubId);
    // Reset chapter and topic when subject changes
    onChangeChapter('');
    onChangeTopic('');
  };

  const handleChapterSelect = (newChapId: string) => {
    onChangeChapter(newChapId);
    onChangeTopic('');
  };

  return (
    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <FolderTree className="w-4 h-4 text-indigo-600" />
          <span>Curriculum Taxonomy</span>
        </div>
        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
          {t.tax_mock_badge}
        </span>
      </div>

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
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
          >
            <option value="">{t.tax_select_subject}</option>
            {MOCK_TAXONOMY.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {language === 'bn'
                  ? `${subj.name_bn} (${subj.code})`
                  : `${subj.name_en} (${subj.code})`}
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
            disabled={!subjectId || availableChapters.length === 0}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">{t.tax_select_chapter}</option>
            {availableChapters.map((chap) => (
              <option key={chap.id} value={chap.id}>
                {language === 'bn'
                  ? `অধ্যায় ${chap.chapter_number}: ${chap.name_bn}`
                  : `Ch ${chap.chapter_number}: ${chap.name_en}`}
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
            disabled={!chapterId || availableTopics.length === 0}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">{t.tax_select_topic}</option>
            {availableTopics.map((top) => (
              <option key={top.id} value={top.id}>
                {language === 'bn' ? top.name_bn : top.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
