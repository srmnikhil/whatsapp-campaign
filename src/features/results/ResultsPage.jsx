import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { SelectInput } from '../../components/ui/SelectInput.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { POLL_INTERVAL_MS } from '../../config/defaults.js';
import { ASYNC_STATUS } from '../../constants/asyncStatus.js';
import { SEND_REQUIRED_KEYS, TEMPLATE_REQUIRED_KEYS } from '../../constants/settingsFields.js';
import { getMissingKeys } from '../../lib/settings.js';
import { downloadCampaignCsv, getCampaign, listRecipients } from '../../services/backendApi.js';
import { MissingSettingsAlert } from '../settings/MissingSettingsAlert.jsx';
import { CampaignMessage } from './CampaignMessage.jsx';
import { LogConsole } from '../../components/LogConsole.jsx';

const CAMPAIGN_STATUS_TONES = Object.freeze({
  sending: 'warning',
  stopped: 'error',
  completed: 'success',
});

const RECIPIENT_STATE_TONES = Object.freeze({
  accepted: 'success',
  failed: 'error',
  not_sent: 'warning',
  queued: 'neutral',
});

const RECIPIENT_STATUS_TONES = Object.freeze({
  read: 'success',
  delivered: 'success',
  sent: 'neutral',
  failed: 'error',
});

const PAGE_SIZE_OPTIONS = Object.freeze([
  { value: '10', label: '10 / page' },
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
]);

function StatCard({ label, value, sub, tone }) {
  const accentClass =
    tone === 'success' ? 'bg-emerald-500' :
    tone === 'error' ? 'bg-rose-500' :
    tone === 'warning' ? 'bg-amber-500' :
    'bg-slate-400';

  const valueClass =
    tone === 'success' ? 'text-emerald-600' :
    tone === 'error' ? 'text-rose-600' :
    tone === 'warning' ? 'text-amber-600' :
    'text-slate-900';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-all duration-150">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentClass}`} />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${valueClass}`}>
        {value?.toLocaleString() ?? '—'}
      </p>
      {sub && <p className="mt-1 text-[11px] font-medium text-slate-400">{sub}</p>}
    </div>
  );
}

/**
 * Results page: polls a specific campaign every 20 s, shows live stats and per-recipient table.
 */
