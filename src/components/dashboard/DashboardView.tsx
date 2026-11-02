import React from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { MOCK_DASHBOARD_HISTORY, MOCK_DASHBOARD_METRICS } from '../../data/mockDashboard';
import { MockTagBadge, Badge } from '../common/Badge';
import {
  UploadCloud,
  CheckCircle2,
  FileQuestion,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface DashboardViewProps {
  onStartUpload: () => void;
  onLoadSampleBatch: () => void;
  onOpenReview: () => void;
  currentBatchQuestionCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartUpload,
  onLoadSampleBatch,
  onOpenReview,
  currentBatchQuestionCount,
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome / Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Porokh Exam Engine
            </span>
            <MockTagBadge />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            {t.app_title}
          </h1>
          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed mb-6">
            {t.dash_import_cta_sub}. {t.phase_banner_desc}
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
              onClick={onLoadSampleBatch}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-md border border-white/15 transition-all"
            >
              <FileQuestion className="w-4 h-4 text-indigo-200" />
              <span>{t.dash_view_sample}</span>
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

      {/* Metrics Row (Clearly labeled mock metrics) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
          <span>Overview Statistics</span>
          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
            {t.dash_mock_notice}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{t.dash_total_imported}</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {MOCK_DASHBOARD_METRICS.totalImportedAllTime.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>+124 questions this month</span>
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{t.dash_total_batches}</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {MOCK_DASHBOARD_METRICS.totalBatchesProcessed}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Across 8 Board & Admission tests</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{t.dash_accuracy_rate}</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {MOCK_DASHBOARD_METRICS.averageAccuracyRate}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Bilingual OCR & formula fidelity</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{t.dash_pending_review}</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentBatchQuestionCount > 0 ? currentBatchQuestionCount : MOCK_DASHBOARD_METRICS.pendingReviewBatches}
              </div>
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                {currentBatchQuestionCount > 0 ? 'Active in review session' : 'Batches awaiting verification'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Workflow Guide */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4">How Porokh Importer Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-0.5">Upload Question Images</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Take photos with camera or drop question paper scans. Supports multi-image batching.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-0.5">Review & Enrich</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Refine bilingual Bengali/English text, options, explanations, exam references, and NCTB subject/chapter taxonomy.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-0.5">Summary & Export</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Run automated schema validation, download clean structured JSON, or commit to Porokh Question Bank.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table (Mock Data) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t.dash_recent_activity}</h3>
            <p className="text-xs text-slate-500">Historical mock records from previous extraction sessions</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Mock Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-100 font-semibold">
              <tr>
                <th className="px-4 py-3">{t.dash_batch_id}</th>
                <th className="px-4 py-3">{t.dash_subject}</th>
                <th className="px-4 py-3">Source File</th>
                <th className="px-4 py-3 text-center">{t.dash_questions}</th>
                <th className="px-4 py-3">{t.dash_date}</th>
                <th className="px-4 py-3 text-right">{t.dash_status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_DASHBOARD_HISTORY.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-800">
                    {batch.batchNumber}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-900">
                    {language === 'bn' ? batch.subjectNameBn : batch.subjectNameEn}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                    {batch.sourceName}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-semibold text-slate-900">{batch.validCount}</span>
                    <span className="text-slate-400">/{batch.totalQuestions}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">{batch.date}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Badge variant={batch.status === 'imported' ? 'success' : 'warning'} size="sm">
                      {batch.status === 'imported' ? t.dash_status_imported : t.dash_status_partial}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
