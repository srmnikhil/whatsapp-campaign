import { describe, expect, it } from 'vitest';
import { toSheetCsvUrl } from './sheetUrl.js';

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';

describe('toSheetCsvUrl', () => {
  it('converts an edit link with a tab gid in the hash', () => {
    expect(toSheetCsvUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=123`)).toBe(
      `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=123`,
    );
  });

  it('converts a share link without a gid', () => {
    expect(toSheetCsvUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`)).toBe(
      `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`,
    );
  });

  it('keeps a gid passed as a query param', () => {
    expect(toSheetCsvUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=7#gid=7`)).toContain('gid=7');
  });

  it('converts a publish-to-web link', () => {
    expect(toSheetCsvUrl(`https://docs.google.com/spreadsheets/d/e/2PACX-${ID}/pubhtml?gid=5`)).toBe(
      `https://docs.google.com/spreadsheets/d/e/2PACX-${ID}/pub?output=csv&gid=5`,
    );
  });

  it.each([
    'not a url',
    'http://docs.google.com/spreadsheets/d/abc',
    `https://evil.example.com/spreadsheets/d/${ID}/edit`,
    'https://docs.google.com/document/d/abc/edit',
  ])('rejects %s', (link) => {
    expect(toSheetCsvUrl(link)).toBeNull();
  });
});
