const INDIA_COUNTRY_CODE = '91';
const INTERNATIONAL_PREFIX = '00';
const TRUNK_PREFIX = '0';
const LOCAL_LENGTH = 10;
const ALLOWED_CHARACTERS_PATTERN = /^[\d\s+\-().]+$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

function toLocalNumber(digits) {
  if (digits.length === LOCAL_LENGTH) return digits;
  if (digits.length === LOCAL_LENGTH + 1 && digits.startsWith(TRUNK_PREFIX)) return digits.slice(1);
  if (digits.length === LOCAL_LENGTH + 2 && digits.startsWith(INDIA_COUNTRY_CODE)) return digits.slice(2);
  if (digits.length === LOCAL_LENGTH + 4 && digits.startsWith(INTERNATIONAL_PREFIX + INDIA_COUNTRY_CODE)) {
    return digits.slice(4);
  }
  return null;
}

/**
 * Normalises an Indian mobile number to the WhatsApp format 91XXXXXXXXXX.
 * Accepts +91, 91, 0091 or a leading 0, with spaces, dashes, dots or brackets.
 * @param {unknown} input
 * @returns {string | null} null when the value isn't a valid Indian mobile number
 */
export function normalizeIndianPhone(input) {
  if (typeof input !== 'string' && typeof input !== 'number') return null;

  const text = String(input).trim();
  if (!text || !ALLOWED_CHARACTERS_PATTERN.test(text)) return null;

  const local = toLocalNumber(text.replace(/\D/g, ''));
  return local && MOBILE_PATTERN.test(local) ? INDIA_COUNTRY_CODE + local : null;
}
