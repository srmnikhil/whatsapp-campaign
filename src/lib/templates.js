import { TEMPLATE_DEFAULTS } from '../config/defaults.js';
import {
  BUTTON_TYPES,
  COMPONENT_TYPES,
  HEADER_FORMATS,
  NAME_VARIABLE,
  POSITIONAL_PARAMETER_FORMAT,
  TEMPLATE_CATEGORY,
  TEMPLATE_STATUS,
} from '../constants/templates.js';

const VARIABLE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;
const SUPPORTED_HEADER_FORMATS = [HEADER_FORMATS.TEXT, HEADER_FORMATS.IMAGE];
const SUPPORTED_BUTTON_TYPES = [BUTTON_TYPES.QUICK_REPLY, BUTTON_TYPES.URL, BUTTON_TYPES.PHONE_NUMBER];

/** @returns {string[]} variable names in order of appearance, e.g. ['1'] */
export function findVariables(text = '') {
  return [...text.matchAll(VARIABLE_PATTERN)].map((match) => match[1]);
}

function findComponent(components, type) {
  return components.find((component) => component.type === type);
}

function headerProblem(header) {
  if (header.format === HEADER_FORMATS.NONE) return null;
  if (!SUPPORTED_HEADER_FORMATS.includes(header.format)) return `${header.format.toLowerCase()} headers aren't supported yet`;
  if (header.format === HEADER_FORMATS.TEXT && findVariables(header.text).length > 0) return 'Header variables aren\'t supported';
  return null;
}

function bodyProblem(template) {
  const variables = findVariables(template.bodyText);
  if (template.parameterFormat && template.parameterFormat !== POSITIONAL_PARAMETER_FORMAT) return 'Named variables aren\'t supported';
  if (variables.some((variable) => variable !== '1')) return `Only ${NAME_VARIABLE} (name) is supported`;
  return null;
}

function buttonsProblem(buttons) {
  const unsupported = buttons.find((button) => !SUPPORTED_BUTTON_TYPES.includes(button.type));
  if (unsupported) return `${unsupported.type.toLowerCase()} buttons aren't supported`;
  if (buttons.some((button) => button.type === BUTTON_TYPES.URL && findVariables(button.url).length > 0)) {
    return 'URL buttons with variables aren\'t supported';
  }
  return null;
}

export const ALLOWED_CAMPAIGN_CATEGORIES = Object.freeze([
  TEMPLATE_CATEGORY.MARKETING,
  TEMPLATE_CATEGORY.UTILITY,
]);

/**
 * Why a template can't be used for a campaign. Empty when it can.
 * @param {ReturnType<typeof summarizeTemplate>} template
 */
export function getCampaignProblems(template) {
  return [
    template.status !== TEMPLATE_STATUS.APPROVED && `Status is ${template.status}`,
    !ALLOWED_CAMPAIGN_CATEGORIES.includes(template.category) && `Category is ${template.category}`,
    headerProblem(template.header),
    bodyProblem(template),
    buttonsProblem(template.buttons),
  ].filter(Boolean);
}

/** @returns {number} index of the stop button among the template's buttons, or -1 */
export function findStopButtonIndex(buttons, stopText = TEMPLATE_DEFAULTS.stopButtonText) {
  const wanted = stopText.trim().toLowerCase();
  return buttons.findIndex((button) => button.type === BUTTON_TYPES.QUICK_REPLY && button.text.trim().toLowerCase() === wanted);
}

/**
 * Flattens a Graph template into the fields the UI and payload builder need.
 * @param {object} raw Graph template
 */
export function summarizeTemplate(raw) {
  const components = raw.components ?? [];
  const header = findComponent(components, COMPONENT_TYPES.HEADER);
  const buttons = (findComponent(components, COMPONENT_TYPES.BUTTONS)?.buttons ?? []).map((button) => ({
    type: button.type,
    text: button.text ?? '',
    url: button.url ?? '',
  }));

  const summary = {
    id: raw.id,
    name: raw.name,
    language: raw.language,
    status: raw.status,
    category: raw.category,
    qualityScore: raw.quality_score?.score ?? null,
    rejectedReason: raw.rejected_reason && raw.rejected_reason !== 'NONE' ? raw.rejected_reason : null,
    parameterFormat: raw.parameter_format ?? null,
    header: {
      format: header?.format ?? HEADER_FORMATS.NONE,
      text: header?.text ?? '',
      exampleUrl: header?.example?.header_handle?.[0] ?? '',
    },
    bodyText: findComponent(components, COMPONENT_TYPES.BODY)?.text ?? '',
    footerText: findComponent(components, COMPONENT_TYPES.FOOTER)?.text ?? '',
    buttons,
    stopButtonIndex: findStopButtonIndex(buttons),
  };

  return { ...summary, problems: getCampaignProblems(summary) };
}

/**
 * Replaces the template with the same id, or adds it.
 * @template {{ id: string }} T
 * @param {T[]} templates
 * @param {T} template
 */
export function upsertTemplate(templates, template) {
  const index = templates.findIndex((existing) => existing.id === template.id);
  if (index === -1) return [...templates, template];
  return templates.map((existing, position) => (position === index ? template : existing));
}

export function isMarketing(template) {
  return template.category === TEMPLATE_CATEGORY.MARKETING;
}

/** Usable templates first, then by name. */
export function sortTemplates(templates) {
  return [...templates].sort((a, b) => a.problems.length - b.problems.length || a.name.localeCompare(b.name));
}

const VERSION_SUFFIX = /_v(\d+)$/i;

/** Version number from a name like `estimate_ready_en_v3` (3), or 0 when it has no `_vN` suffix. */
export function getTemplateVersion(name = '') {
  const match = VERSION_SUFFIX.exec(name);
  return match ? Number(match[1]) : 0;
}

/**
 * Groups templates that differ only by a `_vN` suffix (and share a language) into one entry.
 * Versions are sorted newest first, so `latest` is the highest number.
 * @param {ReturnType<typeof summarizeTemplate>[]} templates
 * @returns {{ key: string, baseName: string, language: string, versions: object[], latest: object }[]}
 */
export function groupTemplatesByVersion(templates) {
  const groups = new Map();
  for (const template of templates) {
    const baseName = template.name.replace(VERSION_SUFFIX, '');
    const key = `${baseName}::${template.language}`;
    if (!groups.has(key)) groups.set(key, { key, baseName, language: template.language, versions: [] });
    groups.get(key).versions.push(template);
  }
  return [...groups.values()].map((group) => {
    const versions = [...group.versions].sort((a, b) => getTemplateVersion(b.name) - getTemplateVersion(a.name));
    return { ...group, versions, latest: versions[0] };
  });
}

/** Template name without its `_vN` suffix. */
export function getTemplateBaseName(name = '') {
  return name.replace(VERSION_SUFFIX, '');
}
