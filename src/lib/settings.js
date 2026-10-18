import { DEFAULT_GRAPH_API_VERSION } from '../config/defaults.js';
import { GRAPH_REQUIRED_KEYS, SETTINGS_FIELDS } from '../constants/settingsFields.js';
import { STORAGE_KEYS } from '../constants/storageKeys.js';

const SETTINGS_KEYS = SETTINGS_FIELDS.map((field) => field.key);
const NUMERIC_ID_KEYS = ['appId', 'wabaId', 'phoneNumberId'];
const NUMERIC_ID_PATTERN = /^\d+$/;
const GRAPH_VERSION_PATTERN = /^v\d+\.\d+$/;
const WHITESPACE_PATTERN = /\s/;
const LOCALHOST_HOSTNAMES = ['localhost', '127.0.0.1'];

export const EMPTY_SETTINGS = Object.freeze({
  ...Object.fromEntries(SETTINGS_KEYS.map((key) => [key, ''])),
  graphApiVersion: DEFAULT_GRAPH_API_VERSION,
});

/**
 * Keeps only known keys, trims strings and drops a trailing slash from the backend URL.
 * @param {Record<string, unknown>} raw
 */
export function sanitizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const entries = SETTINGS_KEYS.map((key) => {
    const value = typeof source[key] === 'string' ? source[key].trim() : EMPTY_SETTINGS[key];
    return [key, value];
  });
  const settings = Object.fromEntries(entries);
  settings.backendUrl = settings.backendUrl.replace(/\/+$/, '');
  return settings;
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const stored = storage.getItem(STORAGE_KEYS.SETTINGS);
    return stored ? sanitizeSettings(JSON.parse(stored)) : { ...EMPTY_SETTINGS };
  } catch {
    return { ...EMPTY_SETTINGS };
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  const clean = sanitizeSettings(settings);
  storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(clean));
  return clean;
}

export function clearSettings(storage = globalThis.localStorage) {
  storage.removeItem(STORAGE_KEYS.SETTINGS);
}

export function getFieldLabel(key) {
  return SETTINGS_FIELDS.find((field) => field.key === key)?.label ?? key;
}

/** @returns {string[]} keys that are required for Graph API calls but empty */
export function getMissingKeys(settings, requiredKeys = GRAPH_REQUIRED_KEYS) {
  return requiredKeys.filter((key) => !settings?.[key]);
}

function isAllowedBackendUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && LOCALHOST_HOSTNAMES.includes(url.hostname));
  } catch {
    return false;
  }
}

/**
 * Format checks for filled-in fields. Empty optional fields are allowed.
 * @returns {Record<string, string>} field key → error message
 */
export function validateSettings(settings) {
  const errors = {};

  NUMERIC_ID_KEYS.filter((key) => settings[key] && !NUMERIC_ID_PATTERN.test(settings[key])).forEach((key) => {
    errors[key] = 'Use digits only.';
  });
  if (!GRAPH_VERSION_PATTERN.test(settings.graphApiVersion)) {
    errors.graphApiVersion = 'Use the format v25.0.';
  }
  if (settings.accessToken && WHITESPACE_PATTERN.test(settings.accessToken)) {
    errors.accessToken = 'The token must not contain spaces or line breaks.';
  }
  if (settings.backendUrl && !isAllowedBackendUrl(settings.backendUrl)) {
    errors.backendUrl = 'Use an https:// URL (http:// is allowed only for localhost).';
  }

  return errors;
}
