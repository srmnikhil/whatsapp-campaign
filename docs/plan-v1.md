# Garaaz WhatsApp Marketing Campaign Tool — lean v1 plan

Status: **approved (revision 4, with three small changes).** Target: a working demo in about 1 week.
Companion doc: [`docs/whatsapp-limits.md`](./whatsapp-limits.md) (limits, pricing, payloads, sources).

**What v1 does:**
- **Settings:** Cloud API details.
- **Contacts:** upload a Google Sheet, .csv or .xlsx with name and phone.
- **Message:** pick or create a template with text, an image and the name variable.
- **Send:** send to everyone.
- **Stats:** sent, delivered, read and failed.

It uses only the official Meta Cloud API.

---

## 1. Pre-work

### 1.1 What the codebase shows

- **SuprSend sends Garaaz's WhatsApp messages today.** The backend never calls Meta for these
  (`notification-v2/services/suprsendClient.service.ts`).
- **SuprSend forwards button taps** to `POST /webhooks/suprsend`. The order delivery confirmation
  flow depends on this, so SuprSend's Meta app must keep its webhook.
- **A MongoDB Atlas trigger** (`Create_WhatsApp_Order_Confirmation_Message.js`) calls the Graph API
  directly with a Garaaz-held token. That points to the WABA being in **Garaaz's own portfolio**
  (scenario A). If a BSP owns it instead (scenario B), we can't get our own token.

### 1.2 Checks you need to run on the existing number (blocking)

1. **SuprSend → Vendors → WhatsApp:** vendor type (Cloud API or BSP), App ID, WABA ID, Phone
   Number ID.
2. **Meta Business Settings → WhatsApp Accounts / Messaging Accounts:** which portfolio owns
   them. **If it's scenario B, I stop and report.**
3. **SuprSend's app → WhatsApp → Configuration:** callback URL (expect `hub.suprsend.com`).
4. **Graph Explorer:** `GET /{WABA_ID}/subscribed_apps`.
5. **WhatsApp Manager:** messaging limit tier, quality rating, display name status.
   **Security Center:** Business Verification.
6. **SuprSend analytics:** WhatsApp messages per day. This sets the reserve we keep for
   transactional messages.
7. Whether the Atlas trigger is still enabled. It's another sender on the same daily limit.

### 1.3 Limits doc

Done: [`docs/whatsapp-limits.md`](./whatsapp-limits.md). What matters for v1:

- **The daily limit is per portfolio and shared with SuprSend.** The API doesn't expose how much
  is left. We estimate it as **tier − our unique recipients in the last 24 h − SuprSend reserve**,
  and block a send that goes over.
- **Throughput:** 80 msg/s per number. We send at a fixed **5 msg/s** (configurable).
- **India marketing costs ₹0.8631 per delivered message** (1 Oct 2026, before tax).
- **CORS:** every Graph call works from the browser **except** the image upload step
  `POST /upload:{session}`, which goes through the backend.
- **Stop button:** a tap's webhook `payload` is the button label, unless the send supplies one.
  We supply `STOP_PROMOTIONS`.

### 1.4 WANotifier study

WANotifier uses the official Cloud API. Its flow is:
1. contact list
2. approved template
3. map each variable, with a default value
4. send
5. sent / delivered / read / failed stats

**For v1 we take:**
- a fallback value for an empty name (default "there")
- the STOP keyword opt-out
- the import summary with counts
- CSV export

AiSensy and Wati use the same official API and follow the same pattern.

---

## 2. Architecture

```
 Browser (React + Vite, localhost)  ──── Graph API (send, templates, media, test connection) ────▶  Meta
   settings in localStorage                                                                           │
   sheet parsing, preview, send loop ── x-api-key ──▶ garaaz-backend /whatsapp-campaigns/*           │
                                                        /api/*     campaigns, results, stats, CSV     │
                                                        /meta/template-upload (CORS proxy)            │
                                                        /webhook  ◀── statuses, button taps, texts ───┘
                                                        Mongo: wa_campaigns · wa_campaign_recipients · wa_opt_outs

 SuprSend's Meta app (unchanged) ── its own callback ──▶ hub.suprsend.com ──▶ garaaz-backend /webhooks/suprsend
```

