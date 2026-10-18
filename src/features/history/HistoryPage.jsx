import { useCallback, useEffect, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { SEND_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { getMissingKeys } from '../../lib/settings.js';
import { listCampaigns } from '../../services/backendApi.js';
import { MissingSettingsAlert } from '../settings/MissingSettingsAlert.jsx';

const CAMPAIGN_STATUS_TONES = Object.freeze({
  sending: 'warning',
  stopped: 'error',
  completed: 'success',
});

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * History page: lists campaigns newest-first, with date, template, counts and status.
 * Click a row to jump to Results.
 */
export function HistoryPage({ settings, backendClient, onViewResults, onNavigateToSettings }) {
  const missingKeys = getMissingKeys(settings, SEND_REQUIRED_KEYS);
  const [campaigns, setCampaigns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!backendClient) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listCampaigns(backendClient);
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [backendClient]);

  useEffect(() => {
    let ignore = false;
    if (!backendClient) return;

    listCampaigns(backendClient)
      .then((data) => {
        if (!ignore) {
          setCampaigns(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [backendClient]);

  if (missingKeys.length > 0) return <MissingSettingsAlert missingKeys={missingKeys} onNavigateToSettings={onNavigateToSettings} />;

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Campaign history"
        description="All campaigns, newest first. Click a row to view its results."
      >
        <div className="flex justify-end mb-4">
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </Button>
        </div>

        {error && <ErrorAlert error={error} />}

        {!error && campaigns === null && loading && (
          <p className="text-sm text-text-secondary animate-pulse">Loading campaigns…</p>
        )}

        {campaigns?.length === 0 && (
          <Alert tone="info">No campaigns found. Send your first campaign from the Send tab.</Alert>
        )}

        {campaigns?.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Date</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Campaign Name</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Template</th>
                    <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Total</th>
                    <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Sent</th>
                    <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Delivered</th>
                    <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Read</th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-100"
                      onClick={() => onViewResults(campaign.id)}
                      title={`View results for ${campaign.name}`}
                    >
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(campaign.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-48 truncate" title={campaign.name}>
                        {campaign.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {campaign.templateName}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-700">{campaign.stats?.total ?? '—'}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-600">{campaign.stats?.sent ?? '—'}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-600">{campaign.stats?.delivered ?? '—'}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-600">{campaign.stats?.read ?? '—'}</td>
                      <td className="py-3 px-4">
                        <Badge tone={CAMPAIGN_STATUS_TONES[campaign.status] ?? 'neutral'}>
                          {campaign.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
