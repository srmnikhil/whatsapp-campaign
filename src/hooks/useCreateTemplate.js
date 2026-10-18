import { useCallback } from 'react';
import { UPLOAD_TIMEOUT_MS } from '../config/defaults.js';
import { HEADER_FORMATS } from '../constants/templates.js';
import { buildTemplateCreatePayload } from '../lib/templateDraft.js';
import { createBackendClient } from '../services/backendClient.js';
import { uploadTemplateImage } from '../services/templateUploadApi.js';
import { createTemplate } from '../services/templatesApi.js';
import { useAsyncAction } from './useAsyncAction.js';
import { useGraphClient } from './useGraphClient.js';

async function uploadHeaderIfNeeded(draft, settings, signal) {
  if (draft.headerFormat !== HEADER_FORMATS.IMAGE) return undefined;
  const backend = createBackendClient({
    backendUrl: settings.backendUrl,
    apiKey: settings.backendApiKey,
    secrets: [settings.accessToken],
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return uploadTemplateImage(backend, { file: draft.imageFile, appId: settings.appId, accessToken: settings.accessToken }, { signal });
}

/**
 * Uploads the header image (if any), submits the template, then adds it to the list.
 * @param {object} settings
 * @param {(templateId: string, signal: AbortSignal) => Promise<unknown>} onCreated
 */
export function useCreateTemplate(settings, onCreated) {
  const graph = useGraphClient(settings);

  const submit = useCallback(
    async (draft, signal) => {
      const headerHandle = await uploadHeaderIfNeeded(draft, settings, signal);
      const created = await createTemplate(graph, settings.wabaId, buildTemplateCreatePayload(draft, { headerHandle }), { signal });

      let listUpdated = true;
      try {
        await onCreated(created.id, signal);
      } catch {
        listUpdated = false;
      }
      return { ...created, listUpdated };
    },
    [graph, settings, onCreated],
  );

  return useAsyncAction(submit);
}
