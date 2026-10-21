# WhatsApp Cloud API — limits, rules and pricing (reference for v1)

Verified against Meta's official docs on **18 Oct 2026**. Meta moved its docs from
`/docs/whatsapp/...` to `/documentation/business-messaging/whatsapp/...`; all links below
use the new paths. Every number here is configuration, not code: the app reads them from
`src/config/defaults.js` (or Settings) so they can be changed without a code change.

Base URL for links: `https://developers.facebook.com/documentation/business-messaging/whatsapp`

---

## 1. Messaging limits (business portfolio level)

Source: `/messaging-limits/`, `/upcoming-messaging-limits-changes/` (changes live since 7 Oct 2025)

- **What it counts:** unique WhatsApp users your business *delivers* messages to **outside a
  customer service window**, in a **moving 24-hour period**.
- **Scope:** set per **business portfolio** and shared by **every phone number** in it. Under the
  new account model it is also shared by **every partner/app sending on the number**, so
  SuprSend's transactional messages and our marketing campaigns use the same limit.
- **Tiers:** 250 (new portfolio) → 2,000 → 10,000 → 100,000 → Unlimited.
- **Getting to 2,000 (one of):**
  - Business Verification, **or**
  - partner-led verification, **or**
  - 2,000 delivered messages outside customer service windows to unique users in 30 days,
    using high-quality templates.
  Meta then reviews message quality and approves or denies (`business_capability_update` /
  `account_alerts` webhooks).
- **Automatic scaling above 2,000:** high-quality messages across all numbers and templates
  **and** at least 50% of the current limit used in the last 7 days → up one tier within 6 hours.
- **Quality drops no longer downgrade the limit** (the old "Flagged" state is gone).
- **API:** `GET /{PHONE_NUMBER_ID}?fields=whatsapp_business_manager_messaging_limit` (also on the
  WABA/portfolio) → `TIER_250 | TIER_2K | TIER_10K | TIER_100K | TIER_UNLIMITED`.
  `messaging_limit_tier` is **deprecated**, so don't use it.
- **Remaining quota is not exposed by the API.** The tool can only estimate it:
  tier minus our own unique recipients in the last 24 hours minus a configured reserve for
  transactional (SuprSend) traffic.
- **Registered number cap:** 2 per new portfolio, rising to 20 after verification or reaching 2K.

## 2. Throughput and rate limits

Sources: `/throughput/`, `/about-the-platform/` (Rate limits section), `/support/error-codes`

| Limit | Value | Error |
|---|---|---|
| Throughput per phone number | 80 msg/s default; automatic upgrade to 1,000 msg/s (needs Unlimited tier, ≥100K unique users/24h, quality ≥ Medium) | `130429` |
| Coexistence numbers (Business app + API) | fixed 20 msg/s | `130429` |
| Throughput counts | inbound **and** outbound, all message types | — |
| Pair rate limit (same recipient) | 1 msg / 6 s (~10/min); bursts of up to 45 borrow from future quota | `131056` |
| Management endpoints (`/{WABA}`, `/message_templates`, `/subscribed_apps`, `/phone_numbers`) | 200 req/hour per app per WABA; 5,000/hour for an active WABA with a registered number | `80007` (WABA), `4` (app) |
| Maintenance (e.g. during throughput upgrade, ~1 min) | — | `131057` |

- Meta's documented retry for the pair rate limit is to wait 4^X seconds (X = 0, 1, 2…).
- Throughput is per phone number. Under the new account model, partners sharing a number share
  its throughput.
- For media at high throughput, Meta recommends uploading once and sending the media **ID**
  rather than a URL.
- Get the current level with `GET /{PHONE_NUMBER_ID}?fields=throughput`.

## 3. Per-user marketing message limits (`131049`)

Source: `/templates/marketing-templates/per-user-limits/`

- WhatsApp dynamically limits how many marketing templates **one user** receives from **all
  businesses**, based on that user's recent marketing read rate and inbox activity.
- Every delivered marketing template counts. Marketing templates sent **inside** an open 24h
  customer service window do **not** count.
- Failure arrives as a `failed` status webhook with code `131049`.
- **Wait at least 24 hours** before resending to that user. Repeated retries within 24h can block
  delivery to that user for up to 24h. **The tool never auto-retries 131049.**
- Marketing templates are **not delivered to US (+1) numbers**.

## 4. Quality rating — what lowers it and what it affects

Sources: `/templates/template-quality/`, `/templates/template-pausing/`,
`/templates/template-pacing/`, `/templates/portfolio-pacing/`, `/getting-opt-in/`

- **Template `quality_score`:** `GREEN` (high), `YELLOW` (medium), `RED` (low), `UNKNOWN` (new).
- **Phone `quality_rating`:** `GREEN` / `YELLOW` / `RED` (High / Medium / Low in WhatsApp Manager).
- **What lowers quality:** negative user feedback (blocks, reports, "stop marketing"),
  low read rates, and unexpected or unsolicited messages.
