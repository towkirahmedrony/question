import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { PlainTextParseResult } from '../../types/import';
import { parsePlainText } from '../../services/plainTextImportService';
import { readErrorMessage } from '../../services/apiClient';
import { countQuestionBlocks, copyPlainText, downloadPlainText } from '../../utils/plainText';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';

interface PlainTextReviewViewProps {
  text: string;
  onChange: (text: string) => void;
  extractionWarnings: string[];
  extractionFailures: Array<{ name: string; error: string }>;
  onBack: () => void;
  onContinue: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const PlainTextReviewView: React.FC<PlainTextReviewViewProps> = ({
  text,
  onChange,
  extractionWarnings,
  extractionFailures,
  onBack,
  onContinue,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const [parseResult, setParseResult] = useState<PlainTextParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [copied, setCopied] = useState(false);

  const questionCount = useMemo(() => countQuestionBlocks(text), [text]);

  const validate = useCallback(
    async (silent = false) => {
      if (text.trim() === '') {
        setParseResult(null);
        setParseError(null);
        return;
      }

      setIsParsing(true);
      setParseError(null);

      try {
        setParseResult(await parsePlainText(text));
      } catch (error) {
        const message = readErrorMessage(error, t.import_extraction_failed);
        setParseResult(null);
        setParseError(message);
        if (!silent) onShowToast(message, 'error');
      } finally {
        setIsParsing(false);
      }
    },
    [text, onShowToast, t.import_extraction_failed]
  );

  // Validate once on arrival so problems are visible without an extra click.
  useEffect(() => {
    void validate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async () => {
    if (await copyPlainText(text)) {
      setCopied(true);
      onShowToast(t.text_copied, 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      onShowToast('Copy failed. Select the text and copy it manually.', 'error');
    }
  };

  const validCount = parseResult?.counts.valid ?? 0;
  const canContinue = text.trim() !== '' && validCount > 0;

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
            {t.text_review_title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">{t.text_review_subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.nav_upload}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={text.trim() === ''}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-indigo-600" />
            )}
            {t.text_copy}
          </button>
          <button
            type="button"
            onClick={() => downloadPlainText(text)}
            disabled={text.trim() === ''}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            {t.text_download}
          </button>
        </div>
      </div>

      {/* Extraction notes */}
      {(extractionWarnings.length > 0 || extractionFailures.length > 0) && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
            <AlertTriangle className="w-4 h-4 text-sky-600" />
            {t.review_extraction_warnings}
          </div>
          <ul className="list-disc list-inside text-xs text-sky-800 space-y-0.5">
            {extractionWarnings.map((warning, index) => (
              <li key={`warning-${index}`}>{warning}</li>
            ))}
            {extractionFailures.map((failure) => (
              <li key={`failure-${failure.name}`} className="text-rose-800">
                {failure.name}: {failure.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-semibold text-slate-500">{t.text_questions.replace('{count}', '')}</p>
          <p className="text-2xl font-extrabold text-slate-900">{questionCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5">
          <p className="text-[11px] font-semibold text-emerald-700">{t.review_filter_valid}</p>
          <p className="text-2xl font-extrabold text-emerald-900">{validCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5">
          <p className="text-[11px] font-semibold text-rose-700">{t.review_filter_invalid}</p>
          <p className="text-2xl font-extrabold text-rose-900">
            {parseResult ? parseResult.counts.total - parseResult.counts.valid : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-semibold text-slate-500">{t.review_filter_warning}</p>
          <p className="text-2xl font-extrabold text-amber-700">
            {parseResult ? parseResult.warnings.length : '—'}
          </p>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            {t.import_guide_title}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void validate()}
              disabled={isParsing || text.trim() === ''}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
              {isParsing ? t.text_validating : t.text_validate}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setParseResult(null);
                setParseError(null);
              }}
              disabled={text.trim() === ''}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.text_clear}
            </button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t.text_review_placeholder}
          spellCheck={false}
          rows={24}
          className="w-full resize-y bg-slate-950 text-slate-100 font-mono text-[12px] leading-6 px-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>

      {parseError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      {parseResult && (
        <div className="space-y-3">
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
              parseResult.counts.invalid > 0
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            {t.text_valid
              .replace('{valid}', String(parseResult.counts.valid))
              .replace('{total}', String(parseResult.counts.total))}
          </div>

          {parseResult.errors.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-white p-4 space-y-2">
              <p className="text-xs font-bold text-rose-800">{t.text_parse_errors}</p>
              <ul className="space-y-2">
                {parseResult.errors.map((issue, index) => (
                  <li
                    key={`error-${index}`}
                    className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-[11px] text-rose-800"
                  >
                    <span className="font-semibold">
                      {issue.question > 0 ? `Q${issue.question}` : '@header'} · line {issue.line}
                    </span>
                    <p className="mt-0.5">{issue.messages.join(' ')}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parseResult.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-white p-4 space-y-2">
              <p className="text-xs font-bold text-amber-800">{t.text_parse_warnings}</p>
              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                {parseResult.warnings.map((issue, index) => (
                  <li key={`warning-parse-${index}`}>
                    {issue.question > 0 ? `Q${issue.question}: ` : ''}
                    {issue.messages.join(' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parseResult.reference_checks.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <p className="text-xs font-bold text-slate-800">{t.text_reference_links}</p>
              <ul className="space-y-1.5">
                {parseResult.reference_checks.map((check, index) => (
                  <li
                    key={`ref-${index}`}
                    className={`rounded-lg border px-3 py-2 text-[11px] ${
                      check.status === 'ok'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    <span className="font-semibold">{check.institution_input}</span>
                    {check.unit_input ? ` · ${check.unit_input}` : ''} — {check.message}
                    {check.suggestions && check.suggestions.length > 0 && (
                      <span className="block mt-0.5 opacity-80">
                        Suggestions: {check.suggestions.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <p className="text-[11px] text-slate-500">
          {questionCount > 0 ? t.text_questions.replace('{count}', String(questionCount)) : t.import_empty}
        </p>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || isParsing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50"
        >
          <Loader2 className={`w-4 h-4 ${isParsing ? 'animate-spin' : 'hidden'}`} />
          {t.text_continue}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
