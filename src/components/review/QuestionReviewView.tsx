import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { QuestionItem } from '../../types/question';
import { QuestionEditor } from './QuestionEditor';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { RawJsonEditorModal } from './RawJsonEditorModal';
import { Badge, MockTagBadge } from '../common/Badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Code,
  FileQuestion,
  Filter,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface QuestionReviewViewProps {
  questions: QuestionItem[];
  onUpdateQuestion: (index: number, updated: QuestionItem) => void;
  onDeleteQuestion: (index: number) => void;
  onAddQuestion: () => void;
  onProceedToSummary: () => void;
  onGoToUpload: () => void;
}

export const QuestionReviewView: React.FC<QuestionReviewViewProps> = ({
  questions,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddQuestion,
  onProceedToSummary,
  onGoToUpload,
}) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'valid' | 'needs_answer' | 'warning' | 'invalid'>('all');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);

  // Filtered indices list
  const filteredIndices = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => {
        if (filter === 'all') return true;
        if (filter === 'needs_answer') {
          return q.requires_manual_answer_verification || !q.options.some((o) => o.isCorrect);
        }
        return q.validation_status === filter;
      })
      .map(({ idx }) => idx);
  }, [questions, filter]);

  // Adjust selected index if it falls out of bounds
  const currentQuestion = questions[selectedIndex] || null;

  const handleSelectIndex = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setSelectedIndex(idx);
    }
  };

  const handlePrev = () => {
    const currentPosInFiltered = filteredIndices.indexOf(selectedIndex);
    if (currentPosInFiltered > 0) {
      setSelectedIndex(filteredIndices[currentPosInFiltered - 1]);
    } else if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    const currentPosInFiltered = filteredIndices.indexOf(selectedIndex);
    if (currentPosInFiltered >= 0 && currentPosInFiltered < filteredIndices.length - 1) {
      setSelectedIndex(filteredIndices[currentPosInFiltered + 1]);
    } else if (selectedIndex < questions.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto space-y-4 my-8 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">No Questions in Batch</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Upload question images or load sample questions from the dashboard to review and edit bilingual MCQs.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            onClick={onGoToUpload}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-colors"
          >
            {t.nav_upload}
          </button>
          <button
            onClick={onAddQuestion}
            className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
          >
            {t.review_add_question}
          </button>
        </div>
      </div>
    );
  }

  const needsAnswerCount = questions.filter(
    (q) => q.requires_manual_answer_verification || !q.options.some((o) => o.isCorrect)
  ).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.review_title}</h1>
            <MockTagBadge />
          </div>
          <p className="text-xs sm:text-sm text-slate-500">{t.review_subtitle}</p>
        </div>

        {/* Global Batch Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">{t.review_preview_student}</span>
            <span className="sm:hidden">Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setJsonModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Code className="w-4 h-4 text-indigo-600" />
            <span>{t.review_view_json}</span>
          </button>

          <button
            type="button"
            onClick={onProceedToSummary}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <span>{t.nav_summary}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Question Carousel Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-3">
        {/* Filters and Add Question */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.review_filter_all} ({questions.length})
            </button>
            <button
              onClick={() => setFilter('valid')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'valid'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {t.review_filter_valid} ({questions.filter((q) => q.validation_status === 'valid').length})
            </button>
            {needsAnswerCount > 0 && (
              <button
                onClick={() => setFilter('needs_answer')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  filter === 'needs_answer'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <HelpCircle className="w-3 h-3" />
                <span>{t.review_filter_needs_answer} ({needsAnswerCount})</span>
              </button>
            )}
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              {t.review_filter_warning} ({questions.filter((q) => q.validation_status === 'warning').length})
            </button>
            <button
              onClick={() => setFilter('invalid')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'invalid'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              {t.review_filter_invalid} ({questions.filter((q) => q.validation_status === 'invalid').length})
            </button>
          </div>

          <button
            onClick={onAddQuestion}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.review_add_question}</span>
          </button>
        </div>

        {/* Scrollable Question Number Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
          {questions.map((q, idx) => {
            const isSelected = idx === selectedIndex;
            const isFilteredOut =
              filter !== 'all' &&
              (filter === 'needs_answer'
                ? !(q.requires_manual_answer_verification || !q.options.some((o) => o.isCorrect))
                : q.validation_status !== filter);

            const isMissingAnswer = q.requires_manual_answer_verification || !q.options.some((o) => o.isCorrect);

            let statusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
            if (isMissingAnswer) {
              statusIcon = <HelpCircle className="w-3 h-3 text-amber-500" />;
            } else if (q.validation_status === 'warning') {
              statusIcon = <AlertTriangle className="w-3 h-3 text-amber-500" />;
            } else if (q.validation_status === 'invalid') {
              statusIcon = <XCircle className="w-3 h-3 text-rose-500" />;
            }

            return (
              <button
                key={q.id}
                onClick={() => handleSelectIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105'
                    : isFilteredOut
                    ? 'bg-slate-100 text-slate-400 opacity-50'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Q{idx + 1}</span>
                <span className={isSelected ? 'text-white' : ''}>{statusIcon}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Editor Container */}
      {currentQuestion && (
        <div className="space-y-4">
          {/* Question Nav Bar & Status Info */}
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-slate-900">
                Question {selectedIndex + 1} of {questions.length}
              </span>
              <Badge
                variant={
                  currentQuestion.validation_status === 'valid'
                    ? 'success'
                    : currentQuestion.validation_status === 'warning'
                    ? 'warning'
                    : 'danger'
                }
              >
                {currentQuestion.validation_status === 'valid'
                  ? 'Valid'
                  : currentQuestion.validation_status === 'warning'
                  ? 'Warning'
                  : 'Invalid'}
              </Badge>
              {currentQuestion.reviewed && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Reviewed
                </span>
              )}
            </div>

            {/* Prev / Next buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={selectedIndex === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                title={t.review_prev}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={selectedIndex === questions.length - 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                title={t.review_next}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actual Question Editor Form */}
          <QuestionEditor
            question={currentQuestion}
            onChange={(updated) => onUpdateQuestion(selectedIndex, updated)}
            onDelete={() => onDeleteQuestion(selectedIndex)}
          />
        </div>
      )}

      {/* Student View Modal */}
      <QuestionPreviewModal
        question={currentQuestion}
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
      />

      {/* Raw JSON Modal */}
      <RawJsonEditorModal
        question={currentQuestion}
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
      />
    </div>
  );
};