export function ResultsPage({ settings, backendClient, templatesState, campaignId: propCampaignId, onNavigateToSettings }) {
  const missingKeys = getMissingKeys(settings, SEND_REQUIRED_KEYS);
  const [campaignId, setCampaignId] = useState(propCampaignId ?? '');
  const [inputId, setInputId] = useState(propCampaignId ?? '');
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Keep state in sync if prop changes (e.g. navigation from History or Send)
  const [prevPropCampaignId, setPrevPropCampaignId] = useState(propCampaignId);
  if (propCampaignId !== prevPropCampaignId) {
    setPrevPropCampaignId(propCampaignId);
    if (propCampaignId) {
      setCampaignId(propCampaignId);
      setInputId(propCampaignId);
    }
  }

  const fetchCampaign = useCallback(async (id) => {
    if (!id || !backendClient) return;
    setLoading(true);
    setError(null);
    try {
      const [data, rows] = await Promise.all([
        getCampaign(backendClient, id),
        listRecipients(backendClient, id),
      ]);
      setCampaign(data);
      setRecipients(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [backendClient]);

  // Poll while the campaign is still sending
  useEffect(() => {
    if (!campaignId || !backendClient) return;
    let ignore = false;

    Promise.all([getCampaign(backendClient, campaignId), listRecipients(backendClient, campaignId)])
      .then(([data, rows]) => {
        if (!ignore) {
          setCampaign(data);
          setRecipients(Array.isArray(rows) ? rows : []);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err);
      });

    pollRef.current = setInterval(() => {
      Promise.all([getCampaign(backendClient, campaignId), listRecipients(backendClient, campaignId)])
        .then(([data, rows]) => {
          if (!ignore) {
            setCampaign(data);
            setRecipients(Array.isArray(rows) ? rows : []);
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      clearInterval(pollRef.current);
    };
  }, [campaignId, backendClient]);

  // Stop polling when campaign is done
  useEffect(() => {
    if (campaign?.status === 'completed' || campaign?.status === 'stopped') {
      clearInterval(pollRef.current);
    }
  }, [campaign?.status]);

  const canLoadTemplates = getMissingKeys(settings, TEMPLATE_REQUIRED_KEYS).length === 0;

  const templateStatus = templatesState?.status;
  const loadTemplates = templatesState?.load;
  useEffect(() => {
    if (!campaign || !canLoadTemplates || !loadTemplates) return;
    if (templateStatus === ASYNC_STATUS.IDLE) loadTemplates();
  }, [campaign, canLoadTemplates, templateStatus, loadTemplates]);

  if (missingKeys.length > 0) return <MissingSettingsAlert missingKeys={missingKeys} onNavigateToSettings={onNavigateToSettings} />;

  async function exportCsv() {
    setError(null);
    try {
      await downloadCampaignCsv({
        backendUrl: settings.backendUrl,
        apiKey: settings.backendApiKey,
        campaignId,
      });
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Campaign ID input */}
      <Card title="Campaign results" description="Paste a campaign ID or view results from the Send tab.">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="campaign-id-input" className="text-xs font-medium text-text-secondary">
              Campaign ID
            </label>
            <input
              id="campaign-id-input"
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="67f3a1b2c3d4e5f6a7b8c9d0"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/15 focus:border-navy transition-all w-80 shadow-2xs hover:border-slate-300"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setCampaignId(inputId.trim())}
            disabled={!inputId.trim() || loading}
          >
            {loading ? 'Loading…' : 'Load'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => fetchCampaign(campaignId)}
            disabled={!campaignId || loading}
          >
            ↻ Refresh
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!campaignId || loading}>
            ↓ Export CSV
          </Button>
        </div>
      </Card>

      {error && <ErrorAlert error={error} />}

      {campaign && (
        <CampaignResults
          campaign={campaign}
          recipients={recipients}
          templatesState={templatesState}
          canLoadTemplates={canLoadTemplates}
        />
      )}

      {!campaign && !loading && campaignId && !error && (
        <Alert tone="info">Loading campaign {campaignId}…</Alert>
      )}
    </div>
  );
}

const RECIPIENT_COLUMNS = Object.freeze([
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'lastStatus', label: 'Last status' },
  { key: 'errorCode', label: 'Error code' },
  { key: 'errorMessage', label: 'Error message' },
  { key: 'sentAt', label: 'Sent' },
  { key: 'deliveredAt', label: 'Delivered' },
  { key: 'readAt', label: 'Read' },
  { key: 'failedAt', label: 'Failed' },
]);

function formatWhen(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function toRecipientRow(recipient) {
  return {
    name: recipient.name || '—',
    phone: recipient.phone,
    state: (
      <Badge tone={RECIPIENT_STATE_TONES[recipient.state] ?? 'neutral'}>
        {recipient.state || '—'}
      </Badge>
    ),
    lastStatus: recipient.lastStatus ? (
      <Badge tone={RECIPIENT_STATUS_TONES[recipient.lastStatus] ?? 'neutral'}>
        {recipient.lastStatus}
      </Badge>
    ) : '—',
    errorCode: recipient.error?.code ?? '',
    errorMessage: recipient.error?.message ?? '',
    sentAt: formatWhen(recipient.sentAt),
    deliveredAt: formatWhen(recipient.deliveredAt),
    readAt: formatWhen(recipient.readAt),
    failedAt: formatWhen(recipient.failedAt),
  };
}

function findCampaignTemplate(templates, campaign) {
  return (templates ?? []).find((item) => item.name === campaign.templateName && item.language === campaign.language)
    ?? (templates ?? []).find((item) => item.name === campaign.templateName)
    ?? null;
}

function CampaignResults({ campaign, recipients, templatesState, canLoadTemplates }) {
  const { stats, failedByCode, status, name, templateName, createdAt } = campaign;
  const isLive = status === 'sending';

  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filterCounts = useMemo(() => {
    const counts = {
      all: recipients.length,
      read: 0,
      delivered: 0,
      sent: 0,
      failed: 0,
      accepted: 0,
      queued: 0,
      not_sent: 0,
    };
    for (const r of recipients) {
      if (r.lastStatus === 'read') counts.read += 1;
      if (r.lastStatus === 'delivered') counts.delivered += 1;
      if (r.lastStatus === 'sent') counts.sent += 1;
      if (r.state === 'failed' || r.lastStatus === 'failed') counts.failed += 1;
      if (r.state === 'accepted' && !r.lastStatus) counts.accepted += 1;
      if (r.state === 'queued') counts.queued += 1;
      if (r.state === 'not_sent') counts.not_sent += 1;
    }
    return counts;
  }, [recipients]);

  const filteredRecipients = useMemo(() => {
    if (statusFilter === 'all') return recipients;
    return recipients.filter((r) => {
      if (statusFilter === 'read') return r.lastStatus === 'read';
      if (statusFilter === 'delivered') return r.lastStatus === 'delivered';
      if (statusFilter === 'sent') return r.lastStatus === 'sent';
      if (statusFilter === 'failed') return r.state === 'failed' || r.lastStatus === 'failed';
      if (statusFilter === 'accepted') return r.state === 'accepted' && !r.lastStatus;
      if (statusFilter === 'queued') return r.state === 'queued';
      if (statusFilter === 'not_sent') return r.state === 'not_sent';
      return true;
    });
  }, [recipients, statusFilter]);

  const totalFiltered = filteredRecipients.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRecipients = filteredRecipients.slice(startIndex, startIndex + pageSize);

  const handleFilterChange = (newFilter) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const template = findCampaignTemplate(templatesState?.templates, campaign);
  const templateLoading = canLoadTemplates
    && !template
    && (templatesState?.status === ASYNC_STATUS.IDLE || templatesState?.status === ASYNC_STATUS.LOADING);

  const statusFilterOptions = [
    { value: 'all', label: `All statuses (${filterCounts.all})` },
    { value: 'read', label: `Read (${filterCounts.read})` },
    { value: 'delivered', label: `Delivered (${filterCounts.delivered})` },
    { value: 'sent', label: `Sent (${filterCounts.sent})` },
    { value: 'failed', label: `Failed (${filterCounts.failed})` },
    { value: 'accepted', label: `Accepted (no webhook) (${filterCounts.accepted})` },
    { value: 'queued', label: `Queued (${filterCounts.queued})` },
    { value: 'not_sent', label: `Not sent (${filterCounts.not_sent})` },
  ];

  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'recipients' | 'logs'

  return (
    <div className="flex flex-col gap-5">
      {/* Campaign header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{name}</h2>
            <Badge tone={CAMPAIGN_STATUS_TONES[status] ?? 'neutral'}>{status}</Badge>
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Live delivery tracking (polling 20s)</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Template: <code className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{templateName}</code>
            {createdAt && ` · Started ${new Date(createdAt).toLocaleString('en-IN')}`}
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveView('overview')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeView === 'overview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📱 Mobile Screen & Stats
          </button>
          <button
            type="button"
            onClick={() => setActiveView('recipients')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeView === 'recipients'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Recipients ({recipients.length.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('logs')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeView === 'logs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ Delivery Logs
          </button>
        </div>
      </div>

      {/* VIEW 1: Overview & Full Mobile Screen */}
      {activeView === 'overview' && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_410px]">
          {/* Stats & Summaries on the Left */}
          <div className="flex flex-col gap-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Total" value={stats?.total} />
              <StatCard label="Sent" value={stats?.sent} tone="success" sub="Meta accepted" />
              <StatCard label="Delivered" value={stats?.delivered} tone="success" />
              <StatCard label="Read" value={stats?.read} tone="success" />
              <StatCard label="Failed" value={stats?.failed} tone="error" />
              <StatCard label="Not sent" value={stats?.notSent} tone="warning" />
              <StatCard label="Queued" value={stats?.queued} />
            </div>

            {/* Failed by error code */}
            {failedByCode?.length > 0 && (
              <Card title="Failed by error code" description="Meta Graph API error codes and counts">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-text-secondary">
                      <th className="pb-2 pr-8 font-medium">Error code</th>
                      <th className="pb-2 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedByCode.map(({ code, count }) => (
                      <tr key={code} className="border-b border-line/50 last:border-0">
                        <td className="py-2 pr-8 font-mono text-xs text-rose-600 font-semibold">{code}</td>
                        <td className="py-2 tabular-nums font-semibold text-slate-700">{count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {/* Quick jump to Recipients card */}
            <Card title="Recipients Snapshot">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{recipients.length.toLocaleString()} recipients recorded</p>
                  <p className="text-xs text-slate-500">View individual sent, delivered, read, and failed timestamps</p>
                </div>
                <Button onClick={() => setActiveView('recipients')}>
                  View Recipients Table →
                </Button>
              </div>
            </Card>
          </div>

          {/* Full WhatsApp Phone Mockup on the Right */}
          <div className="flex flex-col items-center lg:sticky lg:top-6">
            <CampaignMessage
              template={template}
              recipientName={recipients[0]?.name}
              isLoading={templateLoading}
              loadError={templatesState?.error}
              missingAccount={!canLoadTemplates}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: Full Recipients Table */}
      {activeView === 'recipients' && (
        <Card title="Recipients" description="One row per phone number. Filter by delivery state or status.">
          {recipients.length === 0 ? (
            <p className="text-sm text-text-secondary py-6 text-center">No recipients saved for this campaign.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Filter and page size controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="status-filter" className="text-xs font-semibold text-slate-600">
                    Filter by status:
                  </label>
                  <SelectInput
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    options={statusFilterOptions}
                    className="w-auto text-xs py-1.5"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="page-size" className="text-xs font-semibold text-slate-600">
                    Rows per page:
                  </label>
                  <SelectInput
                    id="page-size"
                    value={String(pageSize)}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    options={PAGE_SIZE_OPTIONS}
                    className="w-auto text-xs py-1.5"
                  />
                </div>
              </div>

              {totalFiltered === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No recipients match the selected filter.
                </p>
              ) : (
                <>
                  <Table
                    caption="Recipients"
                    columns={RECIPIENT_COLUMNS}
                    rows={pageRecipients.map(toRecipientRow)}
                    getRowKey={(row) => row.phone}
                  />

                  {/* Pagination footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                    <span>
                      Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalFiltered)} of{' '}
                      {totalFiltered} recipient{totalFiltered !== 1 ? 's' : ''}
                      {statusFilter !== 'all' && ` (filtered from ${recipients.length})`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="px-2 font-mono text-xs">
                        {safePage} / {totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* VIEW 3: Live Webhook & Activity Logs */}
      {activeView === 'logs' && (
        <div className="h-[600px]">
          <LogConsole inline />
        </div>
      )}
    </div>
  );
}

