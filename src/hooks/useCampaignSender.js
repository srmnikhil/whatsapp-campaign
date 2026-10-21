import { useCallback, useRef, useState } from 'react';
import {
  CAMPAIGN_STOP_CODES,
  DEFAULT_SEND_DELAY_MS,
  MAX_UNIQUE_USERS_LIMIT,
  MIN_SEND_DELAY_MS,
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

const INITIAL_SENDER = Object.freeze({
  phase: SENDER_PHASE.IDLE,
  campaignId: null,
  total: 0,
  sent: 0,
  failed: 0,
  notSent: 0,
  stopReason: null,
  template: null, // kept so a retry can reuse it
  mediaId: null,
  rows: [], // { recipientId, phone, name, state: 'queued'|'accepted'|'failed'|'not_sent', error? }
  errorMessage: null,
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
  const [sender, setSender] = useState(INITIAL_SENDER);

  /** Takes a partial state, or a function from the previous state to the new one. */
  const updateSender = useCallback(
    (patch) => setSender((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch })),
    [],
  );

  /** Clears the finished campaign so the Send tab goes back to its steps. */
  const resetSender = useCallback(() => {
    stopRequestedRef.current = false;
    setSender(INITIAL_SENDER);
  }, []);

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

      if (contacts && contacts.length > MAX_UNIQUE_USERS_LIMIT) {
        updateSender({
          phase: SENDER_PHASE.ERROR,
          errorMessage: `Cannot send: Campaign exceeds the ${MAX_UNIQUE_USERS_LIMIT.toLocaleString()} unique user limit (${contacts.length.toLocaleString()} contacts). WhatsApp limits broadcasts to 2,000 unique users per 24 hours.`,
        });
        return;
      }

      const configuredDelay = Number(settings?.sendDelayMs);
      const delayMs = !isNaN(configuredDelay) && configuredDelay >= MIN_SEND_DELAY_MS ? configuredDelay : DEFAULT_SEND_DELAY_MS;

      const hasNameVariable = findVariables(template.bodyText).includes('1');

      // ── Step 1: Initialize Campaign ───────────────────────────────────────
      updateSender({ phase: SENDER_PHASE.CREATING, errorMessage: null, stopReason: null, campaignId: null, rows: [], template, mediaId: mediaId ?? null });

      let campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      let hasBackend = Boolean(backendClient?.request && settings?.backendUrl);

      if (hasBackend) {
        try {
          const campaign = await createCampaign(backendClient, {
            name: campaignName,
            templateName: template.name,
            language: template.language,
            ...(mediaId ? { headerMediaId: mediaId } : {}),
          });
          if (campaign?.id) {
            campaignId = campaign.id;
            await markSending(backendClient, campaign.id, mediaId ? { headerMediaId: mediaId } : {}).catch(() => {});
          }
        } catch {
          // If backend fails or server is absent, continue seamlessly in direct client-side mode
          hasBackend = false;
        }
      }

      updateSender({ campaignId, phase: SENDER_PHASE.SENDING, total: contacts.length, sent: 0, failed: 0, notSent: 0, rows: [] });

      // ── Step 2: Set up phone to recipient map ──────────────────────────────
      const phoneToRecipient = new Map(); // phone → { id, name }
      contacts.forEach((c, idx) => {
        phoneToRecipient.set(c.phone, { id: `${campaignId}_${idx + 1}`, name: c.name || '' });
      });

      if (hasBackend) {
        for (let i = 0; i < contacts.length; i += RECIPIENTS_CHUNK_SIZE) {
          const chunk = contacts.slice(i, i + RECIPIENTS_CHUNK_SIZE);
          try {
            const result = await addRecipients(
              backendClient,
              campaignId,
              chunk.map(({ phone, name }) => ({ phone, name: name || '' })),
            );
            if (result?.recipients) {
              for (const r of result.recipients) {
                const contact = chunk.find((c) => c.phone === r.phone);
                phoneToRecipient.set(r.phone, { id: r.id, name: contact?.name ?? '' });
              }
            }
          } catch {
            hasBackend = false;
            break;
          }
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

      // ── Step 3: Send loop with configured delay ───────────────────────────
      const pendingResults = [];
      let campaignStopped = false;
      let campaignStopReason = null;
      let sentCount = 0;
      let failedCount = 0;
      const finalRowMap = new Map(initialRows.map((r) => [r.recipientId, { ...r }]));

      /** Flush pending results to the backend if connected */
      const flushResults = async () => {
        if (!hasBackend || pendingResults.length === 0) return;
        const batch = pendingResults.splice(0, RESULTS_BATCH_SIZE);
        try {
          await reportResults(backendClient, campaignId, batch);
        } catch {
          pendingResults.unshift(...batch);
        }
      };

      for (let i = 0; i < contacts.length; i++) {
        if (hasBackend && pendingResults.length >= RESULTS_BATCH_SIZE) {
          flushResults();
        }

        if (stopRequestedRef.current || campaignStopped) {
          const notSentRows = contacts.slice(i).map(({ phone }) => {
            const rid = phoneToRecipient.get(phone)?.id ?? phone;
            return {
              recipientId: rid,
              phone,
              state: 'not_sent',
            };
          });
          notSentRows.forEach((r) => {
            const prev = finalRowMap.get(r.recipientId) || {};
            finalRowMap.set(r.recipientId, { ...prev, ...r });
          });
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
            finalRowMap.set(recipientId, { ...(finalRowMap.get(recipientId) || {}), state: 'accepted', wamid });
            patchRows([{ recipientId, state: 'accepted', wamid }]);
            sentCount++;
            updateSender((prev) => ({ ...prev, sent: prev.sent + 1 }));
            accepted = true;
          } catch (err) {
            if (isCampaignStop(err)) {
              campaignStopped = true;
              campaignStopReason = `Meta error ${err.code}: ${err.message}`;
              pendingResults.push({
                recipientId,
                state: 'failed',
                error: { code: String(err.code ?? 'unknown'), message: err.message },
              });
              finalRowMap.set(recipientId, { ...(finalRowMap.get(recipientId) || {}), state: 'failed', error: err.message });
              patchRows([{ recipientId, state: 'failed', error: err.message }]);
              failedCount++;
              updateSender((prev) => ({ ...prev, failed: prev.failed + 1 }));
              break;
            }

            if (isRateLimit(err) && retries < PAIR_RATE_MAX_RETRIES) {
              retries++;
              const backoffMs = PAIR_RATE_RETRY_BASE_MS * Math.pow(4, retries - 1);
              await sleep(backoffMs);
              continue;
            }

            pendingResults.push({
              recipientId,
              state: 'failed',
              error: { code: String(err.code ?? 'timeout'), message: err.message ?? 'Send failed' },
            });
            finalRowMap.set(recipientId, { ...(finalRowMap.get(recipientId) || {}), state: 'failed', error: err.message });
            patchRows([{ recipientId, state: 'failed', error: err.message }]);
            failedCount++;
            updateSender((prev) => ({ ...prev, failed: prev.failed + 1 }));
            break;
          }
        }

        // Delay between sends
        const slotEnd = Date.now() + delayMs;
        const remaining = slotEnd - Date.now();
        if (remaining > 0) await sleep(remaining);
      }

      // ── Step 4: Flush any remaining backend results ────────────────────────
      if (hasBackend) {
        for (let attempt = 0; attempt < 5 && pendingResults.length > 0; attempt++) {
          await flushResults();
          if (pendingResults.length > 0) await sleep(1000);
        }
      }

      // ── Step 5: Mark campaign complete or stopped ─────────────────────────
      if (stopRequestedRef.current && !campaignStopped) {
        campaignStopReason = 'Stopped by user';
      }

      if (hasBackend) {
        try {
          if (campaignStopped || stopRequestedRef.current) {
            await stopCampaign(backendClient, campaignId, campaignStopReason ?? 'Stopped');
          } else {
            await completeCampaign(backendClient, campaignId);
          }
        } catch {
          // Best-effort
        }
      }

      // ── Step 6: Persist campaign summary in browser localStorage ─────────
      try {
        const storedKey = 'garaaz-wa-campaigns.campaigns';
        const existing = JSON.parse(globalThis.localStorage?.getItem(storedKey) || '[]');
        const finalRows = Array.from(finalRowMap.values());
        const summary = {
          id: campaignId,
          name: campaignName,
          templateName: template.name,
          language: template.language,
          createdAt: new Date().toISOString(),
          status: campaignStopped || stopRequestedRef.current ? 'stopped' : 'completed',
          stopReason: campaignStopReason,
          total: contacts.length,
          sent: sentCount,
          failed: failedCount,
          notSent: Math.max(0, contacts.length - sentCount - failedCount),
          rows: finalRows,
        };
        globalThis.localStorage?.setItem(storedKey, JSON.stringify([summary, ...existing.slice(0, 49)]));
      } catch {
        // Local persistence fallback
      }

      updateSender({
        phase: SENDER_PHASE.DONE,
        stopReason: campaignStopReason,
      });
    },
    [graphClient, backendClient, settings, updateSender, patchRows],
  );

  return { sender, startSend, stopSend, resetSender };
}
