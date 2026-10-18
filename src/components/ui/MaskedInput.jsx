import { useState } from 'react';
import { INPUT_CLASSES } from './TextInput.jsx';

export function MaskedInput({ label, ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleLabel = `${isVisible ? 'Hide' : 'Show'} ${label}`;

  return (
    <div className="flex gap-2">
      <input
        type={isVisible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        className={`${INPUT_CLASSES} font-mono`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        className="cursor-pointer rounded-md border border-line px-3 text-xs font-medium text-navy hover:bg-muted"
      >
        {isVisible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
