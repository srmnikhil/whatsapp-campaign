import { Button } from '../../components/ui/Button.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { RadioGroup } from '../../components/ui/RadioGroup.jsx';
import { SelectInput } from '../../components/ui/SelectInput.jsx';
import { TextArea } from '../../components/ui/TextArea.jsx';
import { TextInput } from '../../components/ui/TextInput.jsx';
import { TEMPLATE_DEFAULTS } from '../../config/defaults.js';
import { HEADER_FORMATS, NAME_VARIABLE } from '../../constants/templates.js';
import { DRAFT_LIMITS } from '../../lib/templateDraft.js';

const HEADER_OPTIONS = [
  { value: HEADER_FORMATS.IMAGE, label: 'Image' },
  { value: HEADER_FORMATS.NONE, label: 'No header' },
];
const IMAGE_ACCEPT = 'image/jpeg,image/png';
const FILE_INPUT_CLASSES =
  'block w-full cursor-pointer text-sm text-text-secondary file:mr-3 file:cursor-pointer file:rounded-md file:border ' +
  'file:border-line file:bg-card file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy hover:file:bg-muted';

export function TemplateDraftFields({ draft, errors, onChange }) {
  const setField = (key) => (event) => onChange({ [key]: event.target.value });
  const insertName = () => onChange({ bodyText: `${draft.bodyText}${NAME_VARIABLE}` });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="draft-name" label="Template name" required help="Lowercase, digits and underscores, e.g. diwali_offer_2026." error={errors.name}>
          {(inputProps) => <TextInput {...inputProps} value={draft.name} onChange={setField('name')} />}
        </Field>
        <Field id="draft-language" label="Language" required>
          {(inputProps) => <SelectInput {...inputProps} options={TEMPLATE_DEFAULTS.languages} value={draft.language} onChange={setField('language')} />}
        </Field>
      </div>

      <RadioGroup name="draft-header" legend="Header" options={HEADER_OPTIONS} value={draft.headerFormat} onChange={(headerFormat) => onChange({ headerFormat })} />
      {draft.headerFormat === HEADER_FORMATS.IMAGE && (
        <Field id="draft-image" label="Header image" required help="JPEG or PNG, up to 5 MB." error={errors.imageFile}>
          {(inputProps) => (
            <input {...inputProps} type="file" accept={IMAGE_ACCEPT} className={FILE_INPUT_CLASSES} onChange={(event) => onChange({ imageFile: event.target.files?.[0] ?? null })} />
          )}
        </Field>
      )}

      <Field id="draft-body" label="Message text" required help={`${NAME_VARIABLE} becomes the contact's name. ${draft.bodyText.length}/${DRAFT_LIMITS.bodyMax}`} error={errors.bodyText}>
        {(inputProps) => <TextArea {...inputProps} maxLength={DRAFT_LIMITS.bodyMax} value={draft.bodyText} onChange={setField('bodyText')} />}
      </Field>
      <div>
        <Button variant="secondary" onClick={insertName}>Insert {NAME_VARIABLE} (name)</Button>
      </div>
      <Field id="draft-sample" label="Sample name for review" help={`Meta reviewers see this in place of ${NAME_VARIABLE}.`} error={errors.sampleName}>
        {(inputProps) => <TextInput {...inputProps} maxLength={DRAFT_LIMITS.sampleMax} value={draft.sampleName} onChange={setField('sampleName')} />}
      </Field>

      <Field id="draft-footer" label="Footer (optional)" help={`Up to ${DRAFT_LIMITS.footerMax} characters.`} error={errors.footerText}>
        {(inputProps) => <TextInput {...inputProps} maxLength={DRAFT_LIMITS.footerMax} value={draft.footerText} onChange={setField('footerText')} />}
      </Field>
      <Checkbox
        id="draft-stop-button"
        label={`Add a "${TEMPLATE_DEFAULTS.stopButtonText}" button`}
        help="Recommended. A tap opts the contact out of future campaigns."
        checked={draft.includeStopButton}
        onChange={(event) => onChange({ includeStopButton: event.target.checked })}
      />
    </div>
  );
}
