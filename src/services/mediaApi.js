/**
 * Uploads a campaign header image directly to Meta via POST /{PHONE_NUMBER_ID}/media.
 * This call works from the browser (CORS allowed).
 * The media ID is valid for 30 days, so we upload once per campaign and reuse it.
 *
 * @param {{ request: Function }} client   createGraphClient result
 * @param {string} phoneNumberId
 * @param {File} file                       JPEG or PNG, ≤ 5 MB
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<string>}               Media ID
 */
export async function uploadCampaignImage(client, phoneNumberId, file, { signal } = {}) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', file, file.name);
  form.append('type', file.type);

  // The graph client's request() normally sets Content-Type: application/json when body is present.
  // We need multipart, so we pass the FormData directly and let the browser set the boundary.
  // The graphClient.request method handles FormData by not adding Content-Type (browser does it).
  const data = await client.request(`/${encodeURIComponent(phoneNumberId)}/media`, {
    method: 'POST',
    body: form,
    signal,
  });

  const id = data?.id;
  if (!id) throw new Error('Meta did not return a media ID.');
  return id;
}
