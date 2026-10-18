import { GRAPH_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/defaults.js';
import { ERROR_KINDS } from '../constants/errorKinds.js';
import { redactSecrets } from '../lib/redact.js';
import { ApiError, fetchWithTimeout, readJson } from './http.js';

const SERVICE_NAME = 'Meta';

function buildUrl(graphApiVersion, path, query) {
  const url = new URL(`${GRAPH_BASE_URL}/${graphApiVersion}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url.toString();
}

/** Converts a Graph error body (`{ error: {...} }`) into an ApiError with secrets removed. */
export function toGraphError(status, graphError, redact = redactSecrets) {
  return new ApiError({
    kind: ERROR_KINDS.GRAPH,
    status,
    code: graphError.code,
    subcode: graphError.error_subcode,
    title: redact(graphError.error_user_title ?? graphError.type ?? ''),
    details: redact(graphError.error_data?.details ?? graphError.error_user_msg ?? ''),
    message: redact(graphError.message ?? `Request failed with HTTP ${status}.`),
    fbtraceId: graphError.fbtrace_id,
  });
}

function toResponseError(response, payload, redact) {
  if (payload?.error) return toGraphError(response.status, payload.error, redact);
  return new ApiError({ kind: ERROR_KINDS.HTTP, status: response.status, message: `Request failed with HTTP ${response.status}.` });
}

/**
 * @param {{ accessToken: string, graphApiVersion: string, fetchImpl?: typeof fetch, timeoutMs?: number }} options
 */
export function createGraphClient({ accessToken, graphApiVersion, fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS }) {
  const redact = (text) => redactSecrets(text, [accessToken]);

  /**
   * @param {string} path e.g. `/${phoneNumberId}/messages`
   * @param {{ method?: string, query?: Record<string, string|number>, body?: object, signal?: AbortSignal }} [options]
   */
  async function request(path, { method = 'GET', query, body, signal } = {}) {
    const isForm = body instanceof FormData;
    const headers = { Authorization: `Bearer ${accessToken}` };
    if (body && !isForm) headers['Content-Type'] = 'application/json';

    const response = await fetchWithTimeout(
      buildUrl(graphApiVersion, path, query),
      { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined },
      { fetchImpl, timeoutMs, signal, serviceName: SERVICE_NAME },
    );
    const payload = await readJson(response);
    if (!response.ok || payload?.error) throw toResponseError(response, payload, redact);
    return payload;
  }

  return { request };
}
