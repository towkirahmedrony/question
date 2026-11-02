import { useState, useCallback, useEffect } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { useLanguage } from './i18n/useLanguage';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { NotificationToast, type ToastMessage } from './components/common/NotificationToast';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ImageUploadView } from './components/upload/ImageUploadView';
import { QuestionReviewView } from './components/review/QuestionReviewView';
import { ImportSummaryView } from './components/summary/ImportSummaryView';
import { ImportHistoryView } from './components/history/ImportHistoryView';
import type { ImporterTab } from './types/navigation';
import type {
  ImportHistoryEntry,
  QuestionItem,
  UploadedImage,
} from './types/question';
import { validateForImport } from './utils/validation';
import { extractQuestionsViaBackendApi } from './services/aiExtractionService';
import { fetchImportHistory } from './services/importService';
import { readErrorMessage } from './services/apiClient';
import {
  type ImporterIdentity,
  type ImporterSession,
  canImportQuestions,
  fetchImporterIdentity,
  onUnauthorized,
  restoreSession,
  signIn,
  signOut,
} from './services/authService';

export function AppContent() {
  const { t } = useLanguage();

  const [session, setSession] = useState<ImporterSession | null>(null);
  const [identity, setIdentity] = useState<ImporterIdentity | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<ImporterTab>('dashboard');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgressText, setExtractionProgressText] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const addToast = useCallback(
    (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const refreshHistory = useCallback(async () => {
    setIsLoadingHistory(true);

    try {
      setHistory(await fetchImportHistory());
    } catch (error) {
      addToast(readErrorMessage(error, t.hist_error), 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [addToast, t.hist_error]);

  // Restore a stored Supabase session and verify authoring access first.
  useEffect(() => {
    let active = true;

    restoreSession()
      .then(async (stored) => {
        if (!active || !stored) return;

        const nextIdentity = await fetchImporterIdentity(stored.access_token);

        if (!canImportQuestions(nextIdentity)) {
          await signOut();
          if (active) setAuthError(t.auth_access_denied);
          return;
        }

        if (active) {
          setSession(stored);
          setIdentity(nextIdentity);
        }
      })
      .catch((error: unknown) => {
        if (active) setAuthError(readErrorMessage(error, t.auth_backend_error));
      })
      .finally(() => {
        if (active) setIsBootstrapping(false);
      });

    return () => {
      active = false;
    };
  }, [t.auth_access_denied, t.auth_backend_error]);

  // A 401 from the backend ends the session instead of leaving stale data.
  useEffect(
    () =>
      onUnauthorized(() => {
        setSession(null);
        setIdentity(null);
        setQuestions([]);
        setUploadedImages([]);
        setAuthError(t.auth_session_expired);
      }),
    [t.auth_session_expired]
  );

  useEffect(() => {
    if (!session) return;
    void refreshHistory();
  }, [session, refreshHistory]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);

      const nextSession = await signIn(email, password);

      try {
        const nextIdentity = await fetchImporterIdentity(nextSession.access_token);

        if (!canImportQuestions(nextIdentity)) {
          throw new Error(t.auth_access_denied);
        }

        setSession(nextSession);
        setIdentity(nextIdentity);
      } catch (error) {
        await signOut();
        throw error;
      }
    },
    [t.auth_access_denied]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    setSession(null);
    setIdentity(null);
    setQuestions([]);
    setUploadedImages([]);
    setHistory([]);
    setCurrentTab('dashboard');
    setAuthError(null);
  }, []);

  const validateAndStore = (question: QuestionItem): QuestionItem => {
    const validation = validateForImport(question);
    return {
      ...question,
      validation_status: validation.status,
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
    };
  };

  const handleUpdateQuestion = (index: number, updated: QuestionItem) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = validateAndStore(updated);
      return copy;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, position) => position !== index));
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
      validation_errors: [],
      validation_warnings: [],
      reviewed: false,
    };

    const validated = validateAndStore(newQuestion);
    setQuestions((prev) => [validated, ...prev]);
    setCurrentTab('review');
    addToast('New blank question created', 'success');
  };

  const handleExtractQuestions = async () => {
    if (uploadedImages.length === 0) {
      addToast('Please upload at least one image first', 'warning');
      return;
    }

    setIsExtracting(true);
    setExtractionProgressText('Connecting to the backend Gemini service...');

    setUploadedImages((prev) =>
      prev.map((img) => ({ ...img, status: 'processing', errorMessage: undefined }))
    );

    try {
      const result = await extractQuestionsViaBackendApi(
        uploadedImages,
        { generateMissingExplanations: true },
        (progress: string) => setExtractionProgressText(progress)
      );

      const validatedItems: QuestionItem[] = result.questions.map((question, index) =>
        validateAndStore({
          ...question,
          id: question.id || `q_gemini_${Date.now()}_${index + 1}`,
          reviewed: false,
        })
      );

      // Per-image status comes from the backend, not an average across pages.
      setUploadedImages((prev) =>
        prev.map((img) => {
          const status = result.images.find((entry) => entry.image_id === img.id);
          if (!status) return img;

          return {
            ...img,
            status: status.status,
            extractedQuestionCount: status.question_count,
            errorMessage: undefined,
          };
        })
      );

      setQuestions(validatedItems);
      setCurrentTab('review');

      const missingAnswerCount = validatedItems.filter(
        (question) =>
          question.requires_manual_answer_verification ||
          !question.options.some((option) => option.isCorrect)
      ).length;

      if (validatedItems.length === 0) {
        addToast('No questions were found. Try clearer photos or another page.', 'warning');
      } else if (missingAnswerCount > 0) {
        addToast(
          `Extracted ${validatedItems.length} questions. ${missingAnswerCount} need a manual answer key.`,
          'warning'
        );
      } else {
        addToast(`Successfully extracted ${validatedItems.length} questions.`, 'success');
      }

      if (result.rejected.length > 0) {
        addToast(`${result.rejected.length} question(s) could not be read and were skipped.`, 'warning');
      }
    } catch (error) {
      const message = readErrorMessage(
        error,
        'Gemini extraction failed. Please check the backend connection.'
      );

      setUploadedImages((prev) =>
        prev.map((img) => ({ ...img, status: 'error', errorMessage: message }))
      );

      addToast(message, 'error');
    } finally {
      setIsExtracting(false);
      setExtractionProgressText('');
    }
  };

  const handleRetrySingleImage = async (imageId: string) => {
    const targetImage = uploadedImages.find((img) => img.id === imageId);
    if (!targetImage) return;

    setUploadedImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, status: 'processing', errorMessage: undefined } : img
      )
    );

    try {
      const result = await extractQuestionsViaBackendApi(
        [targetImage],
        { generateMissingExplanations: true },
        (progress: string) => setExtractionProgressText(progress)
      );

      const validatedNew = result.questions.map((question, index) =>
        validateAndStore({
          ...question,
          id: question.id || `q_gemini_retry_${Date.now()}_${index + 1}`,
          reviewed: false,
        })
      );

      setQuestions((prev) => [...prev, ...validatedNew]);
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                status: validatedNew.length > 0 ? 'extracted' : 'empty',
                extractedQuestionCount: validatedNew.length,
                errorMessage: undefined,
              }
            : img
        )
      );

      addToast(
        validatedNew.length > 0
          ? `Retried ${targetImage.name}: extracted ${validatedNew.length} question(s)`
          : `Retried ${targetImage.name}: no questions found on this image`,
        validatedNew.length > 0 ? 'success' : 'warning'
      );
    } catch (error) {
      const message = readErrorMessage(error, 'Retry failed');
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, status: 'error', errorMessage: message } : img
        )
      );
      addToast(message, 'error');
    } finally {
      setExtractionProgressText('');
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

  const handleImportFinished = (remaining: QuestionItem[]) => {
    setQuestions(remaining);
    setHistoryRefreshKey((key) => key + 1);
    void refreshHistory();
  };

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">{t.auth_signing_in}</p>
      </div>
    );
  }

  if (!session) {
    return <LoginView onSignIn={handleSignIn} initialError={authError} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        questionCount={questions.length}
        userEmail={identity?.role ? `${session.user.email} · ${identity.role}` : session.user.email}
        onSignOut={() => void handleSignOut()}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onStartUpload={() => setCurrentTab('upload')}
            onOpenReview={() => setCurrentTab('review')}
            onOpenHistory={() => setCurrentTab('history')}
            currentBatchQuestionCount={questions.length}
            history={history}
            isLoadingHistory={isLoadingHistory}
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
            onImportFinished={handleImportFinished}
            onShowToast={addToast}
            onOpenHistory={() => setCurrentTab('history')}
          />
        )}

        {currentTab === 'history' && (
          <ImportHistoryView refreshKey={historyRefreshKey} onShowToast={addToast} />
        )}
      </main>

      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        questionCount={questions.length}
      />

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
