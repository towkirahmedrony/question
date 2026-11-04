import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { AlertCircle, History, X } from 'lucide-react';
import { LanguageProvider } from './i18n/LanguageContext';
import { useLanguage } from './i18n/useLanguage';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { NotificationToast, type ToastMessage } from './components/common/NotificationToast';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ImportView } from './components/import/ImportView';
import { PlainTextReviewView } from './components/review/PlainTextReviewView';
import { ImportSummaryView } from './components/summary/ImportSummaryView';
import { ImportHistoryView } from './components/history/ImportHistoryView';
import type { ImporterTab } from './types/navigation';
import type { ImportHistoryEntry } from './types/question';
import type { ImportSource, PreparedUnit } from './types/import';
import {
  classifyFile,
  csvToReadableText,
  extractPdfUnits,
  mergePlainTextParts,
  prepareImage,
  readTextFile,
} from './services/sourceProcessing';
import { runExtraction } from './services/aiExtractionService';
import { fetchImportHistory } from './services/importService';
import { readErrorMessage } from './services/apiClient';
import { countQuestionBlocks } from './utils/plainText';
import { pickNativeImages } from './services/imagePickerService';
import { isNativeApp } from './services/platform';
import { clearImporterDraft, loadImporterDraft, saveImporterDraft } from './services/draftService';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import type { ImagePickSource } from './utils/imagePick';
import type { ImagePickRejection } from './services/imagePickerService';
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
  const isOnline = useNetworkStatus();

  const [session, setSession] = useState<ImporterSession | null>(null);
  const [identity, setIdentity] = useState<ImporterIdentity | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<ImporterTab>('dashboard');
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [plainText, setPlainText] = useState('');
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [extractionFailures, setExtractionFailures] = useState<
    Array<{ name: string; error: string }>
  >([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(
    null
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [draftInfo, setDraftInfo] = useState<{ savedAt: string } | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const extractionAbort = useRef<AbortController | null>(null);
  const backgroundInterrupted = useRef(false);
  const questionCount = useMemo(() => countQuestionBlocks(plainText), [plainText]);

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

  const releaseSources = useCallback((items: ImportSource[]) => {
    items.forEach((source) => {
      if (source.previewUrl) URL.revokeObjectURL(source.previewUrl);
    });
  }, []);

  const resetBatch = useCallback(() => {
    setSources((prev) => {
      releaseSources(prev);
      return [];
    });
    setPastedText('');
    setPlainText('');
    setExtractionWarnings([]);
    setExtractionFailures([]);
    setProgress(null);
  }, [releaseSources]);

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
        extractionAbort.current?.abort();
        setSession(null);
        setIdentity(null);
        setDraftInfo(null);
        setDraftReady(false);
        resetBatch();
        setAuthError(t.auth_session_expired);
      }),
    [resetBatch, t.auth_session_expired]
  );

  useEffect(() => {
    if (!session) return;
    void refreshHistory();
  }, [session, refreshHistory]);

  // A local draft is text only: selected files and server-side extraction
  // cannot be resumed after the app process is killed.
  useEffect(() => {
    if (!session) return;

    let active = true;

    void loadImporterDraft(session.user.id).then((draft) => {
      if (!active) return;

      if (draft) {
        setPastedText(draft.pastedText);
        setPlainText(draft.plainText);
        setDraftInfo({ savedAt: draft.savedAt });
        setCurrentTab(draft.plainText.trim() !== '' ? 'review' : 'upload');
      }

      setDraftReady(true);
    });

    return () => {
      active = false;
    };
  }, [session]);

  // Persist the editable text so a killed WebView does not lose the batch.
  useEffect(() => {
    if (!session || !draftReady) return;

    const timer = setTimeout(() => {
      void saveImporterDraft(session.user.id, { pastedText, plainText });
    }, 1000);

    return () => clearTimeout(timer);
  }, [session, draftReady, pastedText, plainText]);

  // An extraction in flight cannot survive the WebView being suspended.
  useEffect(() => {
    if (!isNativeApp()) return;

    let active = true;
    let removeListener: (() => void) | undefined;

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && extractionAbort.current) {
        backgroundInterrupted.current = true;
        extractionAbort.current.abort();
      }
    })
      .then((handle) => {
        removeListener = () => {
          void handle.remove();
        };
        if (!active) removeListener();
      })
      .catch(() => {
        // Lifecycle handling is native-only; the page visibility below is not
        // needed because extraction already aborts on network failure.
      });

    return () => {
      active = false;
      removeListener?.();
    };
  }, []);

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
    if (session) await clearImporterDraft(session.user.id);
    await signOut();
    setSession(null);
    setIdentity(null);
    setDraftInfo(null);
    setDraftReady(false);
    resetBatch();
    setHistory([]);
    setCurrentTab('dashboard');
    setAuthError(null);
  }, [session, resetBatch]);

  const updateSource = useCallback((id: string, patch: Partial<ImportSource>) => {
    setSources((prev) => prev.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  }, []);

  const handleAddFiles = useCallback((files: File[]) => {
    const created: ImportSource[] = [];

    for (const file of files) {
      const validation = classifyFile(file);
      if ('error' in validation) continue;

      created.push({
        id: `${validation.kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        kind: validation.kind,
        mimeType: validation.mimeType,
        size: file.size,
        status: 'pending',
        rawFile: file,
        ...(validation.kind === 'image' ? { previewUrl: URL.createObjectURL(file) } : {}),
      });
    }

    if (created.length > 0) {
      setSources((prev) => [...prev, ...created]);
      addToast(`${created.length} source(s) added.`, 'success');
    }
  }, [addToast]);

  const rejectionMessage = useCallback(
    (rejection: ImagePickRejection): string => {
      const reason =
        rejection.reason === 'size'
          ? t.upload_error_size
          : rejection.reason === 'empty'
            ? t.upload_error_empty
            : rejection.reason === 'read'
              ? t.upload_read_failed
              : t.upload_error_type;

      return `${rejection.name}: ${reason}`;
    },
    [
      t.upload_error_empty,
      t.upload_error_size,
      t.upload_error_type,
      t.upload_read_failed,
    ]
  );

  const handlePickImages = useCallback(
    async (source: ImagePickSource) => {
      const result = await pickNativeImages(source);

      if (result.status === 'cancelled') return;

      if (result.status === 'denied') {
        addToast(t.upload_permission_denied, 'error');
        return;
      }

      if (result.status === 'unavailable') {
        addToast(t.upload_native_unavailable, 'warning');
        return;
      }

      if (result.status === 'failed') {
        addToast(readErrorMessage(new Error(result.message), t.upload_read_failed), 'error');
        return;
      }

      if (result.files.length > 0) handleAddFiles(result.files);

      for (const rejection of result.rejected.slice(0, 3)) {
        addToast(rejectionMessage(rejection), 'warning');
      }
    },
    [
      addToast,
      handleAddFiles,
      rejectionMessage,
      t.upload_native_unavailable,
      t.upload_permission_denied,
      t.upload_read_failed,
    ]
  );

  const handleRemoveSource = useCallback(
    (id: string) => {
      setSources((prev) => {
        const next = prev.filter((source) => source.id !== id);
        releaseSources(prev.filter((source) => source.id === id));
        return next;
      });
    },
    [releaseSources]
  );

  const handleMoveSource = useCallback((id: string, direction: -1 | 1) => {
    setSources((prev) => {
      const index = prev.findIndex((source) => source.id === id);
      const target = index + direction;

      if (index === -1 || target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    resetBatch();
    if (session) void clearImporterDraft(session.user.id);
    setDraftInfo(null);
    addToast('Batch cleared.', 'warning');
  }, [resetBatch, session, addToast]);

  const prepareSource = async (
    source: ImportSource,
    signal?: AbortSignal
  ): Promise<PreparedUnit[]> => {
    const file = source.rawFile;
    if (!file) return [];

    if (source.kind === 'image') {
      const image = await prepareImage(file);
      return [
        {
          id: source.id,
          sourceId: source.id,
          name: source.name,
          kind: 'image',
          ...image,
        },
      ];
    }

    if (source.kind === 'pdf') {
      const units = await extractPdfUnits(file, {
        sourceId: source.id,
        signal,
        onProgress: (message) => setProgress({ current: 1, total: 1, label: message }),
      });
      updateSource(source.id, { pageCount: units.length });
      return units;
    }

    const raw = await readTextFile(file);

    if (source.kind === 'csv') {
      const converted = csvToReadableText(raw);
      if (converted.trim() === '') throw new Error('The CSV has no question rows.');

      return [
        {
          id: source.id,
          sourceId: source.id,
          name: source.name,
          kind: 'text',
          text: converted,
        },
      ];
    }

    if (raw.trim() === '') throw new Error('The text file is empty.');

    return [
      {
        id: source.id,
        sourceId: source.id,
        name: source.name,
        kind: 'text',
        text: raw,
      },
    ];
  };

  const handleProcess = async () => {
    if (isExtracting) return;

    if (!isOnline) {
      addToast(t.offline_extract_blocked, 'warning');
      return;
    }

    if (pastedText.trim() === '' && sources.length === 0) {
      addToast(t.import_empty, 'warning');
      return;
    }

    const controller = new AbortController();
    extractionAbort.current = controller;
    backgroundInterrupted.current = false;
    setIsExtracting(true);
    setExtractionWarnings([]);
    setExtractionFailures([]);
    setProgress(null);
    setSources((prev) =>
      prev.map((source) => ({ ...source, status: 'processing', error: undefined }))
    );

    const parts: string[] = [];
    const warnings: string[] = [];
    const failures: Array<{ name: string; error: string }> = [];
    let cancelled = false;

    const runUnits = async (units: PreparedUnit[]) => {
      if (units.length === 0) return;

      const result = await runExtraction(units, {
        signal: controller.signal,
        onProgress: (next) => setProgress(next),
      });

      if (result.plainText.trim() !== '') parts.push(result.plainText);
      for (const warning of result.warnings) {
        if (!warnings.includes(warning)) warnings.push(warning);
      }
      for (const failure of result.failures) {
        failures.push({ name: failure.name, error: failure.error });
      }
      if (result.cancelled) cancelled = true;

      // Update the file rows from the stable source id, not the display name:
      // PDF pages and text chunks have per-unit names.
      for (const sourceId of new Set(units.map((unit) => unit.sourceId))) {
        if (sourceId === 'pasted_text') continue;

        const failure = result.failures.find((item) => item.sourceId === sourceId);
        if (failure) updateSource(sourceId, { status: 'error', error: failure.error });
        else if (result.cancelled) updateSource(sourceId, { status: 'pending' });
        else updateSource(sourceId, { status: 'done', error: undefined });
      }
    };

    const pendingUnits: PreparedUnit[] = [];

    const flushPending = async () => {
      if (pendingUnits.length === 0) return;
      await runUnits(pendingUnits.splice(0, pendingUnits.length));
    };

    try {
      if (pastedText.trim() !== '') {
        pendingUnits.push({
          id: 'pasted_text',
          sourceId: 'pasted_text',
          name: 'Pasted text',
          kind: 'text',
          text: pastedText,
        });
      }

      // Non-PDF inputs are small after downscaling, so they share requests.
      // A PDF is flushed on its own and processed page-by-page to keep memory low.
      for (let index = 0; index < sources.length; index += 1) {
        if (controller.signal.aborted) {
          cancelled = true;
          break;
        }

        const source = sources[index];
        setProgress({
          current: index + 1,
          total: sources.length,
          label: `Reading ${source.name}`,
        });

        try {
          if (source.kind === 'pdf') {
            await flushPending();
            await runUnits(await prepareSource(source, controller.signal));
          } else {
            pendingUnits.push(...(await prepareSource(source, controller.signal)));
            if (pendingUnits.length >= 16) await flushPending();
          }
        } catch (error) {
          if (controller.signal.aborted) {
            cancelled = true;
            updateSource(source.id, { status: 'pending' });
            break;
          }

          const message = readErrorMessage(error, t.import_error_file);
          failures.push({ name: source.name, error: message });
          updateSource(source.id, { status: 'error', error: message });
        }
      }

      if (!controller.signal.aborted) await flushPending();

      setExtractionWarnings(warnings);
      setExtractionFailures(failures);

      const combined = mergePlainTextParts(parts);

      if (combined.trim() !== '') {
        setPlainText(combined);
        setCurrentTab('review');
        addToast(
          t.import_extracted_success.replace(
            '{count}',
            String(countQuestionBlocks(combined))
          ),
          'success'
        );
      } else if (!cancelled) {
        addToast(t.import_no_questions, 'warning');
      }

      if (failures.length > 0) {
        addToast(t.import_partial_failure.replace('{count}', String(failures.length)), 'warning');
      }

      if (cancelled) {
        addToast(
          backgroundInterrupted.current ? t.import_background_paused : t.import_cancelled,
          'warning'
        );
      }

      if (controller.signal.aborted) {
        setSources((prev) =>
          prev.map((source) =>
            source.status === 'processing' ? { ...source, status: 'pending' } : source
          )
        );
      }
    } catch (error) {
      if (controller.signal.aborted) {
        addToast(
          backgroundInterrupted.current ? t.import_background_paused : t.import_cancelled,
          'warning'
        );
      } else {
        addToast(readErrorMessage(error, t.import_extraction_failed), 'error');
      }
    } finally {
      extractionAbort.current = null;
      backgroundInterrupted.current = false;
      setIsExtracting(false);
      setProgress(null);
    }
  };

  const handleRetrySource = async (id: string) => {
    if (isExtracting) return;

    if (!isOnline) {
      addToast(t.offline_extract_blocked, 'warning');
      return;
    }

    const source = sources.find((item) => item.id === id);
    if (!source?.rawFile) return;

    const controller = new AbortController();
    extractionAbort.current = controller;
    setIsExtracting(true);
    updateSource(id, { status: 'processing', error: undefined });

    try {
      const result = await runExtraction(await prepareSource(source, controller.signal), {
        signal: controller.signal,
      });

      if (result.plainText.trim() !== '') {
        setPlainText((prev) => mergePlainTextParts([prev, result.plainText]));
      }

      setExtractionWarnings((prev) => [...new Set([...prev, ...result.warnings])]);
      setExtractionFailures((prev) => [
        ...prev.filter((item) => item.name !== source.name),
        ...result.failures.map(({ name, error }) => ({ name, error })),
      ]);

      if (result.cancelled) {
        updateSource(id, { status: 'pending' });
        addToast(t.import_cancelled, 'warning');
      } else if (result.failures.length > 0) {
        updateSource(id, { status: 'error', error: result.failures[0].error });
      } else {
        updateSource(id, { status: 'done', error: undefined });

        if (result.plainText.trim() !== '') {
          addToast(
            t.import_extracted_success.replace(
              '{count}',
              String(countQuestionBlocks(result.plainText))
            ),
            'success'
          );
        } else {
          addToast(t.import_no_questions, 'warning');
        }
      }
    } catch (error) {
      const message = controller.signal.aborted
        ? t.import_cancelled
        : readErrorMessage(error, t.import_error_file);
      updateSource(id, {
        status: controller.signal.aborted ? 'pending' : 'error',
        error: controller.signal.aborted ? undefined : message,
      });
      addToast(message, controller.signal.aborted ? 'warning' : 'error');
    } finally {
      extractionAbort.current = null;
      setIsExtracting(false);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    extractionAbort.current?.abort();
  };

  const handleImportFinished = () => {
    setHistoryRefreshKey((key) => key + 1);
    void refreshHistory();
  };

  const sourceLabel =
    sources.length > 0
      ? sources
          .map((source) => source.name)
          .join(', ')
          .slice(0, 200)
      : pastedText
        ? 'Pasted text'
        : null;

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-500">{t.auth_signing_in}</p>
      </div>
    );
  }

  if (!session) {
    return <LoginView onSignIn={handleSignIn} initialError={authError} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        questionCount={questionCount}
        userEmail={identity?.role ? `${session.user.email} · ${identity.role}` : session.user.email}
        onSignOut={() => void handleSignOut()}
      />

      {draftInfo && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-start gap-2 text-xs text-amber-900">
            <History className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">
              {t.draft_banner.replace(
                '{date}',
                new Date(draftInfo.savedAt).toLocaleString()
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                void clearImporterDraft(session.user.id);
                setDraftInfo(null);
                setPastedText('');
                setPlainText('');
                setExtractionWarnings([]);
                setExtractionFailures([]);
                setCurrentTab('upload');
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white/70 px-2 py-1 font-semibold hover:bg-white"
            >
              <X className="w-3.5 h-3.5" />
              {t.draft_discard}
            </button>
          </div>
        </div>
      )}

      {!isOnline && (
        <div role="status" className="bg-rose-50 border-b border-rose-200">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 text-xs font-medium text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t.offline_banner}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-28 md:py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onStartUpload={() => setCurrentTab('upload')}
            onOpenReview={() => setCurrentTab('review')}
            onOpenHistory={() => setCurrentTab('history')}
            currentBatchQuestionCount={questionCount}
            history={history}
            isLoadingHistory={isLoadingHistory}
          />
        )}

        {currentTab === 'upload' && (
          <ImportView
            sources={sources}
            pastedText={pastedText}
            onPasteChange={setPastedText}
            onAddFiles={handleAddFiles}
            onPickImages={handlePickImages}
            onRemoveSource={handleRemoveSource}
            onMoveSource={handleMoveSource}
            onRetrySource={(id) => void handleRetrySource(id)}
            onClearAll={handleClearAll}
            onProcess={() => void handleProcess()}
            onCancel={handleCancel}
            isExtracting={isExtracting}
            isOnline={isOnline}
            progress={progress}
            questionCount={questionCount}
            onContinue={() => setCurrentTab('review')}
          />
        )}

        {currentTab === 'review' && (
          <PlainTextReviewView
            text={plainText}
            onChange={setPlainText}
            extractionWarnings={extractionWarnings}
            extractionFailures={extractionFailures}
            onBack={() => setCurrentTab('upload')}
            onContinue={() => setCurrentTab('summary')}
            onShowToast={addToast}
          />
        )}

        {currentTab === 'summary' && (
          <ImportSummaryView
            text={plainText}
            sourceLabel={sourceLabel}
            onBack={() => setCurrentTab('review')}
            onStartNewBatch={() => {
              resetBatch();
              void clearImporterDraft(session.user.id);
              setDraftInfo(null);
              setCurrentTab('upload');
            }}
            onShowToast={addToast}
            onOpenHistory={() => {
              handleImportFinished();
              setCurrentTab('history');
            }}
          />
        )}

        {currentTab === 'history' && (
          <ImportHistoryView refreshKey={historyRefreshKey} onShowToast={addToast} />
        )}
      </main>

      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        questionCount={questionCount}
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
