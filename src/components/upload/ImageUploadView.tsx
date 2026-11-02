import React, { useState, useRef } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { UploadedImage } from '../../types/question';
import { Modal } from '../common/Modal';
import { validateImageFile } from '../../utils/imageValidation';
import {
  UploadCloud,
  Camera,
  Trash2,
  Eye,
  FileCheck2,
  Sparkles,
  AlertCircle,
  FileText,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface ImageUploadViewProps {
  image: UploadedImage | null;
  onSelectImage: (image: UploadedImage) => void;
  onRemoveImage: () => void;
  onProceedToReview: () => void;
  onExtractQuestions: () => void;
  isExtracting: boolean;
  extractionProgressText?: string;
  questionCount: number;
}

export const ImageUploadView: React.FC<ImageUploadViewProps> = ({
  image,
  onSelectImage,
  onRemoveImage,
  onProceedToReview,
  onExtractQuestions,
  isExtracting,
  extractionProgressText,
  questionCount,
}) => {
  const { t } = useLanguage();
  const [dragOver, setDragOver] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setValidationError(null);

    const validation = validateImageFile(file);
    if ('reason' in validation) {
      const message =
        validation.reason === 'type'
          ? t.upload_error_type
          : validation.reason === 'size'
            ? t.upload_error_size
            : t.upload_error_empty;
      setValidationError(message);
      return;
    }

    onSelectImage({
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: URL.createObjectURL(file),
      uploadedAt: new Date(),
      status: 'pending',
      rawFile: file,
    });
  };

  const processFileList = (files: FileList | File[]) => {
    const [first] = Array.from(files);
    if (!first) return;

    // One page per request: a multi-select drops everything after the first file.
    if (files.length > 1) setValidationError(t.upload_error_single);
    processFile(first);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusBadge = () => {
    if (!image) return null;

    if (image.status === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t.upload_status_processing}
        </span>
      );
    }

    if (image.status === 'extracted') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
          <CheckCircle2 className="w-3 h-3" />
          {image.extractedQuestionCount
            ? `${image.extractedQuestionCount} MCQs`
            : t.upload_status_extracted}
        </span>
      );
    }

    if (image.status === 'empty') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
          <AlertCircle className="w-3 h-3" />
          0 MCQs
        </span>
      );
    }

    if (image.status === 'error') {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
          <XCircle className="w-3 h-3" />
          {t.upload_status_error}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-slate-900/80 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
        {t.upload_status_pending}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{t.upload_title}</h1>
        <p className="text-xs sm:text-sm text-slate-500">{t.upload_subtitle}</p>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* Hidden inputs: gallery/file selection and mobile camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Empty state / dropzone */}
      {!image && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all bg-white ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
          }`}
        >
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
              {t.upload_drag_drop}
            </h3>
            <p className="text-xs text-slate-400 mb-6">{t.upload_format_hint}</p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/20 active:scale-98 transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>{t.upload_browse_files}</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isExtracting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-98 transition-all"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{t.upload_take_photo}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single image preview card */}
      {image && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {t.upload_selected_image}
            </h3>
            {statusBadge()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-4">
            <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-4/3">
              <img
                src={image.previewUrl}
                alt={image.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 break-all">{image.name}</p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(image.size)} · {image.type}
                </p>
                {image.errorMessage && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 mt-2">
                    {image.errorMessage}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>{t.upload_view_image}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <span>{t.upload_replace}</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>{t.upload_retake}</span>
                </button>

                <button
                  type="button"
                  onClick={onRemoveImage}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.upload_remove}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Extraction controls */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{t.upload_privacy_note}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onExtractQuestions}
                disabled={isExtracting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700 active:scale-98 transition-all disabled:opacity-60"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.upload_extracting}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t.upload_gemini_process_btn}</span>
                  </>
                )}
              </button>

              {questionCount > 0 && (
                <button
                  type="button"
                  onClick={onProceedToReview}
                  disabled={isExtracting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
                >
                  <span>{t.upload_process_btn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar while extracting */}
      {isExtracting && (
        <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              {extractionProgressText || t.upload_extracting}
            </span>
            <span className="text-indigo-600 font-mono">Gemini Multimodal OCR</span>
          </div>
          <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full animate-pulse w-3/4 transition-all duration-300" />
          </div>
        </div>
      )}

      {/* Helpful note when there is no image yet */}
      {!image && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">{t.upload_empty_state}</p>
        </div>
      )}

      {/* Full-size preview modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={image?.name || 'Image Preview'}
        maxWidth="2xl"
      >
        {image && (
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-slate-900/5 flex items-center justify-center p-2">
              <img
                src={image.previewUrl}
                alt={image.name}
                className="max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Size: {formatFileSize(image.size)}</span>
              <span>Format: {image.type}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
