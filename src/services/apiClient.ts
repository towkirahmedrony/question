import { API_BASE_URL } from '../config/apiConfig';
import { clearSession, getValidAccessToken, notifyUnauthorized } from './authService';

/** Typed transport error so views can distinguish auth failures from other 4xx. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope {
  success?: boolean;
  message?: string;
  data?: unknown;
  code?: string;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
  /** Aborts the request, for example when the caller unmounts. */
  signal?: AbortSignal;
  /** Client-side deadline; the backend enforces its own timeout as well. */
  timeoutMs?: number;
}


export const readErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * Calls porokh-backend with the current Supabase bearer token.
 *
 * The backend wraps every response as `{ success, message, data }`; the payload
 * is unwrapped here so callers work with the resource itself.
 */
export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const token = options.token ?? (await getValidAccessToken());
  const hasBody = options.body !== undefined;

  const controller = new AbortController();
  const timer = options.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : null;

  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(
        options.timeoutMs
          ? `The request took longer than ${Math.round(options.timeoutMs / 1000)} seconds. Please retry.`
          : 'The request was cancelled.',
        0,
        'REQUEST_ABORTED'
      );
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      notifyUnauthorized();
    }

    throw new ApiError(
      payload?.message || `Request failed (HTTP ${response.status}).`,
      response.status,
      payload?.code
    );
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
};
