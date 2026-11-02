import React, { useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { QuestionItem } from '../../types/question';
import { downloadJsonFile, copyJsonToClipboard, exportQuestionsToJson } from '../../utils/jsonExport';
import { Badge, DifficultyBadge, MockTagBadge } from '../common/Badge';
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
} from 'lucide-react';

interface ImportSummaryViewProps {
  questions: QuestionItem[];
  onReturnToReview: () => void;
  onStartNewBatch: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const ImportSummaryView: React.FC<ImportSummaryViewProps> = ({
  questions,
  onReturnToReview,
  onStartNewBatch,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showJsonPreviewModal, setShowJsonPreviewModal] = useState(false);
  const [showSimulateCommitModal, setShowSimulateCommitModal] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);

  // Stats calculation
  const total = questions.length;
  const validCount = questions.filter((q) => q.validation_status === 'valid').length;
  const warningCount = questions.filter((q) => q.validation_status === 'warning').length;
  const invalidCount = questions.filter((q) => q.validation_status === 'invalid').length;
  const pendingReviewCount = questions.filter((q) => !q.reviewed).length;
  const missingAnswerCount = questions.filter(
    (q) => q.requires_manual_answer_verification || !q.options.some((o) => o.isCorrect)
  ).length;

  const handleCopyJson = async () => {
    const success = await copyJsonToClipboard(questions);
    if (success) {
      setCopied(true);
      onShowToast(t.sum_copied_success, 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadJson = () => {
    downloadJsonFile(questions, `porokh_import_batch_${new Date().toISOString().slice(0, 10)}.json`);
    onShowToast('JSON file downloaded successfully', 'success');
  };

  const handleSimulateCommit = () => {
    if (missingAnswerCount > 0) {
      onShowToast(`Warning: ${missingAnswerCount} question(s) still require a confirmed correct answer.`, 'warning');
    }
    setCommitSuccess(true);
    onShowToast(t.sum_import_simulated_success, 'success');
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto space-y-4 my-8 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{t.sum_title}</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {t.sum_empty_batch}
        </p>
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
      {/* Title & Phase Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.sum_title}</h1>
            <MockTagBadge />
          </div>
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
        </div>
      </div>

      {/* Status Cards (Valid, Warnings, Errors, Missing Answer, Pending) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Valid */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-800">{t.sum_valid_count}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
              {validCount} <span className="text-xs font-medium text-emerald-600">/ {total}</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Passed schema & bilingual checks
            </p>
          </div>
        </div>

        {/* Warnings */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-800">{t.sum_warning_count}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-950">{warningCount}</div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">Non-critical omissions</p>
          </div>
        </div>

        {/* Missing Answer Key */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-orange-800">{t.sum_needs_answer_count}</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-orange-950">{missingAnswerCount}</div>
            <p className="text-[11px] text-orange-700 font-medium mt-1">
              {missingAnswerCount === 0 ? 'All answers confirmed' : 'Requires answer key select'}
            </p>
          </div>
        </div>

        {/* Errors / Invalid */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-800">{t.sum_invalid_count}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-950">{invalidCount}</div>
            <p className="text-[11px] text-rose-700 font-medium mt-1">
              {pendingReviewCount > 0 ? `${pendingReviewCount} unreviewed` : 'Requires user fix'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Action Bar for Export and Simulated Commit */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Sparkles className="w-5 h-5 text-indigo-300" />
            <h3 className="text-lg font-bold text-white">Export & Commit Batch</h3>
          </div>
          <p className="text-xs text-indigo-200">
            Export the standardized JSON schema or test the mock Porokh API pipeline.
          </p>
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold shadow-md shadow-black/10 active:scale-98 transition-all"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>{t.sum_action_export_json}</span>
          </button>

          <button
            onClick={() => setShowSimulateCommitModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-md active:scale-98 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{t.sum_action_porokh_import}</span>
          </button>
        </div>
      </div>

      {/* Question-by-Question Breakdown List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-0">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t.sum_validation_breakdown}</h3>
            <p className="text-xs text-slate-500">Individual status, option count, and diagnostics for each item</p>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Total {questions.length} Questions
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {questions.map((q, idx) => {
            const hasErrors = q.validation_errors.length > 0;
            const hasWarnings = q.validation_warnings.length > 0;
            const isMissingAnswer = q.requires_manual_answer_verification || !q.options.some((o) => o.isCorrect);

            return (
              <div key={q.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <Badge
                      variant={
                        q.validation_status === 'valid'
                          ? 'success'
                          : q.validation_status === 'warning'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {q.validation_status === 'valid'
                        ? 'Valid'
                        : q.validation_status === 'warning'
                        ? 'Warning'
                        : 'Invalid'}
                    </Badge>
                    <DifficultyBadge level={q.difficulty_level} />
                    {isMissingAnswer && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                        <HelpCircle className="w-3 h-3 text-amber-600" />
                        Needs Answer Key
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {q.options.length} Options
                    </span>
                    {q.reviewed ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reviewed
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Unverified</span>
                    )}
                  </div>
                </div>

                {/* Question Bengali snippet */}
                <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2">
                  {q.body.text_bn || <span className="text-rose-500 italic">(Missing Bengali question text)</span>}
                </p>

                {/* Question English snippet */}
                {q.body.text_en && (
                  <p className="text-xs text-slate-500 line-clamp-1 italic">
                    EN: {q.body.text_en}
                  </p>
                )}

                {/* Diagnostics list */}
                {(hasErrors || hasWarnings) && (
                  <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                    {q.validation_errors.map((err, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded"
                      >
                        <XCircle className="w-3 h-3" />
                        {err}
                      </span>
                    ))}
                    {q.validation_warnings.map((warn, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {warn}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* JSON Viewer Modal */}
      <Modal
        isOpen={showJsonPreviewModal}
        onClose={() => setShowJsonPreviewModal(false)}
        title="Complete Batch JSON Payload"
        maxWidth="4xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Standardized bilingual MCQ JSON schema ({questions.length} items):</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-auto max-h-[60vh] border border-slate-800 leading-relaxed">
            {exportQuestionsToJson(questions)}
          </pre>
        </div>
      </Modal>

      {/* Simulated Porokh Commit Modal */}
      <Modal
        isOpen={showSimulateCommitModal}
        onClose={() => {
          setShowSimulateCommitModal(false);
          setCommitSuccess(false);
        }}
        title="Simulated Porokh Import"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MockTagBadge />
            <span className="text-xs text-slate-500">Phase 2 Sandbox Mode</span>
          </div>

          {!commitSuccess ? (
            <>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                You are about to simulate committing <span className="font-bold text-slate-900">{validCount} valid questions</span> to the Porokh Question Bank.
              </p>

              {missingAnswerCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                  <span className="font-bold block">⚠️ Unconfirmed Answers Detected:</span>
                  <span>
                    {missingAnswerCount} question(s) do not have confirmed correct options. They will be flagged for teacher review upon import.
                  </span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1">
                <span className="font-bold block text-slate-800">Phase 2 Notice:</span>
                <span>
                  No direct database writes occur in this phase. This validates the schema and prepares questions for Phase 3 ingestion.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateCommitModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  {t.btn_cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSimulateCommit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
                >
                  Confirm Simulation
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Simulation Succeeded!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {validCount} questions were processed and verified against the Porokh bilingual schema.
              </p>
              <div className="pt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSimulateCommitModal(false);
                    setCommitSuccess(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                >
                  {t.btn_close}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
