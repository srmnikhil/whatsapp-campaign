# Progress — WhatsApp Campaigns v1

Last updated: 18 Oct 2026. Plan: [`docs/plan-v1.md`](./plan-v1.md) (approved, revision 4).

**Status:** steps 1–6 are done and have been run on the test number. Step 4's backend is `2af6403f` on `garaaz-backend` branch `feat/whatsapp-campaigns` (not pushed). The send, results and history UI is on `garaaz-wa-campaigns` `main` (not pushed): confirm-screen fix `f63a76d`, per-recipient Results table with separate state and last status columns, status filtering, and pagination. A sheet of 4 test contacts was sent; stats landed (2 delivered, 1 of those read, 2 failed with `131049`).

---

## Done

### Step 1: Scaffold, Settings, Test connection, test send

- The app (repo root) uses React 19, Vite 8 and Tailwind 4, in JavaScript only. Theme tokens mirror `garaaz-web`.
- **Settings:**
  - Fields: token, App ID, WABA ID, Phone Number ID, Graph API version, backend URL and backend API key.
  - They're stored in this browser's localStorage only.
  - The token and API key are masked, and **Clear settings** removes everything.
  - The token is removed from every error message.
- **Test connection** shows the display name, number, quality rating and messaging limit.
- **Test send** sends one variable-free approved template to one number.
- Both work live on the test app "Garaaz Campaigns (Test)", test number +1 555 668 7731, quality
  High, limit 2,000 per 24 h.

### Step 2: Contacts import

- **Sources:** a Google Sheet link (link-shared, read through its CSV export), .csv or .xlsx.
  The old `.xls` format is rejected.
- **Columns:** the name and phone columns are guessed from the headings, and can be changed.
- **Phones:** Indian mobiles are normalised to `91XXXXXXXXXX`. `+91`, `91`, `0091`, a leading `0`
  and separators are all accepted.
- **Summary:** total, valid, invalid and duplicate counts. The invalid and duplicate tables give
  sheet row numbers, and there's a preview of the first 20 contacts.
- **Limits:** 5 MB per file, 20,000 rows.
- The import stays loaded while you switch tabs.

**Sheet format:**
- Row 1 holds the headings.
- One heading contains "name". Another contains "phone", "mobile", "whatsapp" or "cell".
- Set the phone column to plain-text format.
- Share the sheet as "Anyone with the link: Viewer".

### Step 3: Templates

- **List:**
  - Shows MARKETING templates from `GET /{WABA_ID}/message_templates`, following pagination.
  - Each card has a status badge, a quality badge, a WhatsApp-style preview, and either "Ready for
    campaigns" or the reasons the template can't be used.
  - Utility and authentication templates are hidden and counted.
- **Loading:** the list loads once per session, then on **Reload list** or a card's **Refresh status**.
- **Create:**
  - Fields: name, language, header (Image or None), body with an **Insert {{1}}** helper, sample
    name, footer, and the **Stop promotions** quick-reply button (on by default).
  - A live preview shows the message.
  - Meta's rules are checked before submitting.
  - After submitting, the new template is added to the list. There's a warning if Meta changes its
    category.
- **Text-only templates can be created live now.**

### Step 4: Backend module (built, webhook statuses proven live)

- **Commit:** `2af6403f` on `garaaz-backend` branch `feat/whatsapp-campaigns`. Not pushed. `329700e0` added the module; `2af6403f` adds `GET /campaigns/:id/recipients`.
- **Where:** `garaaz-backend/src/modules/whatsapp-campaigns/`. Shared files touched: `main.ts` (raw-body
  `verify` hook), `app.module.ts`, `config/configuration.ts`, `.env.example`.
- **Webhook:** registered via the Graph API (`POST /{APP_ID}/subscriptions`, field `messages`) on the
  cloudflared tunnel, and the app is subscribed to the test WABA (`POST /{WABA_ID}/subscribed_apps`).
  The live Stop tap and STOP text were not completed, because sending then started returning `131005`.
