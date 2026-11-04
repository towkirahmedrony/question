import React, { useRef, useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { ImportSource } from '../../types/import';
import { FormatGuide } from './FormatGuide';
import { classifyFile } from '../../services/sourceProcessing';
import { isNativeApp } from '../../services/platform';
import type { ImagePickSource } from '../../utils/imagePick';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Camera,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

interface ImportViewProps {
  sources: ImportSource[];
  pastedText: string;
  onPasteChange: (text: string) => void;
  onAddFiles: (files: File[]) => void;
  onPickImages: (source: ImagePickSource) => Promise<void>;
  onRemoveSource: (id: string) => void;
  onMoveSource: (id: string, direction: -1 | 1) => void;
  onRetrySource: (id: string) => void;
  onClearAll: () => void;
  onProcess: () => void;
  onCancel: () => void;
  isExtracting: boolean;
  isOnline: boolean;
  progress: { current: number; total: number; label: string } | null;
  questionCount: number;
  onContinue: () => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const kindIcon = (kind: ImportSource['kind']) => {
  if (kind === 'image') return <ImageIcon className="w-4 h-4" />;
  if (kind === 'csv') return <FileSpreadsheet className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

export const ImportView: React.FC<ImportViewProps> = ({
  sources,
  pastedText,
  onPasteChange,
  onAddFiles,
  onPickImages,
  onRemoveSource,
  onMoveSource,
  onRetrySource,
  onClearAll,
  onProcess,
  onCancel,
  isExtracting,
  isOnline,
  progress,
  questionCount,
  onContinue,
}) => {
  const { t } = useLanguage();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const native = isNativeApp();

  const pickImages = async (source: ImagePickSource) => {
    setIsPicking(true);
    try {
      await onPickImages(source);
    } finally {
      setIsPicking(false);
    }
  };

  const acceptFiles = (files: FileList | File[]) => {
    setValidationError(null);

    const accepted: File[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      const result = classifyFile(file);
      if ('error' in result) errors.push(result.error);
      else accepted.push(file);
    }

    if (accepted.length > 0) onAddFiles(accepted);
    if (errors.length > 0) setValidationError(errors.slice(0, 3).join(' '));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 0) acceptFiles(event.dataTransfer.files);
  };

  const canProcess =
    (pastedText.trim() !== '' || sources.length > 0) && !isExtracting && isOnline;

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{t.import_title}</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">{t.import_subtitle}</p>
      </div>

      {validationError && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf,.csv,.txt,text/plain,text/csv"
        onChange={(event) => {
          if (event.target.files) acceptFiles(event.target.files);
          event.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={photosInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          if (event.target.files) acceptFiles(event.target.files);
          event.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          if (event.target.files) acceptFiles(event.target.files);
          event.target.value = '';
        }}
        className="hidden"
      />

      {/* Direct text */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="import-text" className="text-sm font-bold text-slate-900">
            {t.import_paste_label}
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {pastedText.length.toLocaleString()} chars
          </span>
        </div>
        <textarea
          id="import-text"
          value={pastedText}
          onChange={(event) => onPasteChange(event.target.value)}
          placeholder={t.import_paste_placeholder}
          disabled={isExtracting}
          rows={7}
          className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
        />
        <p className="text-[11px] text-slate-500">
          Line breaks, Bangla text and mathematical notation are preserved exactly as pasted.
        </p>
      </div>

      {/* Add files */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition-all ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/60'
            : 'border-slate-300 bg-white hover:border-indigo-400'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-800">Drop files here, or</p>
        <p className="text-[11px] text-slate-400 mt-0.5 mb-4">{t.import_drop_hint}</p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => filesInputRef.current?.click()}
            disabled={isExtracting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {t.import_add_files}
          </button>
          <button
            type="button"
            onClick={() => {
              if (native) void pickImages('gallery');
              else photosInputRef.current?.click();
            }}
            disabled={isExtracting || isPicking}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {isPicking ? (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4 text-indigo-600" />
            )}
            {t.import_add_photos}
          </button>
          <button
            type="button"
            onClick={() => {
              if (native) void pickImages('camera');
              else cameraInputRef.current?.click();
            }}
            disabled={isExtracting || isPicking}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors disabled:opacity-50"
          >
            {isPicking ? (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-emerald-400" />
            )}
            {t.import_take_photo}
          </button>
        </div>
      </div>

      {/* Selected sources */}
      {sources.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              {t.import_selected_sources} ({sources.length})
            </h3>
            <button
              type="button"
              onClick={onClearAll}
              disabled={isExtracting}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
            >
              {t.import_clear_all}
            </button>
          </div>

          <ul className="divide-y divide-slate-100">
            {sources.map((source, index) => (
              <li key={source.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
                {source.previewUrl ? (
                  <img
                    src={source.previewUrl}
                    alt={source.name}
                    className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-lg object-cover border border-slate-200 bg-slate-100"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    {kindIcon(source.kind)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                    {source.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {source.kind.toUpperCase()} · {formatSize(source.size)}
                    {source.pageCount ? ` · ${source.pageCount} pages` : ''}
                  </p>
                  {source.error && (
                    <p className="text-[11px] text-rose-700 mt-0.5">{source.error}</p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => onMoveSource(source.id, -1)}
                    disabled={index === 0 || isExtracting}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30"
                    title={t.upload_move_up}
                    aria-label={t.upload_move_up}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveSource(source.id, 1)}
                    disabled={index === sources.length - 1 || isExtracting}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30"
                    title={t.upload_move_down}
                    aria-label={t.upload_move_down}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {source.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => onRetrySource(source.id)}
                    disabled={isExtracting || !isOnline}
                    className="shrink-0 p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 disabled:opacity-40"
                    title={t.upload_retry}
                    aria-label={t.upload_retry}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}

                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    source.status === 'processing'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : source.status === 'done'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : source.status === 'error'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {source.status === 'processing' && (
                    <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                  )}
                  {source.status === 'processing'
                    ? t.import_status_processing
                    : source.status === 'done'
                      ? t.import_status_done
                      : source.status === 'error'
                        ? t.import_status_error
                        : t.import_status_pending}
                </span>

                <button
                  type="button"
                  onClick={() => onRemoveSource(source.id)}
                  disabled={isExtracting}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  title={t.import_remove}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extraction controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
        {!isOnline && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {t.offline_extract_blocked}
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              The AI provider key stays on the backend. Only the extracted content is sent, with
              your signed-in session.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isExtracting ? (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 font-bold text-xs sm:text-sm hover:bg-rose-50"
              >
                <X className="w-4 h-4" />
                {t.import_cancel}
              </button>
            ) : (
              <button
                type="button"
                onClick={onProcess}
                disabled={!canProcess}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700 active:scale-98 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {t.import_process}
              </button>
            )}

            {questionCount > 0 && !isExtracting && (
              <button
                type="button"
                onClick={onContinue}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm"
              >
                <span>{t.nav_review}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isExtracting && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-indigo-900">
              <span className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                <span className="truncate">
                  {progress ? progress.label : t.import_processing}
                </span>
              </span>
              {progress && (
                <span className="shrink-0 font-mono text-indigo-700">
                  {progress.current}/{progress.total}
                </span>
              )}
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: progress ? `${(progress.current / Math.max(1, progress.total)) * 100}%` : '10%',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <FormatGuide />
    </div>
  );
};
