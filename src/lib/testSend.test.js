import { describe, expect, it } from 'vitest';
import { prepareTestSend } from './testSend.js';

describe('prepareTestSend', () => {
  it('builds a template payload with a normalised number', () => {
    const { errors, payload } = prepareTestSend({ to: '+91 98765 43210', templateName: 'hello_world', languageCode: 'en_US' });
    expect(errors).toEqual({});
    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '919876543210',
      type: 'template',
      template: { name: 'hello_world', language: { code: 'en_US' } },
    });
  });

  it('returns errors and no payload for invalid input', () => {
    const { errors, payload } = prepareTestSend({ to: '123', templateName: 'Hello World', languageCode: 'english' });
    expect(Object.keys(errors).sort()).toEqual(['languageCode', 'templateName', 'to']);
    expect(payload).toBeNull();
  });
});
