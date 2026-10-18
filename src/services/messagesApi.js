const DEFAULT_MESSAGE_STATUS = 'accepted';

/**
 * @param {{ request: Function }} client from createGraphClient
 * @param {string} phoneNumberId
 * @param {object} payload from buildTemplatePayload
 * @returns {Promise<{ wamid: string, messageStatus: string }>}
 */
export async function sendMessage(client, phoneNumberId, payload, { signal } = {}) {
  const data = await client.request(`/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: 'POST',
    body: payload,
    signal,
  });
  const [message] = data.messages ?? [];

  return {
    wamid: message?.id ?? '',
    messageStatus: message?.message_status ?? DEFAULT_MESSAGE_STATUS,
  };
}
