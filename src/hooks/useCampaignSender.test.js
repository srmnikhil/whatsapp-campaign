import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SENDER_PHASE, useCampaignSender } from './useCampaignSender.js';

const TEMPLATE = { name: 'big_sale', language: 'en', bodyText: 'Hi {{1}}', stopButtonIndex: -1 };
const CONTACTS = [
  { phone: '919876543210', name: 'Ravi' },
  { phone: '919123456789', name: 'Asha' },
];

function setup(request) {
  return renderHook(() =>
    useCampaignSender({
      graphClient: { request },
      backendClient: null,
      settings: { phoneNumberId: '333', sendDelayMs: 200 },
    }),
  );
}

describe('useCampaignSender counts', () => {
  it('counts sent and failed messages as they happen', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ messages: [{ id: 'wamid.1' }] })
      .mockRejectedValueOnce(Object.assign(new Error('Recipient phone number not in allowed list'), { code: 131030 }));
    const { result } = setup(request);

    await act(async () => {
      await result.current.startSend({ campaignName: 'Test', template: TEMPLATE, contacts: CONTACTS });
    });

    expect(result.current.sender).toMatchObject({ phase: SENDER_PHASE.DONE, total: 2, sent: 1, failed: 1 });
  });

  it('can be reset after a finished campaign', async () => {
    const { result } = setup(vi.fn().mockResolvedValue({ messages: [{ id: 'wamid.1' }] }));
    await act(async () => {
      await result.current.startSend({ campaignName: 'Test', template: TEMPLATE, contacts: CONTACTS });
    });
    expect(result.current.sender.phase).toBe(SENDER_PHASE.DONE);

    act(() => result.current.resetSender());
    expect(result.current.sender).toMatchObject({ phase: SENDER_PHASE.IDLE, sent: 0, rows: [] });
  });
});
