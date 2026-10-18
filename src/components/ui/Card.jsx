export function Card({ title, description, action, className = '', children }) {
  return (
    <section className={`rounded-2xl border border-slate-200/90 bg-card p-6 shadow-xs transition-shadow duration-200 ${className}`}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            {title && <h2 className="text-base font-semibold tracking-tight text-text-primary">{title}</h2>}
            {description && <p className="mt-1 text-xs sm:text-sm text-text-secondary leading-relaxed">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