- **Routes:** all of plan §5. Errors come back as `{ statusCode, message, metaError? }`, through a
  module-level filter, because the global filter's `errorMsg` shape would drop `metaError`.
- **Checked live on localhost:3005, against the existing `DB_URI`:**
  - the handshake through the cloudflared tunnel, with the right and wrong verify token
  - an unsigned POST gets 401; a missing API key gets 401
  - create a campaign; add recipients, including a retried chunk and an in-chunk duplicate
  - results, including a repeated batch that is skipped
  - stop (a reason is required) and complete; a second PATCH gets 409
  - stats, failed-by-code, history, 24 h usage, opted-out lookup, and the CSV export
  - **The image upload proxy against Meta returned a `header_handle`** with the 24 h token, and the
    token doesn't appear in the backend logs.
  - Smoke-test rows were deleted afterwards.
- **Details:**
  - Recipient adds return the ids of every phone in the chunk, so a retry still gets the ids for
    `biz_opaque_callback_data`.
  - Results only change `queued` rows.
  - Stats are counted live: read is included in delivered, and delivered in sent.
  - CSV cells that start with `= + - @` get a leading `'`, so they can't run as formulas.

### Step 5: Send flow (frontend complete)

- **Contacts verification:** requires an active import from the Contacts tab.
- **Template picker:** filters to APPROVED marketing templates only.
- **Image header:** if the template has an image header, uploads the JPEG/PNG once via `POST /{PHONE_NUMBER_ID}/media` and reuses the `mediaId` across all sends.
- **Name variable mapping:** maps `{{1}}` to the contact's name column, with fallback "there" for blank names.
- **Real-row preview:** renders `TemplatePreview` for the first 3 rows.
- **Confirmation step:**
  - Queries `POST /api/contacts/opted-out` to filter and skip opted-out recipients.
  - Checks 24h usage via `GET /api/usage/24h` and validates against messaging tier minus SuprSend reserve (`checkQuota`).
  - Blocks sending if the list exceeds remaining 24h quota.
  - Displays estimated cost (₹0.8631 / message) and eligible count.
- **Execution & Pacing:**
  - Creates the campaign (`POST /api/campaigns`) and registers recipients in chunks of 500 (`POST /api/campaigns/:id/recipients`).
  - Sets campaign to `sending` (`PATCH /api/campaigns/:id`).
  - Sends directly from browser to Meta Cloud API at 5 msg/s.
  - Includes `STOP_PROMOTIONS` quick-reply button payload and `biz_opaque_callback_data = recipientId`.
  - Retries rate limits (429, 130429, 80007, 4, 131056) with exponential backoff.
  - Halts the campaign on critical errors (190 expired token, 131048 spam rate limit, 132015/132016 paused/disabled template).
  - Posts results in batches (`POST /api/campaigns/:id/results`).
  - Marks campaign `completed` or `stopped` upon finish.
- **UX & Safety:**
  - "Keep this tab open" banner with pulsing dot and progress bar.
  - Real-time tabular progress tracking.
  - Stop button to cleanly cancel sending and mark unsent rows `not_sent`.
  - Sending state lives at the top-level `App` component so tab switching does not interrupt the send loop.

### Step 6: Results & History (frontend complete)

- **Results Page:**
  - Displays live campaign stats (Total, Queued, Accepted, Failed, Sent, Delivered, Read).
  - Shows breakdown of failures by error code.
  - Lists each recipient from `GET /api/campaigns/:id/recipients`: name, phone, state, last status, error code, error message, and sent / delivered / read / failed times.
  - Supports status filtering with count badges, and pagination (10, 25, 50, 100 rows per page).
  - Auto-polls every 20s while the campaign is active, including the recipient rows.
  - **Export CSV** downloads `GET /api/campaigns/:id/export.csv` with the API key in the `x-api-key` header (with trailing slashes safely handled).