- **Template pausing** (when quality reaches RED): paused 3h, then 6h, then **disabled**.
  - Sends are rejected with `132015` (paused) or `132016` (disabled).
  - Rejected sends are not charged and don't count against the limit.
  - Templates can be unpaused with `POST /{TEMPLATE_ID}/unpause`.
- **Template pacing** (marketing and utility): new or non-GREEN templates may have messages
  `held`.
  - Send response `message_status: "held_for_quality_assessment"` instead of `"accepted"`.
  - If feedback is bad: template PAUSED and held messages dropped with `132015`.
  - Meta targets delivery within ~1 hour (p99).
- **Business portfolio pacing:** applies to portfolios that sent **fewer than 500K templates in
  365 days** (Garaaz very likely qualifies) or that are being monitored.
  - Large bursts are delivered in batches while Meta collects feedback.
  - If feedback is bad: remaining held messages are dropped with `135000`, **and the portfolio
    can't send or create templates during review**.
- **Phone-level effects:**
  - Sustained low quality can trigger `131048` (spam rate limit) for that number.
  - Automatic tier scaling needs high quality.
  - The 1,000 msg/s upgrade needs ≥ Medium.
  - Because templates share the number, marketing feedback can affect the transactional number.

## 5. 24-hour customer service window and marketing templates

Sources: `/pricing/`, `/support/error-codes`

- The window opens (or resets) every time the **user** messages the business.
  **Non-template** messages can only be sent inside it (`131047` otherwise).
- Reaching out to users who haven't messaged first **requires an approved template**.
  Promotional content must use the **MARKETING** category.
- **Opt-in is mandatory** before messaging. It can be gathered off WhatsApp, must name the
  business, and opt-outs must be honoured (`/getting-opt-in/`).

## 6. Template approval and category rules

Sources: `/templates/template-review/`, `/templates/components/`,
`/templates/template-categorization/`, `/templates/template-management/`

- **Review:** a decision can take **up to 24h**.
  - Statuses: `PENDING`, `APPROVED`, `REJECTED`, `PAUSED`, `DISABLED`, plus `IN_APPEAL` and others.
  - Rejection reason: `rejected_reason` field. Appeals are decided within 24h.
  - Status changes arrive via the `message_template_status_update` webhook. Template webhooks
    **always go to the app's default callback URL** and can't be overridden.
- **Common rejection reasons:**
  - **Parameter formatting:** variables must be `{{1}}`, `{{2}}`… in sequence; no `# $ %`;
    the body can't start or end with a variable; not too many variables for the text length.
  - **Policy:** Commerce or Business Policy violations; asking for sensitive identifiers;
    threatening tone.
  - **Duplicates:** same body and footer as an existing template.
- **Component limits:**
  - Header text: 60 chars. Body: 1,024 chars. Footer: 60 chars. Up to 10 buttons
    (max 10 quick replies). Quick-reply label: **25 chars**. Quick replies must be grouped together,
    not interleaved with URL or phone buttons.
  - A quick reply combined with another button type (or ≥4 buttons) isn't viewable on WhatsApp
    desktop.
- **Variables:**
  - Both positional (`{{1}}`) and named (`{{first_name}}`) formats exist
    (`parameter_format: "positional" | "named"`).
  - Sample values are **required** at creation.
- **Image header sample:** needs a `header_handle` from the Resumable Upload API
  (`POST /{APP_ID}/uploads`, then `POST /upload:{SESSION_ID}`).
- **Category:** promotional content must be MARKETING. Meta may recategorise templates
  (`template_category_update` webhook). Repeated misclassification leads to `131064` sending
  restrictions.
- **Ownership:** under the new account model, templates belong to the **Messaging account**
  (= WABA ID). Every app sending through that WABA sees them.

## 7. Pricing for marketing messages to India

Sources: `/pricing/` and its INR rate card (effective **1 Oct 2026**)

- **Model:** **per-message** pricing since 1 Jul 2025. Meta charges **only for delivered
  messages**, by category and the recipient's country code.
- **INR list rates for recipients in India** (+91), before taxes:

  | Category | ₹ per delivered message |
  |---|---|
  | Marketing | **0.8631** |
  | Utility | 0.115 |
  | Authentication | 0.115 |
  | Service | 0.115, after the free tier of 1,000 service messages per number per month (from 1 Oct 2026) |

- No volume tiers for marketing (they apply to utility and authentication only).
- Messages sent in a free entry point window (Click-to-WhatsApp ads) aren't charged. That doesn't
  apply to v1.
- Rates change on Meta's pricing calendar, so they live in config. v1 doesn't estimate cost
  (out of scope). This section is for planning only.
- Taxes (GST) on Meta's invoice aren't covered by the rate card. Check the Billing Hub invoice.

## 8. Webhook payloads we rely on

Sources: `/webhooks/create-webhook-endpoint/`, `/webhooks/overview/`, `/webhooks/override/`,
`/webhooks/reference/messages/status/`, `/webhooks/reference/messages/button/`,
`/webhooks/reference/messages/text/`, `/webhooks/reference/user_preferences/`

