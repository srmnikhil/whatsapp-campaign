import { INPUT_CLASSES } from './TextInput.jsx';

export function TextArea({ className = '', ...props }) {
  return <textarea rows={5} className={`${INPUT_CLASSES} resize-y ${className}`} {...props} />;
}