- **History Page:**
  - Lists all past campaigns newest first with date, template, total, sent, delivered, read, and status badge.
  - Row click navigates directly to the Results view for that campaign.
  - Includes manual refresh.

### Step 7: Small fixes (Group C complete)

- **Webhook verify token redaction:** `LoggerService` in `garaaz-backend` (`18eb8ed4`) redacts `hub.verify_token` in URLs, query strings, and log context, strictly scoped to requests targeting `/whatsapp-campaigns/webhook`. Unit tests added in `wa-utils.spec.ts`.
- **Contacts import empty-name warning:** `buildContacts` in `src/lib/contacts.js` counts rows with an empty name. `ContactsPage` renders an Alert informing the user how many contacts have no name and will get the fallback `"there"` for `{{1}}`. Unit tests updated in `contacts.test.js`.

---

## Left

| Step | Work |
|---|---|
| Verify History & CSV | Confirm campaign display on History tab and verify CSV download in UI. |
| Group B (Verify built but untested) | 4. Image header send with APPROVED image-header template. 5. Image template creation via upload proxy from Templates tab. 6. STOP opt-out (button tap + STOP reply), check `wa_opt_outs` and confirm skip. |
| Group D (Before prod) | 9. Tests (Jest backend: API-key guard, signature check, webhook statuses incl. ordering/duplicates/unknown wamid, opt-outs, unique {campaignId, phone} index, results only changing queued rows; Vitest frontend: payloadBuilder incl. stop button + image header, phone normalisation, quota check, send-loop error handling). 10. `docs/deploy.md` (env vars per UAT/prod, real webhook URL registration, Settings values, pre-prod checklist). 11. `docs/meta-setup.md` (Meta app, system-user token, webhook, subscribed_apps, "never touch SuprSend's app" list). |
| Real number & reserve | Real WABA owner and tier decision; SuprSend daily volume check (needed before first real campaign). |

---

## Decisions made

**Meta and API:**
- **Official Cloud API only.** Graph calls go straight from the browser, except the image upload,
  which goes through the backend because of CORS.
- **The token lives only in the browser's Settings.** The backend stores no Meta token. The upload
  proxy receives it in `Authorization: Bearer`, so the backend logger redacts it, and never stores it.
- **The default Graph version is `v25.0`,** to match the app. It can be changed in Settings, and
  nothing in code depends on a specific version.
- **There's a separate Meta app, "Garaaz Campaigns".** SuprSend's app is never touched (see the
  "never do" list in plan §6).
- **Stop button:** the label is "Stop promotions". Every send carries the payload `STOP_PROMOTIONS`
  so the webhook doesn't depend on the label text.
- **Template list:** Meta allows about 200 management calls per hour, so the list is loaded once
  and refreshed only when you ask.
- **Templates use positional `{{1}}` = name only,** used once, never at the start or end of the
  body. Templates with other variables, video or document headers, or copy-code buttons are shown
  as unusable.
- **Image headers are the default in the create form.** Submitting is disabled until the App ID,
  backend URL and backend API key are set.

**Sending:**
- **Timeouts:** a network error or timeout marks the row `failed` with reason `timeout`, with no
  retry.
- **Statuses win over Stop and timeouts (changed 18 Oct 2026, replaces the plan §4.5 rule):** a status
  webhook carrying our wamid or `biz_opaque_callback_data` updates a row that is `queued`, `not_sent`
  (Stop or finish while its send was in flight) or `failed` with reason `timeout`. The row becomes
  `accepted` with the real status (sent / delivered / read), so stats reflect what Meta actually did.
  Rows that failed with a Meta error code still never change.
- **While the webhook points at UAT,** only internal numbers are messaged. Before the first real
  campaign, `wa_opt_outs` is copied from UAT to prod (upsert by phone).

**Backend:**
- **Run locally first** at `http://localhost:3005`, with a cloudflared quick tunnel for Meta's
  webhook. The UAT hostname comes later.
