/**
 * @param {{ name: string, legend: string, options: { value: string, label: string }[], value: string,
 *           onChange: (value: string) => void }} props
 */
export function RadioGroup({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium text-text-primary">{legend}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 cursor-pointer accent-navy"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
