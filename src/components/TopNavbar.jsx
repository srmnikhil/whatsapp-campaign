import { SENDER_PHASE } from '../hooks/useCampaignSender.js';
import { useLogger } from '../context/LogContext.jsx';

const TITLES = {
  settings: { title: 'Settings & Credentials', subtitle: 'Manage Meta Cloud API keys, Webhooks, and test sends' },
  contacts: { title: 'Contacts & Audiences', subtitle: 'Import workshop phone numbers from Google Sheets, CSV, or Excel' },
  templates: { title: 'Template Manager', subtitle: 'Browse approved Meta marketing templates and submit new designs' },
  send: { title: 'Broadcast Campaign', subtitle: 'Select template, preview mobile screen, check quota, and send' },
  results: { title: 'Campaign Analytics & Results', subtitle: 'Live webhook statuses (Sent, Delivered, Read, Failed) and recipients' },
  history: { title: 'Campaign History', subtitle: 'Audit log of past campaigns, recipients, and delivery reports' },
};

export function TopNavbar({
  activeTab,
  onOpenSidebar,
  connectionInfo,
  sender,
  onStopSend,
  onOpenLogs,
}) {
  const { logs, errorCount } = useLogger();
  const pageInfo = TITLES[activeTab] ?? { title: 'Campaigns', subtitle: 'WhatsApp Marketing Broadcasts' };
  const isSending = sender?.phase === SENDER_PHASE.SENDING;
  const pct = sender?.total > 0 ? Math.round(((sender.sent + sender.failed) / sender.total) * 100) : 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md shadow-2xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <img
          src="/logo.jpg"
          alt="Garaaz Logo"
          className="h-8 w-8 rounded-lg object-cover border border-slate-200 shadow-2xs lg:hidden"
        />

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-sans">
              {pageInfo.title}
            </h1>
            <span className="hidden sm:inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-600 border border-slate-200">
              v25.0
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 font-sans truncate max-w-md">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Live Sending Chip if active */}
        {isSending && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1 text-xs text-emerald-800 border border-emerald-200 animate-pulse">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold hidden sm:inline">Sending:</span>
            <span className="font-mono">{pct}%</span>
            <span className="text-emerald-600 hidden sm:inline">({sender.sent + sender.failed}/{sender.total})</span>
            {onStopSend && (
              <button
                type="button"
                onClick={onStopSend}
                className="ml-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700"
              >
                Stop
              </button>
            )}
          </div>
        )}

        {/* Live Meta Connection Badge */}
        {connectionInfo && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-700 border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium truncate max-w-[120px]">{connectionInfo.displayName ? `Account: ${connectionInfo.displayName}` : 'Connected'}</span>
          </div>
        )}

        {/* Logs Drawer Toggle Button */}
        <button
          type="button"
          onClick={onOpenLogs}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          title="Open real-time activity and network logs console"
        >
          <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Logs</span>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-emerald-300">
            {logs.length}
          </span>
          {errorCount > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-mono font-bold text-white">
              {errorCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
