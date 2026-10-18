import { useCallback, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { TextInput } from '../../components/ui/TextInput.jsx';
import { CONTACT_IMPORT_LIMITS } from '../../config/defaults.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { fetchGoogleSheet } from '../../services/contactSources.js';

const SOURCE_LABEL = 'Google Sheet';

export function SheetLinkForm({ onLoaded }) {
  const [link, setLink] = useState('');
  const load = useCallback(async (sheetLink, signal) => {
    const table = await fetchGoogleSheet(sheetLink, CONTACT_IMPORT_LIMITS, { signal });
    onLoaded({ sourceLabel: SOURCE_LABEL, table });
  }, [onLoaded]);
  const { error, isLoading, run } = useAsyncAction(load);

  const handleSubmit = (event) => {
    event.preventDefault();
    run(link);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <Field
        id="contacts-sheet-link"
        label="Google Sheet link"
        help='The sheet must be shared as "Anyone with the link". Reads the tab in the link. Unshare it after importing.'
      >
        {(inputProps) => (
          <TextInput {...inputProps} type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value={link} onChange={(event) => setLink(event.target.value)} />
        )}
      </Field>
      <div>
        <Button type="submit" disabled={isLoading || !link.trim()}>{isLoading ? 'Loading…' : 'Load sheet'}</Button>
      </div>
      {error && <ErrorAlert error={error} title="Could not load the sheet" />}
    </form>
  );
}
