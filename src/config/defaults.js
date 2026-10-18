export const GRAPH_BASE_URL = 'https://graph.facebook.com';
export const DEFAULT_GRAPH_API_VERSION = 'v25.0';
export const REQUEST_TIMEOUT_MS = 20_000;
export const UPLOAD_TIMEOUT_MS = 60_000;
export const BACKEND_ROUTE_PREFIX = '/whatsapp-campaigns';

export const TEMPLATE_DEFAULTS = Object.freeze({
  stopButtonText: 'Stop promotions',
  sampleName: 'Rahul',
  maxListPages: 10,
  pageSize: 100,
  languages: Object.freeze([
    { value: 'en', label: 'English (en)' },
    { value: 'en_US', label: 'English US (en_US)' },
    { value: 'en_GB', label: 'English UK (en_GB)' },
    { value: 'hi', label: 'Hindi (hi)' },
  ]),
});

export const TEMPLATE_IMAGE_LIMITS = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: Object.freeze(['image/jpeg', 'image/png']),
});

export const TEST_SEND_DEFAULTS = Object.freeze({
  templateName: 'hello_world',
  languageCode: 'en_US',
});

export const TIER_LIMITS = Object.freeze({
  TIER_250: 250,
  TIER_2K: 2_000,
  TIER_10K: 10_000,
  TIER_100K: 100_000,
  TIER_UNLIMITED: null,
});

export const CONTACT_IMPORT_LIMITS = Object.freeze({
  maxFileBytes: 5 * 1024 * 1024,
  maxRows: 20_000,
  previewRows: 20,
});

export const QUALITY_LABELS = Object.freeze({
  GREEN: 'High',
  YELLOW: 'Medium',
  RED: 'Low',
  UNKNOWN: 'Unknown',
});

/** Fixed pacing: 5 messages/second in the browser. 80 msg/s is the Meta ceiling. */
export const SEND_PACING_MPS = 5;

/** Payload on the STOP button so the webhook doesn't depend on label text. */
export const STOP_BUTTON_PAYLOAD = 'STOP_PROMOTIONS';

/** Name fallback when the contact's name column is blank. */
export const NAME_FALLBACK = 'there';

/**
 * Reserve this many slots for SuprSend transactional messages in the 24 h limit check.
 * Set to 0 until the actual daily volume is confirmed.
 */
export const TRANSACTIONAL_RESERVE = 0;

/** Max results in one batch POST. Backend limit is 500. */
export const RESULTS_BATCH_SIZE = 200;

/** Recipient chunk size for addRecipients calls. Backend limit is 500. */
export const RECIPIENTS_CHUNK_SIZE = 500;

/** How often (ms) the results page polls for fresh stats. */
export const POLL_INTERVAL_MS = 20_000;

/** INR cost per delivered marketing message to India (1 Oct 2026, ex-tax). */
export const MARKETING_RATE_INR = 0.8631;

/**
 * Meta error codes that mean we must stop the whole campaign immediately.
 * 190 = token expired, 131048 = spam rate limit, 132015 = template paused, 132016 = template disabled.
 */
export const CAMPAIGN_STOP_CODES = Object.freeze([190, 131048, 132015, 132016]);

/**
 * Meta error codes that mean we should back off and retry the same message.
 * 130429 = throughput limit, 80007 = management limit, 4 = app rate limit, 131056 = pair rate limit.
 */
export const RATE_LIMIT_CODES = Object.freeze([130429, 80007, 4, 131056]);

/** Base back-off in ms for pair-rate-limit retries (4^attempt seconds, capped). */
export const PAIR_RATE_RETRY_BASE_MS = 4_000;
export const PAIR_RATE_MAX_RETRIES = 3;

/** Send preview row count. */
export const PREVIEW_ROWS = 3;
