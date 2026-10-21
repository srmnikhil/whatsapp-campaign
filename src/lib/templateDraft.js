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

export const DRAFT_LIMITS = Object.freeze({
  nameMax: 512,
  headerTextMax: 60,
  bodyMax: 1024,
  footerMax: 60,
  sampleMax: 60,
  buttonTextMax: 25,
  codeMax: 15,
});

const NAME_PATTERN = /^[a-z0-9_]+$/;

export const EMPTY_DRAFT = Object.freeze({
  name: '',
  category: TEMPLATE_CATEGORY.MARKETING,
  language: TEMPLATE_DEFAULTS.languages[0].value,
  headerFormat: HEADER_FORMATS.IMAGE,
  headerText: '',
  imageFile: null,
  bodyText: '',
  sampleName: TEMPLATE_DEFAULTS.sampleName,
  footerText: '',
  buttonType: 'QUICK_REPLY', // 'NONE' | 'CTA' | 'QUICK_REPLY'
  includeStopButton: true,
  ctaButtons: [],
  quickReplies: [],
});

function validateName(name) {
  if (!name) return 'Enter a template name.';
  if (!NAME_PATTERN.test(name)) return 'Use lowercase letters, digits and underscores only.';
  if (name.length > DRAFT_LIMITS.nameMax) return `Use at most ${DRAFT_LIMITS.nameMax} characters.`;
  return null;
}

