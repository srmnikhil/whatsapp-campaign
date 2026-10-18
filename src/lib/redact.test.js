import { describe, expect, it } from 'vitest';
import { REDACTED, redactSecrets } from './redact.js';

const TOKEN = 'EAAJBabcdefghijklmnopqrstuvwxyz0123456789';

describe('redactSecrets', () => {
  it('removes a known secret wherever it appears', () => {
    expect(redactSecrets(`token ${TOKEN} was rejected`, [TOKEN])).toBe(`token ${REDACTED} was rejected`);
  });

  it('removes Meta-shaped tokens even when not passed in', () => {
    expect(redactSecrets(`bad ${TOKEN}`)).toBe(`bad ${REDACTED}`);
  });

  it('removes bearer values and access_token query params', () => {
    expect(redactSecrets('Authorization: Bearer abc.def')).toBe(`Authorization: Bearer ${REDACTED}`);
    expect(redactSecrets('https://x/y?access_token=secret123&a=1')).toBe(`https://x/y?access_token=${REDACTED}&a=1`);
  });

  it('ignores short secrets so normal words are not redacted', () => {
    expect(redactSecrets('code 100 failed', ['100'])).toBe('code 100 failed');
  });

  it('returns an empty string for non-string input', () => {
    expect(redactSecrets(undefined)).toBe('');
    expect(redactSecrets(42)).toBe('');
  });
});