- **Verification:** `GET` with `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`.
  Reply `200` with the challenge if the token matches.
- **Signature:** `X-Hub-Signature-256: sha256=<hex>` = HMAC-SHA256 of the **raw body**,
  keyed by the **App Secret**.
- **Delivery semantics:**
  - Up to 1,000 updates per POST (batching isn't guaranteed).
  - Non-200 responses are retried for **up to 7 days**, so duplicates happen; handlers must be
    idempotent.
  - Retries go to **all subscribed apps**.
  - Meta wants median latency ≤ 250 ms.
  - There's no API to fetch past webhooks, so store them.
- **Status object:** `entry[].changes[].value.statuses[]` with `field: "messages"`.
  - Fields: `id` (wamid), `status` (`sent | delivered | read | failed | played`), `timestamp`,
    `recipient_id`, optional `biz_opaque_callback_data`, `pricing { type, category }`,
    `errors[] { code, title, message, error_data.details }`.
  - `read` implies delivered; `delivered` is sometimes skipped.
  - The `conversation` object is omitted from v24.0 onward.
- **Quick-reply tap:** `messages[]` with `type: "button"`, `button { payload, text }`, and
  `context.id` = the wamid of our template message.
  - **By default `payload` = the button label text** (the reference shows
    `"payload": "<BUTTON_LABEL_TEXT>"`, and the example has payload and text both `"Unsubscribe"`).
  - A custom payload is supplied **per send** in the template components:
    `{"type":"button","sub_type":"quick_reply","index":"<n>","parameters":[{"type":"payload","payload":"<VALUE>"}]}`
    (Message API reference). `index` is a string and is the button's position in the template.
- **Text reply:** `messages[]` with `type: "text"`, `text.body`, `from` = the user's number.
- **`user_preferences` field:** `user_preferences[] { wa_id, category: "marketing_messages",
  value: "stop" | "resume", timestamp }`. Fires when the user uses WhatsApp's built-in
  stop/resume-marketing control. `wa_id` may be missing for users with a username enabled.
- **`131050` (failed status):** the user has stopped marketing messages from us. Never retry.
- **Multiple apps:** every app subscribed to a WABA gets webhooks at **its own** callback URL.
  The `override_callback_uri` (WABA or phone level) only redirects **that app's** webhooks.
- **Conversation Routing:** by default every connected responder receives every inbound message.
  If the business sets up routing, inbound replies go to one primary per entry point
  (e.g. "Marketing Message Response").
- **Under the new account model:** "delivery receipts return to the sending app".

## 9. Media

Source: `/business-phone-numbers/media/`

- Upload with `POST /{PHONE_NUMBER_ID}/media` (multipart, `messaging_product=whatsapp`).
  Media IDs **expire after 30 days**.
- Images: **JPEG / PNG, ≤ 5 MB, 8-bit RGB or RGBA**.

## 10. New account model (rolling out now) — affects IDs and config

Source: `/account-model-evolution/`, `/account-model-evolution/messaging/`

- **Phase 1** (23 Sep 2026 → mid-Oct 2026):
  - The WABA becomes a **WhatsApp account (WAAC)**, which holds the phone number, plus a
    **Messaging account**, which holds templates, billing and webhook subscriptions and
    **keeps the WABA ID**.
  - Existing IDs and calls keep working.
  - System users need asset access to **both** the WhatsApp account and the Messaging account.
- **`messaging_account_id`** on `/messages`: optional now. Required (on the newest version) from
  **Phase 2, H1 2027**, whenever the token can reach more than one Messaging account on the number.
- **Phase 3, H1 2028:** endpoints that take a **phone number ID in the path** (`/messages`,
  `/media`) must use the **WAAC ID**. That's why the IDs and the Graph API version are settings,
  not constants.

## 11. Browser CORS (tested 18 Oct 2026 from origin `http://localhost:5173`)

| Call | Browser direct? |
|---|---|
| `graph.facebook.com/{v}/{id}` GET, `/messages`, `/media`, `/message_templates`, `/{APP_ID}/uploads` | Yes. Preflight returns `Access-Control-Allow-Origin: *` and allows `authorization, content-type, file_offset` |
| `graph.facebook.com/{v}/upload:{SESSION_ID}` (resumable upload data step) | **No.** Preflight returns 403 and the response has no CORS header, so it **goes through the backend** |
| Google Sheets `/export?format=csv&gid=…` (link-shared sheet) | Yes. The redirect target returns `Access-Control-Allow-Origin: *` |

## 12. Config keys (never hardcoded)

`graphApiVersion` (current docs show `v26.0`), `throughputCeilingMps` (80),
`pacingMps` (user-set), `pairRateRetryBaseSeconds` (4), `perUserLimitWaitHours` (24),
`tierLimits` (`TIER_250: 250 … TIER_UNLIMITED: null`), `transactionalReserve`,
`recentContactGapDays`, `optOutKeywords`, `stopButtonPayload`, `pollIntervalMs`,
`marketingRateInr` (planning only), `errorCatalog` (code → class + readable message).
