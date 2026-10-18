import { useCallback, useRef, useState } from 'react';
import {
  CAMPAIGN_STOP_CODES,
  PAIR_RATE_MAX_RETRIES,
  PAIR_RATE_RETRY_BASE_MS,
  RATE_LIMIT_CODES,
  RECIPIENTS_CHUNK_SIZE,
  RESULTS_BATCH_SIZE,
  SEND_PACING_MPS,
} from '../config/defaults.js';
import { buildCampaignPayload } from '../lib/payloadBuilder.js';
import { findVariables } from '../lib/templates.js';
import {
  addRecipients,
  completeCampaign,
  createCampaign,
  markSending,
  reportResults,
  stopCampaign,
} from '../services/backendApi.js';
import { sendMessage } from '../services/messagesApi.js';

export const SENDER_PHASE = Object.freeze({
  IDLE: 'idle',
  CREATING: 'creating',
  UPLOADING: 'uploading',
  SENDING: 'sending',
  DONE: 'done',
  ERROR: 'error',
});

const MS_PER_MSG = Math.round(1000 / SEND_PACING_MPS); // 200ms at 5 msg/s

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimit(error) {
  return RATE_LIMIT_CODES.includes(error.code) || RATE_LIMIT_CODES.includes(error.subcode);
}

function isCampaignStop(error) {
  return CAMPAIGN_STOP_CODES.includes(error.code) || CAMPAIGN_STOP_CODES.includes(error.subcode);
}

/**
 * Drives the entire campaign send loop in the browser.
 * State is kept in a single `sender` object so the component can render a live progress table.
 *
 * Usage:
 *   const { sender, startSend, stopSend } = useCampaignSender({ graphClient, backendClient, settings });
 *
 * @param {{ graphClient: object, backendClient: object, settings: object }} deps
 */
