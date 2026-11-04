/**
 * A local, unsent draft.
 *
 * Only text is stored. Selected files and page previews cannot be restored
 * after the app process is killed, and extraction itself is not resumable
 * because the backend does not persist import sessions.
 */

export interface ImporterDraft {
  version: 1;
  savedAt: string;
  pastedText: string;
  plainText: string;
}

/** Guards SharedPreferences/localStorage against very large text payloads. */
export const MAX_DRAFT_CHARS = 200_000;

export const parseImporterDraft = (raw: string | null): ImporterDraft | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ImporterDraft> | null;
    if (!parsed || parsed.version !== 1) return null;
    if (typeof parsed.savedAt !== 'string' || Number.isNaN(Date.parse(parsed.savedAt))) return null;
    if (typeof parsed.pastedText !== 'string' || typeof parsed.plainText !== 'string') return null;

    if (parsed.pastedText.trim() === '' && parsed.plainText.trim() === '') return null;
    if (parsed.pastedText.length + parsed.plainText.length > MAX_DRAFT_CHARS) return null;

    return {
      version: 1,
      savedAt: parsed.savedAt,
      pastedText: parsed.pastedText,
      plainText: parsed.plainText,
    };
  } catch {
    return null;
  }
};
