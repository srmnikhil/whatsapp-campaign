import { useMemo, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ASYNC_STATUS } from '../../constants/asyncStatus.js';
import { TEMPLATE_STATUS } from '../../constants/templates.js';
import { Icon } from '../../components/Icon.jsx';
import { getTemplateVersion, groupTemplatesByVersion } from '../../lib/templates.js';

function StatusPill({ status }) {
  const isApproved = status === TEMPLATE_STATUS.APPROVED;
  const isPending = status === TEMPLATE_STATUS.PENDING;
  const isRejected = status === TEMPLATE_STATUS.REJECTED;

  let pillClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  if (isApproved) {
    pillClasses = 'bg-[#EBFBF2] text-[#1E7E44] border-[#C6EFD6]';
  } else if (isPending) {
    pillClasses = 'bg-[#FEF9E7] text-[#B7791F] border-[#FDE8A2]';
  } else if (isRejected) {
    pillClasses = 'bg-[#FEEAEA] text-[#C53030] border-[#FACACA]';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${pillClasses}`}
    >
      {status || 'UNKNOWN'}
    </span>
  );
}

export function TemplateList({
  templatesState,
  onOpenCreate,
  onEditTemplate,
  onDuplicateTemplate,
}) {
  const { templates = [], error, isLoading, hiddenCount, status, refreshOne, deleteOne, load } = templatesState;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [refreshingId, setRefreshingId] = useState(null);
  const [deletingName, setDeletingName] = useState(null);
  // Version picked per template group; a group with no pick shows its latest version.
  const [pickedVersions, setPickedVersions] = useState({});

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const groups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const matches = (template) =>
      (template.name || '').toLowerCase().includes(q) || (template.bodyText || '').toLowerCase().includes(q);

    const list = groupTemplatesByVersion(templates).filter(
      (group) => !q || group.versions.some(matches),
    );

    list.sort((a, b) => {
      let valA = a.latest[sortField] || '';
      let valB = b.latest[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [templates, searchQuery, sortField, sortDirection]);

  const handleRefresh = async (template, e) => {
    e.stopPropagation();
    if (!refreshOne || !template.id) return;
    setRefreshingId(template.id);
    try {
      await refreshOne(template.id);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (template, e) => {
    e.stopPropagation();
    if (!deleteOne) return;
    const ok = window.confirm(`Are you sure you want to delete template "${template.name}" from Meta WhatsApp?`);
    if (!ok) return;
    setDeletingName(template.name);
    try {
      await deleteOne(template.name);
    } catch (err) {
      alert(`Could not delete template: ${err.message || String(err)}`);
    } finally {
      setDeletingName(null);
    }
  };

  if (error) return <ErrorAlert error={error} title="Could not load templates" />;
  if (isLoading && templates.length === 0) return <p className="text-sm text-text-secondary">Loading templates from Meta…</p>;
  if (status === ASYNC_STATUS.SUCCESS && templates.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert tone="info" title="No templates yet" className="w-full">
          Create your first template. Meta usually reviews it within minutes.
        </Alert>
        {onOpenCreate && (
          <Button onClick={onOpenCreate}>
            <Icon name="plus" /> New Template
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
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
              placeholder="Search templates…"
              className="h-9 w-48 sm:w-64 rounded-lg border border-slate-200 bg-slate-50/50 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {hiddenCount > 0 && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              {hiddenCount} utility or authentication templates are hidden.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={load} disabled={isLoading}>
            {isLoading ? 'Reloading…' : <><Icon name="refresh" /> Reload list</>}
          </Button>

          {onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2aa9a0] hover:bg-[#238c84] text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              <span>New Template</span>
            </button>
          )}
        </div>
      </div>

      {/* Templates Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            {/* Table Header */}
            <thead className="bg-[#FAFBFD] text-slate-600 font-semibold tracking-wider uppercase select-none">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 sm:pl-6 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>TEMPLATE NAME</span>
                    <Icon name="sort" className="h-3 w-3 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th scope="col" className="px-3 py-3.5 w-[30%]">
                  PREVIEW
                </th>
                <th scope="col" className="px-3 py-3.5">
                  STATUS
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    <span>CREATED</span>
                    <Icon name="sort" className="h-3 w-3 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    <span>LAST MODIFIED</span>
                    <Icon name="sort" className="h-3 w-3 shrink-0 text-slate-400" />
                  </div>
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200/80 bg-white">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No templates found matching your search.
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const template =
                    group.versions.find((v) => v.name === pickedVersions[group.key]) ?? group.latest;
                  const isPending = template.status === TEMPLATE_STATUS.PENDING;
                  const isApproved = template.problems.length === 0;

                  return (
                    <tr
                      key={group.key}
                      role="article"
                      aria-label={`Template ${template.name}`}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Column 1: Template Name + Category */}
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => onEditTemplate?.(template)}
                            className="text-[#0284c7] hover:text-[#0369a1] font-semibold text-xs text-left hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>
                              {template.name} ({template.language})
                            </span>
                          </button>
                          {group.versions.length > 1 && (
                            <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                              Version
                              <select
                                value={template.name}
                                onChange={(e) =>
                                  setPickedVersions((prev) => ({ ...prev, [group.key]: e.target.value }))
                                }
                                aria-label={`Version of ${group.baseName}`}
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:border-teal-500 focus:outline-none"
                              >
                                {group.versions.map((v) => (
                                  <option key={v.name} value={v.name}>
                                    {`v${getTemplateVersion(v.name)}${v === group.latest ? ' (latest)' : ''} · ${v.status}`}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <span className="text-[11px] text-slate-400 capitalize mt-0.5">
                            {template.category?.toLowerCase() || 'marketing'}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Preview snippet */}
                      <td className="px-3 py-3.5 text-slate-600">
                        <span className="line-clamp-1 truncate max-w-xs block font-sans" title={template.bodyText}>
                          {template.bodyText || '—'}
                        </span>
                      </td>

                      {/* Column 3: Status Pill */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={template.status} />
                          {isApproved && (
                            <span className="sr-only">Ready for campaigns</span>
                          )}
                          {isPending && (
                            <span className="sr-only">Status is PENDING</span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Created Date */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                        19 Oct, 2026
                      </td>

                      {/* Column 5: Last Modified Date */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                        19 Oct, 2026
                      </td>

                      {/* Column 6: Action Icons */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Refresh button for status check */}
                          <button
                            type="button"
                            title={`Refresh status of ${template.name}`}
                            aria-label={`Refresh status of ${template.name}`}
                            onClick={(e) => handleRefresh(template, e)}
                            disabled={refreshingId === template.id}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            <svg
                              className={`h-4 w-4 ${refreshingId === template.id ? 'animate-spin text-emerald-600' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.75}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>

                          {/* Edit / View Icon (Pencil) */}
                          <button
                            type="button"
                            title="Edit template"
                            onClick={() => onEditTemplate?.(template)}
                            className="p-1 rounded text-slate-500 hover:text-teal-600 transition-colors cursor-pointer"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>

                          {/* Delete Icon (Red Trash) */}
                          <button
                            type="button"
                            title="Delete template"
                            onClick={(e) => handleDelete(template, e)}
                            disabled={deletingName === template.name}
                            className="p-1 rounded text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>

                          {/* Duplicate Icon */}
                          <button
                            type="button"
                            title="Duplicate template"
                            onClick={() => onDuplicateTemplate?.(template)}
                            className="p-1 rounded text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
