import { useState, useCallback } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { NotificationToast, type ToastMessage } from './components/common/NotificationToast';
import { DashboardView } from './components/dashboard/DashboardView';
import { ImageUploadView } from './components/upload/ImageUploadView';
import { QuestionReviewView } from './components/review/QuestionReviewView';
import { ImportSummaryView } from './components/summary/ImportSummaryView';
import type { QuestionItem, UploadedImage } from './types/question';
import { MOCK_QUESTIONS } from './data/mockQuestions';
import { validateQuestion } from './utils/validation';
import { extractQuestionsViaBackendApi } from './services/aiExtractionService';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'upload' | 'review' | 'summary'>('dashboard');
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    // Initialize with re-validated mock questions
    return MOCK_QUESTIONS.map((q) => {
      const v = validateQuestion(q);
      return {
        ...q,
        validation_status: v.status,
        validation_errors: v.errors,
        validation_warnings: v.warnings,
      };
    });
  });

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgressText, setExtractionProgressText] = useState<string>('');
  const [useBackendApi, setUseBackendApi] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update a single question and recalculate validation
  const handleUpdateQuestion = (index: number, updated: QuestionItem) => {
    const validation = validateQuestion(updated);
    const validatedItem: QuestionItem = {
      ...updated,
      validation_status: validation.status,
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
    };

    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = validatedItem;
      return copy;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    addToast('Question deleted from batch', 'warning');
  };

  const handleAddQuestion = () => {
    const newQuestion: QuestionItem = {
      id: `q_new_${Date.now()}`,
      type: 'mcq',
      body: {
        text_bn: '',
        text_en: '',
        image_url: null,
      },
      options: [
        { id: 1, text_bn: '', text_en: '', isCorrect: true },
        { id: 2, text_bn: '', text_en: '', isCorrect: false },
        { id: 3, text_bn: '', text_en: '', isCorrect: false },
        { id: 4, text_bn: '', text_en: '', isCorrect: false },
      ],
      explanation: { bn: '', en: '' },
      difficulty_level: 'medium',
      source_type: 'board_exam',
      exam_references: [],
      tags: [],
      validation_status: 'invalid',
      validation_errors: ['Question text in Bengali is required.'],
      validation_warnings: [],
      reviewed: false,
    };

    setQuestions((prev) => [newQuestion, ...prev]);
    setCurrentTab('review');
    addToast('New blank question created', 'success');
  };

  const handleLoadSampleBatch = () => {
    const loaded = MOCK_QUESTIONS.map((q) => {
      const v = validateQuestion(q);
      return {
        ...q,
        validation_status: v.status,
        validation_errors: v.errors,
        validation_warnings: v.warnings,
      };
    });
    setQuestions(loaded);
    setCurrentTab('review');
    addToast('Loaded sample extracted batch into reviewer', 'success');
  };

  // Execute extraction (Real Backend API or Simulation)
  const handleExtractQuestions = async () => {
    if (uploadedImages.length === 0) {
      addToast('Please upload at least one image first', 'warning');
      return;
    }

    setIsExtracting(true);

    if (!useBackendApi) {
      // Local Simulation Mode
      setExtractionProgressText('Running simulated multimodal OCR...');
      addToast('Processing images with simulated AI OCR...', 'info');

      // Mark images as extracting
      setUploadedImages((prev) =>
        prev.map((img) => ({ ...img, extractionStatus: 'extracting', errorMessage: undefined }))
      );

      setTimeout(() => {
        const extractedMock = MOCK_QUESTIONS.map((q, idx) => {
          const v = validateQuestion(q);
          return {
            ...q,
            id: `q_extracted_${Date.now()}_${idx}`,
            validation_status: v.status,
            validation_errors: v.errors,
            validation_warnings: v.warnings,
            reviewed: false,
          };
        });

        // Mark images as extracted
        setUploadedImages((prev) =>
          prev.map((img) => ({
            ...img,
            extractionStatus: 'extracted',
            extractedCount: Math.ceil(extractedMock.length / Math.max(1, prev.length)),
          }))
        );

        setQuestions(extractedMock);
        setIsExtracting(false);
        setExtractionProgressText('');
        setCurrentTab('review');
        addToast(`Simulated extraction complete! Extracted ${extractedMock.length} bilingual MCQs`, 'success');
      }, 1200);
      return;
    }

    // Live Backend Gemini API Extraction
    try {
      setExtractionProgressText('Connecting to backend Gemini Vision service...');
      addToast('Analyzing images with Gemini 2.5 Flash...', 'info');

      // Update image statuses to extracting
      setUploadedImages((prev) =>
        prev.map((img) => ({ ...img, extractionStatus: 'extracting', errorMessage: undefined }))
      );

      const result = await extractQuestionsViaBackendApi(
        uploadedImages,
        { generateMissingExplanations: true },
        (progress: string) => setExtractionProgressText(progress)
      );

      if (!result.success || !result.questions) {
        throw new Error(result.error || 'Failed to extract questions from images');
      }

      const extractedItems = result.questions;

      // Validate all extracted items with Porokh schema rules
      const validatedItems: QuestionItem[] = extractedItems.map((q: QuestionItem, idx: number) => {
        const v = validateQuestion(q);
        return {
          ...q,
          id: q.id || `q_gemini_${Date.now()}_${idx + 1}`,
          validation_status: v.status,
          validation_errors: v.errors,
          validation_warnings: v.warnings,
          reviewed: false,
        };
      });

      // Update image status to extracted
      setUploadedImages((prev) =>
        prev.map((img) => ({
          ...img,
          extractionStatus: 'extracted',
          extractedCount: Math.ceil(validatedItems.length / Math.max(1, prev.length)),
        }))
      );

      setQuestions(validatedItems);
      setIsExtracting(false);
      setExtractionProgressText('');
      setCurrentTab('review');

      const missingAnswerCount = validatedItems.filter(
        (q) => q.requires_manual_answer_verification || !q.options.some((o) => o.isCorrect)
      ).length;

      if (missingAnswerCount > 0) {
        addToast(
          `Extracted ${validatedItems.length} questions. Note: ${missingAnswerCount} question(s) need manual answer key confirmation.`,
          'warning'
        );
      } else {
        addToast(`Successfully extracted ${validatedItems.length} questions via Gemini Vision!`, 'success');
      }
    } catch (err: any) {
      console.error('Gemini extraction failed:', err);
      setIsExtracting(false);
      setExtractionProgressText('');

      const errorMsg = err?.message || 'Gemini Vision extraction failed. Please check backend connection.';

      // Mark images as error
      setUploadedImages((prev) =>
        prev.map((img) => ({
          ...img,
          extractionStatus: 'error',
          errorMessage: errorMsg,
        }))
      );

      addToast(errorMsg, 'error');
    }
  };

  // Retry extraction for a single failed image
  const handleRetrySingleImage = async (imageId: string) => {
    const targetImage = uploadedImages.find((img) => img.id === imageId);
    if (!targetImage) return;

    setUploadedImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, extractionStatus: 'extracting', errorMessage: undefined } : img))
    );

    try {
      if (!useBackendApi) {
        setTimeout(() => {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === imageId ? { ...img, extractionStatus: 'extracted', extractedCount: 2 } : img
            )
          );
          addToast(`Retried ${targetImage.name} in simulation mode.`, 'success');
        }, 800);
        return;
      }

      const result = await extractQuestionsViaBackendApi(
        [targetImage],
        { generateMissingExplanations: true },
        (progress: string) => setExtractionProgressText(progress)
      );

      if (!result.success || !result.questions) {
        throw new Error(result.error || 'Retry extraction failed');
      }

      const retryExtracted = result.questions;
      const validatedNew: QuestionItem[] = retryExtracted.map((q: QuestionItem, idx: number) => {
        const v = validateQuestion(q);
        return {
          ...q,
          id: q.id || `q_gemini_retry_${Date.now()}_${idx + 1}`,
          validation_status: v.status,
          validation_errors: v.errors,
          validation_warnings: v.warnings,
          reviewed: false,
        };
      });

      setQuestions((prev) => [...prev, ...validatedNew]);
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, extractionStatus: 'extracted', extractedCount: validatedNew.length }
            : img
        )
      );

      addToast(`Retried ${targetImage.name}: extracted ${validatedNew.length} question(s)`, 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Retry failed';
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, extractionStatus: 'error', errorMessage: errorMsg } : img
        )
      );
      addToast(errorMsg, 'error');
    }
  };

  const handleAddUploadedImages = (newImages: UploadedImage[]) => {
    setUploadedImages((prev) => [...prev, ...newImages]);
    addToast(`${newImages.length} image(s) added successfully`, 'success');
  };

  const handleRemoveUploadedImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleClearUploadedImages = () => {
    setUploadedImages([]);
    addToast('Cleared all uploaded images', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        questionCount={questions.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onStartUpload={() => setCurrentTab('upload')}
            onLoadSampleBatch={handleLoadSampleBatch}
            onOpenReview={() => setCurrentTab('review')}
            currentBatchQuestionCount={questions.length}
          />
        )}

        {currentTab === 'upload' && (
          <ImageUploadView
            images={uploadedImages}
            onAddImages={handleAddUploadedImages}
            onRemoveImage={handleRemoveUploadedImage}
            onClearImages={handleClearUploadedImages}
            onProceedToReview={() => setCurrentTab('review')}
            onExtractQuestions={handleExtractQuestions}
            onRetrySingleImage={handleRetrySingleImage}
            isExtracting={isExtracting}
            extractionProgressText={extractionProgressText}
            questionCount={questions.length}
            useBackendApi={useBackendApi}
            onToggleBackendApi={setUseBackendApi}
          />
        )}

        {currentTab === 'review' && (
          <QuestionReviewView
            questions={questions}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onAddQuestion={handleAddQuestion}
            onProceedToSummary={() => setCurrentTab('summary')}
            onGoToUpload={() => setCurrentTab('upload')}
          />
        )}

        {currentTab === 'summary' && (
          <ImportSummaryView
            questions={questions}
            onReturnToReview={() => setCurrentTab('review')}
            onStartNewBatch={() => {
              setQuestions([]);
              setUploadedImages([]);
              setCurrentTab('upload');
            }}
            onShowToast={addToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        questionCount={questions.length}
      />

      {/* Global Toast Notifications */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
