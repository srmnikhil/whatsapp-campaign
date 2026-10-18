import { ERROR_KINDS } from '../constants/errorKinds.js';

export class ApiError extends Error {
  /**
   * @param {{ kind: string, message: string, status?: number, code?: number, subcode?: number,
   *           title?: string, details?: string, fbtraceId?: string }} info
   */
  constructor({ kind, message, status, code, subcode, title, details, fbtraceId }) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.subcode = subcode;
    this.title = title;
    this.details = details;
    this.fbtraceId = fbtraceId;
  }
}

/**
 * fetch with a timeout. A caller abort is rethrown unchanged; a timeout or network
 * failure becomes an ApiError of kind TIMEOUT or NETWORK.
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ fetchImpl: typeof fetch, timeoutMs: number, signal?: AbortSignal, serviceName: string }} options
 */
export async function fetchWithTimeout(url, init, { fetchImpl, timeoutMs, signal, serviceName }) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) forwardAbort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      timedOut
        ? { kind: ERROR_KINDS.TIMEOUT, message: `No response from ${serviceName} within ${timeoutMs / 1000} seconds.` }
        : { kind: ERROR_KINDS.NETWORK, message: `Could not reach ${serviceName}. Check the connection and the URL.` },
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

export async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
