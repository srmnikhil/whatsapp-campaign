import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { MaskedInput } from '../../components/ui/MaskedInput.jsx';
import { TextInput } from '../../components/ui/TextInput.jsx';
import { SETTINGS_FIELDS } from '../../constants/settingsFields.js';
import { sanitizeSettings, validateSettings } from '../../lib/settings.js';

const CLEAR_CONFIRMATION = 'Clear all settings, including the access token, from this browser?';

export function SettingsForm({ settings, onSave, onClear }) {
  const [draft, setDraft] = useState(settings);
  const [errors, setErrors] = useState({});

  const updateField = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const clean = sanitizeSettings(draft);
    const validationErrors = validateSettings(clean);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) onSave(clean);
  };

  const handleClear = () => {
    if (window.confirm(CLEAR_CONFIRMATION)) onClear();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {SETTINGS_FIELDS.map((field) => (
        <Field key={field.key} id={`settings-${field.key}`} label={field.label} required={field.required} help={field.help} error={errors[field.key]}>
          {(inputProps) =>
            field.secret ? (
              <MaskedInput {...inputProps} label={field.label} value={draft[field.key]} onChange={updateField(field.key)} />
            ) : (
              <TextInput {...inputProps} value={draft[field.key]} onChange={updateField(field.key)} />
            )
          }
        </Field>
      ))}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit">Save settings</Button>
        <Button variant="danger" onClick={handleClear}>Clear settings</Button>
      </div>
    </form>
  );
}
