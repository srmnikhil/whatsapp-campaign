import { describe, expect, it, vi } from 'vitest';
import { SheetParseError } from '../lib/sheetParser.js';
import { fetchGoogleSheet, readContactsFile } from './contactSources.js';

vi.mock('read-excel-file/browser', () => ({
  readSheet: vi.fn(async () => [
    ['Name', 'Mobile'],
    ['Ravi', 9876543210],
  ]),
}));

const LIMITS = { maxFileBytes: 1024, maxRows: 100 };
const SHEET_LINK = 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit#gid=0';

describe('readContactsFile', () => {
  it('reads a .csv file', async () => {
    const file = new File(['Name,Phone\nRavi,9876543210\n'], 'contacts.csv', { type: 'text/csv' });
    expect(await readContactsFile(file, LIMITS)).toEqual({ headers: ['Name', 'Phone'], rows: [['Ravi', '9876543210']] });
  });

  it('reads the first sheet of an .xlsx file', async () => {
    const file = new File(['binary'], 'contacts.XLSX');
    expect(await readContactsFile(file, LIMITS)).toEqual({ headers: ['Name', 'Mobile'], rows: [['Ravi', '9876543210']] });
  });

  it('rejects other file types and oversized files', async () => {
    await expect(readContactsFile(new File(['x'], 'old.xls'), LIMITS)).rejects.toThrow('.xlsx');
    await expect(readContactsFile(new File(['x'.repeat(2048)], 'big.csv'), LIMITS)).rejects.toBeInstanceOf(SheetParseError);
  });
});

describe('fetchGoogleSheet', () => {
  it('downloads the CSV export without cookies and parses it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('Name,Phone\nAsha,9123456789\n', { status: 200 }));
    const table = await fetchGoogleSheet(SHEET_LINK, LIMITS, { fetchImpl });

    expect(fetchImpl.mock.calls[0][0]).toContain('/export?format=csv&gid=0');
    expect(fetchImpl.mock.calls[0][1].credentials).toBe('omit');
    expect(table.rows).toEqual([['Asha', '9123456789']]);
  });

  it('explains sharing when Google returns a login page or blocks the request', async () => {
    const loginPage = vi.fn().mockResolvedValue(new Response('<!doctype html><html>Sign in</html>', { status: 200 }));
    await expect(fetchGoogleSheet(SHEET_LINK, LIMITS, { fetchImpl: loginPage })).rejects.toThrow('Anyone with the link');

    const blocked = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchGoogleSheet(SHEET_LINK, LIMITS, { fetchImpl: blocked })).rejects.toThrow('Anyone with the link');
  });

  it('rejects links that are not Google Sheets', async () => {
    await expect(fetchGoogleSheet('https://example.com/sheet', LIMITS, { fetchImpl: vi.fn() })).rejects.toThrow('Google Sheets link');
  });
});
