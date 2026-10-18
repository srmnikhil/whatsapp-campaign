export function Checkbox({ id, label, help, ...props }) {
  return (
    <div className="flex items-start gap-2">
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 cursor-pointer accent-navy" {...props} />
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-text-primary">{label}</label>
        {help && <p className="text-xs text-text-secondary">{help}</p>}
      </div>
    </div>
  );
}
