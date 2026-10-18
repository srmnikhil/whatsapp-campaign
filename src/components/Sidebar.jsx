import { useLogger } from '../context/LogContext.jsx';
import { SENDER_PHASE } from '../hooks/useCampaignSender.js';

export function Sidebar({
  items,
  activeId,
  onSelect,
  isOpen,
  onClose,
  connectionInfo,
  sender,
  onOpenLogs,
  contactsCount = 0,
}) {
  const { logs, errorCount } = useLogger();
  const isSending = sender?.phase === SENDER_PHASE.SENDING;

  const renderIcon = (id) => {
    switch (id) {
      case 'settings':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'contacts':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'templates':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
      case 'send':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'results':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'history':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const sidebarContent = (
    <aside className="flex flex-col h-full bg-[#051829] text-white w-64 border-r border-white/10 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img
          src="/logo.jpg"
          alt="Garaaz Logo"
          className="h-10 w-10 rounded-xl object-cover shadow-md shadow-emerald-500/20 border border-white/20 shrink-0"
        />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-white font-sans">Garaaz Campaigns</span>
            <span className="rounded-md bg-emerald-500/25 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-300 border border-emerald-400/30">
              WA Cloud
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Marketing Broadcasts</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav aria-label="Sidebar navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          Campaign Workspace
        </div>

        {items.map((item) => {
          const isActive = item.id === activeId;
          const isItemSending = item.id === 'send' && isSending;
          const cleanLabel = typeof item.label === 'string' ? item.label.replace(/^●\s*/, '') : item.label;
          const isSettings = item.id === 'settings';

          return (
            <div key={item.id} className={isSettings ? 'pt-2 mt-2 border-t border-white/10' : ''}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  if (onClose) onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400 transition-colors'}>
                    {renderIcon(item.id)}
                  </span>
                  <span>{cleanLabel}</span>
                </div>

                {/* Status / Count Badges */}
                {isItemSending && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                )}
                {item.id === 'contacts' && contactsCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {contactsCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Activity Logs Console Quick-Access Button */}
      <div className="px-3 py-2 border-t border-white/10">
        <button
          type="button"
          onClick={onOpenLogs}
          className="flex w-full items-center justify-between rounded-xl bg-slate-900/80 hover:bg-slate-800/90 px-3.5 py-2.5 text-xs text-slate-300 border border-slate-700/60 transition-all hover:border-emerald-500/40 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-semibold text-slate-200">Terminal & Logs</span>
          </div>
          <div className="flex items-center gap-1.5">
            {errorCount > 0 && (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-rose-400 border border-rose-500/30">
                {errorCount} err
              </span>
            )}
            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
              {logs.length}
            </span>
          </div>
        </button>
      </div>

      {/* Connection Status Card */}
      <div className="p-3 border-t border-white/10 bg-[#03111e]">
        <div className="rounded-xl bg-white/5 p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Meta WABA
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{connectionInfo ? 'Online' : 'Configured'}</span>
            </span>
          </div>

          <div className="mt-2 text-xs">
            <p className="font-medium text-white truncate">
              {connectionInfo?.displayName ? `Account: ${connectionInfo.displayName}` : 'Garaaz WhatsApp'}
            </p>
            <p className="font-mono text-[11px] text-slate-400 truncate">
              {connectionInfo?.displayPhoneNumber || 'Meta Official API'}
            </p>
          </div>

          {connectionInfo?.messagingLimitTier && (
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] text-slate-400">
              <span>Tier limit</span>
              <span className="font-mono font-semibold text-slate-200">{connectionInfo.messagingLimitTier}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Modal Drawer Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex flex-col w-64 max-w-xs h-full bg-[#051829] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
