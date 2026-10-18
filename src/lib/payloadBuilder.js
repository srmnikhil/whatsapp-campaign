import { NAME_FALLBACK, STOP_BUTTON_PAYLOAD } from '../config/defaults.js';
import { HEADER_FORMATS, NAME_VARIABLE } from '../constants/templates.js';

const MESSAGING_PRODUCT = 'whatsapp';
const RECIPIENT_TYPE = 'individual';

/**
 * Builds a Cloud API template message body.
 * @param {{ to: string, templateName: string, languageCode: string, components?: object[] }} input
 */
export function buildTemplatePayload({ to, templateName, languageCode, components = [] }) {
  const template = { name: templateName, language: { code: languageCode } };
  if (components.length > 0) template.components = components;

  return {
    messaging_product: MESSAGING_PRODUCT,
    recipient_type: RECIPIENT_TYPE,
    to,
    type: 'template',
    template,
  };
}

/**
 * Resolves the display name used in `{{1}}`.
 * @param {string} name   contact's name (may be empty)
 * @returns {string}
 */
export function resolveName(name) {
  return name && name.trim() ? name.trim() : NAME_FALLBACK;
}

/**
 * Builds the complete payload for one campaign send.
 *
 * Includes:
 * - HEADER image component (when mediaId is provided)
 * - BODY with `{{1}}` resolved to the contact's name (fallback: "there")
 * - Quick-reply button override with `STOP_PROMOTIONS` payload
 * - `biz_opaque_callback_data` set to the recipientId so statuses land
 *   even if the tab closes before the result was saved
 *
 * @param {{
 *   to: string,
 *   recipientId: string,
 *   name: string,
 *   templateName: string,
 *   languageCode: string,
 *   stopButtonIndex: number,
 *   mediaId?: string | null,
 *   hasNameVariable: boolean,
 * }} input
 */
export function buildCampaignPayload({
  to,
  recipientId,
  name,
  templateName,
  languageCode,
  stopButtonIndex,
  mediaId,
  hasNameVariable,
}) {
  const components = [];

  // Header image (if this template has one and we have a media ID)
  if (mediaId) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { id: mediaId } }],
    });
  }

  // Body with name variable
  if (hasNameVariable) {
    components.push({
      type: 'body',
      parameters: [{ type: 'text', text: resolveName(name) }],
    });
  }

  // Stop button override
  if (stopButtonIndex >= 0) {
    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: String(stopButtonIndex),
      parameters: [{ type: 'payload', payload: STOP_BUTTON_PAYLOAD }],
    });
  }

  const payload = buildTemplatePayload({ to, templateName, languageCode, components });

  // Opaque callback data so webhook can find the row even if the tab closed
  payload.biz_opaque_callback_data = recipientId;

  return payload;
}
