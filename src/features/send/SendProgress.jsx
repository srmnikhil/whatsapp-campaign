import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { SENDER_PHASE } from '../../hooks/useCampaignSender.js';
import { formatPhoneDisplay } from '../../lib/phone.js';
import { Icon } from '../../components/Icon.jsx';

const STATE_TONES = {
  queued: 'neutral',
  accepted: 'success',
  failed: 'error',
  not_sent: 'warning',
};

const STATE_LABELS = {
  queued: 'Queued',
  accepted: 'Sent',
  failed: 'Failed',
  not_sent: 'Not sent',
};

function ProgressBar({ sent, failed, total }) {
  const pct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{sent + failed} of {total} processed</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60 p-0.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 shadow-2xs"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Live send progress: progress bar, stats, Stop button, rows table.
 */
export function SendProgress({ sender, onStop, onViewResults, onRetryFailed, onNewCampaign }) {
  const { phase, total, sent, failed, notSent, stopReason, rows, errorMessage, campaignId } = sender;
  const isSending = phase === SENDER_PHASE.SENDING;
  const isDone = phase === SENDER_PHASE.DONE;
  const isError = phase === SENDER_PHASE.ERROR;
  const isStopped = isDone && stopReason;
  const retryCount = rows.filter((r) => r.state === 'failed' || r.state === 'not_sent').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Keep tab open banner */}
      {isSending && (
        <Alert tone="warning" title="Keep this tab open">
          Sending is running in this browser. Closing or navigating away will stop the campaign and mark unsent contacts as "not sent".
        </Alert>
      )}

      <Card title={isSending ? 'Sending…' : isDone ? (isStopped ? 'Campaign stopped' : 'Campaign complete') : 'Campaign'}>
        <div className="flex flex-col gap-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Total" value={total} />
            <StatBox label="Sent" value={sent} tone="success" />
            <StatBox label="Failed" value={failed} tone="error" />
            <StatBox label="Not sent" value={notSent} tone="warning" />
          </div>

          {/* Progress bar */}
          {total > 0 && <ProgressBar sent={sent} failed={failed} total={total} />}

          {/* Stop reason */}
          {stopReason && (
            <Alert tone="warning" title="Stopped">
              {stopReason}
            </Alert>
          )}

          {/* Error */}
          {isError && errorMessage && (
            <Alert tone="error" title="Campaign failed">
              {errorMessage}
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap items-center">
            {isSending && (
              <Button variant="danger" onClick={onStop}>
                <Icon name="stop" className="h-4 w-4 shrink-0" /> Stop campaign
              </Button>
            )}
            {rows.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  const header = ['Phone', 'Name', 'Status', 'Message ID', 'Error'];
                  const csvRows = [header.join(',')];
                  rows.forEach((r) => {
                    const phone = `"${(r.phone || '').replace(/"/g, '""')}"`;
                    const name = `"${(r.name || '').replace(/"/g, '""')}"`;
                    const status = `"${(r.state || '').replace(/"/g, '""')}"`;
                    const wamid = `"${(r.wamid || '').replace(/"/g, '""')}"`;
                    const error = `"${(r.error || '').replace(/"/g, '""')}"`;
                    csvRows.push([phone, name, status, wamid, error].join(','));
                  });
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `campaign_results_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
              >
                <Icon name="download" /> Download Results CSV
              </Button>
            )}
            {(isDone || isError) && campaignId && (
              <Button onClick={() => onViewResults(campaignId)}>
                View results <Icon name="arrowRight" />
              </Button>
            )}
            {isDone && retryCount > 0 && onRetryFailed && (
              <Button variant="secondary" onClick={onRetryFailed}>
                <Icon name="refresh" /> Retry {retryCount} failed
              </Button>
            )}
            {(isDone || isError) && onNewCampaign && (
              <Button variant="secondary" onClick={onNewCampaign}>
                <Icon name="plus" /> New campaign
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Live recipient rows */}
      {rows.length > 0 && (
        <Card title={`Recipients (${rows.length.toLocaleString()})`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-text-secondary">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Phone</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.recipientId} className="border-b border-line/50 last:border-0">
                    <td className="py-1.5 pr-4 text-text-primary">{row.name || <span className="text-text-secondary italic">—</span>}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs text-text-secondary">{formatPhoneDisplay(row.phone)}</td>
                    <td className="py-1.5 pr-4">
                      <Badge tone={STATE_TONES[row.state] ?? 'neutral'}>
                        {STATE_LABELS[row.state] ?? row.state}
                      </Badge>
                    </td>
                    <td className="py-1.5 text-xs text-text-secondary">{row.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value, tone }) {
  const toneClasses = {
    success: 'bg-emerald-50/70 border-emerald-200/80',
    error: 'bg-rose-50/70 border-rose-200/80',
    warning: 'bg-amber-50/70 border-amber-200/80',
  }[tone] ?? 'bg-white border-slate-200';

  const valueTone = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    warning: 'text-amber-600',
  }[tone] ?? 'text-slate-900';

  return (
    <div className={`rounded-xl border p-4 shadow-2xs transition-all ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueTone}`}>{value.toLocaleString()}</p>
    </div>
  );
}

