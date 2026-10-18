import { describe, expect, it, vi } from 'vitest';
import { sendMessage } from './messagesApi.js';

describe('sendMessage', () => {
  it('posts to the messages edge and returns the wamid and status', async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ messages: [{ id: 'wamid.ABC', message_status: 'held_for_quality_assessment' }] }),
    };
    const result = await sendMessage(client, '123', { to: '919876543210' });

    expect(client.request).toHaveBeenCalledWith('/123/messages', { method: 'POST', body: { to: '919876543210' }, signal: undefined });
    expect(result).toEqual({ wamid: 'wamid.ABC', messageStatus: 'held_for_quality_assessment' });
  });

  it('defaults the status to accepted', async () => {
    const client = { request: vi.fn().mockResolvedValue({ messages: [{ id: 'wamid.X' }] }) };
    expect(await sendMessage(client, '123', {})).toEqual({ wamid: 'wamid.X', messageStatus: 'accepted' });
  });
});
