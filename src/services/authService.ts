import { API_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from '../config/apiConfig';
import type { ImporterIdentity, ImporterSession } from '../types/auth';
import { parseStoredSession, sessionNeedsRefresh } from '../utils/session';
import { httpFetch } from './http';
import { readRawSession, removeRawSession, writeRawSession } from './sessionStore';

/**
 * Supabase Auth over its public REST endpoint.
 *
 * The importer deliberately does not bundle the Supabase client: it needs a
 * password session and a refresh, nothing else, and keeping the dependency out
 * keeps the token handling in one auditable place.
 */

export type { ImporterIdentity, ImporterSession } from '../types/auth';

/** Roles the backend accepts on the question authoring routes. */
const IMPORTER_ROLES = ['super_admin', 'admin', 'editor', 'teacher'];

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

/** Avoids a secure-storage round trip on every API call. */
let memorySession: ImporterSession | null | undefined;
let refreshInFlight: { generation: number; promise: Promise<ImporterSession> } | null = null;

/**
 * Incremented whenever the session is cleared. A refresh that started before
 * sign-out must not write its result back afterwards. Storage writes are also
 * serialized so a slow write cannot finish after the remove that followed it.
 */
let sessionGeneration = 0;
let storageWrites: Promise<void> = Promise.resolve();

const enqueueStorageWrite = (operation: () => Promise<void>): Promise<void> => {
  const next = storageWrites.then(operation, operation);
  storageWrites = next.catch(() => undefined);
  return next;
};

export const readStoredSession = async (): Promise<ImporterSession | null> => {
  if (memorySession !== undefined) return memorySession;

  memorySession = parseStoredSession(await readRawSession());
  return memorySession;
};

const storeSession = async (
  session: ImporterSession,
  generation: number = sessionGeneration
): Promise<void> => {
  if (generation !== sessionGeneration) return;

  memorySession = session;
  await enqueueStorageWrite(async () => {
    if (generation !== sessionGeneration) return;
    await writeRawSession(JSON.stringify(session));
  });
};

export const clearSession = async (): Promise<void> => {
  sessionGeneration += 1;
  refreshInFlight = null;
  memorySession = null;
  await enqueueStorageWrite(removeRawSession);
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

  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=${encodeURIComponent(grantType)}`;

  console.info('[AUTH DEBUG] Request started', {
    step: 'supabase_token',
    grantType,
    url,
    timestamp: new Date().toISOString(),
  });

  let response: Response;

  try {
    response = await httpFetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('[AUTH DEBUG] Supabase network request failed', {
      step: 'supabase_token',
      url,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Supabase network request failed: ${error instanceof Error ? error.message : String(error)}. Check browser Network/Console.`
    );
  }

  console.info('[AUTH DEBUG] Supabase response received', {
    step: 'supabase_token',
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const message = await readAuthError(response);
    console.error('[AUTH DEBUG] Supabase authentication rejected', {
      status: response.status,
      message,
    });
    throw new Error(message);
  }

  const payload = (await response.json()) as SupabaseTokenResponse;
  console.info('[AUTH DEBUG] Supabase login successful', {
    hasAccessToken: Boolean(payload.access_token),
    hasRefreshToken: Boolean(payload.refresh_token),
    hasUser: Boolean(payload.user?.id),
  });

  return toSession(payload);
};

/** Password sign-in against Supabase Auth; stores the session securely. */
export const signIn = async (email: string, password: string): Promise<ImporterSession> => {
  const session = await requestToken('password', { email: email.trim(), password });
  sessionGeneration += 1;
  refreshInFlight = null;
  await storeSession(session, sessionGeneration);
  return session;
};

const refreshSession = async (
  session: ImporterSession,
  generation: number
): Promise<ImporterSession> => {
  const next = await requestToken('refresh_token', { refresh_token: session.refresh_token });
  await storeSession(next, generation);
  return next;
};

/** Returns a usable access token, refreshing it when it is close to expiry. */
export const getValidAccessToken = async (): Promise<string> => {
  const session = await readStoredSession();
  if (!session) throw new Error('Not signed in.');

  if (!sessionNeedsRefresh(session)) return session.access_token;

  const generation = sessionGeneration;

  try {
    // Concurrent requests share one refresh instead of invalidating each other.
    // A refresh from a previous session generation is never reused.
    if (!refreshInFlight || refreshInFlight.generation !== generation) {
      const promise = refreshSession(session, generation).finally(() => {
        if (refreshInFlight?.promise === promise) refreshInFlight = null;
      });
      refreshInFlight = { generation, promise };
    }

    const refreshed = await refreshInFlight.promise;
    if (generation !== sessionGeneration) throw new Error('Not signed in.');
    return refreshed.access_token;
  } catch (error) {
    if (generation === sessionGeneration) {
      await clearSession();
      notifyUnauthorized();
    }

    throw error;
  }
};

/** Restores a stored session on load, dropping one that can no longer refresh. */
export const restoreSession = async (): Promise<ImporterSession | null> => {
  const session = await readStoredSession();
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
  const url = `${API_BASE_URL}/auth/permissions`;

  console.info('[AUTH DEBUG] Backend permissions request started', {
    step: 'backend_permissions',
    url,
    timestamp: new Date().toISOString(),
  });

  let response: Response;

  try {
    response = await httpFetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error('[AUTH DEBUG] Backend network request failed', {
      step: 'backend_permissions',
      url,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Backend network request failed (${url}): ${error instanceof Error ? error.message : String(error)}`
    );
  }

  console.info('[AUTH DEBUG] Backend permissions response received', {
    step: 'backend_permissions',
    status: response.status,
    ok: response.ok,
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
  const session = await readStoredSession();
  await clearSession();

  if (!session) return;

  try {
    await httpFetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // Local sign-out already happened; the server session expires on its own.
  }
};
