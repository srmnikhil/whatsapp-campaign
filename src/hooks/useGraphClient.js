import { useMemo } from 'react';
import { createGraphClient } from '../services/graphClient.js';

export function useGraphClient({ accessToken, graphApiVersion }) {
  return useMemo(() => createGraphClient({ accessToken, graphApiVersion }), [accessToken, graphApiVersion]);
}
