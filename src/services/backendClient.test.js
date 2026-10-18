import { describe, expect, it, vi } from 'vitest';
import { ERROR_KINDS } from '../constants/errorKinds.js';
import { createBackendClient } from './backendClient.js';
import { uploadTemplateImage } from './templateUploadApi.js';

const TOKEN = 'EAAJBabcdefghijklmnopqrstuvwxyz0123456789';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeClient(fetchImpl) {
  return createBackendClient({ backendUrl: 'http://localhost:3005', apiKey: 'api-key-123456', secrets: [TOKEN], fetchImpl });
}

describe('createBackendClient', () => {
  it('prefixes the route, sends the API key and JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    await makeClient(fetchImpl).request('/api/campaigns', { method: 'POST', body: { a: 1 } });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://localhost:3005/whatsapp-campaigns/api/campaigns');
    expect(init.headers['x-api-key']).toBe('api-key-123456');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('turns a Nest error into a backend error with secrets removed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { statusCode: 401, message: `bad key api-key-123456 ${TOKEN}` }));
    const error = await makeClient(fetchImpl).request('/x').catch((caught) => caught);

    expect(error).toMatchObject({ kind: ERROR_KINDS.BACKEND, status: 401 });
    expect(error.message).not.toContain('api-key-123456');
    expect(error.message).not.toContain(TOKEN);
  });

  it('surfaces a Meta error relayed by the backend', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400, { message: 'Meta rejected', metaError: { code: 100, message: 'Invalid file' } }));
    await expect(makeClient(fetchImpl).request('/x')).rejects.toMatchObject({ kind: ERROR_KINDS.GRAPH, code: 100 });
  });

  it('reports an unreachable backend as a network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(makeClient(fetchImpl).request('/x')).rejects.toMatchObject({ kind: ERROR_KINDS.NETWORK });
  });
});

describe('uploadTemplateImage', () => {
  it('posts the file and app ID with the Meta token as a bearer header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { handle: '4::aGFuZGxl' }));
    const file = new File(['png'], 'offer.png', { type: 'image/png' });
    const handle = await uploadTemplateImage(makeClient(fetchImpl), { file, appId: '111', accessToken: TOKEN });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(handle).toBe('4::aGFuZGxl');
    expect(url).toBe('http://localhost:3005/whatsapp-campaigns/meta/template-upload');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(init.body.get('appId')).toBe('111');
    expect(init.body.get('file').name).toBe('offer.png');
  });

  it('fails clearly when no handle comes back', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const file = new File(['png'], 'offer.png', { type: 'image/png' });
    await expect(uploadTemplateImage(makeClient(fetchImpl), { file, appId: '111', accessToken: TOKEN })).rejects.toThrow('upload handle');
  });
});
