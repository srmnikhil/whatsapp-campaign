const PHONE_NUMBER_FIELDS = [
  'verified_name',
  'display_phone_number',
  'quality_rating',
  'whatsapp_business_manager_messaging_limit',
  'name_status',
].join(',');

/**
 * @param {{ request: Function }} client from createGraphClient
 * @param {string} phoneNumberId
 */
export async function fetchPhoneNumberInfo(client, phoneNumberId, { signal } = {}) {
  const data = await client.request(`/${encodeURIComponent(phoneNumberId)}`, {
    query: { fields: PHONE_NUMBER_FIELDS },
    signal,
  });

  return {
    verifiedName: data.verified_name ?? '',
    displayPhoneNumber: data.display_phone_number ?? '',
    qualityRating: data.quality_rating ?? '',
    messagingLimitTier: data.whatsapp_business_manager_messaging_limit ?? '',
    nameStatus: data.name_status ?? '',
  };
}