- **The token stays in the browser.** The backend holds only the App Secret, the verify token and
  the API key, all as env vars.
- **One new Meta app, "Garaaz Campaigns".** It's subscribed to the WABA alongside SuprSend's app,
  and each app gets webhooks at its own callback. **SuprSend's app is never touched.**
- **Backend module** at `garaaz-backend/src/modules/whatsapp-campaigns/`:
  - It's self-contained, with no imports from other notification modules.
  - Collections use a `wa_` prefix.
  - The feature flag `WHATSAPP_CAMPAIGNS_ENABLED` switches it off without a rollback.
- **Raw-body hook.** A `verify` callback on the existing `bodyParser.json()` in `main.ts` keeps the
  raw body **only for `/whatsapp-campaigns/webhook`**. The signature check needs those bytes.
  Every other route is unchanged.
- **Webhook always returns 200** after the signature passes, even if processing throws (it's
  logged). That avoids Meta's 7-day retry storm. A bad signature gets 401.
- **JavaScript only** for the frontend, as requested. This overrides the workspace TypeScript rule.

---

## 3. Folder structure

**Frontend: `garaaz-wa-campaigns/` (repo root)**

```
src/
├── config/defaults.js        graph version, pacing, poll interval, stop keyword, name fallback
├── services/                 graphClient.js · templatesApi.js · messagesApi.js · mediaApi.js · backendApi.js
├── lib/                      phone.js · sheetParser.js · contacts.js · payloadBuilder.js · quota.js · errors.js · redact.js
├── hooks/                    useSettings.js · useCampaignSender.js
├── features/                 settings/ · contacts/ · templates/ · send/ · results/ · history/
└── components/ui/            Button · Card · Field · Alert · Table · Badge · MaskedInput
```

**Backend: `garaaz-backend/src/modules/whatsapp-campaigns/`**

```
whatsapp-campaigns.module.ts · whatsapp-campaigns.constants.ts
controllers/   wa-webhook.controller.ts · wa-campaigns.controller.ts · wa-template-upload.controller.ts
guards/        wa-api-key.guard.ts (timingSafeEqual) · meta-signature.guard.ts
services/      wa-campaigns.service.ts · wa-webhook.service.ts · wa-opt-outs.service.ts · wa-template-upload.service.ts
schemas/       wa-campaign.schema.ts · wa-campaign-recipient.schema.ts · wa-opt-out.schema.ts
dto/           create-campaign · add-recipients · report-results
__fixtures__/  Meta sample webhooks: sent, delivered, read, failed, unknown wamid, STOP_PROMOTIONS tap, "STOP" text
```

**Shared backend files touched:**
- `src/main.ts`: the raw-body hook.
- `src/app.module.ts`: import the module.
- `config/configuration.ts`: the config block.

**Packages** (frontend only; the backend needs no new dependencies):
- **app:** `react`, `react-dom`, `vite`, `@vitejs/plugin-react`
- **styling:** `tailwindcss`, `@tailwindcss/vite`
- **file parsing:** `papaparse` for CSV and Google Sheets; `read-excel-file` for .xlsx, chosen over
  SheetJS because of its security advisories
- **tests and lint:** `vitest`, `jsdom`, `@testing-library/react`, `eslint`, `@eslint/js`,
  `eslint-plugin-react-hooks`

---

## 4. Features

### 4.1 Settings

- **Fields:** token, App ID, WABA ID, Phone Number ID, Graph API version, backend URL and API
  key. They're stored in localStorage.
- **Token safety:** the token is masked in the UI. There's a **Clear settings** button. The token
  is never logged or shown in error messages.
