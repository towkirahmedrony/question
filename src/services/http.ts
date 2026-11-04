import { CapacitorHttp, type HttpOptions } from '@capacitor/core';
import { isNativeApp } from './platform';

/**
 * Android WebView transport.
 *
 * Capacitor's patched `fetch` forwards the request to native code but ignores
 * `AbortSignal` and does not set socket timeouts. Native calls therefore go
 * through `CapacitorHttp.request` directly so the cancellation button and the
 * request deadlines are real. A native request cannot be cancelled mid-flight;
 * the socket timeouts bound how long it can keep running.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 15_000;
const SOCKET_TIMEOUT_GRACE_MS = 1_000;

const abortError = (signal: AbortSignal): Error => {
  if (signal.reason instanceof Error) return signal.reason;
  return new DOMException('The request was aborted.', 'AbortError');
};

const raceAbort = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError(signal));

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
};

const toResponse = (native: {
  data: unknown;
  status: number;
  headers: Record<string, string>;
  url: string;
}): Response => {
  const headers = new Headers(native.headers);
  const hasBody = native.status !== 204 && native.status !== 205;

  const body = !hasBody
    ? null
    : typeof native.data === 'string'
      ? native.data
      : JSON.stringify(native.data ?? null);

  const response = new Response(body, {
    status: native.status,
    headers,
  });

  Object.defineProperty(response, 'url', { value: native.url });
  return response;
};

/** `fetch` on the web; timeout-bounded native HTTP inside the Android shell. */
export const httpFetch = async (
  url: string,
  init: RequestInit = {},
  timeoutMs?: number
): Promise<Response> => {
  if (!isNativeApp()) return fetch(url, init);
  if (init.signal?.aborted) throw abortError(init.signal);

  const body = typeof init.body === 'string' ? init.body : undefined;
  const readTimeout = timeoutMs ? timeoutMs + SOCKET_TIMEOUT_GRACE_MS : DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = {};
  new Headers(init.headers).forEach((value, key) => {
    headers[key] = value;
  });

  const options: HttpOptions = {
    url,
    method: (init.method ?? 'GET').toUpperCase(),
    headers,
    connectTimeout: Math.min(CONNECT_TIMEOUT_MS, readTimeout),
    readTimeout,
    ...(body !== undefined ? { data: body } : {}),
  };

  const request = CapacitorHttp.request(options).then(toResponse);
  return raceAbort(request, init.signal ?? undefined);
};
