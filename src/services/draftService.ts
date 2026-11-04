import { Preferences } from '@capacitor/preferences';
import {
  MAX_DRAFT_CHARS,
  parseImporterDraft,
  type ImporterDraft,
} from '../utils/draft';

/**
 * Local draft recovery for pasted and extracted text.
 *
 * Preferences is appropriate here because drafts contain no credentials.
 * Sessions are kept in secure storage instead.
 */

const draftKey = (userId: string): string => `porokh_importer_draft_${userId}`;

export const loadImporterDraft = async (userId: string): Promise<ImporterDraft | null> => {
  if (!userId) return null;

  try {
    const stored = await Preferences.get({ key: draftKey(userId) });
    return parseImporterDraft(stored.value);
  } catch {
    return null;
  }
};

export const saveImporterDraft = async (
  userId: string,
  draft: Pick<ImporterDraft, 'pastedText' | 'plainText'>
): Promise<void> => {
  if (!userId) return;

  if (draft.pastedText.trim() === '' && draft.plainText.trim() === '') {
    await clearImporterDraft(userId);
    return;
  }

  if (draft.pastedText.length + draft.plainText.length > MAX_DRAFT_CHARS) return;

  const payload: ImporterDraft = {
    version: 1,
    savedAt: new Date().toISOString(),
    pastedText: draft.pastedText,
    plainText: draft.plainText,
  };

  try {
    await Preferences.set({ key: draftKey(userId), value: JSON.stringify(payload) });
  } catch {
    // Draft recovery is best-effort; the in-memory batch is still intact.
  }
};

export const clearImporterDraft = async (userId: string): Promise<void> => {
  if (!userId) return;

  try {
    await Preferences.remove({ key: draftKey(userId) });
  } catch {
    // Ignore storage failures while clearing.
  }
};
