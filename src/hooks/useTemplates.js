import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ASYNC_STATUS } from '../constants/asyncStatus.js';
import { isMarketing, sortTemplates, summarizeTemplate, upsertTemplate } from '../lib/templates.js';
import { getTemplate, listTemplates } from '../services/templatesApi.js';
import { useGraphClient } from './useGraphClient.js';

const IDLE_STORE = Object.freeze({ owner: null, status: ASYNC_STATUS.IDLE, templates: [], error: null });

/**
 * WABA templates, loaded on demand and kept while the app is open. Changing the token,
 * version or WABA ID makes the list idle again so it is never shown for the wrong account.
 */
export function useTemplates(settings) {
  const client = useGraphClient(settings);
  const { wabaId } = settings;
  const owner = useMemo(() => ({ client, wabaId }), [client, wabaId]);
  const [store, setStore] = useState(IDLE_STORE);
  const controllerRef = useRef(null);
  const current = store.owner === owner ? store : IDLE_STORE;

  useEffect(() => () => controllerRef.current?.abort(), []);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStore((previous) => ({ ...(previous.owner === owner ? previous : IDLE_STORE), owner, status: ASYNC_STATUS.LOADING, error: null }));

    try {
      const raw = await listTemplates(client, wabaId, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setStore({ owner, status: ASYNC_STATUS.SUCCESS, templates: raw.map(summarizeTemplate), error: null });
      }
    } catch (error) {
      if (!controller.signal.aborted) setStore((previous) => ({ ...previous, owner, status: ASYNC_STATUS.ERROR, error }));
    }
  }, [client, wabaId, owner]);

  const refreshOne = useCallback(
    async (templateId, signal) => {
      const template = summarizeTemplate(await getTemplate(client, templateId, { signal }));
      setStore((previous) => (previous.owner === owner ? { ...previous, templates: upsertTemplate(previous.templates, template) } : previous));
      return template;
    },
    [client, owner],
  );

  const marketing = useMemo(() => sortTemplates(current.templates.filter(isMarketing)), [current.templates]);

  return {
    status: current.status,
    error: current.error,
    isLoading: current.status === ASYNC_STATUS.LOADING,
    templates: marketing,
    hiddenCount: current.templates.length - marketing.length,
    load,
    refreshOne,
  };
}
