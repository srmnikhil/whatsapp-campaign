export const SETTINGS_FIELDS = Object.freeze([
  {
    key: 'accessToken',
    label: 'System user access token',
    secret: true,
    required: true,
    help: 'Needs whatsapp_business_management and whatsapp_business_messaging. Stored only in this browser.',
  },
  { key: 'appId', label: 'App ID', required: true, help: 'The "Garaaz Campaigns" Meta app.' },
  { key: 'wabaId', label: 'WhatsApp Business Account ID', required: true },
  { key: 'phoneNumberId', label: 'Phone number ID', required: true },
  { key: 'graphApiVersion', label: 'Graph API version', required: true, help: 'The version shown in your Meta app, e.g. v26.0.' },
  { key: 'sendDelayMs', label: 'Delay between API calls (ms)', help: 'Delay in milliseconds between consecutive message sends. Minimum is 200 ms (max 5 msg/s safe limit).' },
]);

export const GRAPH_REQUIRED_KEYS = Object.freeze(['accessToken', 'phoneNumberId', 'graphApiVersion']);
export const TEMPLATE_REQUIRED_KEYS = Object.freeze(['accessToken', 'wabaId', 'graphApiVersion']);
export const IMAGE_UPLOAD_REQUIRED_KEYS = Object.freeze(['appId', 'backendUrl', 'backendApiKey']);
export const SEND_REQUIRED_KEYS = Object.freeze(['accessToken', 'phoneNumberId', 'graphApiVersion']);