- **Local testing database:** the existing `DB_URI`, `dev-cluster.cen4e.mongodb.net/myFirstDatabase`
  (non-prod; prod is `cluster-m10.vgzvh`). Only the `wa_` collections are written; no existing
  collection is touched. Never point local testing at prod.
- **Secrets per environment:** the current API key and verify token are **local only**. Generate new
  values for UAT and for prod. The App Secret goes into `WHATSAPP_CAMPAIGNS_APP_SECRET` in `.env`,
  never into chat or git.
- **Tests:** no new tests until before the UAT/prod deploy. Lint and build must keep passing.
- **The module is self-contained,** with collections prefixed `wa_`, behind the flag
  `WHATSAPP_CAMPAIGNS_ENABLED`.
- **Raw body:** a `verify` hook on the existing JSON body parser keeps the raw body only for
  `/whatsapp-campaigns/webhook`, which the signature check needs.
- **The webhook always returns 200** once the signature passes. A bad signature gets 401.

**Tooling:**
- **xlsx parsing** uses `read-excel-file`, not SheetJS, because of SheetJS's security advisories.

---

## Backend env variables (step 4)

These follow `garaaz-backend`'s naming: a feature prefix in `.env`, and a `WHATSAPP_CAMPAIGNS`
block in `config/configuration.ts`, like `SUPPLIER_REMINDER`. All of them get placeholders in
`.env.example`.

| Variable | Config key | Purpose |
|---|---|---|
| `WHATSAPP_CAMPAIGNS_ENABLED` | `WHATSAPP_CAMPAIGNS.ENABLED` | `true` turns the module's routes on. Anything else returns 404, so the module can be switched off without a rollback. |
| `WHATSAPP_CAMPAIGNS_API_KEY` | `WHATSAPP_CAMPAIGNS.API_KEY` | Checked against the `x-api-key` header on `/api/*` and `/meta/*` (`timingSafeEqual`). The same value goes in the tool's Settings as "Backend API key". |
| `WHATSAPP_CAMPAIGNS_APP_SECRET` | `WHATSAPP_CAMPAIGNS.APP_SECRET` | The "Garaaz Campaigns" app secret, used to check `X-Hub-Signature-256` on `POST /webhook` |
| `WHATSAPP_CAMPAIGNS_WEBHOOK_VERIFY_TOKEN` | `WHATSAPP_CAMPAIGNS.WEBHOOK_VERIFY_TOKEN` | A random string we choose, answered on `GET /webhook` during Meta's handshake. The same value is entered in the app's WhatsApp → Configuration. |
| `WHATSAPP_CAMPAIGNS_GRAPH_API_VERSION` | `WHATSAPP_CAMPAIGNS.GRAPH_API_VERSION` | The Graph version the upload proxy calls, e.g. `v25.0`. It's required, with no default in code. |

The existing variables `PORT` (local backend URL) and `DB_URI` (Mongo) are reused. CORS already
allows any origin, so no CORS change is needed.

---

## Known gaps

- **The upload proxy works with the 24 h token.** It hasn't been tried from the Templates tab yet,
  and **it must be rerun with the system-user token**. If it fails then, in-app creation stays
  text-only (plan §4.3).
- **Pre-existing:** `tsc` reports errors in `mobile-config-access.util.spec.ts`. They aren't from this
  module.
- **Token:** the current token is the temporary 24 h one. A permanent system-user token is still
  needed.
