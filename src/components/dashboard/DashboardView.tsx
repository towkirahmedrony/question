import React from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { ImportBatchStatus, ImportHistoryEntry } from '../../types/question';
import { Badge } from '../common/Badge';
import {
  UploadCloud,
  CheckCircle2,
  Layers,
  ArrowRight,
  AlertTriangle,
  History,
  Eye,
  Copy,
  Sparkles,
  FileQuestion,
} from 'lucide-react';

interface DashboardViewProps {
  onStartUpload: () => void;
  onOpenReview: () => void;
  onOpenHistory: () => void;
  currentBatchQuestionCount: number;
  history: ImportHistoryEntry[];
  isLoadingHistory: boolean;
}

const statusVariant: Record<ImportBatchStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  completed: 'success',
  partial: 'warning',
  failed: 'danger',
  duplicate: 'info',
};

const formatDate = (value: string, language: 'en' | 'bn'): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartUpload,
  onOpenReview,
  onOpenHistory,
  currentBatchQuestionCount,
  history,
  isLoadingHistory,
}) => {
  const { t, language } = useLanguage();

  const totalImported = history.reduce((sum, entry) => sum + entry.imported, 0);
  const totalFailed = history.reduce((sum, entry) => sum + entry.failed, 0);
  const totalDuplicates = history.reduce((sum, entry) => sum + entry.duplicate, 0);
  const recent = history.slice(0, 5);

  const statusLabel = (status: ImportBatchStatus): string => {
    switch (status) {
      case 'completed':
        return t.hist_status_completed;
      case 'partial':
        return t.hist_status_partial;
      case 'failed':
        return t.hist_status_failed;
      default:
        return t.hist_status_duplicate;
    }
  };

  const metrics = [
    {
      label: t.dash_total_imported,
      value: totalImported,
      icon: <CheckCircle2 className="w-4 h-4" />,
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: t.dash_total_batches,
      value: history.length,
      icon: <Layers className="w-4 h-4" />,
      accent: 'bg-slate-100 text-slate-600',
    },
    {
      label: t.dash_failed,
      value: totalFailed,
      icon: <AlertTriangle className="w-4 h-4" />,
      accent: 'bg-rose-50 text-rose-600',
    },
    {
      label: t.dash_duplicates,
      value: totalDuplicates,
      icon: <Copy className="w-4 h-4" />,
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            {t.phase_banner_title}
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            {t.app_title}
          </h1>
          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed mb-6">
            {t.dash_import_cta_sub}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onStartUpload}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-900 font-bold text-sm shadow-lg shadow-black/10 hover:bg-indigo-50 active:scale-98 transition-all"
            >
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              <span>{t.dash_import_cta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenHistory}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-md border border-white/15 transition-all"
            >
              <History className="w-4 h-4 text-indigo-200" />
              <span>{t.dash_view_history}</span>
            </button>

            {currentBatchQuestionCount > 0 && (
              <button
                onClick={onOpenReview}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-medium text-sm border border-indigo-400/40 backdrop-blur-md transition-all ml-auto"
              >
                <Eye className="w-4 h-4" />
                <span>
                  {t.nav_review} ({currentBatchQuestionCount})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics from real import history */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{metric.label}</span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${metric.accent}`}
              >
                {metric.icon}
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {metric.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Recent batches */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">{t.dash_recent_activity}</h3>
          <button
            onClick={onOpenHistory}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {t.dash_view_history}
          </button>
        </div>

        {isLoadingHistory && history.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">{t.hist_loading}</p>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileQuestion className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm text-slate-500">{t.dash_no_history}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">{t.dash_date}</th>
                  <th className="text-left font-semibold px-4 py-3">{t.dash_batch_id}</th>
                  <th className="text-left font-semibold px-4 py-3">{t.dash_subject}</th>
                  <th className="text-right font-semibold px-3 py-3">{t.dash_questions}</th>
                  <th className="text-left font-semibold px-4 py-3">{t.dash_status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((entry) => (
                  <tr key={entry.batch_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {formatDate(entry.imported_at, language)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {entry.batch_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {entry.subject_labels.join(', ') || '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">
                      {entry.imported}/{entry.total}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[entry.status]} size="sm">
                        {statusLabel(entry.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
