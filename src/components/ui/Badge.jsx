const TONE_CLASSES = Object.freeze({
  neutral: 'bg-slate-50 text-slate-700 border-slate-200/90',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
  warning: 'bg-amber-50 text-amber-800 border-amber-200/90',
  error: 'bg-rose-50 text-rose-700 border-rose-200/90',
});

const DOT_CLASSES = Object.freeze({
  neutral: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
});

export function Badge({ tone = 'neutral', withDot = true, children, className = '' }) {
  const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;
  const dotClass = DOT_CLASSES[tone] ?? DOT_CLASSES.neutral;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border shadow-2xs ${toneClass} ${className}`}>
      {withDot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />}
      <span>{children}</span>
    </span>
  );
}