- **Test connection** shows the display name, number, quality rating and messaging limit tier:
  `GET /{PHONE_NUMBER_ID}?fields=verified_name,display_phone_number,quality_rating,whatsapp_business_manager_messaging_limit`.

### 4.2 Contacts

- **Input:** a Google Sheet link (link-shared, read through its CSV export), a .csv or an .xlsx.
- **Columns:** pick the name and phone columns.
- **Indian number normalisation:** strip `+91`, `91` or a leading `0`, then require 10 digits
  starting with 6–9. The result is stored as `91XXXXXXXXXX`.
- **Cleaning:** invalid and duplicate rows are removed.
- **Counts:** total, valid, invalid and duplicate.

### 4.3 Templates

- **List:** APPROVED templates in the MARKETING category from
  `GET /{WABA_ID}/message_templates`, following pagination. Each one has a **Refresh status**
  button.
- **Create in-app:**
  - an image header
  - body text with `{{1}}` = name
  - an optional footer
  - a **"Stop promotions"** quick-reply button
  - it's submitted with `POST /{WABA_ID}/message_templates`
- **Image upload:** goes through the backend proxy, which calls `POST /{APP_ID}/uploads` then
  `POST /upload:{session}`. **This is tested first on day 3.**
  - If it fails with the system-user token, in-app creation becomes text-only.
  - Image templates are then created in WhatsApp Manager and still show up in the list.

### 4.4 Send

**1. Preview** shows the message rendered for the first few contacts.

**2. Confirm** shows:
- the number of contacts to send to
- opted-out numbers skipped (`POST /api/contacts/opted-out`)
- the estimated cost

Sending is **blocked** if the count is more than **tier − our 24 h usage − SuprSend reserve**.

**3. Send** (in the browser):
- The campaign and its recipients are saved to the backend first. A unique
  `{campaignId, phone}` index means **no number gets two messages in one campaign**.
- The header image is uploaded once (`POST /{PHONE_NUMBER_ID}/media`).
- Messages are sent at a fixed 5 msg/s.
- **Each send** includes the button payload `STOP_PROMOTIONS` and
  `biz_opaque_callback_data = recipientId`. The opaque data lets statuses land even if the tab
  closed before the result was saved.
- Results are posted to the backend every few seconds.
- A **"Keep this tab open until sending finishes"** banner stays on screen.
- **Only `queued` rows are ever sent.** There's no resume: a closed tab or **Stop** ends the
  campaign. Rows not yet sent are marked `not_sent`, so nothing is sent twice.

**Errors:**

| Error | What happens |
|---|---|
| **Explicit rate limit:** HTTP 429, `130429`, `80007`, `4`; `131056` (same number too fast) | Wait with backoff, then retry the same message |
| **Stop the campaign:** `190` token expired, `131048` spam rate limit, `132015`/`132016` template paused or disabled | Stop and show why. Unsent rows become `not_sent`. |
| **Network error or timeout** (Meta may still have accepted it) | Mark `failed` with reason `timeout`. No retry. If a webhook later arrives with our `biz_opaque_callback_data`, the row is updated to its real status (4.5). |
| **Anything else** | Mark `failed` with its error code. No retry. |

### 4.5 Backend webhook

- **Verification:** `GET /webhook` answers Meta's handshake with the verify token.
- **Signature:** `POST /webhook` checks the HMAC-SHA256 of the raw body against
  `X-Hub-Signature-256` with `timingSafeEqual`.
- **Statuses:**
  - Find the recipient by `wamid`, or by `biz_opaque_callback_data` if that misses.
  - **If neither matches, it's SuprSend's message: ignore it, with no writes.**
  - If the row was marked `failed` with reason `timeout`, or is still `queued`, the webhook proves
    Meta accepted it. The row becomes `accepted` with the wamid, its timeout error is cleared,
    and the status is applied. Rows that failed with a Meta error code are never changed.
  - Store the status and its timestamp. A status never moves backwards
    (read > delivered > sent), so Meta's duplicate or out-of-order webhooks are harmless.
