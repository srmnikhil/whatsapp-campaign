import { describe, expect, it, vi } from 'vitest';
import { ERROR_KINDS } from '../constants/errorKinds.js';
import { createGraphClient } from './graphClient.js';
import { ApiError } from './http.js';

const TOKEN = 'EAAJBabcdefghijklmnopqrstuvwxyz0123456789';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeClient(fetchImpl, options = {}) {
  return createGraphClient({ accessToken: TOKEN, graphApiVersion: 'v26.0', fetchImpl, ...options });
}

describe('createGraphClient', () => {
  it('sends the bearer token, version, query and JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const result = await makeClient(fetchImpl).request('/123/messages', { method: 'POST', query: { fields: 'a,b' }, body: { x: 1 } });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v26.0/123/messages?fields=a%2Cb');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"x":1}');
    expect(result).toEqual({ ok: true });
  });

  it('normalises a Graph error body and redacts the token from it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(401, {
        error: { message: `Invalid OAuth access token ${TOKEN}`, type: 'OAuthException', code: 190, error_subcode: 463, fbtrace_id: 'trace1' },
      }),
    );
    const error = await makeClient(fetchImpl).request('/123').catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: ERROR_KINDS.GRAPH, status: 401, code: 190, subcode: 463, fbtraceId: 'trace1' });
    expect(error.message).not.toContain(TOKEN);
  });

  it('reports a non-JSON HTTP failure as an http error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 }));
    await expect(makeClient(fetchImpl).request('/123')).rejects.toMatchObject({ kind: ERROR_KINDS.HTTP, status: 502 });
  });

  it('reports a fetch failure as a network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(makeClient(fetchImpl).request('/123')).rejects.toMatchObject({ kind: ERROR_KINDS.NETWORK });
  });

  it('reports a slow response as a timeout', async () => {
    const fetchImpl = vi.fn((_url, { signal }) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
    );
    await expect(makeClient(fetchImpl, { timeoutMs: 10 }).request('/123')).rejects.toMatchObject({ kind: ERROR_KINDS.TIMEOUT });
  });

  it('rethrows caller aborts unchanged', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_url, { signal }) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
    );
    const pending = makeClient(fetchImpl).request('/123', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
