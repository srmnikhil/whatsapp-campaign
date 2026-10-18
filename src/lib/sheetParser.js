import Papa from 'papaparse';

const BYTE_ORDER_MARK = '\uFEFF';
const UNNAMED_COLUMN_PREFIX = 'Column';

export class SheetParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SheetParseError';
  }
}

function cellToText(cell) {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

function uniqueHeaders(rawHeaders) {
  const seen = new Map();
  return rawHeaders.map((raw, index) => {
    const base = raw || `${UNNAMED_COLUMN_PREFIX} ${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function isBlankRow(row) {
  return row.every((cell) => cell === '');
}

/**
 * Turns raw rows (first row = headings) into a table of trimmed strings.
 * @param {unknown[][]} rawRows
 * @param {{ maxRows: number }} limits
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function toTable(rawRows, { maxRows }) {
  const textRows = rawRows.map((row) => (Array.isArray(row) ? row.map(cellToText) : [])).filter((row) => !isBlankRow(row));
  if (textRows.length === 0) throw new SheetParseError('The sheet is empty.');

  const [headerRow, ...dataRows] = textRows;
  if (dataRows.length === 0) throw new SheetParseError('The sheet has headings but no rows.');
  if (dataRows.length > maxRows) {
    throw new SheetParseError(`The sheet has ${dataRows.length} rows. The maximum is ${maxRows}.`);
  }

  const width = Math.max(headerRow.length, ...dataRows.map((row) => row.length));
  const pad = (row) => Array.from({ length: width }, (_, index) => row[index] ?? '');

  return { headers: uniqueHeaders(pad(headerRow)), rows: dataRows.map(pad) };
}

/** @param {string} text CSV text, e.g. from a Google Sheets export or a .csv file */
export function parseCsvText(text, limits) {
  const { data, errors } = Papa.parse(text.replace(BYTE_ORDER_MARK, ''), { skipEmptyLines: 'greedy' });
  const fatal = errors.find((error) => error.type === 'Quotes');
  if (fatal) throw new SheetParseError(`Could not read the CSV (row ${fatal.row + 1}): ${fatal.message}`);
  return toTable(data, limits);
}
