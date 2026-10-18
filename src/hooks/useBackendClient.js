import { useMemo } from 'react';
import { createBackendClient } from '../services/backendClient.js';

/**
 * Memoised backend client. Recreated only when backendUrl, apiKey or accessToken changes.
 * The accessToken is passed as a redacted secret so it never appears in error messages.
 */
export function useBackendClient({ backendUrl, backendApiKey, accessToken }) {
  return useMemo(
    () => createBackendClient({ backendUrl, apiKey: backendApiKey, secrets: [accessToken] }),
    [backendUrl, backendApiKey, accessToken],
  );
}
