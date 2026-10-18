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
  { key: 'graphApiVersion', label: 'Graph API version', required: true, help: 'The version shown in your Meta app, e.g. v25.0.' },
  { key: 'backendUrl', label: 'Backend URL', help: 'For example https://<api-host>. Needed from the send step.' },
  { key: 'backendApiKey', label: 'Backend API key', secret: true, help: 'Sent as the x-api-key header.' },
]);

export const GRAPH_REQUIRED_KEYS = Object.freeze(['accessToken', 'phoneNumberId', 'graphApiVersion']);
export const TEMPLATE_REQUIRED_KEYS = Object.freeze(['accessToken', 'wabaId', 'graphApiVersion']);
export const IMAGE_UPLOAD_REQUIRED_KEYS = Object.freeze(['appId', 'backendUrl', 'backendApiKey']);
export const SEND_REQUIRED_KEYS = Object.freeze(['accessToken', 'phoneNumberId', 'graphApiVersion', 'backendUrl', 'backendApiKey']);
