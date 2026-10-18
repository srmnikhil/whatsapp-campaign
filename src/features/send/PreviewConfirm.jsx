import { useEffect } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { MARKETING_RATE_INR, PREVIEW_ROWS } from '../../config/defaults.js';
import { HEADER_FORMATS, NAME_VARIABLE } from '../../constants/templates.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { checkQuota } from '../../lib/quota.js';
import { resolveName } from '../../lib/payloadBuilder.js';
import { findVariables } from '../../lib/templates.js';
import { getOptedOut, getUsage24h } from '../../services/backendApi.js';

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

/** Single contact preview card. */
function ContactPreviewCard({ contact, template }) {
  const name = resolveName(contact.name);
  return (
    <TemplatePreview
      header={template.header}
      imageUrl={template.header.exampleUrl}
      bodyText={template.bodyText}
      footerText={template.footerText}
      buttons={template.buttons}
      name={name}
    />
  );
}

/**
 * Step 1: Preview – shows the message rendered for the first few contacts.
 */
export function PreviewStep({ template, contacts, onConfirm }) {
  const preview = contacts.slice(0, PREVIEW_ROWS);
  const hasNameVariable = findVariables(template.bodyText).includes('1');

  return (
    <Card title="Preview" description="How the message will look for the first few contacts.">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-4">
          {preview.map((contact) => (
            <ContactPreviewCard key={contact.phone} contact={contact} template={template} />
          ))}
        </div>
        {!hasNameVariable && (
          <Alert tone="info">
            This template has no <code className="font-mono">{NAME_VARIABLE}</code> variable. Every
            recipient gets the same message.
          </Alert>
        )}
        <div>
          <Button onClick={onConfirm}>Continue to confirm →</Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Step 2: Confirm – shows count, opted-out, cost, and quota check.
 */
export function ConfirmStep({ template, contacts, backendClient, connectionInfo, onStart, onBack }) {
  const fetchConfirm = useAsyncAction(async () => {
    const phones = contacts.map((c) => c.phone);
    const [{ optedOut }, { uniqueRecipients }] = await Promise.all([
      getOptedOut(backendClient, phones),
      getUsage24h(backendClient),
    ]);
    const tier = connectionInfo?.messagingLimitTier ?? null;
    const eligible = contacts.filter((c) => !optedOut.includes(c.phone));
    const quota = checkQuota({ count: eligible.length, tier, usage24h: uniqueRecipients });
    return { optedOut, eligible, uniqueRecipients, quota, tier };
  });

  useEffect(() => {
    fetchConfirm.run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmData = fetchConfirm.data;

  if (fetchConfirm.isLoading || (!confirmData && !fetchConfirm.error)) {
    return (
      <Card title="Confirm send" description={`Template: ${template.name}`}>
        <p className="text-sm text-text-secondary animate-pulse">
          Checking opted-out numbers and quota…
        </p>
      </Card>
    );
  }

  if (fetchConfirm.error && !confirmData) {
    return (
      <Card title="Confirm send" description={`Template: ${template.name}`}>
        <ErrorAlert error={fetchConfirm.error} />
        <div className="mt-4">
          <Button variant="secondary" onClick={onBack}>
            ← Back
          </Button>
        </div>
      </Card>
    );
  }

  const { optedOut, eligible, uniqueRecipients, quota, tier } = confirmData;

  return (
    <Card title="Confirm send" description={`Template: ${template.name}`}>
      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <Stat label="Total contacts" value={contacts.length.toLocaleString()} />
          <Stat label="Opted out (skipped)" value={optedOut.length.toLocaleString()} valueClass="text-brand-yellow" />
          <Stat label="Will receive" value={eligible.length.toLocaleString()} valueClass="text-brand-green" />
          <Stat label="Estimated cost" value={formatCost(eligible.length)} />
          <Stat label="24h usage (our sends)" value={uniqueRecipients.toLocaleString()} />
          <Stat label="Tier limit" value={formatTier(tier)} />
          {quota.available !== null && (
            <Stat
              label="Available quota"
              value={quota.available.toLocaleString()}
              valueClass={quota.available < eligible.length ? 'text-brand-red' : 'text-brand-green'}
            />
          )}
        </dl>

        {!quota.allowed && (
          <Alert tone="error" title="Quota exceeded">
            This campaign would send {eligible.length.toLocaleString()} messages but only{' '}
            {(quota.available ?? 0).toLocaleString()} slots remain in the 24 h window (tier{' '}
            {formatTier(tier)} − our {uniqueRecipients.toLocaleString()} sent − SuprSend reserve).
            Wait for the window to reset or reduce the contact list.
          </Alert>
        )}

        {eligible.length === 0 && quota.allowed && (
          <Alert tone="warning" title="No eligible contacts">
            All contacts have opted out.
          </Alert>
        )}

        <div className="flex gap-3 flex-wrap">
          <Button variant="secondary" onClick={onBack}>
            ← Back
          </Button>
          <Button
            onClick={() => onStart(eligible)}
            disabled={!quota.allowed || eligible.length === 0}
          >
            Send {eligible.length.toLocaleString()} messages
          </Button>
        </div>

        {fetchConfirm.error && <ErrorAlert error={fetchConfirm.error} />}
      </div>
    </Card>
  );
}

function Stat({ label, value, valueClass = 'text-text-primary' }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className={`font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}
