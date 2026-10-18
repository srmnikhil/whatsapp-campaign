export function Field({ id, label, required = false, help, error, children }) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-brand-red" aria-hidden="true">*</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-brand-red">{error}</p>
      ) : (
        help && <p id={`${id}-help`} className="text-xs text-text-secondary">{help}</p>
      )}
    </div>
  );
}
