import { API_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from '../config/apiConfig';

/**
 * Supabase Auth over its public REST endpoint.
 *
 * The importer deliberately does not bundle the Supabase client: it needs a
 * password session and a refresh, nothing else, and keeping the dependency out
 * keeps the token handling in one auditable place.
 */

export interface ImporterSession {
  access_token: string;
  refresh_token: string;
  /** Seconds since the epoch, as Supabase reports it. */
  expires_at: number;
  user: { id: string; email: string };
}

export interface ImporterIdentity {
  role: string;
  permissions: string[];
}

/** Roles the backend accepts on the question authoring routes. */
const IMPORTER_ROLES = ['super_admin', 'admin', 'editor', 'teacher'];

const STORAGE_KEY = 'porokh_importer_session';

type SupabaseTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: { id?: string; email?: string };
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

export const notifyUnauthorized = (): void => {
  unauthorizedListeners.forEach((listener) => listener());
};

export const readStoredSession = (): ImporterSession | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ImporterSession>;
    if (!parsed?.access_token || !parsed.refresh_token || !parsed.user?.id) return null;

    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: Number(parsed.expires_at) || 0,
      user: { id: parsed.user.id, email: parsed.user.email ?? '' },
    };
  } catch {
    return null;
  }
};

const storeSession = (session: ImporterSession): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // A blocked storage API must not break a valid in-memory session.
  }
};

export const clearSession = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures while clearing.
  }
};

const assertConfigured = (): void => {
  if (!isAuthConfigured) {
    throw new Error(
      'Supabase authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
};

const readAuthError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as SupabaseTokenResponse;
    return (
      body.error_description ||
      body.msg ||
      body.message ||
      body.error ||
      `Authentication failed (${response.status}).`
    );
  } catch {
    return `Authentication failed (${response.status}).`;
  }
};

const toSession = (payload: SupabaseTokenResponse): ImporterSession => {
  if (!payload.access_token || !payload.refresh_token || !payload.user?.id) {
    throw new Error('The authentication response did not include a session.');
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at:
      typeof payload.expires_at === 'number'
        ? payload.expires_at
        : Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600),
    user: { id: payload.user.id, email: payload.user.email ?? '' },
  };
};

const requestToken = async (
  grantType: 'password' | 'refresh_token',
  body: Record<string, string>
): Promise<ImporterSession> => {
  assertConfigured();

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=${encodeURIComponent(grantType)}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) throw new Error(await readAuthError(response));

  return toSession((await response.json()) as SupabaseTokenResponse);
};

/** Password sign-in against Supabase Auth; stores the session for this tab. */
export const signIn = async (email: string, password: string): Promise<ImporterSession> => {
  const session = await requestToken('password', { email: email.trim(), password });
  storeSession(session);
  return session;
};

const refreshSession = async (session: ImporterSession): Promise<ImporterSession> => {
  const next = await requestToken('refresh_token', { refresh_token: session.refresh_token });
  storeSession(next);
  return next;
};

/** Returns a usable access token, refreshing it when it is close to expiry. */
export const getValidAccessToken = async (): Promise<string> => {
  const session = readStoredSession();
  if (!session) throw new Error('Not signed in.');

  const secondsLeft = session.expires_at - Math.floor(Date.now() / 1000);
  if (secondsLeft > 60) return session.access_token;

  try {
    const next = await refreshSession(session);
    return next.access_token;
  } catch (error) {
    clearSession();
    notifyUnauthorized();
    throw error;
  }
};

/** Restores a stored session on load, dropping one that can no longer refresh. */
export const restoreSession = async (): Promise<ImporterSession | null> => {
  const session = readStoredSession();
  if (!session) return null;

  try {
    await getValidAccessToken();
    return readStoredSession();
  } catch {
    return null;
  }
};

const readPermissions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        const action = (entry as { action?: unknown }).action;
        if (typeof action === 'string') return action;
      }
      return '';
    })
    .filter(Boolean);
};

/**
 * Reads the caller's role and permissions from the backend. The backend
 * resolves these from `user_roles`, never from the token's user metadata.
 */
export const fetchImporterIdentity = async (token: string): Promise<ImporterIdentity> => {
  const response = await fetch(`${API_BASE_URL}/auth/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (!response.ok) {
    throw new Error(`Your access could not be verified (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as { role?: unknown; permissions?: unknown };

  return {
    role: typeof payload.role === 'string' ? payload.role : '',
    permissions: readPermissions(payload.permissions),
  };
};

/** UX gate only: the backend enforces the same rule on every import request. */
export const canImportQuestions = (identity: ImporterIdentity): boolean =>
  identity.permissions.includes('questions.manage') || IMPORTER_ROLES.includes(identity.role);

/** Best-effort session revoke, then local sign-out. */
export const signOut = async (): Promise<void> => {
  const session = readStoredSession();
  clearSession();

  if (!session) return;

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // Local sign-out already happened; the server session expires on its own.
  }
};
