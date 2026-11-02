import React, { useState, useRef } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { UploadedImage } from '../../types/question';
import { Modal } from '../common/Modal';
import { MockTagBadge } from '../common/Badge';
import {
  UploadCloud,
  Camera,
  Trash2,
  Eye,
  FileCheck2,
  Sparkles,
  AlertCircle,
  FileText,
  RotateCcw,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Server,
} from 'lucide-react';

interface ImageUploadViewProps {
  images: UploadedImage[];
  onAddImages: (newImages: UploadedImage[]) => void;
  onRemoveImage: (id: string) => void;
  onClearImages: () => void;
  onProceedToReview: () => void;
  onExtractQuestions: () => void;
  onRetrySingleImage: (imageId: string) => void;
  isExtracting: boolean;
  extractionProgressText?: string;
  questionCount: number;
  useBackendApi: boolean;
  onToggleBackendApi: (enabled: boolean) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_COUNT = 10;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export const ImageUploadView: React.FC<ImageUploadViewProps> = ({
  images,
  onAddImages,
  onRemoveImage,
  onClearImages,
  onProceedToReview,
  onExtractQuestions,
  onRetrySingleImage,
  isExtracting,
  extractionProgressText,
  questionCount,
  useBackendApi,
  onToggleBackendApi,
}) => {
  const { t } = useLanguage();
  const [dragOver, setDragOver] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<UploadedImage | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFileList = (files: FileList | File[]) => {
    setValidationError(null);
    const fileArray = Array.from(files);

    if (images.length + fileArray.length > MAX_IMAGES_COUNT) {
      setValidationError(t.upload_error_limit);
      return;
    }

    const newImages: UploadedImage[] = [];

    for (const file of fileArray) {
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        setValidationError(t.upload_error_type);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError(t.upload_error_size);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      newImages.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        uploadedAt: new Date(),
        status: 'pending',
        rawFile: file,
      });
    }

    if (newImages.length > 0) {
      onAddImages(newImages);
    }
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

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Phase Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.upload_title}</h1>
            <MockTagBadge />
          </div>
          <p className="text-xs sm:text-sm text-slate-500">{t.upload_subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Backend / Simulation Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onToggleBackendApi(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                useBackendApi
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>{t.upload_mode_server}</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleBackendApi(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                !useBackendApi
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t.upload_mode_simulation}</span>
            </button>
          </div>

          {images.length > 0 && (
            <button
              onClick={onClearImages}
              disabled={isExtracting}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.upload_clear_all}</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* Upload Dropzone & Trigger Cards */}
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/jpg"
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

      {/* Progress Bar when Extracting */}
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

      {/* Selected Images Grid with Per-Image Statuses */}
      {images.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {t.upload_selected_images}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {images.length} / {MAX_IMAGES_COUNT}
              </span>
            </div>
            <span className="text-xs text-slate-400">Order preserved for sequential extraction</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img, idx) => {
              let statusBadge = (
                <span className="bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                  #{idx + 1} • {t.upload_status_pending}
                </span>
              );

              if (img.status === 'processing') {
                statusBadge = (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>{t.upload_status_processing}</span>
                  </span>
                );
              } else if (img.status === 'extracted') {
                statusBadge = (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{img.extractedQuestionCount ? `${img.extractedQuestionCount} MCQs` : t.upload_status_extracted}</span>
                  </span>
                );
              } else if (img.status === 'error') {
                statusBadge = (
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs">
                    <XCircle className="w-2.5 h-2.5" />
                    <span>{t.upload_status_error}</span>
                  </span>
                );
              }

              return (
                <div
                  key={img.id}
                  className={`group relative rounded-xl border bg-slate-50 overflow-hidden shadow-xs flex flex-col transition-all ${
                    img.status === 'error'
                      ? 'border-rose-300 bg-rose-50/30'
                      : img.status === 'extracted'
                      ? 'border-emerald-300'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Image thumbnail */}
                  <div className="aspect-4/3 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewModalImage(img)}
                        className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white shadow-xs"
                        title="Inspect image"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveImage(img.id)}
                        disabled={isExtracting}
                        className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs disabled:opacity-50"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute top-1.5 left-1.5">{statusBadge}</div>
                  </div>

                  {/* Info row & Retry trigger */}
                  <div className="p-2.5 text-left flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 truncate" title={img.name}>
                        {img.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(img.size)}</p>
                    </div>

                    {img.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => onRetrySingleImage(img.id)}
                        disabled={isExtracting}
                        className="mt-2 text-[10px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 bg-rose-100 hover:bg-rose-200 px-2 py-1 rounded transition-colors self-start"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>{t.upload_retry_image}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Extraction Trigger Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                {useBackendApi
                  ? 'Gemini Vision securely processes images via backend API (API key never exposed).'
                  : 'Operating in Sandbox Simulator mode with pre-validated bilingual models.'}
              </span>
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

      {/* Empty State / Quick Sample Trigger */}
      {images.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mb-3">
            {t.upload_empty_state}
          </p>
          <div className="flex justify-center">
            <button
              onClick={onExtractQuestions}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Sample Extracted Questions into Reviewer</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Size Preview Modal */}
      <Modal
        isOpen={previewModalImage !== null}
        onClose={() => setPreviewModalImage(null)}
        title={previewModalImage?.name || 'Image Preview'}
        maxWidth="2xl"
      >
        {previewModalImage && (
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-slate-900/5 flex items-center justify-center p-2">
              <img
                src={previewModalImage.previewUrl}
                alt={previewModalImage.name}
                className="max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Size: {formatFileSize(previewModalImage.size)}</span>
              <span>Format: {previewModalImage.type}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
