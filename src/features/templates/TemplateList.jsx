import { useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ASYNC_STATUS } from '../../constants/asyncStatus.js';
import { TEMPLATE_STATUS } from '../../constants/templates.js';
import { TemplateCard } from './TemplateCard.jsx';

export function TemplateList({
  templatesState,
  selectedId,
  onSelectId,
  onOpenCreate,
}) {
  const { templates, error, isLoading, hiddenCount, status } = templatesState;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !searchQuery || template.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'APPROVED' && template.status === TEMPLATE_STATUS.APPROVED) ||
      (statusFilter === 'PENDING' && template.status === TEMPLATE_STATUS.PENDING);
    return matchesSearch && matchesStatus;
  });

  const activeTemplate =
    templates.find((t) => t.id === selectedId) ||
    filteredTemplates.find((t) => t.problems.length === 0) ||
    filteredTemplates[0] ||
    templates[0] ||
    null;

  const approvedCount = templates.filter((t) => t.status === TEMPLATE_STATUS.APPROVED).length;
  const pendingCount = templates.filter((t) => t.status === TEMPLATE_STATUS.PENDING).length;

  if (error) return <ErrorAlert error={error} title="Could not load templates" />;
  if (isLoading && templates.length === 0) return <p className="text-sm text-text-secondary">Loading templates…</p>;
  if (status === ASYNC_STATUS.SUCCESS && templates.length === 0) {
    return (
      <Alert tone="info" title="No marketing templates yet">
        Create one below. Meta usually reviews it within minutes.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* SuprSend-style Top Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 font-sans">Marketing Templates</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-slate-700 border border-slate-200">
              {templates.length} total
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Approved Meta marketing broadcast templates. Click any row to preview on the right.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name…"
              className="h-9 w-44 sm:w-56 rounded-xl border border-slate-200 bg-slate-50/50 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <Button variant="secondary" size="sm" onClick={templatesState.load} disabled={templatesState.isLoading}>
            {templatesState.isLoading ? 'Loading…' : 'Reload list'}
          </Button>

          {onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ New Template</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Hidden note */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            All Templates ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {hiddenCount > 0 && (
          <span className="text-xs text-slate-500 font-sans">
            {hiddenCount} utility or authentication templates are hidden.
          </span>
        )}
      </div>

      {/* 2-Column Responsive Layout: Wide List on Left, Live Phone Mockup on Right */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
        {/* Left Column: Template List */}
        <div className="flex flex-col gap-3">
          {filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              No templates match your search filter.
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={activeTemplate?.id === template.id}
                onSelect={() => onSelectId && onSelectId(template.id)}
                onRefresh={templatesState.refreshOne}
              />
            ))
          )}
        </div>

        {/* Right Column: Sticky Live WhatsApp Phone Preview */}
        <div className="sticky top-20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Live Preview
              </span>
              {activeTemplate && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-800">
                  {activeTemplate.name}
                </span>
              )}
            </div>
            {activeTemplate && (
              <span className="text-xs font-mono text-slate-400">
                {activeTemplate.language}
              </span>
            )}
          </div>

          {activeTemplate ? (
            <TemplatePreview
              header={activeTemplate.header}
              imageUrl={activeTemplate.header?.exampleUrl}
              bodyText={activeTemplate.bodyText}
              footerText={activeTemplate.footerText}
              buttons={activeTemplate.buttons}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
              Click a template to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
