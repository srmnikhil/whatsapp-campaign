import { readSheet } from 'read-excel-file/browser';
import { SheetParseError, parseCsvText, toTable } from '../lib/sheetParser.js';
import { toSheetCsvUrl } from '../lib/sheetUrl.js';

const FILE_READERS = Object.freeze({
  csv: async (file, limits) => parseCsvText(await file.text(), limits),
  xlsx: async (file, limits) => toTable(await readSheet(file), limits),
});

const NOT_SHARED_MESSAGE =
  'Could not read the sheet. In Google Sheets, set Share → General access to "Anyone with the link" (Viewer).';
const HTML_PREFIX = '<';

function getExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Reads an uploaded .csv or .xlsx file into a table.
 * @param {File} file
 * @param {{ maxFileBytes: number, maxRows: number }} limits
 */
export async function readContactsFile(file, limits) {
  const reader = FILE_READERS[getExtension(file.name)];
  if (!reader) throw new SheetParseError('Upload a .csv or .xlsx file. Old .xls files must be saved as .xlsx first.');
  if (file.size > limits.maxFileBytes) {
    throw new SheetParseError(`The file is larger than ${Math.round(limits.maxFileBytes / (1024 * 1024))} MB.`);
  }

  try {
    return await reader(file, limits);
  } catch (error) {
    if (error instanceof SheetParseError) throw error;
    throw new SheetParseError('Could not read the file. Check that it is a valid .csv or .xlsx file.');
  }
}

/**
 * Downloads a link-shared Google Sheet tab as CSV and parses it.
 * @param {string} link
 * @param {{ maxRows: number }} limits
 */
export async function fetchGoogleSheet(link, limits, { signal, fetchImpl = globalThis.fetch } = {}) {
  const csvUrl = toSheetCsvUrl(link);
  if (!csvUrl) throw new SheetParseError('Paste a Google Sheets link (https://docs.google.com/spreadsheets/…).');

  let response;
  try {
    response = await fetchImpl(csvUrl, { signal, credentials: 'omit' });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new SheetParseError(NOT_SHARED_MESSAGE);
  }

  const text = await response.text();
  if (!response.ok || text.trimStart().startsWith(HTML_PREFIX)) throw new SheetParseError(NOT_SHARED_MESSAGE);
  return parseCsvText(text, limits);
}
