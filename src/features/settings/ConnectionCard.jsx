import { useCallback } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useGraphClient } from '../../hooks/useGraphClient.js';
import { formatQuality, formatTier, getQualityTone } from '../../lib/connectionInfo.js';
import { getMissingKeys } from '../../lib/settings.js';
import { fetchPhoneNumberInfo } from '../../services/phoneNumberApi.js';
import { MissingSettingsAlert } from './MissingSettingsAlert.jsx';

function ConnectionDetails({ info }) {
  const rows = [
    ['Display name', info.verifiedName || '—'],
    ['Number', info.displayPhoneNumber || '—'],
    ['Quality', <Badge key="quality" tone={getQualityTone(info.qualityRating)}>{formatQuality(info.qualityRating)}</Badge>],
    ['Messaging limit', formatTier(info.messagingLimitTier)],
    ['Display name status', info.nameStatus || '—'],
  ];

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-text-secondary">{label}</dt>
          <dd className="font-medium text-text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConnectionCard({ settings, onConnectionInfo }) {
  const client = useGraphClient(settings);
  const { phoneNumberId } = settings;
  const testConnection = useCallback(
    async (signal) => {
      const info = await fetchPhoneNumberInfo(client, phoneNumberId, { signal });
      onConnectionInfo?.(info);
      return info;
    },
    [client, phoneNumberId, onConnectionInfo],
  );
  const { data, error, isLoading, run } = useAsyncAction(testConnection);
  const missingKeys = getMissingKeys(settings);

  return (
    <Card title="Test connection" description="Reads the phone number's name, quality rating and messaging limit from Meta.">
      <div className="flex flex-col gap-4">
        {missingKeys.length > 0 && <MissingSettingsAlert missingKeys={missingKeys} />}
        <div>
          <Button onClick={() => run()} disabled={isLoading || missingKeys.length > 0}>
            {isLoading ? 'Testing…' : 'Test connection'}
          </Button>
        </div>
        {error && <ErrorAlert error={error} />}
        {data && <ConnectionDetails info={data} />}
      </div>
    </Card>
  );
}
