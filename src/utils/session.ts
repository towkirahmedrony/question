import type { ImporterSession } from '../types/auth';

/**
 * Validates a stored session before it is trusted.
 *
 * Storage can hold a partial write after a crash, so every field is checked
 * instead of casting the parsed JSON.
 */
export const parseStoredSession = (raw: string | null): ImporterSession | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ImporterSession> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.access_token !== 'string' || parsed.access_token === '') return null;
    if (typeof parsed.refresh_token !== 'string' || parsed.refresh_token === '') return null;

    const user = parsed.user;
    if (!user || typeof user !== 'object') return null;
    if (typeof user.id !== 'string' || user.id === '') return null;

    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at:
        typeof parsed.expires_at === 'number' && Number.isFinite(parsed.expires_at)
          ? parsed.expires_at
          : 0,
      user: {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : '',
      },
    };
  } catch {
    return null;
  }
};

/** Refresh a little before expiry so a slow request never sends a dead token. */
export const sessionNeedsRefresh = (
  session: ImporterSession,
  nowSeconds = Math.floor(Date.now() / 1000),
  skewSeconds = 60
): boolean => session.expires_at - nowSeconds <= skewSeconds;
