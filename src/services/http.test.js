import { afterEach, describe, expect, it, vi } from 'vitest';
import { ERROR_KINDS } from '../constants/errorKinds.js';
import { fetchWithTimeout, readJson } from './http.js';

function hangingFetch(_url, init) {
  return new Promise((_resolve, reject) => {
    if (init.signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  });
}

const OPTIONS = { fetchImpl: hangingFetch, timeoutMs: 1000, serviceName: 'Meta' };

afterEach(() => vi.useRealTimers());

describe('fetchWithTimeout', () => {
  it('turns a slow response into a timeout error', async () => {
    vi.useFakeTimers();
    const pending = fetchWithTimeout('https://x', {}, OPTIONS).catch((error) => error);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toMatchObject({ kind: ERROR_KINDS.TIMEOUT, message: 'No response from Meta within 1 seconds.' });
  });

  it('rethrows a caller abort unchanged', async () => {
    const controller = new AbortController();
    const pending = fetchWithTimeout('https://x', {}, { ...OPTIONS, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
  });

  it('does not send when the caller already aborted', async () => {
    const fetchImpl = vi.fn(hangingFetch);
    const controller = new AbortController();
    controller.abort();
    await expect(fetchWithTimeout('https://x', {}, { ...OPTIONS, fetchImpl, signal: controller.signal })).rejects.toHaveProperty('name', 'AbortError');
    expect(fetchImpl.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('reports a failed connection as a network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchWithTimeout('https://x', {}, { ...OPTIONS, fetchImpl })).rejects.toMatchObject({ kind: ERROR_KINDS.NETWORK });
  });
});

describe('readJson', () => {
  it('returns null for a non-JSON body', async () => {
    expect(await readJson(new Response('<html>'))).toBeNull();
  });
});
