import { TEMPLATE_DEFAULTS, TEMPLATE_IMAGE_LIMITS } from '../config/defaults.js';
import {
  BUTTON_TYPES,
  COMPONENT_TYPES,
  HEADER_FORMATS,
  NAME_VARIABLE,
  POSITIONAL_PARAMETER_FORMAT,
  TEMPLATE_CATEGORY,
} from '../constants/templates.js';
import { findVariables } from './templates.js';

export const DRAFT_LIMITS = Object.freeze({ nameMax: 512, bodyMax: 1024, footerMax: 60, sampleMax: 60 });

const NAME_PATTERN = /^[a-z0-9_]+$/;

export const EMPTY_DRAFT = Object.freeze({
  name: '',
  language: TEMPLATE_DEFAULTS.languages[0].value,
  headerFormat: HEADER_FORMATS.IMAGE,
  imageFile: null,
  bodyText: '',
  sampleName: TEMPLATE_DEFAULTS.sampleName,
  footerText: '',
  includeStopButton: true,
});

function validateName(name) {
  if (!name) return 'Enter a template name.';
  if (!NAME_PATTERN.test(name)) return 'Use lowercase letters, digits and underscores only.';
  if (name.length > DRAFT_LIMITS.nameMax) return `Use at most ${DRAFT_LIMITS.nameMax} characters.`;
  return null;
}

function validateBody(body) {
  if (!body) return 'Enter the message text.';
  if (body.length > DRAFT_LIMITS.bodyMax) return `Use at most ${DRAFT_LIMITS.bodyMax} characters.`;

  const variables = findVariables(body);
  if (variables.some((variable) => variable !== '1')) return `Only ${NAME_VARIABLE} is allowed (it becomes the contact's name).`;
  if (variables.length > 1) return `Use ${NAME_VARIABLE} only once.`;
  if (body.startsWith(NAME_VARIABLE) || body.endsWith(NAME_VARIABLE)) {
    return `Meta rejects text that starts or ends with ${NAME_VARIABLE}. Add words before and after it.`;
  }
  return null;
}

function validateImage(headerFormat, file) {
  if (headerFormat !== HEADER_FORMATS.IMAGE) return null;
  if (!file) return 'Choose a JPEG or PNG image.';
  if (!TEMPLATE_IMAGE_LIMITS.mimeTypes.includes(file.type)) return 'Use a JPEG or PNG image.';
  if (file.size > TEMPLATE_IMAGE_LIMITS.maxBytes) return 'The image must be 5 MB or smaller.';
  return null;
}

function validateFooter(footer) {
  if (footer.length > DRAFT_LIMITS.footerMax) return `Use at most ${DRAFT_LIMITS.footerMax} characters.`;
  if (findVariables(footer).length > 0) return 'The footer cannot contain variables.';
  return null;
}

/**
 * @param {typeof EMPTY_DRAFT} draft
 * @returns {Record<string, string>} field → error; empty when valid
 */
export function validateTemplateDraft(draft) {
  const body = draft.bodyText.trim();
  const usesName = findVariables(body).length > 0;
  const errors = {
    name: validateName(draft.name.trim()),
    bodyText: validateBody(body),
    imageFile: validateImage(draft.headerFormat, draft.imageFile),
    footerText: validateFooter(draft.footerText.trim()),
    sampleName: usesName && !draft.sampleName.trim() ? 'Meta needs a sample name to review the template.' : null,
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

/**
 * Builds the POST /{WABA_ID}/message_templates body.
 * @param {typeof EMPTY_DRAFT} draft
 * @param {{ headerHandle?: string }} [uploads] required when the header is an image
 */
export function buildTemplateCreatePayload(draft, { headerHandle } = {}) {
  const body = draft.bodyText.trim();
  const footer = draft.footerText.trim();
  const usesName = findVariables(body).length > 0;

  const components = [
    draft.headerFormat === HEADER_FORMATS.IMAGE && {
      type: COMPONENT_TYPES.HEADER,
      format: HEADER_FORMATS.IMAGE,
      example: { header_handle: [headerHandle] },
    },
    {
      type: COMPONENT_TYPES.BODY,
      text: body,
      ...(usesName && { example: { body_text: [[draft.sampleName.trim()]] } }),
    },
    footer && { type: COMPONENT_TYPES.FOOTER, text: footer },
    draft.includeStopButton && {
      type: COMPONENT_TYPES.BUTTONS,
      buttons: [{ type: BUTTON_TYPES.QUICK_REPLY, text: TEMPLATE_DEFAULTS.stopButtonText }],
    },
  ].filter(Boolean);

  return {
    name: draft.name.trim(),
    language: draft.language,
    category: TEMPLATE_CATEGORY.MARKETING,
    parameter_format: POSITIONAL_PARAMETER_FORMAT,
    components,
  };
}
