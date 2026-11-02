import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { fetchImportHistory } from '../../services/importService';
import { readErrorMessage } from '../../services/apiClient';
import type { ImportBatchStatus, ImportHistoryEntry } from '../../types/question';
import { Badge } from '../common/Badge';
import { History, RefreshCw, AlertTriangle, Inbox } from 'lucide-react';

interface ImportHistoryViewProps {
  /** Bumped by the app after a successful import so the list refreshes. */
  refreshKey: number;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const statusVariant: Record<ImportBatchStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  completed: 'success',
  partial: 'warning',
  failed: 'danger',
  duplicate: 'info',
};

const formatDate = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ImportHistoryView: React.FC<ImportHistoryViewProps> = ({
  refreshKey,
  onShowToast,
}) => {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setHistory(await fetchImportHistory());
    } catch (cause) {
      const message = readErrorMessage(cause, t.hist_error);
      setError(message);
      onShowToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast, t.hist_error]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

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

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>{t.hist_title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">{t.hist_subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold shadow-xs transition-colors self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t.hist_refresh}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading && history.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">{t.hist_loading}</p>
        ) : history.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <p className="text-sm text-slate-600">{t.hist_empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">{t.hist_date}</th>
                  <th className="text-left font-semibold px-4 py-3">{t.hist_batch}</th>
                  <th className="text-right font-semibold px-3 py-3">{t.hist_total}</th>
                  <th className="text-right font-semibold px-3 py-3">{t.hist_success}</th>
                  <th className="text-right font-semibold px-3 py-3">{t.hist_failed}</th>
                  <th className="text-right font-semibold px-3 py-3">{t.hist_duplicates}</th>
                  <th className="text-left font-semibold px-4 py-3">{t.hist_status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((entry) => (
                  <tr key={entry.batch_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {formatDate(entry.imported_at, language)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {entry.batch_id.slice(0, 8)}
                      </span>
                      {entry.subject_labels.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {entry.subject_labels.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">{entry.total}</td>
                    <td className="px-3 py-3 text-right text-emerald-700 font-semibold">
                      {entry.imported}
                    </td>
                    <td className="px-3 py-3 text-right text-rose-700 font-semibold">{entry.failed}</td>
                    <td className="px-3 py-3 text-right text-amber-700 font-semibold">
                      {entry.duplicate}
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
