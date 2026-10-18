import { BACKEND_ROUTE_PREFIX, REQUEST_TIMEOUT_MS } from '../config/defaults.js';
import { ERROR_KINDS } from '../constants/errorKinds.js';
import { redactSecrets } from '../lib/redact.js';
import { toGraphError } from './graphClient.js';
import { ApiError, fetchWithTimeout, readJson } from './http.js';

const SERVICE_NAME = 'the backend';

function backendMessage(payload, status) {
  const message = payload?.message;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' && message ? message : `Request failed with HTTP ${status}.`;
}

/**
 * Client for garaaz-backend's /whatsapp-campaigns routes.
 * @param {{ backendUrl: string, apiKey: string, secrets?: string[], fetchImpl?: typeof fetch, timeoutMs?: number }} options
 */
export function createBackendClient({ backendUrl, apiKey, secrets = [], fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS }) {
  const redact = (text) => redactSecrets(text, [apiKey, ...secrets]);

  /**
   * @param {string} path e.g. `/meta/template-upload`
   * @param {{ method?: string, body?: object | FormData, headers?: Record<string, string>, signal?: AbortSignal }} [options]
   */
  async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
    const isForm = body instanceof FormData;
    const allHeaders = { 'x-api-key': apiKey, ...headers };
    if (body && !isForm) allHeaders['Content-Type'] = 'application/json';

    const response = await fetchWithTimeout(
      `${backendUrl}${BACKEND_ROUTE_PREFIX}${path}`,
      { method, headers: allHeaders, body: isForm ? body : body && JSON.stringify(body) },
      { fetchImpl, timeoutMs, signal, serviceName: SERVICE_NAME },
    );
    const payload = await readJson(response);
    if (response.ok) return payload;

    if (payload?.metaError) throw toGraphError(response.status, payload.metaError, redact);
    throw new ApiError({ kind: ERROR_KINDS.BACKEND, status: response.status, message: redact(backendMessage(payload, response.status)) });
  }

  return { request };
}
