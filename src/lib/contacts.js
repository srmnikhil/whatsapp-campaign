import { normalizeIndianPhone } from './phone.js';

export const INVALID_REASONS = Object.freeze({
  MISSING_PHONE: 'No phone number',
  INVALID_PHONE: 'Not a valid Indian mobile number',
});

const NAME_COLUMN_PATTERN = /name/i;
const STRONG_PHONE_COLUMN_PATTERN = /phone|mobile|whatsapp|cell/i;
const WEAK_PHONE_COLUMN_PATTERN = /number|contact|\bno\b/i;
const NOT_FOUND = -1;
const WHITESPACE_RUN = /\s+/g;

function findPhoneColumn(headers) {
  const strong = headers.findIndex((header) => STRONG_PHONE_COLUMN_PATTERN.test(header));
  if (strong !== NOT_FOUND) return strong;
  return headers.findIndex((header) => WEAK_PHONE_COLUMN_PATTERN.test(header) && !NAME_COLUMN_PATTERN.test(header));
}

/**
 * Picks the most likely name and phone columns from the headings.
 * @param {string[]} headers
 * @returns {{ nameIndex: number, phoneIndex: number }} -1 when no match
 */
export function guessColumns(headers) {
  const phoneIndex = findPhoneColumn(headers);
  const nameIndex = headers.findIndex((header, index) => index !== phoneIndex && NAME_COLUMN_PATTERN.test(header));
  return { nameIndex, phoneIndex };
}

function cleanName(value) {
  return (value ?? '').replace(WHITESPACE_RUN, ' ').trim();
}

/**
 * Normalises phones and splits rows into valid, invalid and duplicate contacts.
 * Row numbers match the sheet (headings are row 1).
 * @param {string[][]} rows
 * @param {{ nameIndex: number, phoneIndex: number }} mapping
 */
export function buildContacts(rows, { nameIndex, phoneIndex }) {
  const valid = [];
  const invalid = [];
  const duplicates = [];
  const firstRowByPhone = new Map();
  let emptyNames = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rawPhone = phoneIndex === NOT_FOUND ? '' : row[phoneIndex] ?? '';
    const name = nameIndex === NOT_FOUND ? '' : cleanName(row[nameIndex]);
    const phone = normalizeIndianPhone(rawPhone);

    if (!phone) {
      const reason = rawPhone ? INVALID_REASONS.INVALID_PHONE : INVALID_REASONS.MISSING_PHONE;
      invalid.push({ rowNumber, name, rawPhone, reason });
      return;
    }
    if (firstRowByPhone.has(phone)) {
      duplicates.push({ rowNumber, name, phone, firstRowNumber: firstRowByPhone.get(phone) });
      return;
    }
    if (!name) {
      emptyNames += 1;
    }
    firstRowByPhone.set(phone, rowNumber);
    valid.push({ rowNumber, name, phone });
  });

  return {
    valid,
    invalid,
    duplicates,
    counts: { total: rows.length, valid: valid.length, invalid: invalid.length, duplicates: duplicates.length, emptyNames },
  };
}