function validateHeader(headerFormat, headerText, file) {
  if (headerFormat === HEADER_FORMATS.TEXT) {
    if (!headerText || !headerText.trim()) return 'Enter text for the header.';
    if (headerText.length > DRAFT_LIMITS.headerTextMax) return `Use at most ${DRAFT_LIMITS.headerTextMax} characters.`;
    if (findVariables(headerText).length > 0) return 'Header variables are not supported.';
    return null;
  }
  if (headerFormat === HEADER_FORMATS.IMAGE) {
    if (!file) return 'Choose a JPEG or PNG image.';
    if (!TEMPLATE_IMAGE_LIMITS.mimeTypes.includes(file.type)) return 'Use a JPEG or PNG image.';
    if (file.size > TEMPLATE_IMAGE_LIMITS.maxBytes) return 'The image must be 5 MB or smaller.';
    return null;
  }
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

function validateFooter(footer) {
  if (footer.length > DRAFT_LIMITS.footerMax) return `Use at most ${DRAFT_LIMITS.footerMax} characters.`;
  if (findVariables(footer).length > 0) return 'The footer cannot contain variables.';
  return null;
}

function validateCtaButtons(buttons) {
  if (!Array.isArray(buttons)) return null;
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    if (btn.type !== BUTTON_TYPES.COPY_CODE && (!btn.text || !btn.text.trim())) {
      return `Button #${i + 1}: Enter a label.`;
    }
    if (btn.text && btn.text.length > DRAFT_LIMITS.buttonTextMax) {
      return `Button #${i + 1}: Label must be at most ${DRAFT_LIMITS.buttonTextMax} characters.`;
    }
    if (btn.type === BUTTON_TYPES.URL) {
      if (!btn.url || !btn.url.trim()) return `Button #${i + 1}: Enter a website URL.`;
      if (!/^https?:\/\//i.test(btn.url.trim())) return `Button #${i + 1}: URL must start with https://`;
    }
    if (btn.type === BUTTON_TYPES.PHONE_NUMBER) {
      if (!btn.phoneNumber || !btn.phoneNumber.trim()) return `Button #${i + 1}: Enter a phone number.`;
      if (!/^\+?[0-9\s\-()]{7,20}$/.test(btn.phoneNumber.trim())) return `Button #${i + 1}: Enter a valid phone number with country code.`;
    }
    if (btn.type === BUTTON_TYPES.COPY_CODE) {
      const code = (btn.example || btn.code || '').trim();
      if (!code) return `Button #${i + 1}: Enter an offer code.`;
      if (code.length > DRAFT_LIMITS.codeMax) return `Button #${i + 1}: Code must be at most ${DRAFT_LIMITS.codeMax} characters.`;
    }
  }
  return null;
}

function validateQuickReplies(replies) {
  if (!Array.isArray(replies)) return null;
  for (let i = 0; i < replies.length; i++) {
    const r = replies[i];
    if (!r.text || !r.text.trim()) return `Quick reply #${i + 1}: Enter text.`;
    if (r.text.length > DRAFT_LIMITS.buttonTextMax) return `Quick reply #${i + 1}: Must be at most ${DRAFT_LIMITS.buttonTextMax} characters.`;
  }
  return null;
}

/**
 * @param {typeof EMPTY_DRAFT} draft
 * @returns {Record<string, string>} field → error; empty when valid
 */
export function validateTemplateDraft(draft) {
  const body = (draft.bodyText || '').trim();
  const usesName = findVariables(body).length > 0;
  const headerError = validateHeader(draft.headerFormat, draft.headerText, draft.imageFile);

  const errors = {
    name: validateName((draft.name || '').trim()),
    headerText: draft.headerFormat === HEADER_FORMATS.TEXT ? headerError : null,
    imageFile: draft.headerFormat === HEADER_FORMATS.IMAGE ? headerError : null,
    bodyText: validateBody(body),
    footerText: validateFooter((draft.footerText || '').trim()),
    sampleName: usesName && !(draft.sampleName || '').trim() ? 'Meta needs a sample name to review the template.' : null,
    buttons:
      draft.buttonType === 'CTA'
        ? validateCtaButtons(draft.ctaButtons)
        : draft.buttonType === 'QUICK_REPLY'
        ? validateQuickReplies(draft.quickReplies)
        : null,
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

/**
 * Builds the POST /{WABA_ID}/message_templates body.
 * @param {typeof EMPTY_DRAFT} draft
 * @param {{ headerHandle?: string }} [uploads] required when the header is an image
 */
export function buildTemplateCreatePayload(draft, { headerHandle } = {}) {
  const body = (draft.bodyText || '').trim();
  const footer = (draft.footerText || '').trim();
  const usesName = findVariables(body).length > 0;

  let headerComponent = null;
  if (draft.headerFormat === HEADER_FORMATS.IMAGE) {
    headerComponent = {
      type: COMPONENT_TYPES.HEADER,
      format: HEADER_FORMATS.IMAGE,
      example: { header_handle: [headerHandle] },
    };
  } else if (draft.headerFormat === HEADER_FORMATS.TEXT && draft.headerText?.trim()) {
    headerComponent = {
      type: COMPONENT_TYPES.HEADER,
      format: HEADER_FORMATS.TEXT,
      text: draft.headerText.trim(),
    };
  }

  let buttonsComponent = null;
  if (draft.buttonType === 'CTA' && draft.ctaButtons?.length > 0) {
    const builtButtons = draft.ctaButtons.map((btn) => {
      if (btn.type === BUTTON_TYPES.URL) {
        return { type: BUTTON_TYPES.URL, text: btn.text.trim(), url: btn.url.trim() };
      }
      if (btn.type === BUTTON_TYPES.PHONE_NUMBER) {
        return { type: BUTTON_TYPES.PHONE_NUMBER, text: btn.text.trim(), phone_number: btn.phoneNumber.trim() };
      }
      if (btn.type === BUTTON_TYPES.COPY_CODE) {
        return { type: BUTTON_TYPES.COPY_CODE, example: (btn.example || btn.code || '').trim() };
      }
      return null;
    }).filter(Boolean);

    if (builtButtons.length > 0) {
      buttonsComponent = { type: COMPONENT_TYPES.BUTTONS, buttons: builtButtons };
    }
  } else if (draft.buttonType === 'QUICK_REPLY') {
    if (draft.quickReplies?.length > 0) {
      const builtButtons = draft.quickReplies
        .filter((q) => q.text?.trim())
        .map((q) => ({ type: BUTTON_TYPES.QUICK_REPLY, text: q.text.trim() }));
      if (builtButtons.length > 0) {
        buttonsComponent = { type: COMPONENT_TYPES.BUTTONS, buttons: builtButtons };
      }
    } else if (draft.includeStopButton) {
      buttonsComponent = {
        type: COMPONENT_TYPES.BUTTONS,
        buttons: [{ type: BUTTON_TYPES.QUICK_REPLY, text: TEMPLATE_DEFAULTS.stopButtonText }],
      };
    }
  }

  const components = [
    headerComponent,
    {
      type: COMPONENT_TYPES.BODY,
      text: body,
      ...(usesName && { example: { body_text: [[(draft.sampleName || '').trim()]] } }),
    },
    footer && { type: COMPONENT_TYPES.FOOTER, text: footer },
    buttonsComponent,
  ].filter(Boolean);

  return {
    name: (draft.name || '').trim(),
    language: draft.language,
    category: draft.category || TEMPLATE_CATEGORY.MARKETING,
    parameter_format: POSITIONAL_PARAMETER_FORMAT,
    components,
  };
}
