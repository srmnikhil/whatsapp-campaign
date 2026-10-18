import { Field } from '../../components/ui/Field.jsx';
import { SelectInput } from '../../components/ui/SelectInput.jsx';

const NONE_VALUE = '-1';

function toOptions(headers, noneLabel) {
  return [{ value: NONE_VALUE, label: noneLabel }, ...headers.map((header, index) => ({ value: String(index), label: header }))];
}

export function ColumnMapping({ headers, mapping, onChange }) {
  const update = (key) => (event) => onChange({ ...mapping, [key]: Number(event.target.value) });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="mapping-phone" label="Phone column" required error={mapping.phoneIndex < 0 ? 'Pick the column with phone numbers.' : undefined}>
        {(inputProps) => (
          <SelectInput {...inputProps} options={toOptions(headers, 'Select a column')} value={String(mapping.phoneIndex)} onChange={update('phoneIndex')} />
        )}
      </Field>
      <Field id="mapping-name" label="Name column" help="Used for {{1}}. Empty names use the fallback set when sending.">
        {(inputProps) => (
          <SelectInput {...inputProps} options={toOptions(headers, 'No name column')} value={String(mapping.nameIndex)} onChange={update('nameIndex')} />
        )}
      </Field>
    </div>
  );
}