export function useCampaignSender({ graphClient, backendClient, settings }) {
  const stopRequestedRef = useRef(false);
  const [sender, setSender] = useState({
    phase: SENDER_PHASE.IDLE,
    campaignId: null,
    total: 0,
    sent: 0,
    failed: 0,
    notSent: 0,
    stopReason: null,
    rows: [], // { recipientId, phone, name, state: 'queued'|'accepted'|'failed'|'not_sent', error? }
    errorMessage: null,
  });

  const updateSender = useCallback((patch) => setSender((prev) => ({ ...prev, ...patch })), []);

  /** Appends or updates rows by recipientId. */
  const patchRows = useCallback((updates) => {
    setSender((prev) => {
      const map = new Map(prev.rows.map((r) => [r.recipientId, r]));
      for (const u of updates) map.set(u.recipientId, { ...(map.get(u.recipientId) ?? {}), ...u });
      return { ...prev, rows: [...map.values()] };
    });
  }, []);

  const stopSend = useCallback(() => {
    stopRequestedRef.current = true;
  }, []);

  /**
   * Main send flow. Call this once to start the campaign.
   *
   * @param {{
   *   campaignName: string,
   *   template: object,            summarizeTemplate result
   *   contacts: Array<{ phone, name }>,
   *   mediaId?: string | null,     already-uploaded media ID (or null)
   * }} input
   */
  const startSend = useCallback(
    async ({ campaignName, template, contacts, mediaId }) => {
      stopRequestedRef.current = false;

      const hasNameVariable = findVariables(template.bodyText).includes('1');

      // ── Step 1: Create campaign in backend ─────────────────────────────────
      updateSender({ phase: SENDER_PHASE.CREATING, errorMessage: null, campaignId: null, rows: [] });

      let campaign;
      try {
        campaign = await createCampaign(backendClient, {
          name: campaignName,
          templateName: template.name,
          language: template.language,
          ...(mediaId ? { headerMediaId: mediaId } : {}),
        });
        await markSending(backendClient, campaign.id, mediaId ? { headerMediaId: mediaId } : {});
      } catch (err) {
        updateSender({ phase: SENDER_PHASE.ERROR, errorMessage: err.message ?? String(err) });
        return;
      }

      const campaignId = campaign.id;
      updateSender({ campaignId, phase: SENDER_PHASE.SENDING, total: contacts.length, sent: 0, failed: 0, notSent: 0, rows: [] });

      // ── Step 2: Add recipients in chunks ───────────────────────────────────
      // Build a map: phone → recipientId so we can set biz_opaque_callback_data
      const phoneToRecipient = new Map(); // phone → { id, name }
      for (let i = 0; i < contacts.length; i += RECIPIENTS_CHUNK_SIZE) {
        const chunk = contacts.slice(i, i + RECIPIENTS_CHUNK_SIZE);
        let result;
        try {
          result = await addRecipients(
            backendClient,
            campaignId,
            chunk.map(({ phone, name }) => ({ phone, name: name || '' })),
          );
        } catch (err) {
          // Non-fatal: if adding recipients fails, we can't continue
          await stopCampaign(backendClient, campaignId, `Failed to add recipients: ${err.message}`);
          updateSender({ phase: SENDER_PHASE.ERROR, errorMessage: `Failed to register recipients: ${err.message}` });
          return;
        }
        for (const r of result.recipients) {
          const contact = chunk.find((c) => c.phone === r.phone);
          phoneToRecipient.set(r.phone, { id: r.id, name: contact?.name ?? '' });
        }
      }

      // Hydrate rows for the progress table
      const initialRows = contacts.map(({ phone, name }) => ({
        recipientId: phoneToRecipient.get(phone)?.id ?? phone,
        phone,
        name,
        state: 'queued',
      }));
      updateSender({ rows: initialRows });

      // ── Step 3: Send loop at SEND_PACING_MPS msg/s ────────────────────────
      const pendingResults = []; // batched before posting
      let campaignStopped = false;
      let campaignStopReason = null;

      /** Flush pending results to the backend (fire-and-forget style, non-blocking). */
      const flushResults = async () => {
        if (pendingResults.length === 0) return;
        const batch = pendingResults.splice(0, RESULTS_BATCH_SIZE);
        try {
          await reportResults(backendClient, campaignId, batch);
        } catch {
          // Re-queue for next flush; don't fail the send loop
          pendingResults.unshift(...batch);
        }
      };

      for (let i = 0; i < contacts.length; i++) {
        // Flush results every batch
        if (pendingResults.length >= RESULTS_BATCH_SIZE) {
          flushResults(); // async, doesn't block
        }

        if (stopRequestedRef.current || campaignStopped) {
          // Mark remaining rows not_sent
          const notSentRows = contacts.slice(i).map(({ phone }) => ({
            recipientId: phoneToRecipient.get(phone)?.id ?? phone,
            phone,
            state: 'not_sent',
          }));
          patchRows(notSentRows);
          updateSender((prev) => ({ ...prev, notSent: prev.notSent + notSentRows.length }));
          break;
        }

        const { phone, name } = contacts[i];
        const recipient = phoneToRecipient.get(phone);
        if (!recipient) continue;

        const { id: recipientId } = recipient;
        const payload = buildCampaignPayload({
          to: phone,
          recipientId,
          name,
          templateName: template.name,
          languageCode: template.language,
          stopButtonIndex: template.stopButtonIndex,
          mediaId: mediaId ?? null,
          hasNameVariable,
        });

        let accepted = false;
        let retries = 0;

        while (!accepted) {
          try {
            const { wamid } = await sendMessage(graphClient, settings.phoneNumberId, payload);
            pendingResults.push({ recipientId, state: 'accepted', wamid });
            patchRows([{ recipientId, state: 'accepted' }]);
            updateSender((prev) => ({ ...prev, sent: prev.sent + 1 }));
            accepted = true;
          } catch (err) {

            if (isCampaignStop(err)) {
              // Stop the whole campaign
              campaignStopped = true;
              campaignStopReason = `Meta error ${err.code}: ${err.message}`;
              pendingResults.push({
                recipientId,
                state: 'failed',
                error: { code: String(err.code ?? 'unknown'), message: err.message },
              });
              patchRows([{ recipientId, state: 'failed', error: err.message }]);
              updateSender((prev) => ({ ...prev, failed: prev.failed + 1 }));
              break;
            }

            if (isRateLimit(err) && retries < PAIR_RATE_MAX_RETRIES) {
              retries++;
              const backoffMs = PAIR_RATE_RETRY_BASE_MS * Math.pow(4, retries - 1);
              await sleep(backoffMs);
              continue;
            }

            // Any other error: mark failed, continue
            pendingResults.push({
              recipientId,
              state: 'failed',
              error: { code: String(err.code ?? 'timeout'), message: err.message ?? 'Send failed' },
            });
            patchRows([{ recipientId, state: 'failed', error: err.message }]);
            updateSender((prev) => ({ ...prev, failed: prev.failed + 1 }));
            break;
          }
        }

        // Pace: wait until this message slot's time has elapsed
        const slotEnd = Date.now() + MS_PER_MSG;
        const remaining = slotEnd - Date.now();
        if (remaining > 0) await sleep(remaining);
      }

      // ── Step 4: Flush any remaining results ───────────────────────────────
      // Flush up to 5 times (fire-and-forget is fine for the rest; webhook catches them)
      for (let attempt = 0; attempt < 5 && pendingResults.length > 0; attempt++) {
        await flushResults();
        if (pendingResults.length > 0) await sleep(1000);
      }

      // ── Step 5: Mark campaign complete or stopped ─────────────────────────
      if (stopRequestedRef.current && !campaignStopped) {
        campaignStopReason = 'Stopped by user';
      }

      try {
        if (campaignStopped || stopRequestedRef.current) {
          await stopCampaign(backendClient, campaignId, campaignStopReason ?? 'Stopped');
        } else {
          await completeCampaign(backendClient, campaignId);
        }
      } catch {
        // Best-effort; the campaign state is already effectively done
      }

      updateSender({
        phase: SENDER_PHASE.DONE,
        stopReason: campaignStopReason,
      });
    },
    [graphClient, backendClient, settings, updateSender, patchRows],
  );

  return { sender, startSend, stopSend };
}
