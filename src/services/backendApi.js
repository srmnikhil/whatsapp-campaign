/**
 * High-level backend API calls for the send flow.
 * All functions accept a `{ request }` backend client from createBackendClient.
 */

/**
 * Creates a campaign record.
 * @param {{ request: Function }} client
 * @param {{ name: string, templateName: string, language: string, headerMediaId?: string }} dto
 * @returns {Promise<{ id: string, status: string, [key: string]: any }>}
 */
export function createCampaign(client, dto) {
  return client.request('/api/campaigns', { method: 'POST', body: dto });
}

/**
 * Marks the campaign as `sending` (first PATCH after create).
 * The backend requires status to change from the default to `sending`.
 * @param {{ request: Function }} client
 * @param {string} campaignId
 * @param {{ headerMediaId?: string }} [extra]
 */
export function markSending(client, campaignId, extra = {}) {
  return client.request(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: { status: 'sending', ...extra },
  });
}

/**
 * Stops a campaign with a reason.
 * @param {{ request: Function }} client
 * @param {string} campaignId
 * @param {string} stopReason
 */
export function stopCampaign(client, campaignId, stopReason) {
  return client.request(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: { status: 'stopped', stopReason },
  });
}

/**
 * Marks a campaign as completed.
 * @param {{ request: Function }} client
 * @param {string} campaignId
 */
export function completeCampaign(client, campaignId) {
  return client.request(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: { status: 'completed' },
  });
}

/**
 * Adds recipients to a campaign in one chunk (max 500).
 * Returns the ids mapped by phone.
 * @param {{ request: Function }} client
 * @param {string} campaignId
 * @param {Array<{ phone: string, name?: string }>} recipients
 * @returns {Promise<{ inserted: number, duplicates: number, total: number, recipients: Array<{ id: string, phone: string }> }>}
 */
/**
 * One row per recipient: name, phone, state, last status, error and timestamps.
 * @param {{ request: Function }} client
 * @param {string} campaignId
 */
export function listRecipients(client, campaignId) {
  return client.request(`/api/campaigns/${campaignId}/recipients`);
}

export function addRecipients(client, campaignId, recipients) {
  return client.request(`/api/campaigns/${campaignId}/recipients`, {
    method: 'POST',
    body: { recipients },
  });
}

/**
 * Reports send results in one batch (max 500).
 * @param {{ request: Function }} client
 * @param {string} campaignId
 * @param {Array<{ recipientId: string, state: 'accepted'|'failed', wamid?: string, error?: { code: string|number, message?: string } }>} results
 */
export function reportResults(client, campaignId, results) {
  return client.request(`/api/campaigns/${campaignId}/results`, {
    method: 'POST',
    body: { results },
  });
}

/**
 * Returns the set of phones (from the given list) that have opted out.
 * @param {{ request: Function }} client
 * @param {string[]} phones
 * @returns {Promise<{ optedOut: string[] }>}
 */
export function getOptedOut(client, phones) {
  return client.request('/api/contacts/opted-out', {
    method: 'POST',
    body: { phones },
  });
}

/**
 * Returns our unique recipients in the last 24 h (for the quota check).
 * @param {{ request: Function }} client
 * @returns {Promise<{ uniqueRecipients: number, since: string }>}
 */
export function getUsage24h(client) {
  return client.request('/api/usage/24h');
}

/**
 * Returns a single campaign with stats and failedByCode.
 * @param {{ request: Function }} client
 * @param {string} campaignId
 */
export function getCampaign(client, campaignId) {
  return client.request(`/api/campaigns/${campaignId}`);
}

/**
 * Lists campaigns, newest first.
 * @param {{ request: Function }} client
 * @param {{ limit?: number, skip?: number }} [query]
 */
export async function listCampaigns(client, { limit = 50, skip = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  return client.request(`/api/campaigns?${params}`);
}

/**
 * Downloads the recipient CSV. The API key goes in the header, not the URL.
 * @param {{ backendUrl: string, apiKey: string, campaignId: string }} input
 */
export async function downloadCampaignCsv({ backendUrl, apiKey, campaignId }) {
  const base = (backendUrl || '').replace(/\/+$/, '');
  const response = await fetch(
    `${base}/whatsapp-campaigns/api/campaigns/${campaignId}/export.csv`,
    { headers: { 'x-api-key': apiKey } },
  );
  if (!response.ok) throw new Error(`CSV download failed with HTTP ${response.status}.`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `campaign-${campaignId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
