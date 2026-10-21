import { TEMPLATE_DEFAULTS } from '../config/defaults.js';

const TEMPLATE_FIELDS = [
  'id',
  'name',
  'status',
  'category',
  'language',
  'components',
  'quality_score',
  'rejected_reason',
  'parameter_format',
].join(',');

/**
 * Lists every template on the WABA, following cursor pagination.
 * @param {{ request: Function }} client
 * @returns {Promise<object[]>} raw Graph template objects
 */
export async function listTemplates(client, wabaId, { signal, pageSize = TEMPLATE_DEFAULTS.pageSize, maxPages = TEMPLATE_DEFAULTS.maxListPages } = {}) {
  const templates = [];
  let after;

  for (let page = 0; page < maxPages; page += 1) {
    const query = { fields: TEMPLATE_FIELDS, limit: pageSize, ...(after && { after }) };
    const data = await client.request(`/${encodeURIComponent(wabaId)}/message_templates`, { query, signal });
    templates.push(...(data.data ?? []));

    after = data.paging?.cursors?.after;
    if (!data.paging?.next || !after) break;
  }

  return templates;
}

/** Re-reads one template, e.g. to refresh its review status. */
export function getTemplate(client, templateId, { signal } = {}) {
  return client.request(`/${encodeURIComponent(templateId)}`, { query: { fields: TEMPLATE_FIELDS }, signal });
}

/**
 * Submits a template for review.
 * @returns {Promise<{ id: string, status: string, category: string }>}
 */
export function createTemplate(client, wabaId, payload, { signal } = {}) {
  return client.request(`/${encodeURIComponent(wabaId)}/message_templates`, { method: 'POST', body: payload, signal });
}

/**
 * Deletes a template by name from Meta.
 */
export function deleteTemplate(client, wabaId, templateName, { signal } = {}) {
  return client.request(`/${encodeURIComponent(wabaId)}/message_templates`, {
    method: 'DELETE',
    query: { name: templateName },
    signal,
  });
}
