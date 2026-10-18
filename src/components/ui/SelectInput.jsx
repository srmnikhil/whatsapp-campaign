import { INPUT_CLASSES } from './TextInput.jsx';

/**
 * @param {{ options: { value: string, label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
export function SelectInput({ options, className = '', ...props }) {
  return (
    <select className={`${INPUT_CLASSES} cursor-pointer ${className}`} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
