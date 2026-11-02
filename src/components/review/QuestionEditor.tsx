import React, { useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type {
  QuestionItem,
  QuestionOption,
  DifficultyLevel,
  SourceType,
} from '../../types/question';
import { TaxonomySelector } from './TaxonomySelector';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Check,
  Image as ImageIcon,
  HelpCircle,
  Hash,
  Award,
  Building,
  GraduationCap,
  Calendar,
  Languages,
  BookMarked,
  HelpCircle as QuestionIcon,
} from 'lucide-react';

interface QuestionEditorProps {
  question: QuestionItem;
  onChange: (updated: QuestionItem) => void;
  onDelete: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onChange,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [bilingualViewMode, setBilingualViewMode] = useState<'both' | 'bn' | 'en'>('both');
  const [newTagInput, setNewTagInput] = useState('');
  const [newExamRefInput, setNewExamRefInput] = useState('');

  // Updates helper
  const updateBody = (fields: Partial<QuestionItem['body']>) => {
    onChange({
      ...question,
      body: { ...question.body, ...fields },
    });
  };

  const updateExplanation = (fields: Partial<QuestionItem['explanation']>) => {
    onChange({
      ...question,
      explanation: { ...question.explanation, ...fields },
    });
  };

  const updateSourceMetadata = (fields: Partial<NonNullable<QuestionItem['source_metadata']>>) => {
    onChange({
      ...question,
      source_metadata: {
        ...(question.source_metadata || {}),
        ...fields,
      },
    });
  };

  // Option handlers
  const handleOptionChange = (optionId: number, field: 'text_bn' | 'text_en', value: string) => {
    const updatedOptions = question.options.map((opt) =>
      opt.id === optionId ? { ...opt, [field]: value } : opt
    );
    onChange({ ...question, options: updatedOptions });
  };

  const handleSetCorrectOption = (optionId: number) => {
    const updatedOptions = question.options.map((opt) => ({
      ...opt,
      isCorrect: opt.id === optionId,
    }));
    // Clear manual verification alert once user confirms an option
    onChange({
      ...question,
      options: updatedOptions,
      requires_manual_answer_verification: false,
    });
  };

  const handleAddOption = () => {
    const nextId = question.options.length > 0 ? Math.max(...question.options.map((o) => o.id)) + 1 : 1;
    const newOption: QuestionOption = {
      id: nextId,
      text_bn: '',
      text_en: '',
      isCorrect: question.options.length === 0,
    };
    onChange({ ...question, options: [...question.options, newOption] });
  };

  const handleRemoveOption = (optionId: number) => {
    if (question.options.length <= 2) return;
    const updatedOptions = question.options.filter((opt) => opt.id !== optionId);
    if (!updatedOptions.some((o) => o.isCorrect) && updatedOptions.length > 0) {
      updatedOptions[0].isCorrect = true;
    }
    onChange({ ...question, options: updatedOptions });
  };

