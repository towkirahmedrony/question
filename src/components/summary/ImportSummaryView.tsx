import React, { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { ImportBatchResult } from '../../types/import';
import { importPlainText } from '../../services/plainTextImportService';
import { readErrorMessage } from '../../services/apiClient';
import { TaxonomySelector } from '../review/TaxonomySelector';
import { countQuestionBlocks } from '../../utils/plainText';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  History,
  Loader2,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface ImportSummaryViewProps {
  text: string;
  sourceLabel: string | null;
  onBack: () => void;
  onStartNewBatch: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onOpenHistory: () => void;
}

export const ImportSummaryView: React.FC<ImportSummaryViewProps> = ({
  text,
  sourceLabel,
  onBack,
  onStartNewBatch,
  onShowToast,
  onOpenHistory,
}) => {
  const { t } = useLanguage();
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [precheck, setPrecheck] = useState<ImportBatchResult | null>(null);
  const [result, setResult] = useState<ImportBatchResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // One in-flight submission at a time: no accidental repeated imports.
  const submitLock = useRef(false);

  const questionCount = useMemo(() => countQuestionBlocks(text), [text]);
  const taxonomyReady = Boolean(subjectId && chapterId);
  const parseErrors = result?.parse.errors ?? precheck?.parse.errors ?? [];
  const duplicateRows = precheck?.results.filter((row) => row.status === 'duplicate') ?? [];
  const failedRows = result?.results.filter((row) => row.status === 'failed') ?? [];

  const runCheck = async () => {
    if (submitLock.current || isImporting || isChecking) return;

    if (!taxonomyReady) {
      onShowToast('Select a subject and chapter before importing.', 'warning');
      return;
    }

    submitLock.current = true;
    setIsChecking(true);
    setPrecheck(null);
    setResult(null);

    try {
      setPrecheck(
        await importPlainText({
          text,
          subjectId,
          chapterId,
          topicId,
          dryRun: true,
          sourceLabel,
        })
      );
    } catch (error) {
      onShowToast(readErrorMessage(error, t.imp_check_failed), 'error');
    } finally {
      submitLock.current = false;
      setIsChecking(false);
    }
  };

  const runImport = async () => {
    if (submitLock.current || isChecking || isImporting) return;

    if (!taxonomyReady) {
      onShowToast('Select a subject and chapter before importing.', 'warning');
      return;
    }

    submitLock.current = true;
    setIsImporting(true);
    setResult(null);

    try {
      const response = await importPlainText({
        text,
        subjectId,
        chapterId,
        topicId,
        dryRun: false,
        sourceLabel,
      });

      setResult(response);
      setPrecheck(null);

      const counts = response.counts;
      if (counts.imported === 0 && counts.duplicate > 0) {
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

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{t.sum_title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            The approved Structured Plain Text is parsed, validated and linked on the backend. Subject
            and chapter are the only fields the text does not carry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.sum_action_return_review}
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            {t.nav_history}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-semibold text-slate-500">Question blocks</p>
          <p className="text-2xl font-extrabold text-slate-900">{questionCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5">
          <p className="text-[11px] font-semibold text-emerald-700">{t.imp_ready}</p>
          <p className="text-2xl font-extrabold text-emerald-900">
            {result?.counts.imported ?? precheck?.counts.imported ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3.5">
          <p className="text-[11px] font-semibold text-sky-700">{t.imp_counts_duplicates}</p>
          <p className="text-2xl font-extrabold text-sky-900">
            {result?.counts.duplicate ?? precheck?.counts.duplicate ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5">
          <p className="text-[11px] font-semibold text-rose-700">{t.imp_counts_invalid}</p>
          <p className="text-2xl font-extrabold text-rose-900">
            {result?.counts.invalid ?? precheck?.counts.invalid ?? parseErrors.length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Curriculum for this batch
        </div>
        <TaxonomySelector
          subjectId={subjectId}
          chapterId={chapterId}
          topicId={topicId}
          onChangeSubject={setSubjectId}
          onChangeChapter={setChapterId}
          onChangeTopic={setTopicId}
        />
      </div>

      {parseErrors.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-white p-4 space-y-2">
          <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            {t.text_parse_errors}
          </p>
          <ul className="space-y-1.5">
            {parseErrors.map((issue, index) => (
              <li
                key={`parse-${index}`}
                className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-[11px] text-rose-800"
              >
                <span className="font-semibold">
                  {issue.question > 0 ? `Q${issue.question}` : '@header'} · line {issue.line}
                </span>
                <p>{issue.messages.join(' ')}</p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500">
            These blocks are skipped; the valid blocks below can still be imported. Go back to the
            editor to fix them.
          </p>
        </div>
      )}

      {duplicateRows.length > 0 && (
        <div className="rounded-2xl border border-sky-200 bg-white p-4 space-y-2">
          <p className="text-xs font-bold text-sky-800">{t.imp_duplicates_found}</p>
          <ul className="list-disc list-inside text-[11px] text-sky-800 space-y-0.5">
            {duplicateRows.map((row) => (
              <li key={`dup-${row.index}`}>
                Q{row.index + 1}:{' '}
                {row.existing_question_id
                  ? `already in the bank (${row.existing_question_id.slice(0, 8)})`
                  : row.errors.join(' ')}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500">{t.imp_duplicates_desc}</p>
        </div>
      )}

      {failedRows.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-white p-4 space-y-2">
          <p className="text-xs font-bold text-rose-800">{t.imp_counts_failed}</p>
          <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
            {failedRows.map((row) => (
              <li key={`failed-${row.index}`}>
                Q{row.index + 1}: {row.errors.join(' ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {precheck && duplicateRows.length === 0 && !result && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4" />
          {t.imp_no_duplicates}
        </div>
      )}

      {result && (
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
      )}

      {result ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="w-4 h-4" />
            {t.imp_result_title}: {result.counts.imported} imported, {result.counts.duplicate}{' '}
            duplicate, {result.counts.failed} failed.
          </div>
          <button
            type="button"
            onClick={onStartNewBatch}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            New batch
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            {taxonomyReady
              ? 'Check runs duplicate detection without writing; Import commits the valid questions.'
              : 'Select a subject and chapter to enable the check and import.'}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runCheck()}
              disabled={!taxonomyReady || isChecking || isImporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold disabled:opacity-50"
            >
              <Loader2 className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : 'hidden'}`}
              />
              {isChecking ? t.imp_checking : t.imp_check_button}
            </button>

            <button
              type="button"
              onClick={() => void runImport()}
              disabled={!taxonomyReady || isImporting || isChecking}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {isImporting ? t.imp_importing : t.imp_confirm_button}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
