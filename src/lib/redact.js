export const REDACTED = '[redacted]';

const MIN_SECRET_LENGTH = 8;
const META_TOKEN_PATTERN = /EAA[A-Za-z0-9]{20,}/g;
const BEARER_PATTERN = /(Bearer\s+)[^\s"']+/gi;
const ACCESS_TOKEN_PARAM_PATTERN = /(access_token=)[^&\s"']+/gi;

/**
 * Removes known secrets and anything shaped like a Meta access token from text
 * before it is shown in the UI or stored.
 * @param {string} text
 * @param {string[]} [secrets] exact values to remove, e.g. the configured token
 * @returns {string}
 */
export function redactSecrets(text, secrets = []) {
  if (typeof text !== 'string' || text === '') return '';

  const withoutKnownSecrets = secrets
    .filter((secret) => typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH)
    .reduce((current, secret) => current.split(secret).join(REDACTED), text);

  return withoutKnownSecrets
    .replace(META_TOKEN_PATTERN, REDACTED)
    .replace(BEARER_PATTERN, `$1${REDACTED}`)
    .replace(ACCESS_TOKEN_PARAM_PATTERN, `$1${REDACTED}`);
}
