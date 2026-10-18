import { useMemo, useState } from 'react';
import { useLogger } from '../context/LogContext.jsx';

const LEVEL_BADGES = {
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  webhook: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const CATEGORY_COLORS = {
  SEND: 'text-emerald-400',
  WEBHOOK: 'text-purple-400',
  META_API: 'text-sky-400',
  AUTH: 'text-amber-400',
  SYSTEM: 'text-slate-400',
};

function formatTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return isoString;
  }
}

export function LogConsole({ isOpen, onClose, inline = false }) {
  const { logs, clearLogs } = useLogger();
  const [filterLevel, setFilterLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [copied, setCopied] = useState(false);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterLevel !== 'all' && log.level !== filterLevel) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = log.title?.toLowerCase().includes(query);
        const matchesCategory = log.category?.toLowerCase().includes(query);
        const matchesDetails = log.details && JSON.stringify(log.details).toLowerCase().includes(query);
        return matchesTitle || matchesCategory || matchesDetails;
      }
      return true;
    });
  }, [logs, filterLevel, search]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(filteredLogs, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const counts = useMemo(() => {
    return {
      all: logs.length,
      info: logs.filter((l) => l.level === 'info').length,
      success: logs.filter((l) => l.level === 'success').length,
      warn: logs.filter((l) => l.level === 'warn').length,
      error: logs.filter((l) => l.level === 'error').length,
      webhook: logs.filter((l) => l.level === 'webhook').length,
    };
  }, [logs]);

  if (!inline && !isOpen) return null;

  const content = (
    <div className={`flex flex-col h-full bg-[#0B0F17] text-slate-200 font-mono text-xs ${inline ? 'rounded-2xl border border-slate-800 shadow-xl overflow-hidden' : ''}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0F1420] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l6-6-6-6m8 14h8" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 font-sans">Activity & Network Logs</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Live stream
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">Real-time Meta Cloud API calls, webhook delivery updates, and errors</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1.5 text-[11px] text-slate-300 border border-slate-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{copied ? 'Copied JSON!' : 'Export JSON'}</span>
          </button>
          <button
            type="button"
            onClick={clearLogs}
            className="rounded-lg bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-400 px-2.5 py-1.5 text-[11px] text-slate-400 border border-slate-700 hover:border-rose-800 transition-colors"
          >
            Clear
          </button>
          {!inline && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Close logs drawer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter and search toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 bg-[#0B0F17] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'webhook', label: 'Webhooks', count: counts.webhook },
            { id: 'success', label: 'Success', count: counts.success },
            { id: 'error', label: 'Errors', count: counts.error },
            { id: 'warn', label: 'Warnings', count: counts.warn },
            { id: 'info', label: 'Info', count: counts.info },
          ].map((tab) => {
            const active = filterLevel === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterLevel(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-sans font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone, recipient, or code…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Log items stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 font-sans">
            <svg className="mb-2 h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs">No activity matching filter.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedIds.has(log.id);
            return (
              <div
                key={log.id}
                className="group rounded-lg p-2 hover:bg-slate-900/60 transition-colors"
              >
                <div
                  className="flex items-start gap-2.5 cursor-pointer"
                  onClick={() => toggleExpand(log.id)}
                >
                  <span className="text-[10px] text-slate-500 tabular-nums shrink-0 pt-0.5">
                    {formatTime(log.timestamp)}
                  </span>

                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0 ${LEVEL_BADGES[log.level] ?? LEVEL_BADGES.info}`}>
                    {log.level}
                  </span>

                  {log.category && (
                    <span className={`text-[10px] font-semibold shrink-0 ${CATEGORY_COLORS[log.category] ?? 'text-slate-400'}`}>
                      [{log.category}]
                    </span>
                  )}

                  <span className="flex-1 text-slate-200 group-hover:text-white transition-colors leading-relaxed">
                    {log.title}
                  </span>

                  {log.details && (
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-300 text-[10px] font-sans shrink-0 px-1 py-0.5 rounded bg-slate-800/40"
                    >
                      {isExpanded ? '▲ Hide' : '▼ Details'}
                    </button>
                  )}
                </div>

                {isExpanded && log.details && (
                  <div className="mt-2.5 ml-6 overflow-x-auto rounded-lg bg-black/60 p-3 border border-slate-800/80">
                    <pre className="text-[11px] text-emerald-300 leading-normal">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#0F1420] px-4 py-2 text-[10px] text-slate-400 font-sans">
        <span>Showing {filteredLogs.length} of {logs.length} logged events</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Connected to local event bus</span>
        </span>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-200">
        {content}
      </div>
    </div>
  );
}
