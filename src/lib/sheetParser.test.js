import { describe, expect, it } from 'vitest';
import { SheetParseError, parseCsvText, toTable } from './sheetParser.js';

const LIMITS = { maxRows: 5 };

describe('parseCsvText', () => {
  it('parses quoted values, a BOM and CRLF line endings', () => {
    const csv = '\uFEFFName,Phone\r\n"Sharma, Ravi",98765 43210\r\n\r\nAsha,+91 9123456789\r\n';
    expect(parseCsvText(csv, LIMITS)).toEqual({
      headers: ['Name', 'Phone'],
      rows: [
        ['Sharma, Ravi', '98765 43210'],
        ['Asha', '+91 9123456789'],
      ],
    });
  });

  it('rejects an empty sheet and a headings-only sheet', () => {
    expect(() => parseCsvText('', LIMITS)).toThrow(SheetParseError);
    expect(() => parseCsvText('Name,Phone\n', LIMITS)).toThrow('headings but no rows');
  });

  it('rejects more rows than the limit', () => {
    const csv = ['Name,Phone', ...Array.from({ length: 6 }, (_, i) => `n${i},9${i}`)].join('\n');
    expect(() => parseCsvText(csv, LIMITS)).toThrow('maximum is 5');
  });
});

describe('toTable', () => {
  it('names blank and repeated headings, pads short rows and stringifies cells', () => {
    const table = toTable(
      [
        ['Name', '', 'Name'],
        ['Ravi', 9876543210],
        [null, 919123456789, new Date('2026-01-02T00:00:00Z')],
      ],
      LIMITS,
    );
    expect(table.headers).toEqual(['Name', 'Column 2', 'Name (2)']);
    expect(table.rows).toEqual([
      ['Ravi', '9876543210', ''],
      ['', '919123456789', '2026-01-02'],
    ]);
  });
});
