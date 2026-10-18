import { describe, expect, it } from 'vitest';
import { INVALID_REASONS, buildContacts, guessColumns } from './contacts.js';

describe('guessColumns', () => {
  it.each([
    [['Name', 'Phone'], { nameIndex: 0, phoneIndex: 1 }],
    [['Mobile No', 'Customer Name'], { nameIndex: 1, phoneIndex: 0 }],
    [['Contact Name', 'Contact Number'], { nameIndex: 0, phoneIndex: 1 }],
    [['City', 'WhatsApp'], { nameIndex: -1, phoneIndex: 1 }],
    [['A', 'B'], { nameIndex: -1, phoneIndex: -1 }],
  ])('guesses %j', (headers, expected) => {
    expect(guessColumns(headers)).toEqual(expected);
  });
});

describe('buildContacts', () => {
  const rows = [
    ['  Ravi   Kumar ', '98765 43210'],
    ['Asha', '+91 9123456789'],
    ['Ravi again', '919876543210'],
    ['Bad', '12345'],
    ['No phone', ''],
    ['', '6000000000'],
  ];

  it('normalises, removes invalid rows and duplicates, and counts them', () => {
    const result = buildContacts(rows, { nameIndex: 0, phoneIndex: 1 });

    expect(result.valid).toEqual([
      { rowNumber: 2, name: 'Ravi Kumar', phone: '919876543210' },
      { rowNumber: 3, name: 'Asha', phone: '919123456789' },
      { rowNumber: 7, name: '', phone: '916000000000' },
    ]);
    expect(result.duplicates).toEqual([{ rowNumber: 4, name: 'Ravi again', phone: '919876543210', firstRowNumber: 2 }]);
    expect(result.invalid).toEqual([
      { rowNumber: 5, name: 'Bad', rawPhone: '12345', reason: INVALID_REASONS.INVALID_PHONE },
      { rowNumber: 6, name: 'No phone', rawPhone: '', reason: INVALID_REASONS.MISSING_PHONE },
    ]);
    expect(result.counts).toEqual({ total: 6, valid: 3, invalid: 2, duplicates: 1, emptyNames: 1 });
  });

  it('treats every row as missing a phone when no phone column is mapped', () => {
    const result = buildContacts(rows, { nameIndex: 0, phoneIndex: -1 });
    expect(result.counts).toEqual({ total: 6, valid: 0, invalid: 6, duplicates: 0, emptyNames: 0 });
  });
});
