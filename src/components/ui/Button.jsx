const BASE_CLASSES =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ' +
  'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:ring-offset-2 ' +
  'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 select-none';

const VARIANT_CLASSES = Object.freeze({
  primary: 'bg-gradient-to-r from-navy via-navy to-navy-700 text-white hover:from-navy-700 hover:to-[#084b80] shadow-xs hover:shadow',
  secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-2xs',
  danger: 'border border-rose-200 bg-rose-50/80 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-2xs',
  ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
});

export function Button({ variant = 'primary', type = 'button', className = '', children, ...props }) {
  return (
    <button type={type} className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
