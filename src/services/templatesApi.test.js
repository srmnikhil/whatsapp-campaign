import { describe, expect, it, vi } from 'vitest';
import { createTemplate, getTemplate, listTemplates } from './templatesApi.js';

describe('listTemplates', () => {
  it('follows the after cursor until there is no next page', async () => {
    const client = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ data: [{ id: '1' }], paging: { cursors: { after: 'c1' }, next: 'https://next' } })
        .mockResolvedValueOnce({ data: [{ id: '2' }], paging: { cursors: { after: 'c2' } } }),
    };
    const templates = await listTemplates(client, '222');

    expect(templates).toEqual([{ id: '1' }, { id: '2' }]);
    expect(client.request).toHaveBeenCalledTimes(2);
    expect(client.request.mock.calls[0][0]).toBe('/222/message_templates');
    expect(client.request.mock.calls[0][1].query).not.toHaveProperty('after');
    expect(client.request.mock.calls[1][1].query.after).toBe('c1');
  });

  it('stops at the page cap', async () => {
    const client = { request: vi.fn().mockResolvedValue({ data: [{ id: 'x' }], paging: { cursors: { after: 'c' }, next: 'n' } }) };
    await listTemplates(client, '222', { maxPages: 3 });
    expect(client.request).toHaveBeenCalledTimes(3);
  });
});

describe('getTemplate and createTemplate', () => {
  it('reads one template and posts a new one', async () => {
    const client = { request: vi.fn().mockResolvedValue({ id: '9' }) };
    await getTemplate(client, '9');
    expect(client.request.mock.calls[0][0]).toBe('/9');

    await createTemplate(client, '222', { name: 'x' });
    expect(client.request.mock.calls[1]).toEqual(['/222/message_templates', { method: 'POST', body: { name: 'x' }, signal: undefined }]);
  });
});
