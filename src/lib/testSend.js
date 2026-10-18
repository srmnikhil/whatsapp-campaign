import { buildTemplatePayload } from './payloadBuilder.js';
import { normalizeIndianPhone } from './phone.js';

const TEMPLATE_NAME_PATTERN = /^[a-z0-9_]+$/;
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(_[A-Z]{2})?$/;

/**
 * Validates the test-send form and builds the Cloud API payload.
 * @param {{ to: string, templateName: string, languageCode: string }} form
 * @returns {{ errors: Record<string, string>, payload: object | null }}
 */
export function prepareTestSend({ to, templateName, languageCode }) {
  const errors = {};
  const phone = normalizeIndianPhone(to);
  const name = templateName.trim();
  const language = languageCode.trim();

  if (!phone) errors.to = 'Enter a valid Indian mobile number.';
  if (!TEMPLATE_NAME_PATTERN.test(name)) errors.templateName = 'Use the exact template name (lowercase, digits, underscores).';
  if (!LANGUAGE_CODE_PATTERN.test(language)) errors.languageCode = 'Use a language code such as en, en_US or hi.';

  const isValid = Object.keys(errors).length === 0;
  return {
    errors,
    payload: isValid ? buildTemplatePayload({ to: phone, templateName: name, languageCode: language }) : null,
  };
}
