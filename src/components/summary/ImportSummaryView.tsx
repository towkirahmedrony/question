import React, { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import type { ImportBatchResult, QuestionItem } from '../../types/question';
import { buildImportPayload } from '../../utils/validation';
import { downloadJsonFile, copyJsonToClipboard, exportQuestionsToJson } from '../../utils/jsonExport';
import { submitImport } from '../../services/importService';
import { readErrorMessage } from '../../services/apiClient';
import { Badge, DifficultyBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Download,
  PlusCircle,
  Sparkles,
  Edit3,
  Layers,
  Send,
  Code,
  Check,
  HelpCircle,
  History,
  RefreshCw,
  UploadCloud,
  Ban,
} from 'lucide-react';

interface ImportSummaryViewProps {
  questions: QuestionItem[];
  onReturnToReview: () => void;
  onStartNewBatch: () => void;
  onImportFinished: (remaining: QuestionItem[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onOpenHistory: () => void;
}

export const ImportSummaryView: React.FC<ImportSummaryViewProps> = ({
  questions,
  onReturnToReview,
  onStartNewBatch,
  onImportFinished,
  onShowToast,
  onOpenHistory,
}) => {
  const { t } = useLanguage();
  const { subjects } = useTaxonomyOptions();

  const [copied, setCopied] = useState(false);
  const [showJsonPreviewModal, setShowJsonPreviewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [precheck, setPrecheck] = useState<ImportBatchResult | null>(null);
  const [result, setResult] = useState<ImportBatchResult | null>(null);
  const [lastBatch, setLastBatch] = useState<QuestionItem[]>([]);
  const [retryable, setRetryable] = useState<QuestionItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Guards against a double click / duplicate submit while a request is open.
  const submitLock = useRef(false);

  const importable = useMemo(
    () => questions.filter((question) => question.validation_errors.length === 0),
    [questions]
  );
  const invalidCount = questions.length - importable.length;
  const warningCount = questions.filter(
    (question) => question.validation_status === 'warning'
  ).length;
  const pendingReviewCount = questions.filter((question) => !question.reviewed).length;
  const missingAnswerCount = questions.filter(
    (question) => !question.options.some((option) => option.isCorrect)
  ).length;

  const subjectLabels = useMemo(() => {
    const ids = Array.from(
      new Set(importable.map((question) => question.subject_id).filter(Boolean))
    ) as string[];

    return ids
      .map((id) => subjects.find((subject) => subject.id === id))
      .map((subject) => subject?.name_en || subject?.name_bn || '')
      .filter(Boolean);
  }, [importable, subjects]);

  const duplicateCount = precheck?.counts.duplicate ?? 0;
  const duplicateRows = useMemo(
    () => (precheck ? precheck.results.filter((row) => row.status === 'duplicate') : []),
    [precheck]
  );
  const failedRows = useMemo(
    () => (result ? result.results.filter((row) => row.status === 'failed') : []),
    [result]
  );

  const handleCopyJson = async () => {
    const success = await copyJsonToClipboard(questions);
    if (success) {
      setCopied(true);
      onShowToast(t.sum_copied_success, 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadJson = () => {
    downloadJsonFile(
      questions,
      `porokh_import_batch_${new Date().toISOString().slice(0, 10)}.json`
    );
    onShowToast('JSON file downloaded successfully', 'success');
  };

  /** Nothing may be imported until every question in the batch has been reviewed. */
  const reviewGateMessage = () =>
    t.imp_review_gate.replace('{count}', String(pendingReviewCount));

  const openImportModal = () => {
    if (pendingReviewCount > 0) {
      onShowToast(reviewGateMessage(), 'warning');
      return;
    }

    setShowImportModal(true);
    setPrecheck(null);
    setResult(null);
    setRetryable([]);
  };

  /** Dry run: validation + duplicate detection without writing anything. */
  const runPrecheck = async () => {
    if (isChecking || isImporting) return;

    if (importable.length === 0) {
      onShowToast(t.imp_no_valid, 'warning');
      return;
    }

    setIsChecking(true);
    setPrecheck(null);
    setResult(null);

    try {
      const response = await submitImport({
        questions: importable.map(buildImportPayload),
        dryRun: true,
        subjectLabels,
      });
      setPrecheck(response);
    } catch (error) {
      onShowToast(readErrorMessage(error, t.imp_check_failed), 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const runImport = async (batch: QuestionItem[]) => {
    if (submitLock.current || batch.length === 0) return;

    if (batch.some((question) => !question.reviewed)) {
      onShowToast(reviewGateMessage(), 'warning');
      return;
    }

    submitLock.current = true;
    setIsImporting(true);
    setResult(null);
    setLastBatch(batch);

    try {
      const response = await submitImport({
        questions: batch.map(buildImportPayload),
        dryRun: false,
        subjectLabels,
      });

      setResult(response);
      setPrecheck(null);

      const resolvedIds = new Set(
        batch
          .filter((_, index) => {
            const status = response.results.find((row) => row.index === index)?.status;
            return status === 'imported' || status === 'duplicate';
          })
          .map((question) => question.id)
      );

      const failed = batch.filter((_, index) => {
        const status = response.results.find((row) => row.index === index)?.status;
        return status === 'failed';
      });

      setRetryable(failed);
      onImportFinished(questions.filter((question) => !resolvedIds.has(question.id)));

      const counts = response.counts;
      if (counts.imported === 0 && counts.failed === 0 && counts.duplicate > 0) {
        onShowToast(`${counts.duplicate} duplicate question(s) were skipped.`, 'warning');
      } else if (counts.failed > 0) {
        onShowToast(
          `${counts.imported} imported, ${counts.duplicate} duplicate, ${counts.failed} failed.`,
          'warning'
        );
      } else {
        onShowToast(`${counts.imported} question(s) imported to the question bank.`, 'success');
      }
    } catch (error) {
      onShowToast(readErrorMessage(error, t.imp_confirm_failed), 'error');
    } finally {
      submitLock.current = false;
      setIsImporting(false);
    }
  };

  const handleImportSingle = (question: QuestionItem) => {
    if (question.validation_errors.length > 0 || !question.reviewed) return;
    openImportModal();
    void runImport([question]);
  };

  const textOf = (question: QuestionItem | undefined, index: number): string => {
    if (!question) return `#${index + 1}`;
    return question.body.text_bn || question.body.text_en || `#${index + 1}`;
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto space-y-4 my-8 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{t.sum_title}</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{t.sum_empty_batch}</p>
        <button
          onClick={onReturnToReview}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-colors"
        >
          {t.sum_action_return_review}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Title & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{t.sum_title}</h1>
          <p className="text-xs sm:text-sm text-slate-500">{t.sum_subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStartNewBatch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>New Batch</span>
          </button>
          <button
            onClick={onReturnToReview}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t.sum_action_return_review}</span>
          </button>
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.nav_history}</span>
          </button>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-800">{t.sum_valid_count}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
            {importable.length} <span className="text-xs font-medium text-emerald-600">/ {questions.length}</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Reached the admin-compatible schema
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-800">{t.sum_warning_count}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-950">{warningCount}</div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Non-critical omissions</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sky-800">{t.sum_duplicate_count}</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-950">{duplicateCount}</div>
          <p className="text-[11px] text-sky-700 font-medium mt-1">
            {precheck ? t.imp_duplicates_found : t.imp_check_title}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-800">{t.sum_invalid_count}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-950">{invalidCount}</div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">
            {missingAnswerCount > 0
              ? `${missingAnswerCount} missing an answer key`
              : pendingReviewCount > 0
                ? `${pendingReviewCount} unreviewed`
                : 'Ready for the importer'}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Sparkles className="w-5 h-5 text-indigo-300" />
            <h3 className="text-lg font-bold text-white">{t.imp_check_title}</h3>
          </div>
          <p className="text-xs text-indigo-200">
            {t.imp_check_desc} ({importable.length}/{questions.length})
          </p>
          {pendingReviewCount > 0 && (
            <p className="text-[11px] font-semibold text-amber-300">{reviewGateMessage()}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => setShowJsonPreviewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-md transition-all"
          >
            <Code className="w-4 h-4 text-indigo-200" />
            <span>View Full JSON</span>
          </button>

          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-md transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t.btn_copied : t.sum_action_copy_json}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-md transition-all"
          >
            <Download className="w-4 h-4 text-indigo-200" />
            <span>{t.sum_action_export_json}</span>
          </button>

          <button
            onClick={openImportModal}
            disabled={pendingReviewCount > 0}
            title={pendingReviewCount > 0 ? reviewGateMessage() : undefined}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-md active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{t.imp_check_button}</span>
          </button>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t.sum_validation_breakdown}</h3>
            <p className="text-xs text-slate-500">
              Individual status, answer key and diagnostics for each item
            </p>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Total {questions.length} Questions
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {questions.map((question, index) => {
            const hasErrors = question.validation_errors.length > 0;
            const canImport = !hasErrors;

            return (
              <div key={question.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <Badge
                      variant={
                        question.validation_status === 'valid'
                          ? 'success'
                          : question.validation_status === 'warning'
                            ? 'warning'
                            : 'danger'
                      }
                      size="sm"
                    >
                      {question.validation_status === 'valid'
                        ? 'Valid'
                        : question.validation_status === 'warning'
                          ? 'Warning'
                          : 'Invalid'}
                    </Badge>
                    <DifficultyBadge level={question.difficulty_level} />
                    {!question.options.some((option) => option.isCorrect) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                        <HelpCircle className="w-3 h-3 text-amber-600" />
                        Needs Answer Key
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {question.options.length} Options
                    </span>
                    <button
                      type="button"
                      onClick={() => handleImportSingle(question)}
                      disabled={!canImport || isImporting || !question.reviewed}
                      title={!question.reviewed ? t.review_reviewed_checkbox : undefined}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 text-indigo-700 text-[11px] font-semibold transition-colors"
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>{t.imp_single}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2">
                  {question.body.text_bn || (
                    <span className="text-rose-500 italic">(Missing Bengali question text)</span>
                  )}
                </p>

                {question.body.text_en && (
                  <p className="text-xs text-slate-500 line-clamp-1 italic">
                    EN: {question.body.text_en}
                  </p>
                )}

                {(hasErrors || question.validation_warnings.length > 0) && (
                  <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                    {question.validation_errors.map((error, errorIndex) => (
                      <span
                        key={errorIndex}
                        className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded"
                      >
                        <XCircle className="w-3 h-3" />
                        {error}
                      </span>
                    ))}
                    {question.validation_warnings.map((warning, warningIndex) => (
                      <span
                        key={warningIndex}
                        className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {warning}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* JSON viewer */}
      <Modal
        isOpen={showJsonPreviewModal}
        onClose={() => setShowJsonPreviewModal(false)}
        title="Complete Batch JSON Payload"
        maxWidth="4xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Admin-panel-compatible JSON ({questions.length} items):</span>
            <button
              type="button"
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.btn_copied : 'Copy JSON'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-auto max-h-[60vh] border border-slate-800 leading-relaxed">
            {exportQuestionsToJson(questions)}
          </pre>
        </div>
      </Modal>

      {/* Import workflow */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          if (isImporting) return;
          setShowImportModal(false);
        }}
        title={result ? t.imp_result_title : t.imp_check_title}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {result ? (
            <>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.imp_result_desc}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: t.imp_counts_imported, value: result.counts.imported, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  { label: t.imp_counts_duplicates, value: result.counts.duplicate, tone: 'text-sky-700 bg-sky-50 border-sky-200' },
                  { label: t.imp_counts_failed, value: result.counts.failed, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
                  { label: t.imp_counts_invalid, value: result.counts.invalid, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
                ].map((item) => (
                  <div key={item.label} className={`p-3 rounded-xl border ${item.tone}`}>
                    <p className="text-[11px] font-semibold">{item.label}</p>
                    <p className="text-xl font-extrabold">{item.value}</p>
                  </div>
                ))}
              </div>

              {failedRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-rose-800">{t.imp_counts_failed}</p>
                  <div className="max-h-48 overflow-auto space-y-1.5">
                    {failedRows.map((row) => (
                      <div
                        key={row.index}
                        className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800"
                      >
                        <p className="font-semibold line-clamp-1">
                          #{row.index + 1} {textOf(lastBatch[row.index], row.index)}
                        </p>
                        <p className="text-rose-700">{row.errors.join(' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                {retryable.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void runImport(retryable)}
                    disabled={isImporting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-xs font-bold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                    <span>
                      {t.imp_retry} ({retryable.length})
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{t.imp_history}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  {t.imp_done}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.imp_check_desc}
              </p>

              {precheck ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                      <p className="text-[11px] font-semibold text-emerald-800">{t.imp_ready}</p>
                      <p className="text-xl font-extrabold text-emerald-900">
                        {precheck.counts.imported}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-sky-200 bg-sky-50">
                      <p className="text-[11px] font-semibold text-sky-800">
                        {t.imp_counts_duplicates}
                      </p>
                      <p className="text-xl font-extrabold text-sky-900">
                        {precheck.counts.duplicate}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-rose-200 bg-rose-50">
                      <p className="text-[11px] font-semibold text-rose-800">
                        {t.imp_counts_invalid}
                      </p>
                      <p className="text-xl font-extrabold text-rose-900">
                        {precheck.counts.invalid}
                      </p>
                    </div>
                  </div>

                  {duplicateRows.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-sky-900">{t.imp_duplicates_found}</p>
                      <div className="max-h-48 overflow-auto space-y-1.5">
                        {duplicateRows.map((row) => (
                          <div
                            key={row.index}
                            className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-900"
                          >
                            <p className="font-semibold line-clamp-1">
                              #{row.index + 1} {textOf(importable[row.index], row.index)}
                            </p>
                            <p className="text-sky-700">
                              {row.existing_question_id
                                ? `Existing question ${row.existing_question_id.slice(0, 8)}`
                                : row.errors.join(' ')}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">{t.imp_duplicates_desc}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      {t.imp_no_duplicates}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                    >
                      {t.btn_cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runImport(importable)}
                      disabled={isImporting || precheck.counts.imported === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isImporting ? t.imp_importing : `${t.imp_confirm_button} (${precheck.counts.imported})`}</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">{t.imp_confirm_title}</p>
                    <p>{t.imp_confirm_desc}</p>
                    <p>
                      {importable.length} {t.imp_ready} · {invalidCount} {t.imp_counts_invalid}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                    >
                      {t.btn_cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runPrecheck()}
                      disabled={isChecking || importable.length === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                      <span>{isChecking ? t.imp_checking : t.imp_check_button}</span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
