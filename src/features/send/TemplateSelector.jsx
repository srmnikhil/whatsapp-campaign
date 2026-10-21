import { useMemo, useState } from 'react';
import { TemplatePreview } from '../../components/TemplatePreview.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { TEMPLATE_CATEGORY } from '../../constants/templates.js';
import { Icon } from '../../components/Icon.jsx';
import { getTemplateVersion, groupTemplatesByVersion } from '../../lib/templates.js';

/**
 * Shows the list of approved campaign templates with live search and category filters.
 * Only templates with problems.length === 0 are selectable.
 */
export function TemplateSelector({ templatesState, onSelect, businessName }) {
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  // Version picked per template group; a group with no pick shows its latest version.
  const [pickedVersions, setPickedVersions] = useState({});

  const { templates, allTemplates, isLoading } = templatesState || {};

  // Use allTemplates if available (includes both MARKETING and UTILITY), falling back to templates
  const sourceTemplates = useMemo(() => {
    return allTemplates?.length ? allTemplates : (templates ?? []);
  }, [allTemplates, templates]);

  const approved = useMemo(() => {
    return sourceTemplates.filter((t) => t.problems.length === 0);
  }, [sourceTemplates]);

  // One card per template: versions (`_v2`, `_v3`, ...) are grouped and the newest is shown first.
  const groups = useMemo(() => groupTemplatesByVersion(approved), [approved]);

  const marketingCount = useMemo(
    () => groups.filter((g) => g.latest.category === TEMPLATE_CATEGORY.MARKETING).length,
    [groups],
  );

  const utilityCount = useMemo(
    () => groups.filter((g) => g.latest.category === TEMPLATE_CATEGORY.UTILITY).length,
    [groups],
  );

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups.filter((group) => {
      const category = group.latest.category;
      const matchesCategory =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'MARKETING' && category === TEMPLATE_CATEGORY.MARKETING) ||
        (categoryFilter === 'UTILITY' && category === TEMPLATE_CATEGORY.UTILITY);

      if (!matchesCategory) return false;
      if (!q) return true;

      return group.versions.some(
        (t) => (t.name || '').toLowerCase().includes(q) || (t.bodyText || '').toLowerCase().includes(q),
      );
    });
  }, [groups, searchQuery, categoryFilter]);

  if (isLoading) {
    return (
      <Card title="Pick a template">
        <p className="text-sm text-text-secondary animate-pulse">Loading templates from Meta…</p>
      </Card>
    );
  }

  if (approved.length === 0) {
    return (
      <Card title="Pick a template">
        <p className="text-sm text-text-secondary">
          No approved, usable templates found. Go to the{' '}
          <strong>Templates</strong> tab to create or reload them.
        </p>
      </Card>
    );
  }

  const descriptionText = `${groups.length} approved template${groups.length !== 1 ? 's' : ''} available (${marketingCount} marketing, ${utilityCount} utility).`;

  return (
    <Card title="Pick a template" description={descriptionText}>
      <div className="flex flex-col gap-4">
        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl bg-slate-50/80 p-3 border border-slate-200/80">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
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
              placeholder="Search templates by name or text..."
              aria-label="Search templates"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-200/70 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={[
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                categoryFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              All ({groups.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('MARKETING')}
              className={[
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                categoryFilter === 'MARKETING'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              Marketing ({marketingCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('UTILITY')}
              className={[
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                categoryFilter === 'UTILITY'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              Utility ({utilityCount})
            </button>
          </div>
        </div>

        {/* Results summary if searching */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Found {filteredGroups.length} matching template{filteredGroups.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-emerald-600 hover:underline font-medium cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        )}

        {/* Templates Grid or Empty State */}
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-slate-300 text-center bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-700">No matching templates found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or switching categories.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
              }}
              className="mt-3 text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const template =
                group.versions.find((v) => v.name === pickedVersions[group.key]) ?? group.latest;
              const isSelected = selected?.id === template.id;
              const isMarketing = template.category === TEMPLATE_CATEGORY.MARKETING;
              return (
                <div
                  key={group.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(template)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(template);
                    }
                  }}
                  className={[
                    'flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all cursor-pointer',
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-card hover:border-slate-300 hover:shadow-sm',
                  ].join(' ')}
                  aria-pressed={isSelected}
                  aria-label={`Select template ${template.name}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-semibold text-slate-900 truncate" title={template.name}>
                        {group.versions.length > 1 ? group.baseName : template.name}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                        {template.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={[
                          'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          isMarketing
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200',
                        ].join(' ')}
                      >
                        {template.category}
                      </span>
                      {isSelected && <Badge tone="success">Selected</Badge>}
                    </div>
                  </div>
                  {group.versions.length > 1 && (
                    <label
                      className="flex items-center gap-1.5 text-[11px] text-slate-500"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      Version
                      <select
                        value={template.name}
                        onChange={(e) => {
                          const next = group.versions.find((v) => v.name === e.target.value);
                          setPickedVersions((prev) => ({ ...prev, [group.key]: next.name }));
                          if (isSelected) setSelected(next);
                        }}
                        aria-label={`Version of ${group.baseName}`}
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:border-emerald-500 focus:outline-none"
                      >
                        {group.versions.map((v) => (
                          <option key={v.name} value={v.name}>
                            {`v${getTemplateVersion(v.name)}${v === group.latest ? ' (latest)' : ''}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <TemplatePreview
                    header={template.header}
                    imageUrl={template.header?.exampleUrl}
                    bodyText={template.bodyText}
                    footerText={template.footerText}
                    buttons={template.buttons}
                    businessName={businessName}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between">
          <Button onClick={() => onSelect(selected)} disabled={!selected}>
            Use this template <Icon name="arrowRight" />
          </Button>
          {selected && (
            <span className="text-xs text-slate-500">
              Selected: <strong className="text-slate-800 font-mono">{selected.name}</strong> ({selected.language})
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
