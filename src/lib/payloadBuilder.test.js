import { describe, expect, it } from 'vitest';
import { buildCampaignPayload, buildTemplatePayload, resolveName } from './payloadBuilder.js';

describe('payloadBuilder', () => {
  it('resolves name with fallback', () => {
    expect(resolveName('Aman')).toBe('Aman');
    expect(resolveName('')).toBe('there');
    expect(resolveName(null)).toBe('there');
    expect(resolveName('   ')).toBe('there');
  });

  it('builds standard template payload', () => {
    const payload = buildTemplatePayload({
      to: '+919876543210',
      templateName: 'summer_sale',
      languageCode: 'en',
    });
    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+919876543210',
      type: 'template',
      template: {
        name: 'summer_sale',
        language: { code: 'en' },
      },
    });
  });

  it('builds full campaign payload with media, name parameter, stop button, and opaque callback data', () => {
    const payload = buildCampaignPayload({
      to: '+919876543210',
      recipientId: 'rec_123',
      name: 'Priya',
      templateName: 'promo_blast',
      languageCode: 'en_US',
      stopButtonIndex: 0,
      mediaId: 'media_999',
      hasNameVariable: true,
    });

    expect(payload.biz_opaque_callback_data).toBe('rec_123');
    expect(payload.to).toBe('+919876543210');
    expect(payload.template.name).toBe('promo_blast');
    expect(payload.template.components).toEqual([
      {
        type: 'header',
        parameters: [{ type: 'image', image: { id: 'media_999' } }],
      },
      {
        type: 'body',
        parameters: [{ type: 'text', text: 'Priya' }],
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: '0',
        parameters: [{ type: 'payload', payload: 'STOP_PROMOTIONS' }],
      },
    ]);
  });
});