  // Tags handlers
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const trimmed = newTagInput.trim().toLowerCase();
    if (!question.tags.includes(trimmed)) {
      onChange({ ...question, tags: [...question.tags, trimmed] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({
      ...question,
      tags: question.tags.filter((t) => t !== tagToRemove),
    });
  };

  // Exam reference handlers
  const handleAddExamRef = () => {
    if (!newExamRefInput.trim()) return;
    const trimmed = newExamRefInput.trim();
    if (!question.exam_references.includes(trimmed)) {
      onChange({ ...question, exam_references: [...question.exam_references, trimmed] });
    }
    setNewExamRefInput('');
  };

  const handleRemoveExamRef = (refToRemove: string) => {
    onChange({
      ...question,
      exam_references: question.exam_references.filter((r) => r !== refToRemove),
    });
  };

  const hasConfirmedCorrectOption = question.options.some((o) => o.isCorrect);

  return (
    <div className="space-y-6">
      {/* Manual Answer Verification Alert (Safety rule: Never invent answer silently) */}
      {(question.requires_manual_answer_verification || !hasConfirmedCorrectOption) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xs flex items-start gap-3 animate-in fade-in duration-150">
          <QuestionIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <span className="font-bold block text-amber-950">
              {t.review_manual_answer_alert}
            </span>
            <p className="text-amber-800 leading-relaxed text-xs">
              Gemini Vision detected no unambiguous printed answer key on this question. Please tap the correct option below to verify and approve.
            </p>
          </div>
        </div>
      )}

      {/* OCR Warnings Banner if any text was uncertain */}
      {question.uncertain_ocr_flags && question.uncertain_ocr_flags.length > 0 && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 shadow-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold block text-sky-950">{t.review_ocr_warning_alert}</span>
            <ul className="list-disc list-inside space-y-0.5 text-sky-800">
              {question.uncertain_ocr_flags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Validation Diagnostics Box if Errors or Warnings exist */}
      {(question.validation_errors.length > 0 || question.validation_warnings.length > 0) && (
        <div className="rounded-2xl p-4 border space-y-2 bg-slate-50/80">
          {question.validation_errors.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <XCircle className="w-4 h-4" />
                <span>Errors requiring attention:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-600 pl-2 space-y-0.5">
                {question.validation_errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {question.validation_warnings.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                <span>Recommendations / Warnings:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-600 pl-2 space-y-0.5">
                {question.validation_warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* View Mode Switcher (Side-by-side vs Single language) */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Languages className="w-4 h-4 text-indigo-600" />
          <span>{t.form_bilingual_mode}</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200/60">
          <button
            type="button"
            onClick={() => setBilingualViewMode('both')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              bilingualViewMode === 'both' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            {t.form_tab_both}
          </button>
          <button
            type="button"
            onClick={() => setBilingualViewMode('bn')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              bilingualViewMode === 'bn' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            {t.form_tab_bn}
          </button>
          <button
            type="button"
            onClick={() => setBilingualViewMode('en')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              bilingualViewMode === 'en' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            {t.form_tab_en}
          </button>
        </div>
      </div>

      {/* 1. Question Body */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-600" />
            <span>Question Statement</span>
          </h3>
          <span className="text-xs text-slate-400">{"Supports LaTeX formulas (e.g. $F = ma$, $\\vec{A}$)"}</span>
        </div>

        <div className={`grid gap-4 ${bilingualViewMode === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {(bilingualViewMode === 'both' || bilingualViewMode === 'bn') && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t.form_question_body_bn}
              </label>
              <textarea
                value={question.body.text_bn}
                onChange={(e) => updateBody({ text_bn: e.target.value })}
                rows={3}
                placeholder={t.form_question_body_placeholder_bn}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium leading-relaxed"
              />
            </div>
          )}

          {(bilingualViewMode === 'both' || bilingualViewMode === 'en') && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t.form_question_body_en}
              </label>
              <textarea
                value={question.body.text_en}
                onChange={(e) => updateBody({ text_en: e.target.value })}
                rows={3}
                placeholder={t.form_question_body_placeholder_en}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Question Image URL (Optional diagram) */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.form_image_url}</span>
          </label>
          <input
            type="text"
            value={question.body.image_url || ''}
            onChange={(e) => updateBody({ image_url: e.target.value || null })}
            placeholder={t.form_image_url_placeholder}
            className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-slate-700"
          />
        </div>
      </div>

      {/* 2. Options Editor */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t.form_options_title}</span>
          </h3>
          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.form_add_option}</span>
          </button>
        </div>

        <div className="space-y-3">
          {question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx); // A, B, C, D...
            const isCorrect = opt.isCorrect;

            return (
              <div
                key={opt.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCorrect
                    ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400/30'
                    : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {letter}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetCorrectOption(opt.id)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md transition-colors ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-300 hover:border-emerald-500 hover:text-emerald-700'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{isCorrect ? t.form_option_correct_badge : t.form_option_mark_correct}</span>
                    </button>
                  </div>

                  {question.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(opt.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title={t.form_remove_option}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Option text inputs */}
                <div
                  className={`grid gap-3 ${
                    bilingualViewMode === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {(bilingualViewMode === 'both' || bilingualViewMode === 'bn') && (
                    <div>
                      <input
                        type="text"
                        value={opt.text_bn}
                        onChange={(e) => handleOptionChange(opt.id, 'text_bn', e.target.value)}
                        placeholder={`Option ${letter} (বাংলা)`}
                        className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                    </div>
                  )}

                  {(bilingualViewMode === 'both' || bilingualViewMode === 'en') && (
                    <div>
                      <input
                        type="text"
                        value={opt.text_en}
                        onChange={(e) => handleOptionChange(opt.id, 'text_en', e.target.value)}
                        placeholder={`Option ${letter} (English)`}
                        className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Explanation Editor */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600" />
          <span>{t.form_explanation_title}</span>
        </h3>

        <div className={`grid gap-4 ${bilingualViewMode === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {(bilingualViewMode === 'both' || bilingualViewMode === 'bn') && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t.form_explanation_bn}
              </label>
              <textarea
                value={question.explanation.bn}
                onChange={(e) => updateExplanation({ bn: e.target.value })}
                rows={3}
                placeholder={t.form_explanation_placeholder_bn}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>
          )}

          {(bilingualViewMode === 'both' || bilingualViewMode === 'en') && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t.form_explanation_en}
              </label>
              <textarea
                value={question.explanation.en}
                onChange={(e) => updateExplanation({ en: e.target.value })}
                rows={3}
                placeholder={t.form_explanation_placeholder_en}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Subject, Chapter, Topic Taxonomy Selector */}
      <TaxonomySelector
        subjectId={question.subject_id}
        chapterId={question.chapter_id}
        topicId={question.topic_id}
        onChangeSubject={(subjectId) => onChange({ ...question, subject_id: subjectId })}
        onChangeChapter={(chapterId) => onChange({ ...question, chapter_id: chapterId })}
        onChangeTopic={(topicId) => onChange({ ...question, topic_id: topicId })}
      />

      {/* 5. Classification & Source Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600" />
          <span>{t.form_classification_title}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.form_difficulty}
            </label>
            <select
              value={question.difficulty_level}
              onChange={(e) =>
                onChange({ ...question, difficulty_level: e.target.value as DifficultyLevel })
              }
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="easy">{t.diff_easy}</option>
              <option value="medium">{t.diff_medium}</option>
              <option value="hard">{t.diff_hard}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.form_source_type}
            </label>
            <select
              value={question.source_type}
              onChange={(e) =>
                onChange({ ...question, source_type: e.target.value as SourceType })
              }
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="board_exam">{t.source_board_exam}</option>
              <option value="admission">{t.source_admission}</option>
              <option value="school">{t.source_school}</option>
              <option value="other">{t.source_other}</option>
            </select>
          </div>
        </div>

        {/* Source Metadata inputs (Institution, Exam Name, Year) */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 block mb-2">
            Source Origin & Year
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" />
                <span>{t.form_institution}</span>
              </label>
              <input
                type="text"
                value={question.source_metadata?.institution || ''}
                onChange={(e) => updateSourceMetadata({ institution: e.target.value })}
                placeholder={t.form_institution_placeholder}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-slate-400" />
                <span>{t.form_exam_name}</span>
              </label>
              <input
                type="text"
                value={question.source_metadata?.exam_name || ''}
                onChange={(e) => updateSourceMetadata({ exam_name: e.target.value })}
                placeholder={t.form_exam_name_placeholder}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{t.form_exam_year}</span>
              </label>
              <input
                type="text"
                value={question.source_metadata?.year || ''}
                onChange={(e) => updateSourceMetadata({ year: e.target.value })}
                placeholder={t.form_exam_year_placeholder}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Exam References Tags */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t.form_exam_refs}
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {question.exam_references.map((ref, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-medium"
              >
                <span>{ref}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveExamRef(ref)}
                  className="hover:text-rose-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newExamRefInput}
              onChange={(e) => setNewExamRefInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddExamRef();
                }
              }}
              placeholder={t.form_exam_refs_hint}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddExamRef}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Add
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.form_tags}</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {question.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={t.form_tags_hint}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Footer Review Checkbox & Delete Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={question.reviewed}
            onChange={(e) => onChange({ ...question, reviewed: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span className="text-xs sm:text-sm font-semibold text-slate-800">
            {t.review_reviewed_checkbox}
          </span>
        </label>

        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>{t.review_delete_question}</span>
        </button>
      </div>
    </div>
  );
};