- **Opt-outs:** a button tap with payload `STOP_PROMOTIONS`, or a text `STOP`, upserts the phone
  into `wa_opt_outs`.

### 4.6 Results and history

- **Results:** total, sent, delivered, read, failed (grouped by error code) and not sent.
  - The page refreshes every 20 s while open, and has a manual refresh.
  - A **CSV export** has one row per recipient with status, error and timestamps.
- **History:** a list of campaigns with date, template, recipient count, delivered, read and
  status.

---

## 5. Backend endpoints and schema

**Routes** are under `/whatsapp-campaigns` and protected by `x-api-key`, except the webhook.

| Route | Purpose |
|---|---|
| `GET` / `POST /webhook` | Meta verification and events (signature-checked) |
| `POST /api/campaigns` | Create a campaign |
| `POST /api/campaigns/:id/recipients` | Add recipients as `queued` (in chunks of 500; duplicates rejected by the unique index) |
| `POST /api/campaigns/:id/results` | Batch of results: `accepted` + wamid, or `failed` + error |
| `PATCH /api/campaigns/:id` | Status: `sending`, `stopped` (with reason) or `completed`. Unsent rows are marked `not_sent`. |
| `GET /api/campaigns` · `GET /api/campaigns/:id` | History and stats |
| `GET /api/campaigns/:id/export.csv` | CSV export |
| `POST /api/contacts/opted-out` | Which of these phones have opted out |
| `GET /api/usage/24h` | Our unique recipients in the last 24 h (for the limit check) |
| `POST /meta/template-upload` | CORS proxy for the image upload. The token is passed through and never stored or logged. |

**Collections:**

```text
wa_campaigns            name · templateName · language · headerMediaId? · status: sending|stopped|completed
                        stopReason? · counts · createdAt

wa_campaign_recipients  campaignId · phone · name · state: queued|accepted|failed|not_sent
                        wamid? · lastStatus?: sent|delivered|read|failed · error?: { code, message }
                        acceptedAt? · sentAt? · deliveredAt? · readAt? · failedAt?
                        indexes: { campaignId, phone } UNIQUE · { wamid } UNIQUE (partial) · { acceptedAt }

wa_opt_outs             phone UNIQUE · source: button|keyword · createdAt
```

---

## 6. Meta setup (done once, written up as `docs/meta-setup.md`)

1. **Run the 1.2 checks.** Stop if it's scenario B.
2. **Create a Meta app, "Garaaz Campaigns"** (type Business, with the WhatsApp product) in the
   Garaaz portfolio, and set it to Live. **Don't reuse SuprSend's app.**
3. **System user:** assign the app, the WhatsApp account and the Messaging account. Generate a
   token with no expiry and the permissions `whatsapp_business_management` and
   `whatsapp_business_messaging`. The token goes into the tool's Settings only.
4. **Backend env:** App Secret, verify token, API key, and `WHATSAPP_CAMPAIGNS_ENABLED=true`.
5. **Webhook:** in the app's WhatsApp → Configuration, set the callback to
   `https://<api-host>/whatsapp-campaigns/webhook`, with the fields `messages`.
6. **Subscribe:** `POST /{WABA_ID}/subscribed_apps` with our token and **no body**. Then check that
   `GET /{WABA_ID}/subscribed_apps` lists **both** apps.
7. **Test on 2–3 internal numbers:**
   - statuses arrive
   - a Stop promotions tap and a "STOP" text both opt the number out
   - SuprSend's order delivery confirmation still works
8. **While the callback points at UAT: internal numbers only, no real campaigns.** UAT's data
   (campaigns, stats, opt-outs) doesn't carry over automatically.
