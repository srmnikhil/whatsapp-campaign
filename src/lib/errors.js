import { ERROR_KINDS } from '../constants/errorKinds.js';
import { redactSecrets } from './redact.js';

const FALLBACK_MESSAGE = 'Something went wrong.';

const KIND_TITLES = Object.freeze({
  [ERROR_KINDS.TIMEOUT]: 'Timed out',
  [ERROR_KINDS.NETWORK]: 'Network error',
  [ERROR_KINDS.HTTP]: 'Request failed',
});

function graphTitle(error) {
  return error.code ? `Meta error ${error.code}` : 'Meta error';
}

function backendTitle(error) {
  return error.status ? `Backend error ${error.status}` : 'Backend error';
}

/**
 * Turns any thrown value into text that is safe to show in the UI.
 * @param {unknown} error
 * @returns {{ title: string, message: string }}
 */
export function describeError(error) {
  if (!(error instanceof Error)) return { title: 'Error', message: FALLBACK_MESSAGE };

  if (error.kind === ERROR_KINDS.GRAPH) {
    const detail = error.details ? ` ${error.details}` : '';
    return { title: graphTitle(error), message: redactSecrets(`${error.message}${detail}`) };
  }
  if (error.kind === ERROR_KINDS.BACKEND) {
    return { title: backendTitle(error), message: redactSecrets(error.message) || FALLBACK_MESSAGE };
  }

  return {
    title: KIND_TITLES[error.kind] ?? 'Error',
    message: redactSecrets(error.message) || FALLBACK_MESSAGE,
  };
}
