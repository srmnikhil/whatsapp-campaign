const ACTIVE_CLASSES =
  'bg-white text-navy font-semibold shadow-sm shadow-black/10 scale-[1.02] border border-white';
const INACTIVE_CLASSES =
  'text-white/85 hover:text-white hover:bg-white/10 border border-transparent';

export function AppNav({ items, activeId, onSelect }) {
  return (
    <nav aria-label="Main" className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-black/20 p-1 backdrop-blur-md border border-white/10 shadow-inner">
      {items.map((item) => {
        const isActive = item.id === activeId;
        const isSendingLive = typeof item.label === 'string' && item.label.startsWith('●');
        const cleanLabel = isSendingLive ? item.label.replace(/^●\s*/, '') : item.label;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex items-center gap-2 cursor-pointer px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
          >
            {isSendingLive && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
            <span>{cleanLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