9. **Switch to prod before the first real campaign:**
   1. Deploy the module to prod with the same env vars.
   2. Change the app's callback to `https://<prod-api-host>/whatsapp-campaigns/webhook`.
      Meta's verification handshake must pass.
   3. **Copy `wa_opt_outs` from UAT to prod**, upserting by `phone` so it can be re-run safely
      (`mongoexport` from UAT, then `mongoimport --mode=upsert --upsertFields=phone` into prod).
      Do this *after* the callback switch, so opt-outs received on UAT up to the switch are
      included. Check that the prod count is at least the UAT count.
   4. Point the tool's Settings at the prod backend URL and API key.
   5. Repeat step 7 on prod with 2–3 internal numbers. Only then run a real campaign.

**Never do these:**
- edit SuprSend's app callback URL
- set `override_callback_uri` (at WABA or phone level)
- deregister or re-register the number
- configure Conversation Routing

---

## 7. Build order (about 7 working days)

| Step | Work | Days |
|---|---|---|
| 1 | Scaffold the app at the repo root. Settings, Test connection, and one test send of an approved template to my number. | 1 |
| 2 | Contacts import (Sheet, .csv, .xlsx), normalisation, counts | 1 |
| 3 | **Image upload test first** (decides the template fallback), then the template list, create and refresh | 1 |
| 4 | Backend module: campaigns, recipients, results, opted-out, usage, upload proxy, webhook (signature, statuses, opt-outs). Deploy to UAT. | 2 |
| 5 | Send flow: preview, confirm checks, send loop, Stop, banner, errors | 1 |
| 6 | Results, CSV export and history. **Test end to end on 2–3 internal numbers**, then fix. | 1 |

**Tests**, written alongside each step:
- **Vitest:** phone normalisation, sheet parsing, the payload builder (including the stop
  button), the limit check, and the error handling.
- **Jest:** signature check, webhook parsing (fixtures), status ordering, the unique index, and
  opt-outs.

This excludes waiting on your inputs, backend review and deploy slots, and Meta's template review
(usually minutes, up to 24 h).

---

## 8. Top 5 risks

| Risk | Mitigation |
|---|---|
| **WABA owned by a BSP** (scenario B): no own token | The 1.2 checks come first. If it's scenario B, I stop and report. |
| **Breaking SuprSend** (order confirmations, delivery reports) | A separate app, the "never do" list, and a SuprSend check after setup |
| **Shared daily limit:** a campaign could block order notifications for 24 h | Block sends over tier − our usage − SuprSend reserve |
| **Shared number quality**, if the order-notification number is reused | Stop button, opt-out skipping, small first campaigns, stop on `131048` |
| **Token in browser localStorage** | Local use only, no third-party scripts, two permissions only, masked, Clear button |

---

## 9. Inputs needed from you

- The **1.2 check results**. Steps 1–2 block day 1.
- **The Meta app and system-user token** (section 6, steps 2–3) **ready before day 1**. Day 1's
  Test connection and test send need them. The token goes into Settings on your laptop only.
- **SuprSend messages per day**, to set the reserve. Needed by day 5.
- **The backend host for the webhook.**
  - My suggestion: point the app at **UAT for the demo week**. SuprSend traffic is ignored there,
    with no writes.
  - Then switch the callback to **prod before the first real campaign**.
  - Needed by day 4.
- **Which number sends.** Reusing the order-notification number or adding a new one, decided
  after the 1.2 checks.

---

## 10. v2 (not in v1)

- Separate UAT and prod Meta apps
- UAT/Prod settings profiles
- Internal-numbers allowlist
- Send journal and tab lock
- Wake lock and leave-page prompt
- `unknown` state and resend-unconfirmed
- State-transition rules
- Full error catalog
- Webhook load testing
- Dry run
- Pause and resume
- `user_preferences` opt-outs
- Username (no `wa_id`) fallback
- Button-text opt-out fallback
- Quality warnings
- Opt-in checkbox
- Backend sending
- Full risk register
- Scheduling, segments, inbox
