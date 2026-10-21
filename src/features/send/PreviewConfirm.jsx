import { useEffect } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { MARKETING_RATE_INR, MAX_UNIQUE_USERS_LIMIT } from '../../config/defaults.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { resolveName } from '../../lib/payloadBuilder.js';
import { checkQuota, isTierKnown } from '../../lib/quota.js';
import { getOptedOut, getUsage24h } from '../../services/backendApi.js';
import { fetchPhoneNumberInfo } from '../../services/phoneNumberApi.js';
import { Icon } from '../../components/Icon.jsx';

const TIER_LABELS = Object.freeze({
  TIER_250: '250',
  TIER_2K: '2,000',
  TIER_10K: '10,000',
  TIER_100K: '100,000',
  TIER_UNLIMITED: 'Unlimited',
});

function formatCost(count) {
  return `₹${(count * MARKETING_RATE_INR).toFixed(2)}`;
}

function formatTier(tier) {
  return TIER_LABELS[tier] ?? tier ?? 'Unknown';
}

function Stat({ label, value, valueClass = 'text-slate-800' }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 text-base font-bold tracking-tight ${valueClass}`}>{value}</dd>
    </div>
  );
}

/**
 * ConfirmStep – shows single mobile mockup preview with the configured credentials account name,
 * along with campaign stats, opt-out filtering, quota verification, and 2,000 unique users limit validation.
 */
export function ConfirmStep({
  template,
  contacts,
  mediaId,
  backendClient,
  graphClient,
  connectionInfo,
  settings,
  onStart,
  onBack,
}) {
  const fetchConfirm = useAsyncAction(async () => {
    const phones = contacts.map((c) => c.phone);
    const hasBackend = Boolean(backendClient?.request && settings?.backendUrl);
    let optedOut = [];
    let uniqueRecipients = 0;

    if (hasBackend) {
      const [optedOutRes, usageRes] = await Promise.all([
        getOptedOut(backendClient, phones).catch(() => ({ optedOut: [] })),
        getUsage24h(backendClient).catch(() => ({ uniqueRecipients: 0 })),
      ]);
      optedOut = Array.isArray(optedOutRes?.optedOut) ? optedOutRes.optedOut : [];
      uniqueRecipients = Number(usageRes?.uniqueRecipients) || 0;
    }

    // Read the tier fresh: the copy saved by Test connection can be missing or stale.
    let tier = connectionInfo?.messagingLimitTier || null;
    try {
      const fresh = await fetchPhoneNumberInfo(graphClient, settings.phoneNumberId);
      if (fresh.messagingLimitTier) tier = fresh.messagingLimitTier;
    } catch {
      // fall back to the saved tier
    }
    const eligible = contacts.filter((c) => !optedOut.includes(c.phone));
    const quota = checkQuota({ count: eligible.length, tier, usage24h: uniqueRecipients });
    return { optedOut, eligible, uniqueRecipients, quota, tier };
  });

  useEffect(() => {
    fetchConfirm.run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmData = fetchConfirm.data;

  // Account display name auto-fetched from verified Meta credentials
  const accountDisplayName =
    connectionInfo?.verifiedName ||
    connectionInfo?.displayName ||
    'Garaaz Notification';

  const sampleContact = contacts?.[0];
  const sampleName = sampleContact ? resolveName(sampleContact.name) : 'there';

  const exceedsLimit = (contacts?.length ?? 0) > MAX_UNIQUE_USERS_LIMIT;

  if (fetchConfirm.isLoading || (!confirmData && !fetchConfirm.error)) {
    return (
      <Card title="Review & Confirm Campaign" description={`Template: ${template.name}`}>
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Checking opted-out numbers and 24h tier quota…</p>
        </div>
      </Card>
    );
  }

  if (fetchConfirm.error && !confirmData) {
    return (
      <Card title="Review & Confirm Campaign" description={`Template: ${template.name}`}>
        <ErrorAlert error={fetchConfirm.error} />
        <div className="mt-4">
          <Button variant="secondary" onClick={onBack}>
            <Icon name="arrowLeft" /> Back
          </Button>
        </div>
      </Card>
    );
  }

  const { optedOut, eligible, uniqueRecipients, quota, tier } = confirmData;
  const isSendBlocked =
    exceedsLimit ||
    eligible.length > MAX_UNIQUE_USERS_LIMIT ||
    !quota.allowed ||
    eligible.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Live WhatsApp Mobile Screen Preview with Account Name from credentials */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="w-full max-w-[390px]">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Preview
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              Account: {accountDisplayName}
            </span>
          </div>
          <TemplatePreview
            header={template.header}
            imageUrl={template.header?.exampleUrl}
            bodyText={template.bodyText}
            footerText={template.footerText}
            buttons={template.buttons}
            name={sampleName}
            businessName={accountDisplayName}
            defaultMode="phone"
          />
        </div>
      </div>

      {/* Right Column: Campaign Stats, Limits, & Actions */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <Card
          title="Campaign Confirmation"
          description={`Ready to broadcast template "${template.name}" (${template.language})`}
        >
          <div className="flex flex-col gap-5">
            {/* 2000 Unique Users Limit Warning */}
            {exceedsLimit && (
              <Alert tone="error" title="Unique user limit exceeded">
                This list has <strong>{contacts.length.toLocaleString()}</strong> unique contacts,
                which exceeds the maximum limit of <strong>{MAX_UNIQUE_USERS_LIMIT.toLocaleString()}</strong> unique users
                per 24-hour broadcast window. Meta prohibits broadcasts exceeding 2,000 unique users.
                You cannot send this message until the list is reduced to 2,000 or fewer contacts.
              </Alert>
            )}

            {/* Campaign Summary Stats Grid */}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Total uploaded" value={contacts.length.toLocaleString()} />
              <Stat
                label="Opted out (skipped)"
                value={optedOut.length.toLocaleString()}
                valueClass={optedOut.length > 0 ? 'text-amber-600' : 'text-slate-800'}
              />
              <Stat
                label="Eligible recipients"
                value={eligible.length.toLocaleString()}
                valueClass={exceedsLimit ? 'text-rose-600' : 'text-emerald-600'}
              />
              <Stat label="Estimated cost" value={formatCost(eligible.length)} />
              <Stat label="24h sent (our app)" value={uniqueRecipients.toLocaleString()} />
              <Stat label="Account tier" value={formatTier(tier)} />
            </dl>

            {/* Available Quota info */}
            {isTierKnown(tier) && quota.available !== null && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Remaining 24h Messaging Quota:
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      quota.available < eligible.length ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {quota.available.toLocaleString()} slots
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Calculated as Tier limit ({formatTier(tier)}) − 24h sent ({uniqueRecipients.toLocaleString()}) − SuprSend reserve.
                </p>
              </div>
            )}

            {/* Tier could not be read, so the quota is not being checked */}
            {!isTierKnown(tier) && (
              <Alert tone="warning" title="Quota not checked">
                Couldn&apos;t read your messaging tier from Meta{tier ? ` (got "${tier}")` : ''}, so the 24-hour
                limit isn&apos;t being checked. Run Test connection in Settings, then come back.
              </Alert>
            )}

            {/* Quota Exceeded Alert */}
            {!quota.allowed && (
              <Alert tone="error" title="24-hour quota exceeded">
                This campaign requires {eligible.length.toLocaleString()} slots, but only{' '}
                {(quota.available ?? 0).toLocaleString()} slots remain in your current 24-hour window.
                Please reduce the recipient list or wait for the 24-hour rolling window to reset.
              </Alert>
            )}

            {/* All opted out warning */}
            {eligible.length === 0 && quota.allowed && (
              <Alert tone="warning" title="No eligible contacts">
                All contacts in this sheet have previously opted out of promotional messages.
              </Alert>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={onBack}>
                <Icon name="arrowLeft" /> Back
              </Button>
              <Button
                onClick={() => onStart(eligible)}
                disabled={isSendBlocked}
              >
                {exceedsLimit
                  ? `Cannot send: Exceeds ${MAX_UNIQUE_USERS_LIMIT.toLocaleString()} limit`
                  : !quota.allowed
                  ? 'Quota exceeded'
                  : <>Send to {eligible.length.toLocaleString()} recipients <Icon name="arrowRight" /></>}
              </Button>
            </div>

            {fetchConfirm.error && <ErrorAlert error={fetchConfirm.error} />}
          </div>
        </Card>
      </div>
    </div>
  );
}
