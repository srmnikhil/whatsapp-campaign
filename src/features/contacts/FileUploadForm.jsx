import { useCallback } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { CONTACT_IMPORT_LIMITS } from '../../config/defaults.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { readContactsFile } from '../../services/contactSources.js';

const ACCEPTED_FILE_TYPES = '.csv,.xlsx';
const FILE_INPUT_CLASSES =
  'block w-full cursor-pointer text-xs text-slate-500 file:mr-3.5 file:cursor-pointer file:rounded-xl file:border ' +
  'file:border-slate-300 file:bg-white file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-slate-800 hover:file:bg-slate-50 shadow-2xs transition-all';


export function FileUploadForm({ onLoaded }) {
  const load = useCallback(async (file) => {
    const table = await readContactsFile(file, CONTACT_IMPORT_LIMITS);
    onLoaded({ sourceLabel: file.name, table });
  }, [onLoaded]);
  const { error, isLoading, run } = useAsyncAction(load);

  const handleChange = (event) => {
    const [file] = event.target.files ?? [];
    event.target.value = '';
    if (file) run(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <Field id="contacts-file" label="Upload .csv or .xlsx" help="First sheet only. The first row must be column headings.">
        {(inputProps) => <input {...inputProps} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleChange} disabled={isLoading} className={FILE_INPUT_CLASSES} />}
      </Field>
      {isLoading && <p className="text-sm text-text-secondary">Reading file…</p>}
      {error && <ErrorAlert error={error} title="Could not read the file" />}
    </div>
  );
}
