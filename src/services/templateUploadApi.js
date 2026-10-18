/**
 * Uploads a template header image through the backend, which runs Meta's resumable
 * upload (the second step is blocked by CORS in the browser).
 * The Meta token goes in the Authorization header so the backend logger redacts it.
 * @param {{ request: Function }} backendClient
 * @param {{ file: File, appId: string, accessToken: string }} input
 * @returns {Promise<string>} the header_handle for template creation
 */
export async function uploadTemplateImage(backendClient, { file, appId, accessToken }, { signal } = {}) {
  const form = new FormData();
  form.append('appId', appId);
  form.append('file', file, file.name);

  const data = await backendClient.request('/meta/template-upload', {
    method: 'POST',
    body: form,
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  if (!data?.handle) throw new Error('The backend did not return an upload handle.');
  return data.handle;
}