- **Plan §1.2 checks are partly done.** Scenario A (WABA in Garaaz's portfolio) is very likely.
  The real WABA owner and tier must be confirmed before any real campaign.
- **The SuprSend daily volume** sets the transactional reserve in the limit check. It's needed
  before first real campaign.
- **Test number restriction:** Meta's test number only delivers to recipient numbers added in the
  app dashboard (up to 5).
- **Tunnel URL:** a quick cloudflared tunnel gets a new URL on every restart, so Meta's callback URL
  must be updated each time. A named tunnel avoids this.
- **Empty names:** the contacts import allows rows with no name. The "there" fallback for `{{1}}`
  is applied in step 5, and step 7 flags them with a warning showing the count.
- **`docs/meta-setup.md`** (plan §6) is not written yet.

---

## Changes by others

Committed as `0c4bc42` (`feat: add campaign send, results and history`) on `main`. Not pushed. It implements the step 5 send flow and the step 6 results and history pages. It was written by another session and then run in this test.

**New files:**
- `src/features/send/` — `SendPage`, `TemplateSelector`, `PreviewConfirm`, `ImageUploadStep`, `SendProgress`
- `src/features/results/ResultsPage.jsx`
- `src/features/history/HistoryPage.jsx`
- `src/hooks/useCampaignSender.js`, `src/hooks/useBackendClient.js`
- `src/services/backendApi.js`, `src/services/mediaApi.js`
- `src/lib/quota.js`, `src/lib/quota.test.js`, `src/lib/payloadBuilder.test.js`

**Modified files:** `src/App.jsx` (Send, Results and History tabs; send state kept above the tabs), `src/config/defaults.js`, `src/constants/tabs.js`, `src/constants/settingsFields.js`, `src/features/settings/SettingsPage.jsx`, `src/features/settings/ConnectionCard.jsx`, `src/lib/payloadBuilder.js`, `src/services/graphClient.js`, and this file.

The same session added the "Step 5" and "Step 6" sections above. The live run is in "Tested on 18 Oct 2026".

## Current setup

- **Meta app:** "Garaaz Campaigns (Test)", App ID `1828095741701411`.
- **WABA:** `1413851776554293`. The only number is the test number +1 555-668-7731, phone number ID `708794355654584`. Garaaz's real number is not on this WABA. Two other apps, "Garaaz Notification" and "Garaaz Notification - Test1", were already subscribed; they were not changed.
- **Webhook:** registered via the Graph API on the cloudflared tunnel, field `messages`. The app is subscribed to the WABA. The tunnel URL changes on every restart.
- **Database:** `dev-cluster.cen4e.mongodb.net` / `myFirstDatabase`. Only the `wa_` collections are written.
- **Backend:** `http://localhost:3005`, branch `feat/whatsapp-campaigns`, commit `2af6403f`, not pushed.
- **Env variable names** (values stay in `.env`, never here): `WHATSAPP_CAMPAIGNS_ENABLED`, `WHATSAPP_CAMPAIGNS_API_KEY`, `WHATSAPP_CAMPAIGNS_APP_SECRET`, `WHATSAPP_CAMPAIGNS_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_CAMPAIGNS_GRAPH_API_VERSION`, plus the existing `PORT` and `DB_URI`. The tool's `.env` uses `ACCESS_TOKEN`, `PHONE_NUMBER_ID`, `WABA_ID`, `APP_ID`, `GRAPH_VERSION`.

## 131005, resolved

From about 17:15, every send (`hello_world` and `garaaz_workshop_intro_test`) returned `131005` "Access denied", with no `error_subcode`. Test connection still worked. A fresh token in Settings and in `ACCESS_TOKEN` started accepting sends again. The old token was not changed in Meta's settings from here.

## Tested on 18 Oct 2026

**One message.** `garaaz_workshop_intro_test` to 919528465756 ("Hi Nikku"). Meta returned sent, delivered and read. The campaign was marked completed. Those webhooks arrived before the row had its message id, so the timestamps were written onto the row afterwards.

**Sheet campaign** `6ad4b7a441f6bb8430017542`, template `garaaz_workshop_intro_test`, from the UI.

- Contacts: the Google Sheet "Test Sheet for WhatsApp Broadcast" imported as 4 ready, 0 invalid, 0 duplicates. Phones stored as `91` + 10 digits.
- Preview: `{{1}}` showed Nikhil Sharma, Nikhil 2nd and Sahil Rally.
- Confirm: 4 contacts, 0 opted out, 4 to receive, estimated cost ₹3.45, 24h usage 1, tier 2,000, available quota 1,999. The ₹3.45 is the tool's estimate. This test number is not billed.
- Send finished. Results: 4 accepted, 2 sent, 2 delivered, 1 read, 2 failed.

| Name | Phone | Result |
|---|---|---|
| Nikhil Sharma | 919528465756 | read |
| Sahil 2nd | 919001354173 | delivered |
| Nikhil 2nd | 919548265756 | failed, 131049 |
| Sahil Rally | 917030067700 | failed, 131049 |

**131049** is WhatsApp's per-user marketing limit ("healthy ecosystem engagement"). Meta accepted the send and then did not deliver it. There is no further reason in the API. Do not resend to those two numbers for 24 hours.

**Confirm screen.** It stayed on "Checking opted-out numbers and quota…". `useAsyncAction` did not return the result, and the confirm step waited on that return value. Fixed in `f63a76d`: `PreviewConfirm.jsx` reads the hook's data, and `run()` returns it.

**Recipient list & Results UI.** `GET /whatsapp-campaigns/api/campaigns/:id/recipients` returns the recipient rows. The Results page renders:
- Separate columns for Name, Phone, State (`accepted`, `failed`, `queued`, `not_sent`), Last status (`read`, `delivered`, `sent`, `failed`), Error code, Error message, and timestamps for Sent, Delivered, Read, and Failed.
- Status filter dropdown with live counts per status (`all`, `read`, `delivered`, `sent`, `failed`, `accepted`, `queued`, `not_sent`).
- Pagination (10, 25, 50, 100 rows per page) with page navigation and count summaries.
- Sent message template preview alongside results.
- **Export CSV** sends `x-api-key` in headers and trims any trailing slashes from `backendUrl`.
- Committed in `2858d62` on `main`. Lint, 132 tests, and Vite build pass.

**Verification in progress:** checking the History tab and CSV export in the UI, followed by Group B (image template send & upload proxy, STOP opt-out tests).

## Notes

- The tunnel URL changes on restart, so the Meta callback must be re-registered (`POST /{APP_ID}/subscriptions`).
- The local API key and verify token are local-only. Generate new ones for UAT and for prod.
- Before any real campaign, confirm the real messaging tier (2,000 per 24 h is what Test connection shows on this test number) and the SuprSend reserve.

## Original step 4 task list

Kept for reference. The module, the upload proxy and the webhook routes are already built.

1. In `garaaz-backend`:
   - Add the `WHATSAPP_CAMPAIGNS` config block and the `.env.example` placeholders above.
   - Create `src/modules/whatsapp-campaigns/` with the module, constants, the
     `WHATSAPP_CAMPAIGNS_ENABLED` check and `guards/wa-api-key.guard.ts`.
   - Import it in `app.module.ts`.
2. Add `controllers/wa-template-upload.controller.ts` and
   `services/wa-template-upload.service.ts` for `POST /whatsapp-campaigns/meta/template-upload`:
   - **Request:** multipart `appId` + `file` (JPEG or PNG, max 5 MB), with
     `Authorization: Bearer <meta token>`.
   - **Action:** `POST /{appId}/uploads`, then `POST /upload:{session}`.
   - **Response:** `{ handle }`.
   - **On error:** the Graph error is relayed as `metaError` with the token removed.
3. Jest tests for the guard (missing or wrong key), the feature flag, the two-call upload with
   Graph mocked, error relay, and the token never appearing in logs or responses.
4. Run the backend locally, put `http://localhost:<PORT>` and the API key in Settings, and create
   one image template from the Templates tab.
5. Then the webhook (signature, statuses, opt-outs) behind a cloudflared tunnel, followed by the
   campaign, recipient and result routes.
