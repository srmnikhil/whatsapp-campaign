import { useCallback } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TEMPLATE_STATUS } from '../../constants/templates.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { formatQuality, getQualityTone } from '../../lib/connectionInfo.js';
import { Icon } from '../../components/Icon.jsx';

const STATUS_TONES = Object.freeze({
  [TEMPLATE_STATUS.APPROVED]: 'success',
  [TEMPLATE_STATUS.PENDING]: 'warning',
  [TEMPLATE_STATUS.REJECTED]: 'error',
  [TEMPLATE_STATUS.PAUSED]: 'error',
  [TEMPLATE_STATUS.DISABLED]: 'error',
});

function TemplateIssues({ template }) {
  if (template.problems.length === 0 && template.stopButtonIndex >= 0) return null;
  return (
    <ul className="list-disc pl-5 text-xs text-text-secondary">
      {template.rejectedReason && <li>Rejected: {template.rejectedReason}</li>}
      {template.problems.map((problem) => <li key={problem}>{problem}</li>)}
      {template.stopButtonIndex < 0 && <li>No &ldquo;Stop promotions&rdquo; button</li>}
    </ul>
  );
}

export function TemplateCard({ template, onRefresh, isSelected = false, onSelect }) {
  const refresh = useCallback((signal) => onRefresh(template.id, signal), [onRefresh, template.id]);
  const { error, isLoading, run } = useAsyncAction(refresh);
  const isUsable = template.problems.length === 0;

  return (
    <article
      className={`group relative flex flex-col gap-3 rounded-2xl border p-4.5 transition-all cursor-pointer ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50/25 shadow-sm ring-2 ring-emerald-500/20'
          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs'
      }`}
      aria-label={`Template ${template.name}`}
      onClick={onSelect}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
            {template.name}
          </h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600">
            {template.language}
          </span>
          <Badge tone={STATUS_TONES[template.status] ?? 'neutral'}>{template.status}</Badge>
          {template.qualityScore && (
            <Badge tone={getQualityTone(template.qualityScore)}>
              Quality {formatQuality(template.qualityScore)}
            </Badge>
          )}
          {isUsable && <Badge tone="success">Ready for campaigns</Badge>}
        </div>

        {/* Selected preview indicator */}
        <div className="flex items-center gap-1.5">
          {isSelected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Previewing
            </span>
          ) : (
            <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:inline">
              Click to preview <Icon name="arrowRight" className="h-3 w-3 shrink-0" />
            </span>
          )}
        </div>
      </header>

      {/* Body preview snippet */}
      {template.bodyText && (
        <div className="rounded-xl bg-slate-50/90 p-3 text-xs text-slate-700 border border-slate-100 font-sans line-clamp-2 leading-relaxed whitespace-pre-wrap">
          {template.bodyText}
        </div>
      )}

      {/* Component Pills: Header, Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        {template.header?.format && template.header.format !== 'NONE' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            {template.header.format === 'IMAGE' ? <><Icon name="image" className="h-3 w-3 shrink-0" /> Image Header</> : <><Icon name="fileText" className="h-3 w-3 shrink-0" /> Text Header</>}
          </span>
        )}
        {template.buttons && template.buttons.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            <Icon name="cursorClick" className="h-3 w-3 shrink-0" /> {template.buttons.length} button{template.buttons.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <TemplateIssues template={template} />

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            run();
          }}
          disabled={isLoading}
          aria-label={`Refresh status of ${template.name}`}
        >
          {isLoading ? 'Refreshing…' : 'Refresh status'}
        </Button>
      </div>
      {error && <ErrorAlert error={error} />}
    </article>
  );
}
