export const INPUT_CLASSES =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-text-primary ' +
  'placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 ' +
  'transition-all duration-150 shadow-2xs hover:border-slate-300 aria-invalid:border-rose-500 aria-invalid:focus:ring-rose-200';

export function TextInput({ className = '', ...props }) {
  return <input type="text" autoComplete="off" spellCheck={false} className={`${INPUT_CLASSES} ${className}`} {...props} />;
}
