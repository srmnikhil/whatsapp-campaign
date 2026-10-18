const TONE_CLASSES = Object.freeze({
  info: 'border-blue-200 bg-blue-50/70 text-blue-950',
  success: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-950',
  error: 'border-rose-200 bg-rose-50/70 text-rose-950',
});

const ACCENT_BAR_CLASSES = Object.freeze({
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
});

const URGENT_TONES = ['error', 'warning'];

export function Alert({ tone = 'info', title, children, className = '' }) {
  const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.info;
  const accentClass = ACCENT_BAR_CLASSES[tone] ?? ACCENT_BAR_CLASSES.info;

  return (
    <div
      role={URGENT_TONES.includes(tone) ? 'alert' : 'status'}
      className={`relative overflow-hidden rounded-xl border p-4 text-sm shadow-2xs ${toneClass} ${className}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass}`} />
      <div className="pl-1">
        {title && <p className="font-semibold tracking-tight text-sm mb-1">{title}</p>}
        {children && <div className="text-xs sm:text-sm opacity-90 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
