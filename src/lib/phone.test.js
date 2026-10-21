import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay, normalizeIndianPhone } from './phone.js';

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210', '919876543210'],
    ['+91 98765 43210', '919876543210'],
    ['91-98765-43210', '919876543210'],
    ['098765 43210', '919876543210'],
    ['0091 9876543210', '919876543210'],
    ['(+91) 98765.43210', '919876543210'],
    [' 6000000000 ', '916000000000'],
    [9876543210, '919876543210'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each([
    ['5876543210', 'starts with 5'],
    ['987654321', '9 digits'],
    ['98765432101', '11 digits without a leading 0'],
    ['+1 415 555 0100', 'US number'],
    ['98765abc43210', 'contains letters'],
    ['', 'empty'],
    [null, 'null'],
    [undefined, 'undefined'],
    [{}, 'object'],
  ])('rejects %s (%s)', (input) => {
    expect(normalizeIndianPhone(input)).toBeNull();
  });
});

describe('formatPhoneDisplay', () => {
  it('drops the 91 prefix from stored Indian numbers', () => {
    expect(formatPhoneDisplay('919528465756')).toBe('9528465756');
  });

  it('leaves anything else unchanged', () => {
    expect(formatPhoneDisplay('9528465756')).toBe('9528465756');
    expect(formatPhoneDisplay('')).toBe('');
    expect(formatPhoneDisplay(null)).toBe('');
  });
});
